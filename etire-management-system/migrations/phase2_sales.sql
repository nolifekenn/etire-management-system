-- ===========================================================================
-- PHASE 2: SALES & INVENTORY ADJUSTMENT MIGRATION
-- Extends the sale table with Odoo-style status lifecycle,
-- adds inventory_adjustment ledger tables, and POS sequence numbering.
--
-- Run AFTER phase1_foundation.sql and phase1_corrective.sql.
-- ===========================================================================


-- ===========================================================================
-- 1. SALE TABLE — add status & lifecycle columns
-- ===========================================================================

ALTER TABLE public.sale
  ADD COLUMN IF NOT EXISTS status          text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('draft','confirmed','done','cancelled')),
  ADD COLUMN IF NOT EXISTS notes           text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount      numeric NOT NULL DEFAULT 0;

-- Ensure sale_number exists (guard against running without phase1_foundation first)
ALTER TABLE public.sale
  ADD COLUMN IF NOT EXISTS sale_number text UNIQUE;

-- POS-specific sequence (POS-YYYY-XXXX) — separate from SO-YYYY-XXXX
INSERT INTO public.ir_sequence (name, code, prefix, padding, number_next)
VALUES ('Point of Sale', 'pos.order', 'POS-', 4, 1)
ON CONFLICT (code) DO NOTHING;


-- ===========================================================================
-- 2. INVENTORY ADJUSTMENT TABLES (referenced by inventory server actions)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.inventory_adjustment (
  adjustment_id  uuid         NOT NULL DEFAULT gen_random_uuid(),
  branch_id      uuid         NOT NULL,
  user_id        uuid         NOT NULL,
  reason         text         NOT NULL
    CHECK (reason IN ('cycle_count','scrap','correction','other')),
  note           text,
  created_at     timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT inventory_adjustment_pkey      PRIMARY KEY (adjustment_id),
  CONSTRAINT inventory_adjustment_branch_fk FOREIGN KEY (branch_id)  REFERENCES public.branch(branch_id),
  CONSTRAINT inventory_adjustment_user_fk   FOREIGN KEY (user_id)    REFERENCES public.user(user_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_adjustment_line (
  adj_line_id     uuid    NOT NULL DEFAULT gen_random_uuid(),
  adjustment_id   uuid    NOT NULL,
  item_id         uuid    NOT NULL,
  quantity_before integer NOT NULL DEFAULT 0,
  quantity_after  integer NOT NULL DEFAULT 0,
  delta           integer GENERATED ALWAYS AS (quantity_after - quantity_before) STORED,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inventory_adj_line_pkey    PRIMARY KEY (adj_line_id),
  CONSTRAINT inventory_adj_line_adj_fk  FOREIGN KEY (adjustment_id) REFERENCES public.inventory_adjustment(adjustment_id) ON DELETE CASCADE,
  CONSTRAINT inventory_adj_line_item_fk FOREIGN KEY (item_id)       REFERENCES public.inventory_item(item_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_adj_branch
  ON public.inventory_adjustment (branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inv_adj_line_item
  ON public.inventory_adjustment_line (item_id, created_at DESC);


-- ===========================================================================
-- 3. RLS for new tables
-- ===========================================================================

ALTER TABLE public.inventory_adjustment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustment_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_adj_select" ON public.inventory_adjustment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "inv_adj_insert" ON public.inventory_adjustment
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.user WHERE auth_id = (auth.jwt()->>'sub')::uuid LIMIT 1)
    IN ('super_admin','branch_manager','staff')
  );

CREATE POLICY "inv_adj_line_select" ON public.inventory_adjustment_line
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "inv_adj_line_insert" ON public.inventory_adjustment_line
  FOR INSERT TO authenticated WITH CHECK (true);


-- ===========================================================================
-- 4. Helper: fn_confirm_sale
--    Called by server action to atomically:
--      a) update sale.status to 'confirmed'
--      b) insert one inventory_moves row per sale_item (negative qty = outbound)
--      c) update inventory_item.stock_quantity
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.fn_confirm_sale(
  p_sale_id   uuid,
  p_user_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale        record;
  v_line        record;
  v_result      jsonb;
BEGIN

  -- Fetch sale with branch
  SELECT * INTO v_sale FROM public.sale WHERE sale_id = p_sale_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sale not found');
  END IF;

  IF v_sale.status NOT IN ('draft', 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sale cannot be confirmed in its current state: ' || v_sale.status);
  END IF;

  -- Process each sale_item
  FOR v_line IN
    SELECT si.item_id, si.quantity, si.price_at_sale,
           ii.cost_price
    FROM   public.sale_item si
    JOIN   public.inventory_item ii ON ii.item_id = si.item_id
    WHERE  si.sale_id = p_sale_id
      AND  si.item_id IS NOT NULL
  LOOP

    -- Deduct stock
    UPDATE public.inventory_item
    SET    stock_quantity = GREATEST(0, stock_quantity - v_line.quantity),
           updated_at     = now()
    WHERE  item_id = v_line.item_id;

    -- Write outbound move to ledger
    INSERT INTO public.inventory_moves
      (item_id, branch_id, source_document_type, source_document_id,
       quantity_moved, unit_cost, created_by)
    VALUES
      (v_line.item_id, v_sale.branch_id, 'sale', p_sale_id,
       -v_line.quantity,
       v_line.cost_price,
       p_user_id);

  END LOOP;

  -- Mark sale as done
  UPDATE public.sale
  SET    status = 'done', updated_at = now()
  WHERE  sale_id = p_sale_id;

  RETURN jsonb_build_object('success', true, 'sale_id', p_sale_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
