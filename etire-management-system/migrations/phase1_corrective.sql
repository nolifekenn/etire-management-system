-- ===========================================================================
-- PHASE 1: CORRECTIVE MIGRATION (Exact-spec reconciliation)
-- Adds the three structures from the Corrective Action brief with the
-- EXACT table names and column names specified.
--
-- This is ADDITIVE to phase1_foundation.sql. Run AFTER it.
-- Both files together fulfill Phase 1 completely.
-- ===========================================================================


-- ===========================================================================
-- 1. INVENTORY MOVES  (exact spec)
--    Immutable stock ledger. Every stock change must produce a row here.
--    `inventory_item.stock_quantity` is legacy; on-hand qty = SUM of this table.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.inventory_moves (
  move_id              uuid         NOT NULL DEFAULT gen_random_uuid(),
  item_id              uuid         NOT NULL,
  branch_id            uuid         NOT NULL,
  -- 'purchase' | 'sale' | 'service' | 'adjustment' | 'transfer'
  source_document_type varchar(32)  NOT NULL
    CHECK (source_document_type IN ('purchase','sale','service','adjustment','transfer')),
  source_document_id   uuid,                     -- FK to originating record (PO, sale, service_job)
  quantity_moved       integer      NOT NULL,     -- positive = stock IN, negative = stock OUT
  unit_cost            numeric      NOT NULL DEFAULT 0,   -- cost at time of move (for valuation)
  notes                text,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  created_by           uuid,

  CONSTRAINT inventory_moves_pkey       PRIMARY KEY (move_id),
  CONSTRAINT inventory_moves_item_fk    FOREIGN KEY (item_id)    REFERENCES public.inventory_item(item_id),
  CONSTRAINT inventory_moves_branch_fk  FOREIGN KEY (branch_id)  REFERENCES public.branch(branch_id),
  CONSTRAINT inventory_moves_user_fk    FOREIGN KEY (created_by) REFERENCES public.user(user_id)
);

-- Indexes for fast stock-on-hand queries
CREATE INDEX IF NOT EXISTS idx_inv_moves_item_branch
  ON public.inventory_moves (item_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_inv_moves_source_doc
  ON public.inventory_moves (source_document_type, source_document_id);

CREATE INDEX IF NOT EXISTS idx_inv_moves_created_at
  ON public.inventory_moves (created_at DESC);

-- Live stock-on-hand view (per item per branch) computed from ledger
CREATE OR REPLACE VIEW public.v_stock_on_hand AS
SELECT
  item_id,
  branch_id,
  SUM(quantity_moved)          AS qty_on_hand,
  SUM(quantity_moved * unit_cost) AS stock_value
FROM public.inventory_moves
GROUP BY item_id, branch_id;

-- RLS
ALTER TABLE public.inventory_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_moves_select" ON public.inventory_moves
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "inv_moves_insert" ON public.inventory_moves
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.user WHERE auth_id = (auth.jwt()->>'sub')::uuid LIMIT 1)
    IN ('super_admin','branch_manager','staff','cashier')
  );

-- Only super_admin can delete a move (audit correction, extremely rare)
CREATE POLICY "inv_moves_delete" ON public.inventory_moves
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM public.user WHERE auth_id = (auth.jwt()->>'sub')::uuid LIMIT 1)
    = 'super_admin'
  );


