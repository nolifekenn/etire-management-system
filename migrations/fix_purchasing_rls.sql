-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: purchase_order and purchase_order_item have RLS enabled but no INSERT/
-- UPDATE/DELETE policies, blocking all authenticated users from creating or
-- editing purchase orders and their line items.
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure RLS is enabled on both tables
ALTER TABLE public.purchase_order      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_item ENABLE ROW LEVEL SECURITY;

-- ── purchase_order policies ──────────────────────────────────────────────────

-- Drop old policies if they exist (so this is idempotent)
DROP POLICY IF EXISTS "po_select"        ON public.purchase_order;
DROP POLICY IF EXISTS "po_insert"        ON public.purchase_order;
DROP POLICY IF EXISTS "po_update"        ON public.purchase_order;
DROP POLICY IF EXISTS "po_delete"        ON public.purchase_order;

-- All authenticated users can read purchase orders
CREATE POLICY "po_select" ON public.purchase_order
  FOR SELECT TO authenticated
  USING (true);

-- Staff and above can create purchase orders
CREATE POLICY "po_insert" ON public.purchase_order
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff')
  );

-- Managers and above can update (state transitions, etc.)
CREATE POLICY "po_update" ON public.purchase_order
  FOR UPDATE TO authenticated
  USING (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff')
  );

-- Only super_admin can (soft-)delete
CREATE POLICY "po_delete" ON public.purchase_order
  FOR DELETE TO authenticated
  USING (
    public.get_current_user_role() = 'super_admin'
  );

-- ── purchase_order_item policies ─────────────────────────────────────────────

DROP POLICY IF EXISTS "po_item_select" ON public.purchase_order_item;
DROP POLICY IF EXISTS "po_item_insert" ON public.purchase_order_item;
DROP POLICY IF EXISTS "po_item_update" ON public.purchase_order_item;
DROP POLICY IF EXISTS "po_item_delete" ON public.purchase_order_item;

-- All authenticated users can read purchase order line items
CREATE POLICY "po_item_select" ON public.purchase_order_item
  FOR SELECT TO authenticated
  USING (true);

-- Staff and above can insert line items
CREATE POLICY "po_item_insert" ON public.purchase_order_item
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff')
  );

-- Staff and above can update line items
CREATE POLICY "po_item_update" ON public.purchase_order_item
  FOR UPDATE TO authenticated
  USING (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff')
  );

-- Only super_admin can delete line items
CREATE POLICY "po_item_delete" ON public.purchase_order_item
  FOR DELETE TO authenticated
  USING (
    public.get_current_user_role() = 'super_admin'
  );

-- ── delivery table policies ───────────────────────────────────────────────────
-- Delivery records are created when a PO transitions to 'purchase' state.
-- Ensure authenticated users can insert/update deliveries.

ALTER TABLE public.delivery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_select" ON public.delivery;
DROP POLICY IF EXISTS "delivery_insert" ON public.delivery;
DROP POLICY IF EXISTS "delivery_update" ON public.delivery;

CREATE POLICY "delivery_select" ON public.delivery
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "delivery_insert" ON public.delivery
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff')
  );

CREATE POLICY "delivery_update" ON public.delivery
  FOR UPDATE TO authenticated
  USING (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff')
  );

-- ── delivery_item table policies ──────────────────────────────────────────────

ALTER TABLE public.delivery_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_item_select" ON public.delivery_item;
DROP POLICY IF EXISTS "delivery_item_insert" ON public.delivery_item;
DROP POLICY IF EXISTS "delivery_item_update" ON public.delivery_item;

CREATE POLICY "delivery_item_select" ON public.delivery_item
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "delivery_item_insert" ON public.delivery_item
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff')
  );

CREATE POLICY "delivery_item_update" ON public.delivery_item
  FOR UPDATE TO authenticated
  USING (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff')
  );

-- ── inventory_moves table policies ───────────────────────────────────────────
-- inventory_moves is the stock ledger — inserts on receipt/sale/service/adjustment.

ALTER TABLE public.inventory_moves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_moves_select" ON public.inventory_moves;
DROP POLICY IF EXISTS "inventory_moves_insert" ON public.inventory_moves;

CREATE POLICY "inventory_moves_select" ON public.inventory_moves
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "inventory_moves_insert" ON public.inventory_moves
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('super_admin', 'branch_manager', 'staff', 'cashier')
  );
