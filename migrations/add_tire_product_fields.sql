-- ============================================================
-- Migration: add_tire_product_fields
-- Adds tire_pattern (text) and ply_rating (smallint) to
-- inventory_item, and refreshes the v_inventory_items view
-- to expose them.
-- ============================================================

ALTER TABLE public.inventory_item
  ADD COLUMN IF NOT EXISTS tire_pattern  text,
  ADD COLUMN IF NOT EXISTS ply_rating    smallint;

-- Rebuild the view (CREATE OR REPLACE cannot rename columns, so drop-and-recreate)
DROP VIEW IF EXISTS public.v_inventory_items;
CREATE VIEW public.v_inventory_items AS
SELECT
  i.item_id,
  i.branch_id,
  i.supplier_id,
  i.name,
  i.category,
  i.vehicle_type,
  i.stock_quantity,
  i.cost_price,
  i.sale_price,
  i.reorder_level,
  i.sku,
  i.barcode,
  i.internal_ref,
  i.uom,
  i.weight_kg,
  -- Tire-specific fields
  i.brand_id,
  i.size_id,
  i.tire_pattern,
  i.ply_rating,
  tb.name                                  AS brand_name,
  ts.label                                 AS size_label,
  -- Computed stock from ledger
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
