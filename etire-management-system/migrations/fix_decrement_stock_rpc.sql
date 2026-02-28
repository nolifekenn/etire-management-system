-- ─────────────────────────────────────────────────────────────────────────────
-- Create decrement_stock RPC used by writeOutboundMoves in sales.ts
-- Safely decrements stock_quantity, never going below 0.
-- SECURITY DEFINER so it works regardless of RLS on inventory_item.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.decrement_stock(
  item_id_param  uuid,
  quantity_param integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inventory_item
  SET
    stock_quantity = GREATEST(0, stock_quantity - quantity_param),
    updated_at     = now()
  WHERE item_id = item_id_param;
END;
$$;
