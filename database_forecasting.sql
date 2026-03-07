-- =============================================================
-- DEMAND-BASED STOCK CRITICALITY FORECASTING
-- =============================================================
-- This script creates:
--   1. view_item_sales_velocity   – calculates sales velocity per item
--   2. view_stock_forecast        – enriches inventory with forecast data
--   3. fn_get_dynamic_reorder_level() – suggest reorder level from demand
-- =============================================================

-- -------------------------------------------------------------
-- STEP 1: Sales Velocity View
-- Aggregates units sold per item over the last 30 and 90 days,
-- computes average daily demand, and tracks how many days have
-- actual sales activity (to avoid over-inflating velocity for
-- items sold infrequently).
-- -------------------------------------------------------------
CREATE OR REPLACE VIEW public.view_item_sales_velocity AS
WITH date_bounds AS (
  SELECT
    CURRENT_DATE                          AS today,
    CURRENT_DATE - INTERVAL '30 days'    AS start_30,
    CURRENT_DATE - INTERVAL '90 days'    AS start_90
),
sales_30 AS (
  SELECT
    si.item_id,
    SUM(si.quantity)                                   AS units_sold_30d,
    COUNT(DISTINCT DATE(s.sale_date))                  AS sale_days_30d
  FROM public.sale_item  si
  JOIN public.sale        s  ON s.sale_id = si.sale_id
  CROSS JOIN date_bounds  db
  WHERE s.deleted_at IS NULL
    AND s.sale_date  >= db.start_30
    AND si.item_id   IS NOT NULL
  GROUP BY si.item_id
),
sales_90 AS (
  SELECT
    si.item_id,
    SUM(si.quantity)                                   AS units_sold_90d,
    COUNT(DISTINCT DATE(s.sale_date))                  AS sale_days_90d
  FROM public.sale_item  si
  JOIN public.sale        s  ON s.sale_id = si.sale_id
  CROSS JOIN date_bounds  db
  WHERE s.deleted_at IS NULL
    AND s.sale_date  >= db.start_90
    AND si.item_id   IS NOT NULL
  GROUP BY si.item_id
)
SELECT
  inv.item_id,
  inv.name,
  inv.branch_id,
  inv.category,
  inv.vehicle_type,
  inv.stock_quantity,
  inv.reorder_level,

  -- 30-day window
  COALESCE(s30.units_sold_30d,  0)                                AS units_sold_30d,
  COALESCE(s30.sale_days_30d,   0)                                AS sale_days_30d,
  -- Daily demand based on 30-day window (use 30 as denominator, not just sale days,
  -- to reflect realistic average that accounts for non-sale days)
  ROUND(
    COALESCE(s30.units_sold_30d, 0)::numeric / 30, 4
  )                                                               AS avg_daily_demand_30d,

  -- 90-day window
  COALESCE(s90.units_sold_90d,  0)                               AS units_sold_90d,
  COALESCE(s90.sale_days_90d,   0)                               AS sale_days_90d,
  ROUND(
    COALESCE(s90.units_sold_90d, 0)::numeric / 90, 4
  )                                                               AS avg_daily_demand_90d,

  -- Blended demand: weight recent 30-day trend heavier (70%) than 90-day (30%)
  ROUND(
    (
      COALESCE(s30.units_sold_30d, 0)::numeric / 30 * 0.7
    + COALESCE(s90.units_sold_90d, 0)::numeric / 90 * 0.3
    ), 4
  )                                                               AS blended_daily_demand

FROM public.inventory_item inv
LEFT JOIN sales_30 s30 ON s30.item_id = inv.item_id
LEFT JOIN sales_90 s90 ON s90.item_id = inv.item_id
WHERE inv.deleted_at IS NULL;


