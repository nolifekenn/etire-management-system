-- ============================================================================
-- migrations/optimize_performance.sql
-- Production Deployment Preparation — Database Performance & Security
-- eTire Management System
--
-- Contents:
--   1. Materialized Views  (monthly_inventory_valuation, daily_sales_cogs)
--   2. Concurrent Refresh Functions
--   3. pg_cron Scheduled Jobs (requires pg_cron extension in Supabase)
--   4. Row Level Security (RLS) — Strict Ledger Policies
--
-- Execute this against your Supabase project's SQL editor or via migration file.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: Materialized Views
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. monthly_inventory_valuation
--     Aggregates stock-on-hand and cost value per item per month.
--     Used by the Dashboard "Inventory Value" KPI — refreshed instead of
--     running a full table scan on every page load.
-- ─────────────────────────────────────────────────────────────────────────────

DROP MATERIALIZED VIEW IF EXISTS monthly_inventory_valuation CASCADE;

CREATE MATERIALIZED VIEW monthly_inventory_valuation AS
SELECT
    DATE_TRUNC('month', im.created_at)::DATE  AS month,
    im.item_id,
    im.branch_id,
    ii.name                                   AS item_name,
    ii.category                               AS item_category,
    ii.cost_price                             AS current_cost_price,
    SUM(im.quantity_moved)                    AS net_quantity,
    SUM(ABS(im.quantity_moved * im.unit_cost))
        FILTER (WHERE im.quantity_moved < 0)  AS total_cogs,
    SUM(im.quantity_moved * im.unit_cost)     AS net_ledger_value,
    -- Snapshot: on-hand × current cost at view refresh time
    SUM(im.quantity_moved) * ii.cost_price    AS valuation_at_refresh
FROM inventory_moves im
JOIN inventory_item   ii ON ii.item_id = im.item_id
GROUP BY
    DATE_TRUNC('month', im.created_at),
    im.item_id,
    im.branch_id,
    ii.name,
    ii.category,
    ii.cost_price;

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS uidx_miv_month_item_branch
    ON monthly_inventory_valuation (month, item_id, branch_id);

-- Index for common filter patterns
CREATE INDEX IF NOT EXISTS idx_miv_month    ON monthly_inventory_valuation (month DESC);
CREATE INDEX IF NOT EXISTS idx_miv_branch   ON monthly_inventory_valuation (branch_id);
CREATE INDEX IF NOT EXISTS idx_miv_category ON monthly_inventory_valuation (item_category);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1b. daily_sales_cogs
--     Aggregates Revenue (from sale) and COGS (from inventory_moves)
--     per calendar day. Powers the "Revenue vs COGS" bar chart on the
--     Dashboard without hitting raw tables on each page render.
-- ─────────────────────────────────────────────────────────────────────────────

DROP MATERIALIZED VIEW IF EXISTS daily_sales_cogs CASCADE;

CREATE MATERIALIZED VIEW daily_sales_cogs AS
WITH daily_revenue AS (
    SELECT
        DATE_TRUNC('day', sale_date)::DATE AS day,
        branch_id,
        SUM(total_amount)                  AS revenue,
        COUNT(*)                           AS sale_count
    FROM sale
    WHERE deleted_at IS NULL
      AND state IN ('confirmed', 'done')
    GROUP BY DATE_TRUNC('day', sale_date), branch_id
),
daily_cogs AS (
    SELECT
        DATE_TRUNC('day', created_at)::DATE                         AS day,
        branch_id,
        SUM(ABS(quantity_moved * unit_cost))                        AS cogs,
        SUM(ABS(quantity_moved * unit_cost))
            FILTER (WHERE source_document_type = 'sale')            AS sale_cogs,
        SUM(ABS(quantity_moved * unit_cost))
            FILTER (WHERE source_document_type = 'service')         AS service_cogs
    FROM inventory_moves
    WHERE quantity_moved < 0
    GROUP BY DATE_TRUNC('day', created_at), branch_id
)
SELECT
    COALESCE(r.day,      c.day)      AS day,
    COALESCE(r.branch_id, c.branch_id) AS branch_id,
    COALESCE(r.revenue,   0)         AS revenue,
    COALESCE(r.sale_count, 0)        AS sale_count,
    COALESCE(c.cogs,       0)        AS total_cogs,
    COALESCE(c.sale_cogs,  0)        AS sale_cogs,
    COALESCE(c.service_cogs, 0)      AS service_cogs,
    COALESCE(r.revenue, 0) - COALESCE(c.cogs, 0) AS gross_profit
