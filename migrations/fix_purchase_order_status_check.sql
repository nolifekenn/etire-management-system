-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: purchase_order.status CHECK constraint only allows old legacy values
-- (pending, approved, ordered, delivered, cancelled) but the app inserts 'draft'.
--
-- Solution: Drop the old check constraint and add a new one that accepts both
-- legacy AND new Odoo-style values so existing rows and new rows both pass.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.purchase_order
  DROP CONSTRAINT IF EXISTS purchase_order_status_check;

ALTER TABLE public.purchase_order
  ADD CONSTRAINT purchase_order_status_check
    CHECK (status IN (
      -- New Odoo-style values (used by the app)
      'draft', 'sent', 'purchase', 'locked', 'cancelled',
      -- Legacy values (keep so existing rows remain valid)
      'pending', 'approved', 'ordered', 'delivered'
    ));