-- -------------------------------------------------------------
-- STEP 2: Stock Forecast View
-- Adds days-of-stock-remaining, a suggested dynamic reorder
-- level, and a demand-aware criticality classification.
-- -------------------------------------------------------------
CREATE OR REPLACE VIEW public.view_stock_forecast AS
SELECT
  v.item_id,
  v.name,
  v.branch_id,
  v.category,
  v.vehicle_type,
  v.stock_quantity,
  v.reorder_level                                        AS current_reorder_level,

  v.units_sold_30d,
  v.units_sold_90d,
  v.avg_daily_demand_30d,
  v.avg_daily_demand_90d,
  v.blended_daily_demand,

  -- Days of stock remaining based on blended demand
  -- Guard against division-by-zero: if demand = 0, use 9999 (virtually infinite)
  CASE
    WHEN v.blended_daily_demand > 0
      THEN ROUND(v.stock_quantity::numeric / v.blended_daily_demand)
    ELSE 9999
  END                                                    AS days_of_stock_remaining,

  -- Suggested reorder level: demand × lead_time_days + safety_stock
  -- Default lead time = 7 days, safety stock = 3 days of demand
  -- Minimum suggested reorder is the current reorder_level (do not lower it)
  GREATEST(
    v.reorder_level,
    CEIL((v.blended_daily_demand * 7) + (v.blended_daily_demand * 3))::integer
  )                                                      AS suggested_reorder_level,

  -- Whether the current reorder_level is too low given demand
  CASE
    WHEN v.blended_daily_demand > 0
      AND v.reorder_level < CEIL(v.blended_daily_demand * 7)
    THEN TRUE
    ELSE FALSE
  END                                                    AS reorder_level_needs_update,

  -- ── CRITICALITY CLASSIFICATION ──────────────────────────────
  -- Based on days of stock remaining using blended demand:
  --   OUT_OF_STOCK : stock = 0
  --   CRITICAL     : stock > 0 but will run out within 3 days
  --   LOW          : will run out in 4–7 days
  --   MODERATE     : will run out in 8–14 days (watch list)
  --   HEALTHY      : 15+ days of stock
  --   NO_DEMAND    : no sales in last 90 days (slow mover)
  CASE
    WHEN v.stock_quantity = 0
      THEN 'OUT_OF_STOCK'
    WHEN v.blended_daily_demand = 0 AND v.units_sold_90d = 0
      THEN 'NO_DEMAND'
    WHEN v.blended_daily_demand > 0
      AND (v.stock_quantity::numeric / v.blended_daily_demand) <= 3
      THEN 'CRITICAL'
    WHEN v.blended_daily_demand > 0
      AND (v.stock_quantity::numeric / v.blended_daily_demand) <= 7
      THEN 'LOW'
    WHEN v.blended_daily_demand > 0
      AND (v.stock_quantity::numeric / v.blended_daily_demand) <= 14
      THEN 'MODERATE'
    ELSE 'HEALTHY'
  END                                                    AS criticality,

  -- Numeric priority for sorting (lower = more urgent)
  CASE
    WHEN v.stock_quantity = 0                                          THEN 0
    WHEN v.blended_daily_demand > 0
      AND (v.stock_quantity::numeric / v.blended_daily_demand) <= 3   THEN 1
    WHEN v.blended_daily_demand > 0
      AND (v.stock_quantity::numeric / v.blended_daily_demand) <= 7   THEN 2
    WHEN v.blended_daily_demand > 0
      AND (v.stock_quantity::numeric / v.blended_daily_demand) <= 14  THEN 3
    WHEN v.blended_daily_demand = 0 AND v.units_sold_90d = 0          THEN 4
    ELSE 5
  END                                                    AS criticality_priority

FROM public.view_item_sales_velocity v;


-- -------------------------------------------------------------
-- STEP 3: Helper function – get forecast for a specific branch
-- Usage:
--   SELECT * FROM fn_get_stock_forecast_for_branch('<branch_uuid>');
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_stock_forecast_for_branch(p_branch_id uuid)
RETURNS TABLE (
  item_id                  uuid,
  name                     text,
  category                 text,
  vehicle_type             text,
  stock_quantity           integer,
  current_reorder_level    integer,
  units_sold_30d           bigint,
  units_sold_90d           bigint,
  avg_daily_demand_30d     numeric,
  blended_daily_demand     numeric,
  days_of_stock_remaining  numeric,
  suggested_reorder_level  integer,
  reorder_level_needs_update boolean,
  criticality              text,
  criticality_priority     integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    item_id,
    name,
    category,
    vehicle_type,
    stock_quantity,
    current_reorder_level,
    units_sold_30d,
    units_sold_90d,
    avg_daily_demand_30d,
    blended_daily_demand,
    days_of_stock_remaining,
    suggested_reorder_level,
    reorder_level_needs_update,
    criticality,
    criticality_priority
  FROM public.view_stock_forecast
  WHERE branch_id = p_branch_id
  ORDER BY criticality_priority ASC, days_of_stock_remaining ASC NULLS LAST;
$$;


-- -------------------------------------------------------------
-- STEP 4: Quick reference query – top critical items system-wide
-- Run this to immediately see what needs restocking:
-- -------------------------------------------------------------
/*
SELECT
  sf.name,
  b.name                          AS branch,
  sf.stock_quantity,
  sf.days_of_stock_remaining,
  sf.blended_daily_demand,
  sf.units_sold_30d,
  sf.criticality,
  sf.suggested_reorder_level,
  sf.reorder_level_needs_update
FROM public.view_stock_forecast   sf
JOIN public.branch                b  ON b.branch_id = sf.branch_id
WHERE sf.criticality IN ('OUT_OF_STOCK', 'CRITICAL', 'LOW')
ORDER BY sf.criticality_priority ASC, sf.days_of_stock_remaining ASC;
*/


-- -------------------------------------------------------------
-- VERIFICATION: confirm objects were created
-- -------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'view_item_sales_velocity : %',
    (SELECT COUNT(*) FROM public.view_item_sales_velocity);
  RAISE NOTICE 'view_stock_forecast      : %',
    (SELECT COUNT(*) FROM public.view_stock_forecast);
  RAISE NOTICE 'Forecasting views and function created successfully.';
END;
$$;