-- ===========================================================================
-- 2. CHATTER MESSAGES  (exact spec)
--    Universal polymorphic note/log/activity table.
--    Attach to any record using related_table + related_record_id.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.chatter_messages (
  message_id         uuid         NOT NULL DEFAULT gen_random_uuid(),
  -- Polymorphic target — identifies WHICH record this message belongs to
  related_table      varchar(64)  NOT NULL,   -- e.g. 'purchase_order', 'customer', 'service_job'
  related_record_id  uuid         NOT NULL,
  user_id            uuid,                    -- NULL = system-generated log
  -- 'note'     = manual internal note by a user
  -- 'log'      = automated state-change / system event log
  -- 'activity' = scheduled activity (call, meeting, email, etc.)
  type               varchar(20)  NOT NULL DEFAULT 'note'
    CHECK (type IN ('note','log','activity')),
  message            text         NOT NULL,
  -- Optional: for 'log' type, snapshot old/new state
  old_value          text,
  new_value          text,
  -- Optional: for 'activity' type
  activity_type      varchar(32),             -- 'call','email','meeting','todo'
  activity_due_date  date,
  activity_done      boolean      NOT NULL DEFAULT false,
  -- Attachments stored as JSONB array [{name, url, mime_type}]
  attachments        jsonb        NOT NULL DEFAULT '[]',
  is_internal        boolean      NOT NULL DEFAULT true,  -- false = visible to customer
  created_at         timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT chatter_messages_pkey    PRIMARY KEY (message_id),
  CONSTRAINT chatter_messages_user_fk FOREIGN KEY (user_id) REFERENCES public.user(user_id)
    ON DELETE SET NULL
);

-- Indexes for fast chatter lookups
CREATE INDEX IF NOT EXISTS idx_chatter_msgs_record
  ON public.chatter_messages (related_table, related_record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatter_msgs_user
  ON public.chatter_messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatter_msgs_activity
  ON public.chatter_messages (activity_due_date, activity_done)
  WHERE type = 'activity' AND activity_done = false;

-- RLS
ALTER TABLE public.chatter_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chatter_msgs_select" ON public.chatter_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "chatter_msgs_insert" ON public.chatter_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT user_id FROM public.user WHERE auth_id = (auth.jwt()->>'sub')::uuid LIMIT 1)
    OR (SELECT role FROM public.user WHERE auth_id = (auth.jwt()->>'sub')::uuid LIMIT 1)
       IN ('super_admin','branch_manager')
  );

CREATE POLICY "chatter_msgs_delete" ON public.chatter_messages
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT user_id FROM public.user WHERE auth_id = (auth.jwt()->>'sub')::uuid LIMIT 1)
    OR (SELECT role FROM public.user WHERE auth_id = (auth.jwt()->>'sub')::uuid LIMIT 1)
       = 'super_admin'
  );


-- ===========================================================================
-- 3. PO SEQUENCE — Year-scoped format  PO-YYYY-XXXX
--    e.g.  PO-2026-0001, PO-2026-0002 ... PO-2027-0001 (resets each year)
-- ===========================================================================

-- Per-year sequence counter table (replaces the flat ir_sequence row for POs)
CREATE TABLE IF NOT EXISTS public.po_year_sequence (
  year          smallint  NOT NULL,
  number_next   integer   NOT NULL DEFAULT 1,
  CONSTRAINT po_year_sequence_pkey PRIMARY KEY (year)
);

-- Thread-safe function: returns next PO number in PO-YYYY-XXXX format
CREATE OR REPLACE FUNCTION public.next_po_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  _year   smallint := EXTRACT(YEAR FROM now())::smallint;
  _next   integer;
  _result text;
BEGIN
  -- Upsert: initialise the row for this year if it doesn't exist, then lock it
  INSERT INTO public.po_year_sequence (year, number_next)
  VALUES (_year, 1)
  ON CONFLICT (year) DO NOTHING;

  SELECT number_next INTO _next
    FROM public.po_year_sequence
   WHERE year = _year
     FOR UPDATE;           -- row-level lock prevents concurrent duplicates

  _result := 'PO-' || _year::text || '-' || LPAD(_next::text, 4, '0');

  UPDATE public.po_year_sequence
     SET number_next = number_next + 1
   WHERE year = _year;

  RETURN _result;
END;
$$;

-- Drop old trigger that used flat ir_sequence, replace with year-scoped one
DROP TRIGGER IF EXISTS set_po_number ON public.purchase_order;

CREATE OR REPLACE FUNCTION public.trg_set_po_number_yearly()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := public.next_po_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_po_number
  BEFORE INSERT ON public.purchase_order
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_po_number_yearly();