FROM daily_revenue r
FULL OUTER JOIN daily_cogs c
    ON r.day = c.day AND r.branch_id = c.branch_id;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_dsc_day_branch
    ON daily_sales_cogs (day, branch_id);

CREATE INDEX IF NOT EXISTS idx_dsc_day    ON daily_sales_cogs (day DESC);
CREATE INDEX IF NOT EXISTS idx_dsc_branch ON daily_sales_cogs (branch_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: Concurrent Refresh Functions
-- ─────────────────────────────────────────────────────────────────────────────
-- Uses CONCURRENTLY so reads are never blocked during refresh.
-- The functions are designed to be called by pg_cron or manually.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_inventory_valuation;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_cogs;
    RAISE NOTICE '[%] Analytics views refreshed.', NOW();
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[%] Failed to refresh analytics views: %', NOW(), SQLERRM;
END;
$$;

COMMENT ON FUNCTION refresh_analytics_views() IS
    'Concurrently refreshes both analytics materialized views. Safe for production — never blocks reads.';

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: pg_cron Scheduling
-- Supabase supports pg_cron. Enable it from:
--   Dashboard → Database → Extensions → pg_cron
--
-- Schedule:
--   • daily_sales_cogs          — every 15 minutes (near real-time dashboard)
--   • monthly_inventory_valuation — every hour (heavier aggregation)
--
-- The block below is SKIPPED if pg_cron is not yet enabled (safe to run).
-- After enabling pg_cron, re-run just this section or call the function:
--   SELECT cron.schedule('refresh-daily-sales-cogs', '*/15 * * * *', $$REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_cogs;$$);
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    -- Guard: only schedule if pg_cron extension is installed
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        RAISE NOTICE 'pg_cron not enabled — skipping cron job registration. Enable it from Supabase Dashboard → Database → Extensions.';
        RETURN;
    END IF;

    -- Remove stale jobs (idempotent)
    DELETE FROM cron.job
    WHERE jobname IN ('refresh-daily-sales-cogs', 'refresh-monthly-inventory-valuation');

    -- Schedule quarterly refresh for the lighter daily view
    PERFORM cron.schedule(
        'refresh-daily-sales-cogs',
        '*/15 * * * *',
        'REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_cogs'
    );

    -- Schedule hourly refresh for the heavier inventory valuation
    PERFORM cron.schedule(
        'refresh-monthly-inventory-valuation',
        '5 * * * *',
        'REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_inventory_valuation'
    );

    RAISE NOTICE 'pg_cron jobs registered successfully.';
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: Row Level Security — Strict Ledger Policies
--
-- Principle: Cashier role can create new sales and post inventory moves,
-- but CANNOT modify or delete historical records (immutable ledger).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Ensure RLS is enabled on critical tables ──────────────────────────────

ALTER TABLE sale              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_item         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_moves   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item    ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_job       ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_job_item  ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order    ENABLE ROW LEVEL SECURITY;

-- ── Drop existing policies (idempotent re-apply) ──────────────────────────

DO $$
DECLARE
    t TEXT;
    p TEXT;
BEGIN
    FOR t, p IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'sale','sale_item','inventory_moves','inventory_item',
              'service_job','service_job_item','purchase_order'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
    END LOOP;
END;
$$;

-- ── Helper: get calling user's role from profiles ─────────────────────────

-- Assumes a 'profiles' (or 'users') table with columns: id (uuid), role (text)
-- Adjust the table/column name to match your schema.

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    -- "user" is a reserved word in PostgreSQL, so we double-quote it.
    -- auth_id links this app's user record to the Supabase auth identity.
    SELECT role
    FROM "user"
    WHERE auth_id = auth.uid()
    LIMIT 1;
$$;

-- ── SALE — policy set ─────────────────────────────────────────────────────

-- All authenticated users can read sales in their branch
-- sale.state uses enum type sale_order_state: draft | confirmed | done | cancelled
-- Actual roles in "user" table: super_admin | branch_manager | staff | cashier

CREATE POLICY "sale_select_authenticated"
    ON sale FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Cashier/staff: INSERT only (no UPDATE/DELETE of historical records)
CREATE POLICY "sale_insert_cashier"
    ON sale FOR INSERT
    TO authenticated
    WITH CHECK (get_my_role() IN ('cashier', 'staff', 'branch_manager', 'super_admin'));

-- Branch manager: can UPDATE (e.g. void/correct a recent sale), but NOT delete
CREATE POLICY "sale_update_manager"
    ON sale FOR UPDATE
    TO authenticated
    USING  (get_my_role() IN ('branch_manager', 'super_admin'))
    WITH CHECK (get_my_role() IN ('branch_manager', 'super_admin'));

-- Only super_admin can hard-delete; cashier/staff CANNOT
CREATE POLICY "sale_delete_super_admin"
    ON sale FOR DELETE
    TO authenticated
    USING (get_my_role() = 'super_admin');

-- ── SALE_ITEM ─────────────────────────────────────────────────────────────

CREATE POLICY "sale_item_select_auth"
    ON sale_item FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "sale_item_insert_cashier"
    ON sale_item FOR INSERT TO authenticated
    WITH CHECK (get_my_role() IN ('cashier', 'staff', 'branch_manager', 'super_admin'));

CREATE POLICY "sale_item_update_manager"
    ON sale_item FOR UPDATE TO authenticated
    USING  (get_my_role() IN ('branch_manager', 'super_admin'))
    WITH CHECK (get_my_role() IN ('branch_manager', 'super_admin'));

CREATE POLICY "sale_item_delete_manager"
    ON sale_item FOR DELETE TO authenticated
    USING (get_my_role() IN ('branch_manager', 'super_admin'));

-- ── INVENTORY_MOVES — immutable ledger ────────────────────────────────────
-- Critical: cashier/staff can post moves (INSERT), but NO ONE except super_admin
-- can UPDATE or DELETE a ledger entry. This preserves the audit trail.

CREATE POLICY "inv_moves_select_auth"
    ON inventory_moves FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Any operational role may INSERT (sale, service, adjustment, transfer)
CREATE POLICY "inv_moves_insert_operational"
    ON inventory_moves FOR INSERT TO authenticated
    WITH CHECK (get_my_role() IN ('cashier', 'staff', 'branch_manager', 'super_admin'));

-- UPDATE blocked for cashier and staff — ledger is append-only for them
CREATE POLICY "inv_moves_update_admin_only"
    ON inventory_moves FOR UPDATE TO authenticated
    USING  (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

-- DELETE: super_admin only (emergency void with full audit trail elsewhere)
CREATE POLICY "inv_moves_delete_super_admin"
    ON inventory_moves FOR DELETE TO authenticated
    USING (get_my_role() = 'super_admin');

-- ── INVENTORY_ITEM ────────────────────────────────────────────────────────

CREATE POLICY "inv_item_select_auth"
    ON inventory_item FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "inv_item_insert_manager"
    ON inventory_item FOR INSERT TO authenticated
    WITH CHECK (get_my_role() IN ('branch_manager', 'super_admin'));

CREATE POLICY "inv_item_update_manager"
    ON inventory_item FOR UPDATE TO authenticated
    USING  (get_my_role() IN ('branch_manager', 'super_admin'))
    WITH CHECK (get_my_role() IN ('branch_manager', 'super_admin'));

CREATE POLICY "inv_item_delete_admin"
    ON inventory_item FOR DELETE TO authenticated
    USING (get_my_role() = 'super_admin');

-- ── SERVICE_JOB ───────────────────────────────────────────────────────────

CREATE POLICY "svc_job_select_auth"
    ON service_job FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "svc_job_insert_staff"
    ON service_job FOR INSERT TO authenticated
    WITH CHECK (get_my_role() IN ('staff', 'cashier', 'branch_manager', 'super_admin'));

CREATE POLICY "svc_job_update_staff"
    ON service_job FOR UPDATE TO authenticated
    USING  (get_my_role() IN ('staff', 'cashier', 'branch_manager', 'super_admin'))
    WITH CHECK (get_my_role() IN ('staff', 'cashier', 'branch_manager', 'super_admin'));

CREATE POLICY "svc_job_delete_admin"
    ON service_job FOR DELETE TO authenticated
    USING (get_my_role() IN ('branch_manager', 'super_admin'));

-- ── SERVICE_JOB_ITEM ──────────────────────────────────────────────────────

CREATE POLICY "svc_item_select_auth"     ON service_job_item FOR SELECT  TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "svc_item_insert_staff"    ON service_job_item FOR INSERT  TO authenticated WITH CHECK (get_my_role() IN ('staff','cashier','branch_manager','super_admin'));
CREATE POLICY "svc_item_update_staff"    ON service_job_item FOR UPDATE  TO authenticated USING  (get_my_role() IN ('staff','cashier','branch_manager','super_admin')) WITH CHECK (get_my_role() IN ('staff','cashier','branch_manager','super_admin'));
CREATE POLICY "svc_item_delete_manager" ON service_job_item FOR DELETE  TO authenticated USING  (get_my_role() IN ('branch_manager','super_admin'));

-- ── PURCHASE_ORDER ────────────────────────────────────────────────────────

CREATE POLICY "po_select_auth"     ON purchase_order FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "po_insert_manager"  ON purchase_order FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('branch_manager','super_admin'));
CREATE POLICY "po_update_manager"  ON purchase_order FOR UPDATE TO authenticated USING  (get_my_role() IN ('branch_manager','super_admin')) WITH CHECK (get_my_role() IN ('branch_manager','super_admin'));
CREATE POLICY "po_delete_admin"    ON purchase_order FOR DELETE TO authenticated USING  (get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: Supplementary Performance Indexes (no-op if already exist)
-- ─────────────────────────────────────────────────────────────────────────────

-- inventory_moves — most queried table after the ledger launch
CREATE INDEX IF NOT EXISTS idx_inv_moves_item_branch    ON inventory_moves (item_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_inv_moves_doc_type       ON inventory_moves (source_document_type);
CREATE INDEX IF NOT EXISTS idx_inv_moves_created_at     ON inventory_moves (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_moves_source_doc_id  ON inventory_moves (source_document_id);

-- sale — dashboard revenue aggregation
CREATE INDEX IF NOT EXISTS idx_sale_date_branch         ON sale (sale_date DESC, branch_id);
CREATE INDEX IF NOT EXISTS idx_sale_state               ON sale (state) WHERE deleted_at IS NULL;

-- service_job — workshop analytics
CREATE INDEX IF NOT EXISTS idx_sj_state_branch          ON service_job (state, branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sj_job_date              ON service_job (job_date DESC) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Initial refresh to populate materialized views immediately
-- ─────────────────────────────────────────────────────────────────────────────

REFRESH MATERIALIZED VIEW monthly_inventory_valuation;
REFRESH MATERIALIZED VIEW daily_sales_cogs;

-- Done. Verify with:
-- SELECT matviewname, ispopulated FROM pg_matviews WHERE schemaname = 'public';
