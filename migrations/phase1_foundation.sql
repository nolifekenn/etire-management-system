-- ===========================================================================
-- PHASE 1: ERP FOUNDATION MIGRATION
-- Supabase PostgreSQL — Odoo 19 Architecture Upgrade
-- Run this in Supabase SQL Editor in ORDER. Each section is idempotent.
-- ===========================================================================


-- ===========================================================================
-- SECTION 1: SEQUENCE ENGINE
-- Provides Odoo-style human-readable document numbers (PO-0001, SO-0001)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.ir_sequence (
  id              serial       PRIMARY KEY,
  name            text         NOT NULL,
  code            text         NOT NULL UNIQUE,
  prefix          text         NOT NULL DEFAULT '',
  padding         integer      NOT NULL DEFAULT 4,
  number_next     integer      NOT NULL DEFAULT 1,
  number_increment integer     NOT NULL DEFAULT 1,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

-- Seed sequence definitions
INSERT INTO public.ir_sequence (name, code, prefix, padding, number_next)
VALUES
  ('Purchase Order',      'purchase.order',   'PO-',   4, 1),
  ('Sales Order',         'sale.order',       'SO-',   4, 1),
  ('Service Job',         'service.job',      'SJ-',   4, 1),
  ('Stock Receipt',       'stock.receipt',    'RCPT-', 4, 1),
  ('Stock Delivery',      'stock.delivery',   'DEL-',  4, 1),
  ('Internal Transfer',   'stock.internal',   'INT-',  4, 1),
  ('Customer Invoice',    'account.invoice',  'INV-',  4, 1),
  ('Vendor Bill',         'account.bill',     'BILL-', 4, 1),
  ('Credit Note',         'account.credit',   'CRED-', 4, 1),
  ('Stock Adjustment',    'stock.adjust',     'ADJ-',  5, 1)
ON CONFLICT (code) DO NOTHING;

-- Thread-safe sequence function (uses advisory locks per sequence code)
CREATE OR REPLACE FUNCTION public.next_sequence(seq_code text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  seq     public.ir_sequence%ROWTYPE;
  result  text;
BEGIN
  SELECT * INTO seq
    FROM public.ir_sequence
   WHERE code = seq_code
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sequence "%" not found. Register it in ir_sequence first.', seq_code;
  END IF;

  result := seq.prefix || LPAD(seq.number_next::text, seq.padding, '0');

  UPDATE public.ir_sequence
     SET number_next = number_next + number_increment
   WHERE code = seq_code;

  RETURN result;
END;
$$;


-- ===========================================================================
-- SECTION 2: ENUM TYPES
-- PostgreSQL native ENUMs for strict state-machine enforcement
-- ===========================================================================

-- Purchase / RFQ lifecycle  (Odoo: Draft RFQ → Sent → Purchase Order → Locked)
DO $$ BEGIN
  CREATE TYPE public.po_state AS ENUM (
    'draft',      -- Draft RFQ
    'sent',       -- Sent to Supplier
    'purchase',   -- Confirmed Purchase Order
    'locked',     -- Locked (no further edits)
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service job lifecycle (Odoo: Quotation → In Progress → Quality Check → Done → Invoiced)
DO $$ BEGIN
  CREATE TYPE public.service_state AS ENUM (
    'quotation',
    'in_progress',
    'quality_check',
    'completed',
    'invoiced',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sales order lifecycle
DO $$ BEGIN
  CREATE TYPE public.sale_order_state AS ENUM (
    'draft',        -- Quotation
    'confirmed',    -- Sales Order
    'done',         -- Locked
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Stock move types
DO $$ BEGIN
  CREATE TYPE public.stock_move_type AS ENUM (
    'receipt',      -- Supplier → Warehouse (from PO)
    'delivery',     -- Warehouse → Customer (from SO/POS)
    'internal',     -- Branch to Branch transfer
    'return',       -- Customer → Warehouse
    'adjustment'    -- Manual inventory correction
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoice / Bill state
DO $$ BEGIN
  CREATE TYPE public.invoice_state AS ENUM (
    'draft',
    'posted',     -- Confirmed & posted
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoice type
DO $$ BEGIN
  CREATE TYPE public.invoice_type AS ENUM (
    'customer_invoice',
    'vendor_bill',
    'credit_note',
    'refund'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payment state (used on invoices & bills)
DO $$ BEGIN
  CREATE TYPE public.payment_state_enum AS ENUM (
    'not_paid',
    'partial',
    'paid',
    'reversed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Chatter message types
DO $$ BEGIN
  CREATE TYPE public.chatter_message_type AS ENUM (
    'comment',          -- User comment / internal note
    'state_change',     -- Automated: status transition log
    'system',           -- Automated: system-generated event
    'activity_done'     -- Activity marked as done
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ===========================================================================
-- SECTION 3: UPGRADE EXISTING TABLES
-- Migrate status text columns → ENUM, add sequence number columns
-- ===========================================================================

-- ── purchase_order ──────────────────────────────────────────────────────────
-- Add new ENUM state column alongside old status (keep old for zero-downtime)
ALTER TABLE public.purchase_order
  ADD COLUMN IF NOT EXISTS state            public.po_state       NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS receipt_status   text                  DEFAULT 'nothing'
    CHECK (receipt_status IN ('nothing','partial','full')),
  ADD COLUMN IF NOT EXISTS bill_status      text                  DEFAULT 'nothing'
    CHECK (bill_status IN ('nothing','partial','billed')),
  ADD COLUMN IF NOT EXISTS source_document  text,
  ADD COLUMN IF NOT EXISTS currency_code    text                  DEFAULT 'PHP';

-- Backfill state ENUM from old status text
UPDATE public.purchase_order SET state =
  CASE status
    WHEN 'pending'    THEN 'draft'::public.po_state
    WHEN 'approved'   THEN 'sent'::public.po_state
    WHEN 'ordered'    THEN 'purchase'::public.po_state
    WHEN 'delivered'  THEN 'locked'::public.po_state
    WHEN 'cancelled'  THEN 'cancelled'::public.po_state
    ELSE 'draft'::public.po_state
  END
WHERE state = 'draft'; -- only backfill rows not yet migrated

-- ── service_job ─────────────────────────────────────────────────────────────
ALTER TABLE public.service_job
  ADD COLUMN IF NOT EXISTS state          public.service_state  NOT NULL DEFAULT 'quotation',
  ADD COLUMN IF NOT EXISTS job_number     text                  UNIQUE,
  ADD COLUMN IF NOT EXISTS priority       smallint              NOT NULL DEFAULT 0
    CHECK (priority BETWEEN 0 AND 3),  -- 0=Normal,1=Urgent,2=Very Urgent,3=Critical
  ADD COLUMN IF NOT EXISTS date_start     timestamptz,
  ADD COLUMN IF NOT EXISTS date_end       timestamptz,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- Backfill state ENUM from old status
UPDATE public.service_job SET state =
  CASE status
    WHEN 'pending'     THEN 'quotation'::public.service_state
    WHEN 'in-progress' THEN 'in_progress'::public.service_state
    WHEN 'completed'   THEN 'completed'::public.service_state
    WHEN 'cancelled'   THEN 'cancelled'::public.service_state
    WHEN 'paid'        THEN 'invoiced'::public.service_state
    ELSE 'quotation'::public.service_state
  END
WHERE state = 'quotation';

-- ── sale (POS Receipt / Sales Order foundation) ──────────────────────────────
ALTER TABLE public.sale
  ADD COLUMN IF NOT EXISTS state          public.sale_order_state NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS sale_number    text                    UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_state  public.payment_state_enum NOT NULL DEFAULT 'not_paid',
  ADD COLUMN IF NOT EXISTS note           text,
  ADD COLUMN IF NOT EXISTS invoiced_at    timestamptz;

-- ── inventory_item ───────────────────────────────────────────────────────────
-- NOTE: As of latest schema, inventory_item already has:
--   size_id uuid → tire_size(size_id)
--   brand_id uuid → tire_brand(brand_id)
-- tire_brand and tire_size lookup tables already exist — no CREATE needed.
--
-- Mark stock_quantity as deprecated direct-write; quantity will be computed
-- from stock_moves via v_stock_qty view (see Section 5). Keep for legacy reads.
ALTER TABLE public.inventory_item
  ADD COLUMN IF NOT EXISTS stock_quantity_legacy integer,
  -- sku/barcode safe with IF NOT EXISTS; catalog_item already has sku,
  -- adding to inventory_item as well for direct product reference.
  ADD COLUMN IF NOT EXISTS sku              text UNIQUE,
  ADD COLUMN IF NOT EXISTS barcode          text UNIQUE,
  ADD COLUMN IF NOT EXISTS internal_ref     text,
  ADD COLUMN IF NOT EXISTS description_sale text,
  ADD COLUMN IF NOT EXISTS description_purchase text,
  ADD COLUMN IF NOT EXISTS weight_kg        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uom              text DEFAULT 'unit';  -- unit of measure

-- Backfill legacy column
UPDATE public.inventory_item
   SET stock_quantity_legacy = stock_quantity
 WHERE stock_quantity_legacy IS NULL;

-- ── customer ─────────────────────────────────────────────────────────────────
ALTER TABLE public.customer
  ADD COLUMN IF NOT EXISTS customer_rank   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_rank   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ref             text,  -- internal reference
  ADD COLUMN IF NOT EXISTS vat             text,  -- tax ID
  ADD COLUMN IF NOT EXISTS country         text DEFAULT 'Philippines',
  ADD COLUMN IF NOT EXISTS city            text,
  ADD COLUMN IF NOT EXISTS zip             text,
  ADD COLUMN IF NOT EXISTS website         text,
  ADD COLUMN IF NOT EXISTS notes           text;

-- ── supplier ──────────────────────────────────────────────────────────────────
ALTER TABLE public.supplier
  ADD COLUMN IF NOT EXISTS ref             text,
  ADD COLUMN IF NOT EXISTS vat             text,
  ADD COLUMN IF NOT EXISTS payment_terms   text DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS country         text DEFAULT 'Philippines',
  ADD COLUMN IF NOT EXISTS city            text,
  ADD COLUMN IF NOT EXISTS address         text,
  ADD COLUMN IF NOT EXISTS website         text,
  ADD COLUMN IF NOT EXISTS notes           text;


-- ===========================================================================
-- SECTION 4: NEW CORE TABLES
-- ===========================================================================

-- ── 4a. Chatter Messages (universal comment/log system per record) ────────────
CREATE TABLE IF NOT EXISTS public.chatter_message (
  id              uuid                        NOT NULL DEFAULT gen_random_uuid(),
  -- Polymorphic FK: identifies which record this message belongs to
  record_table    text                        NOT NULL,  -- e.g. 'purchase_order', 'service_job'
  record_id       uuid                        NOT NULL,
  author_id       uuid                        REFERENCES public.user(user_id) ON DELETE SET NULL,
  message_type    public.chatter_message_type NOT NULL DEFAULT 'comment',
  subject         text,
  body            text                        NOT NULL,
  -- For state_change type: store old/new state
  old_state       text,
  new_state       text,
  -- Attachment metadata (stored in Supabase Storage; array of {name, url} JSON)
  attachments     jsonb                       NOT NULL DEFAULT '[]',
  is_internal     boolean                     NOT NULL DEFAULT false,  -- internal note vs. customer-visible
  created_at      timestamptz                 NOT NULL DEFAULT now(),
  CONSTRAINT chatter_message_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_chatter_record
  ON public.chatter_message (record_table, record_id, created_at DESC);

-- ── 4b. Record Activities (Odoo's "Schedule Activity" feature) ───────────────
CREATE TABLE IF NOT EXISTS public.record_activity (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  record_table    text        NOT NULL,
  record_id       uuid        NOT NULL,
  activity_type   text        NOT NULL DEFAULT 'todo'
    CHECK (activity_type IN ('email','call','meeting','todo','upload_document','other')),
  summary         text,
  note            text,
  date_deadline   date        NOT NULL,
  assigned_to     uuid        REFERENCES public.user(user_id) ON DELETE SET NULL,
  created_by      uuid        REFERENCES public.user(user_id) ON DELETE SET NULL,
  is_done         boolean     NOT NULL DEFAULT false,
  done_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_activity_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_activity_record
  ON public.record_activity (record_table, record_id);
CREATE INDEX IF NOT EXISTS idx_activity_deadline
  ON public.record_activity (assigned_to, date_deadline) WHERE is_done = false;

-- ── 4c. Stock Moves (immutable inventory ledger — the heart of Odoo inventory) ──
CREATE TABLE IF NOT EXISTS public.stock_move (
  id              uuid                    NOT NULL DEFAULT gen_random_uuid(),
  move_number     text                    UNIQUE,  -- auto-generated SM-00001
  move_type       public.stock_move_type  NOT NULL,
  -- Source & destination (branch warehouses)
  branch_id       uuid                    NOT NULL REFERENCES public.branch(branch_id),
  dest_branch_id  uuid                    REFERENCES public.branch(branch_id),  -- for internal transfers
  item_id         uuid                    NOT NULL REFERENCES public.inventory_item(item_id),
  -- Origin documents (at most one will be set)
  origin_po_id          uuid    REFERENCES public.purchase_order(po_id)   ON DELETE SET NULL,
  origin_sale_id        uuid    REFERENCES public.sale(sale_id)            ON DELETE SET NULL,
  origin_service_job_id uuid    REFERENCES public.service_job(job_id)      ON DELETE SET NULL,
  origin_ref            text,   -- human readable origin doc number
  -- Quantities
  qty_demand      numeric       NOT NULL DEFAULT 0 CHECK (qty_demand >= 0),
  qty_done        numeric       NOT NULL DEFAULT 0 CHECK (qty_done >= 0),
  -- Valuation
  unit_cost       numeric       NOT NULL DEFAULT 0,
  -- States
  is_done         boolean       NOT NULL DEFAULT false,
  is_cancelled    boolean       NOT NULL DEFAULT false,
  done_at         timestamptz,
  scheduled_date  timestamptz   NOT NULL DEFAULT now(),
  created_by      uuid          REFERENCES public.user(user_id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT stock_move_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_stock_move_item   ON public.stock_move (item_id, is_done);
CREATE INDEX IF NOT EXISTS idx_stock_move_branch ON public.stock_move (branch_id, is_done);
CREATE INDEX IF NOT EXISTS idx_stock_move_origin ON public.stock_move (origin_po_id, origin_sale_id);

-- ── 4d. Account Invoices & Vendor Bills ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.account_invoice (
  id                uuid                        NOT NULL DEFAULT gen_random_uuid(),
  invoice_number    text                        UNIQUE,   -- auto-generated INV-0001 / BILL-0001
  invoice_type      public.invoice_type         NOT NULL,
  state             public.invoice_state        NOT NULL DEFAULT 'draft',
  payment_state     public.payment_state_enum   NOT NULL DEFAULT 'not_paid',
  -- Relationships
  partner_customer_id uuid  REFERENCES public.customer(customer_id)  ON DELETE SET NULL,
  partner_supplier_id uuid  REFERENCES public.supplier(supplier_id)  ON DELETE SET NULL,
  branch_id           uuid  REFERENCES public.branch(branch_id)      ON DELETE SET NULL,
  created_by          uuid  REFERENCES public.user(user_id)           ON DELETE SET NULL,
  -- Origin documents
  origin_po_id       uuid   REFERENCES public.purchase_order(po_id)  ON DELETE SET NULL,
  origin_sale_id     uuid   REFERENCES public.sale(sale_id)           ON DELETE SET NULL,
  origin_service_id  uuid   REFERENCES public.service_job(job_id)     ON DELETE SET NULL,
  -- Dates
  invoice_date       date   NOT NULL DEFAULT CURRENT_DATE,
  due_date           date,
  -- Amounts (recomputed from lines)
  amount_untaxed     numeric NOT NULL DEFAULT 0,
  amount_tax         numeric NOT NULL DEFAULT 0,
  amount_total       numeric NOT NULL DEFAULT 0,
  amount_residual    numeric NOT NULL DEFAULT 0,  -- outstanding balance
  -- Misc
  currency_code      text   DEFAULT 'PHP',
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  CONSTRAINT account_invoice_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_partner_customer ON public.account_invoice (partner_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_partner_supplier ON public.account_invoice (partner_supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoice_state            ON public.account_invoice (state, payment_state);

-- Invoice / Bill Line Items
CREATE TABLE IF NOT EXISTS public.account_invoice_line (
  id              uuid    NOT NULL DEFAULT gen_random_uuid(),
  invoice_id      uuid    NOT NULL REFERENCES public.account_invoice(id) ON DELETE CASCADE,
  item_id         uuid    REFERENCES public.inventory_item(item_id) ON DELETE SET NULL,
  description     text    NOT NULL,
  quantity        numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  discount_pct    numeric NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  tax_pct         numeric NOT NULL DEFAULT 0 CHECK (tax_pct >= 0),
  subtotal        numeric GENERATED ALWAYS AS (
                    ROUND( quantity * unit_price * (1 - discount_pct/100), 4 )
                  ) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_invoice_line_pkey PRIMARY KEY (id)
);

-- ── 4e. Stock Valuation Ledger (per-move cost layer for FIFO / Average Cost) ─
CREATE TABLE IF NOT EXISTS public.stock_valuation_layer (
  id              uuid      NOT NULL DEFAULT gen_random_uuid(),
  stock_move_id   uuid      NOT NULL REFERENCES public.stock_move(id) ON DELETE CASCADE,
  item_id         uuid      NOT NULL REFERENCES public.inventory_item(item_id) ON DELETE CASCADE,
  branch_id       uuid      NOT NULL REFERENCES public.branch(branch_id),
  quantity        numeric   NOT NULL,   -- negative for outbound
  unit_cost       numeric   NOT NULL,
  total_value     numeric   GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_valuation_layer_pkey PRIMARY KEY (id)
);


-- ===========================================================================
-- SECTION 5: COMPUTED VIEWS (no trigger needed; DB computes on read)
-- ===========================================================================

-- Dynamic stock quantity per item per branch (replaces mutable stock_quantity)
CREATE OR REPLACE VIEW public.v_stock_qty AS
SELECT
  sm.item_id,
  sm.branch_id,
  SUM(
    CASE
      WHEN sm.move_type IN ('receipt','return','adjustment') AND sm.qty_done > 0 THEN  sm.qty_done
      WHEN sm.move_type = 'delivery'   THEN -sm.qty_done
      WHEN sm.move_type = 'internal'   THEN
        CASE
          WHEN sm.branch_id = sm.branch_id THEN -sm.qty_done   -- outbound side
          ELSE 0
        END
      ELSE 0
    END
  ) AS qty_on_hand,
  SUM(
    CASE WHEN sm.move_type IN ('receipt','return','adjustment') AND NOT sm.is_done THEN sm.qty_demand
         WHEN sm.move_type = 'delivery' AND NOT sm.is_done THEN -sm.qty_demand
         ELSE 0 END
  ) AS qty_incoming
FROM public.stock_move sm
WHERE sm.is_cancelled = false
GROUP BY sm.item_id, sm.branch_id;

-- Full inventory item detail view (used by POS, Purchasing, Inventory modules)
-- Joins brand and size lookup tables so API routes don't need extra joins.
CREATE OR REPLACE VIEW public.v_inventory_items AS
SELECT
  i.item_id,
  i.branch_id,
  i.supplier_id,
  i.name,
  i.category,
  i.vehicle_type,
  i.stock_quantity,                        -- legacy direct column (for reads until migration)
  i.cost_price,
  i.sale_price,
  i.reorder_level,
  i.sku,
  i.barcode,
  i.internal_ref,
  i.uom,
  i.weight_kg,
  -- Tire-specific lookups
  tb.name                                  AS brand_name,
  ts.label                                 AS size_label,
  -- Computed stock from ledger (null until stock_moves are populated)
  sq.qty_on_hand                           AS qty_on_hand_computed,
  sq.qty_incoming,
  -- Reorder alert flag
  (COALESCE(sq.qty_on_hand, i.stock_quantity) <= i.reorder_level) AS needs_reorder,
  i.created_at,
  i.updated_at,
  i.deleted_at
FROM public.inventory_item i
LEFT JOIN public.tire_brand  tb ON tb.brand_id = i.brand_id
LEFT JOIN public.tire_size   ts ON ts.size_id  = i.size_id
LEFT JOIN public.v_stock_qty sq ON sq.item_id  = i.item_id AND sq.branch_id = i.branch_id;

-- Customer stats view (powers smart buttons on Customer form)
CREATE OR REPLACE VIEW public.v_customer_stats AS
SELECT
  c.customer_id,
  COUNT(DISTINCT s.sale_id)        AS total_sales,
  COALESCE(SUM(s.total_amount), 0) AS total_revenue,
  COUNT(DISTINCT sj.job_id)        AS total_service_jobs,
  COUNT(DISTINCT v.vehicle_id)     AS total_vehicles,
  MAX(s.sale_date)                 AS last_sale_date
FROM public.customer c
LEFT JOIN public.sale         s  ON s.customer_id  = c.customer_id AND s.deleted_at IS NULL
LEFT JOIN public.service_job  sj ON sj.customer_id = c.customer_id AND sj.deleted_at IS NULL
LEFT JOIN public.vehicle      v  ON v.customer_id  = c.customer_id AND v.deleted_at IS NULL
GROUP BY c.customer_id;

-- Supplier stats view (powers smart buttons on Supplier form)
CREATE OR REPLACE VIEW public.v_supplier_stats AS
SELECT
  s.supplier_id,
  COUNT(DISTINCT po.po_id)              AS total_orders,
  COALESCE(SUM(po.total_amount), 0)     AS total_purchased,
  COUNT(DISTINCT ai.id)                 AS total_bills,
  COALESCE(SUM(ai.amount_residual), 0)  AS outstanding_balance,
  MAX(po.order_date)                    AS last_order_date
FROM public.supplier s
LEFT JOIN public.purchase_order  po ON po.supplier_id = s.supplier_id AND po.deleted_at IS NULL
LEFT JOIN public.account_invoice ai ON ai.partner_supplier_id = s.supplier_id AND ai.deleted_at IS NULL
GROUP BY s.supplier_id;


-- ===========================================================================
-- SECTION 6: TRIGGERS — AUTO-GENERATE DOCUMENT NUMBERS
-- ===========================================================================

-- Auto-generate po_number on INSERT if not provided
CREATE OR REPLACE FUNCTION public.trg_set_po_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := public.next_sequence('purchase.order');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_po_number ON public.purchase_order;
CREATE TRIGGER set_po_number
  BEFORE INSERT ON public.purchase_order
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_po_number();

-- Auto-generate job_number on service_job INSERT
CREATE OR REPLACE FUNCTION public.trg_set_job_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := public.next_sequence('service.job');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_job_number ON public.service_job;
CREATE TRIGGER set_job_number
  BEFORE INSERT ON public.service_job
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_job_number();

-- Auto-generate sale_number on sale INSERT
CREATE OR REPLACE FUNCTION public.trg_set_sale_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := public.next_sequence('sale.order');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sale_number ON public.sale;
CREATE TRIGGER set_sale_number
  BEFORE INSERT ON public.sale
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_sale_number();

-- Auto-generate invoice_number on account_invoice INSERT
CREATE OR REPLACE FUNCTION public.trg_set_invoice_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    IF NEW.invoice_type = 'customer_invoice' THEN
      NEW.invoice_number := public.next_sequence('account.invoice');
    ELSIF NEW.invoice_type = 'vendor_bill' THEN
      NEW.invoice_number := public.next_sequence('account.bill');
    ELSIF NEW.invoice_type IN ('credit_note','refund') THEN
      NEW.invoice_number := public.next_sequence('account.credit');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invoice_number ON public.account_invoice;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON public.account_invoice
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_invoice_number();

-- Auto-generate stock_move move_number on INSERT
CREATE OR REPLACE FUNCTION public.trg_set_move_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.move_number IS NULL OR NEW.move_number = '' THEN
    IF NEW.move_type = 'adjustment' THEN
      NEW.move_number := public.next_sequence('stock.adjust');
    ELSIF NEW.move_type = 'receipt' THEN
      NEW.move_number := public.next_sequence('stock.receipt');
    ELSIF NEW.move_type = 'delivery' THEN
      NEW.move_number := public.next_sequence('stock.delivery');
    ELSE
      NEW.move_number := public.next_sequence('stock.internal');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_move_number ON public.stock_move;
CREATE TRIGGER set_move_number
  BEFORE INSERT ON public.stock_move
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_move_number();

-- Auto state-change chatter log (generic trigger factory)
CREATE OR REPLACE FUNCTION public.trg_log_state_change()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  _old_state text;
  _new_state text;
  _rec_table text;
  _rec_id    uuid;
  _pk_col    text;
BEGIN
  -- Resolve state column name (state for most tables)
  _old_state := OLD.state::text;
  _new_state := NEW.state::text;

  IF _old_state IS DISTINCT FROM _new_state THEN
    _rec_table := TG_TABLE_NAME;

    -- Resolve pk column value
    EXECUTE format('SELECT ($1).%I', TG_ARGV[0]) INTO _rec_id USING NEW;

    INSERT INTO public.chatter_message
      (record_table, record_id, message_type, body, old_state, new_state)
    VALUES
      (_rec_table, _rec_id, 'state_change',
       format('Status changed from "%s" to "%s"', _old_state, _new_state),
       _old_state, _new_state);
  END IF;

  RETURN NEW;
END;
$$;

-- Attach state-change logger to purchase_order
DROP TRIGGER IF EXISTS log_po_state_change ON public.purchase_order;
CREATE TRIGGER log_po_state_change
  AFTER UPDATE OF state ON public.purchase_order
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_state_change('po_id');

-- Attach to service_job
DROP TRIGGER IF EXISTS log_job_state_change ON public.service_job;
CREATE TRIGGER log_job_state_change
  AFTER UPDATE OF state ON public.service_job
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_state_change('job_id');

-- Attach to account_invoice
DROP TRIGGER IF EXISTS log_invoice_state_change ON public.account_invoice;
CREATE TRIGGER log_invoice_state_change
  AFTER UPDATE OF state ON public.account_invoice
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_state_change('id');

-- updated_at auto-refresh
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_purchase_order ON public.purchase_order;
CREATE TRIGGER set_updated_at_purchase_order
  BEFORE UPDATE ON public.purchase_order
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_account_invoice ON public.account_invoice;
CREATE TRIGGER set_updated_at_account_invoice
  BEFORE UPDATE ON public.account_invoice
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();


-- ===========================================================================
-- SECTION 7: ENHANCED AUDIT LOG
-- Upgrade existing audit_log to support chatter-friendly record linking
-- ===========================================================================

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS record_number  text,       -- human-readable doc number
  ADD COLUMN IF NOT EXISTS old_values     jsonb,
  ADD COLUMN IF NOT EXISTS ip_address     text,
  ADD COLUMN IF NOT EXISTS user_agent     text,
  ADD COLUMN IF NOT EXISTS session_id     text;

CREATE INDEX IF NOT EXISTS idx_audit_log_record
  ON public.audit_log (table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON public.audit_log (user_id, created_at DESC);


-- ===========================================================================
-- SECTION 8: ROW LEVEL SECURITY (RLS) POLICIES — NEW TABLES
-- ===========================================================================

-- Enable RLS on all new tables
ALTER TABLE public.ir_sequence          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatter_message      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_activity      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_move           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_valuation_layer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_invoice      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_invoice_line ENABLE ROW LEVEL SECURITY;

-- Helper: get current app user_id from JWT claim
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'sub')::uuid;
$$;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role FROM public.user
   WHERE auth_id = (auth.jwt() ->> 'sub')::uuid
   LIMIT 1;
$$;

-- ir_sequence: only super_admin can modify; all authenticated can read
CREATE POLICY "ir_sequence_select" ON public.ir_sequence
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ir_sequence_admin_all" ON public.ir_sequence
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'super_admin');

-- chatter_message: users see messages for records they have access to
-- For simplicity: all authenticated users can read/insert; only author or admin can delete
CREATE POLICY "chatter_select" ON public.chatter_message
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "chatter_insert" ON public.chatter_message
  FOR INSERT TO authenticated WITH CHECK (
    author_id = public.get_current_user_id()
    OR public.get_current_user_role() IN ('super_admin', 'branch_manager')
  );
CREATE POLICY "chatter_delete" ON public.chatter_message
  FOR DELETE TO authenticated USING (
    author_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'super_admin'
  );

-- record_activity
CREATE POLICY "activity_select" ON public.record_activity
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_insert_update" ON public.record_activity
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- stock_move: insert by staff+; delete only super_admin (moves are immutable in Odoo)
CREATE POLICY "stock_move_select" ON public.stock_move
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_move_insert" ON public.stock_move
  FOR INSERT TO authenticated WITH CHECK (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff', 'cashier')
  );
CREATE POLICY "stock_move_admin_update" ON public.stock_move
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() IN ('super_admin', 'branch_manager'));

-- stock_valuation_layer: read-only for non-admin
CREATE POLICY "svl_select" ON public.stock_valuation_layer
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "svl_insert" ON public.stock_valuation_layer
  FOR INSERT TO authenticated WITH CHECK (
    public.get_current_user_role() IN ('super_admin', 'branch_manager')
  );

-- account_invoice
CREATE POLICY "invoice_select" ON public.account_invoice
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoice_insert" ON public.account_invoice
  FOR INSERT TO authenticated WITH CHECK (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff')
  );
CREATE POLICY "invoice_update" ON public.account_invoice
  FOR UPDATE TO authenticated USING (
    public.get_current_user_role() IN ('super_admin', 'branch_manager')
    AND state = 'draft'   -- can only edit draft invoices
  );

-- account_invoice_line
CREATE POLICY "invoice_line_all" ON public.account_invoice_line
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ===========================================================================
-- SECTION 9: UTILITY FUNCTIONS (used by Next.js API routes)
-- ===========================================================================

-- Validate a PO state transition is legal
CREATE OR REPLACE FUNCTION public.fn_validate_po_transition(
  p_current public.po_state,
  p_next    public.po_state
) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  RETURN CASE
    WHEN p_current = 'draft'    AND p_next = 'sent'      THEN true
    WHEN p_current = 'draft'    AND p_next = 'cancelled'  THEN true
    WHEN p_current = 'sent'     AND p_next = 'purchase'   THEN true
    WHEN p_current = 'sent'     AND p_next = 'cancelled'  THEN true
    WHEN p_current = 'purchase' AND p_next = 'locked'     THEN true
    WHEN p_current = 'purchase' AND p_next = 'cancelled'  THEN true
    ELSE false
  END;
END;
$$;

-- Validate a Service Job state transition
CREATE OR REPLACE FUNCTION public.fn_validate_service_transition(
  p_current public.service_state,
  p_next    public.service_state
) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  RETURN CASE
    WHEN p_current = 'quotation'      AND p_next = 'in_progress'    THEN true
    WHEN p_current = 'quotation'      AND p_next = 'cancelled'      THEN true
    WHEN p_current = 'in_progress'    AND p_next = 'quality_check'  THEN true
    WHEN p_current = 'in_progress'    AND p_next = 'cancelled'      THEN true
    WHEN p_current = 'quality_check'  AND p_next = 'in_progress'    THEN true  -- fail QC → back
    WHEN p_current = 'quality_check'  AND p_next = 'completed'      THEN true
    WHEN p_current = 'completed'      AND p_next = 'invoiced'       THEN true
    ELSE false
  END;
END;
$$;

-- Get total open balance for a supplier
CREATE OR REPLACE FUNCTION public.fn_supplier_open_balance(p_supplier_id uuid)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(amount_residual), 0)
    FROM public.account_invoice
   WHERE partner_supplier_id = p_supplier_id
     AND invoice_type = 'vendor_bill'
     AND state = 'posted'
     AND payment_state IN ('not_paid','partial')
     AND deleted_at IS NULL;
$$;

-- Log a chatter state-change message (callable from API)
CREATE OR REPLACE FUNCTION public.fn_chatter_state_change(
  p_table    text,
  p_id       uuid,
  p_user_id  uuid,
  p_old      text,
  p_new      text,
  p_note     text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  _msg_id uuid;
BEGIN
  INSERT INTO public.chatter_message
    (record_table, record_id, author_id, message_type, body, old_state, new_state)
  VALUES
    (p_table, p_id, p_user_id, 'state_change',
     COALESCE(p_note, format('Status changed from "%s" to "%s"', p_old, p_new)),
     p_old, p_new)
  RETURNING id INTO _msg_id;

  RETURN _msg_id;
END;
$$;


-- ===========================================================================
-- END OF PHASE 1 MIGRATION
-- Next: Phase 1 Part 2 — Layout Refactoring (App Switcher, Top Navbar, Sidebar)
-- ===========================================================================