-- Convenience: analogous year-scoped sequences for SO and SJ
-- SO-YYYY-XXXX
CREATE TABLE IF NOT EXISTS public.so_year_sequence (
  year        smallint  NOT NULL,
  number_next integer   NOT NULL DEFAULT 1,
  CONSTRAINT so_year_sequence_pkey PRIMARY KEY (year)
);

CREATE OR REPLACE FUNCTION public.next_so_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  _year smallint := EXTRACT(YEAR FROM now())::smallint;
  _next integer;
BEGIN
  INSERT INTO public.so_year_sequence (year, number_next) VALUES (_year, 1)
  ON CONFLICT (year) DO NOTHING;
  SELECT number_next INTO _next FROM public.so_year_sequence WHERE year = _year FOR UPDATE;
  UPDATE public.so_year_sequence SET number_next = number_next + 1 WHERE year = _year;
  RETURN 'SO-' || _year::text || '-' || LPAD(_next::text, 4, '0');
END;
$$;

DROP TRIGGER IF EXISTS set_sale_number ON public.sale;
CREATE OR REPLACE FUNCTION public.trg_set_sale_number_yearly()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := public.next_so_number();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_sale_number
  BEFORE INSERT ON public.sale
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_sale_number_yearly();

-- SJ-YYYY-XXXX
CREATE TABLE IF NOT EXISTS public.sj_year_sequence (
  year        smallint  NOT NULL,
  number_next integer   NOT NULL DEFAULT 1,
  CONSTRAINT sj_year_sequence_pkey PRIMARY KEY (year)
);

CREATE OR REPLACE FUNCTION public.next_sj_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  _year smallint := EXTRACT(YEAR FROM now())::smallint;
  _next integer;
BEGIN
  INSERT INTO public.sj_year_sequence (year, number_next) VALUES (_year, 1)
  ON CONFLICT (year) DO NOTHING;
  SELECT number_next INTO _next FROM public.sj_year_sequence WHERE year = _year FOR UPDATE;
  UPDATE public.sj_year_sequence SET number_next = number_next + 1 WHERE year = _year;
  RETURN 'SJ-' || _year::text || '-' || LPAD(_next::text, 4, '0');
END;
$$;

DROP TRIGGER IF EXISTS set_job_number ON public.service_job;
CREATE OR REPLACE FUNCTION public.trg_set_job_number_yearly()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := public.next_sj_number();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_job_number
  BEFORE INSERT ON public.service_job
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_job_number_yearly();


-- ===========================================================================
-- 4. AUTO-LOG TRIGGER  (writes chatter_messages on state changes)
--    Attach to any table that has a `status` or `state` column.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.trg_chatter_state_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _table   text := TG_TABLE_NAME;
  _pk_col  text := TG_ARGV[0];       -- e.g. 'po_id', 'job_id', 'sale_id'
  _state_col text := TG_ARGV[1];     -- e.g. 'status', 'state'
  _rec_id  uuid;
  _old_val text;
  _new_val text;
BEGIN
  EXECUTE format('SELECT ($1).%I::text', _pk_col)    INTO _rec_id  USING NEW;
  EXECUTE format('SELECT ($1).%I::text', _state_col) INTO _new_val USING NEW;
  EXECUTE format('SELECT ($1).%I::text', _state_col) INTO _old_val USING OLD;

  IF _old_val IS DISTINCT FROM _new_val THEN
    INSERT INTO public.chatter_messages
      (related_table, related_record_id, user_id, type, message, old_value, new_value)
    VALUES
      (_table, _rec_id, NULL, 'log',
       format('Status changed: "%s" → "%s"', _old_val, _new_val),
       _old_val, _new_val);
  END IF;

  RETURN NEW;
END;
$$;

-- Attach to purchase_order (uses 'status' column — existing text column)
DROP TRIGGER IF EXISTS chatter_log_po_status ON public.purchase_order;
CREATE TRIGGER chatter_log_po_status
  AFTER UPDATE OF status ON public.purchase_order
  FOR EACH ROW EXECUTE FUNCTION public.trg_chatter_state_log('po_id', 'status');

-- Attach to service_job
DROP TRIGGER IF EXISTS chatter_log_sj_status ON public.service_job;
CREATE TRIGGER chatter_log_sj_status
  AFTER UPDATE OF status ON public.service_job
  FOR EACH ROW EXECUTE FUNCTION public.trg_chatter_state_log('job_id', 'status');


-- ===========================================================================
-- 5. HELPER FUNCTIONS  (callable from Next.js API routes)
-- ===========================================================================

-- Add a manual note to any record's chatter
CREATE OR REPLACE FUNCTION public.fn_add_chatter_note(
  p_table      text,
  p_record_id  uuid,
  p_user_id    uuid,
  p_message    text,
  p_internal   boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.chatter_messages
    (related_table, related_record_id, user_id, type, message, is_internal)
  VALUES
    (p_table, p_record_id, p_user_id, 'note', p_message, p_internal)
  RETURNING message_id INTO _id;
  RETURN _id;
END;
$$;

-- Add a stock move and keep legacy stock_quantity in sync
CREATE OR REPLACE FUNCTION public.fn_record_stock_move(
  p_item_id     uuid,
  p_branch_id   uuid,
  p_doc_type    varchar,
  p_doc_id      uuid,
  p_qty         integer,   -- positive = in, negative = out
  p_unit_cost   numeric,
  p_user_id     uuid,
  p_notes       text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE _move_id uuid;
BEGIN
  -- Guard: prevent negative on-hand (optional — remove for transfers)
  IF p_qty < 0 THEN
    IF (
      SELECT COALESCE(SUM(quantity_moved), 0)
        FROM public.inventory_moves
       WHERE item_id = p_item_id AND branch_id = p_branch_id
    ) + p_qty < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for item % in branch %', p_item_id, p_branch_id;
    END IF;
  END IF;

  INSERT INTO public.inventory_moves
    (item_id, branch_id, source_document_type, source_document_id,
     quantity_moved, unit_cost, notes, created_by)
  VALUES
    (p_item_id, p_branch_id, p_doc_type, p_doc_id,
     p_qty, p_unit_cost, p_notes, p_user_id)
  RETURNING move_id INTO _move_id;

  -- Keep legacy column in sync for any APIs still reading stock_quantity directly
  UPDATE public.inventory_item
     SET stock_quantity = GREATEST(0,
           stock_quantity + p_qty
         ),
         updated_at = now()
   WHERE item_id = p_item_id;

  RETURN _move_id;
END;
$$;

-- Get chatter history for a record (ordered newest-first)
CREATE OR REPLACE FUNCTION public.fn_get_chatter(
  p_table     text,
  p_record_id uuid,
  p_limit     integer DEFAULT 50
)
RETURNS TABLE (
  message_id        uuid,
  type              varchar,
  message           text,
  old_value         text,
  new_value         text,
  is_internal       boolean,
  activity_type     varchar,
  activity_due_date date,
  activity_done     boolean,
  attachments       jsonb,
  created_at        timestamptz,
  author_name       text,
  author_username   text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cm.message_id,
    cm.type,
    cm.message,
    cm.old_value,
    cm.new_value,
    cm.is_internal,
    cm.activity_type,
    cm.activity_due_date,
    cm.activity_done,
    cm.attachments,
    cm.created_at,
    u.name     AS author_name,
    u.username AS author_username
  FROM public.chatter_messages cm
  LEFT JOIN public.user u ON u.user_id = cm.user_id
  WHERE cm.related_table = p_table
    AND cm.related_record_id = p_record_id
  ORDER BY cm.created_at DESC
  LIMIT p_limit;
$$;


-- ===========================================================================
-- END OF CORRECTIVE MIGRATION
-- Run order: phase1_foundation.sql → phase1_corrective.sql
-- ===========================================================================
