-- ===========================================================================
-- Migration: fix_security_advisor
-- Resolves all Supabase Security Advisor ERRORs:
--
--   1. security_definer_view  — 9 views flagged as SECURITY DEFINER
--   2. rls_disabled_in_public — 6 tables without RLS enabled
--   3. sensitive_columns_exposed — audit_log.session_id (resolved by RLS)
--
-- Prerequisites:
--   • optimize_performance.sql must have been run first (defines get_my_role())
--   • PostgreSQL 15+ (Supabase default) for ALTER VIEW SET (security_invoker)
-- ===========================================================================


-- ===========================================================================
-- SECTION 1: Fix Security Definer Views
-- ---------------------------------------------------------------------------
-- By default, PostgreSQL views run with the creator's permissions (effectively
-- SECURITY DEFINER), which bypasses RLS on the underlying tables for any
-- querying user.  The fix is security_invoker = true, which makes the view
-- execute with the caller's permissions, so the caller's RLS policies apply.
--
-- Uses ALTER VIEW ... SET (security_invoker = true) so existing view bodies
-- are preserved exactly.
-- ===========================================================================

-- Views defined in phase1_foundation.sql / add_tire_product_fields.sql
ALTER VIEW public.v_stock_qty           SET (security_invoker = true);
ALTER VIEW public.v_inventory_items     SET (security_invoker = true);
ALTER VIEW public.v_customer_stats      SET (security_invoker = true);
ALTER VIEW public.v_supplier_stats      SET (security_invoker = true);

-- View defined in phase1_corrective.sql
ALTER VIEW public.v_stock_on_hand       SET (security_invoker = true);

-- Views defined in database_forecasting.sql
ALTER VIEW public.view_item_sales_velocity  SET (security_invoker = true);
ALTER VIEW public.view_stock_forecast       SET (security_invoker = true);

-- Views created directly in Supabase (not tracked in local migrations)
ALTER VIEW public.view_branch_inventory     SET (security_invoker = true);
ALTER VIEW public.sale_item_with_catalog    SET (security_invoker = true);


-- ===========================================================================
-- SECTION 2: Enable RLS on Public Tables
-- ---------------------------------------------------------------------------
-- All tables in a schema exposed to PostgREST (default: public) must have
-- RLS enabled to prevent unauthorised API access.
--
-- Policies follow the same role hierarchy used across the codebase:
--   super_admin → branch_manager → staff → cashier
--
-- get_my_role() is defined in optimize_performance.sql (SECURITY DEFINER,
-- reads role from public."user" where auth_id = auth.uid()).
-- ===========================================================================

-- ── 2a. catalog_item ─────────────────────────────────────────────────────
-- Product/service catalogue.  All authenticated users need read access for
-- POS and purchasing lookups.  Writes restricted to managers.

ALTER TABLE public.catalog_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalog_item_select_auth"    ON public.catalog_item;
DROP POLICY IF EXISTS "catalog_item_insert_manager" ON public.catalog_item;
DROP POLICY IF EXISTS "catalog_item_update_manager" ON public.catalog_item;
DROP POLICY IF EXISTS "catalog_item_delete_admin"   ON public.catalog_item;

CREATE POLICY "catalog_item_select_auth"
    ON public.catalog_item FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "catalog_item_insert_manager"
    ON public.catalog_item FOR INSERT
    TO authenticated
    WITH CHECK (get_my_role() IN ('branch_manager', 'super_admin'));

CREATE POLICY "catalog_item_update_manager"
    ON public.catalog_item FOR UPDATE
    TO authenticated
    USING  (get_my_role() IN ('branch_manager', 'super_admin'))
    WITH CHECK (get_my_role() IN ('branch_manager', 'super_admin'));

CREATE POLICY "catalog_item_delete_admin"
    ON public.catalog_item FOR DELETE
    TO authenticated
    USING  (get_my_role() = 'super_admin');


-- ── 2b. vehicle_type ─────────────────────────────────────────────────────
-- Reference / lookup table (car, motor, truck).  Read-only for all staff;
-- only super_admin may modify reference data.

ALTER TABLE public.vehicle_type ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_type_select_auth"  ON public.vehicle_type;
DROP POLICY IF EXISTS "vehicle_type_insert_admin" ON public.vehicle_type;
DROP POLICY IF EXISTS "vehicle_type_update_admin" ON public.vehicle_type;
DROP POLICY IF EXISTS "vehicle_type_delete_admin" ON public.vehicle_type;

CREATE POLICY "vehicle_type_select_auth"
    ON public.vehicle_type FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "vehicle_type_insert_admin"
    ON public.vehicle_type FOR INSERT
    TO authenticated
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "vehicle_type_update_admin"
    ON public.vehicle_type FOR UPDATE
    TO authenticated
    USING  (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "vehicle_type_delete_admin"
    ON public.vehicle_type FOR DELETE
    TO authenticated
    USING  (get_my_role() = 'super_admin');


-- ── 2c. vehicle ───────────────────────────────────────────────────────────
-- Customer-owned vehicles.  Any authenticated user can read (needed for
-- service job creation).  Staff and above can create/update; managers delete.

ALTER TABLE public.vehicle ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_select_auth"    ON public.vehicle;
DROP POLICY IF EXISTS "vehicle_insert_staff"   ON public.vehicle;
DROP POLICY IF EXISTS "vehicle_update_staff"   ON public.vehicle;
DROP POLICY IF EXISTS "vehicle_delete_manager" ON public.vehicle;

CREATE POLICY "vehicle_select_auth"
    ON public.vehicle FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "vehicle_insert_staff"
    ON public.vehicle FOR INSERT
    TO authenticated
    WITH CHECK (get_my_role() IN ('staff', 'cashier', 'branch_manager', 'super_admin'));

CREATE POLICY "vehicle_update_staff"
    ON public.vehicle FOR UPDATE
    TO authenticated
    USING  (get_my_role() IN ('staff', 'cashier', 'branch_manager', 'super_admin'))
    WITH CHECK (get_my_role() IN ('staff', 'cashier', 'branch_manager', 'super_admin'));

CREATE POLICY "vehicle_delete_manager"
    ON public.vehicle FOR DELETE
    TO authenticated
    USING  (get_my_role() IN ('branch_manager', 'super_admin'));


-- ── 2d. supplier ──────────────────────────────────────────────────────────
-- Supplier master data.  All authenticated users can read (referenced in PO
-- and inventory screens).  Managers create/edit; super_admin deletes.

ALTER TABLE public.supplier ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_select_auth"    ON public.supplier;
DROP POLICY IF EXISTS "supplier_insert_manager" ON public.supplier;
DROP POLICY IF EXISTS "supplier_update_manager" ON public.supplier;
DROP POLICY IF EXISTS "supplier_delete_admin"   ON public.supplier;

CREATE POLICY "supplier_select_auth"
    ON public.supplier FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "supplier_insert_manager"
    ON public.supplier FOR INSERT
    TO authenticated
    WITH CHECK (get_my_role() IN ('branch_manager', 'super_admin'));

CREATE POLICY "supplier_update_manager"
    ON public.supplier FOR UPDATE
    TO authenticated
    USING  (get_my_role() IN ('branch_manager', 'super_admin'))
    WITH CHECK (get_my_role() IN ('branch_manager', 'super_admin'));

CREATE POLICY "supplier_delete_admin"
    ON public.supplier FOR DELETE
    TO authenticated
    USING  (get_my_role() = 'super_admin');


-- ── 2e. audit_log ─────────────────────────────────────────────────────────
-- Immutable security audit trail.  Contains sensitive columns (session_id,
-- ip_address, user_agent).  Only branch_manager and super_admin may read;
-- all authenticated users may insert new entries; NO UPDATE or DELETE allowed.
-- Enabling RLS here also resolves the sensitive_columns_exposed error.

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select_manager" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert_auth"    ON public.audit_log;

CREATE POLICY "audit_log_select_manager"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (get_my_role() IN ('branch_manager', 'super_admin'));

-- INSERT is permitted for all authenticated roles so the app can log actions.
-- The server never exposes an UPDATE or DELETE on this table.
CREATE POLICY "audit_log_insert_auth"
    ON public.audit_log FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);


-- ── 2f. notification ──────────────────────────────────────────────────────
-- Per-user in-app notifications.  Users may only see and manage their own
-- rows; the Supabase service-role client (used for delivery) bypasses RLS
-- automatically and is unaffected by these policies.

ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_select_own"  ON public.notification;
DROP POLICY IF EXISTS "notification_insert_auth" ON public.notification;
DROP POLICY IF EXISTS "notification_update_own"  ON public.notification;
DROP POLICY IF EXISTS "notification_delete_own"  ON public.notification;

CREATE POLICY "notification_select_own"
    ON public.notification FOR SELECT
    TO authenticated
    USING (
        user_id = (
            SELECT user_id FROM public."user"
            WHERE auth_id = auth.uid()
            LIMIT 1
        )
    );

CREATE POLICY "notification_insert_auth"
    ON public.notification FOR INSERT
    TO authenticated
    WITH CHECK (true);   -- service role and triggers insert freely; anon blocked by TO authenticated

CREATE POLICY "notification_update_own"
    ON public.notification FOR UPDATE
    TO authenticated
    USING (
        user_id = (
            SELECT user_id FROM public."user"
            WHERE auth_id = auth.uid()
            LIMIT 1
        )
    )
    WITH CHECK (
        user_id = (
            SELECT user_id FROM public."user"
            WHERE auth_id = auth.uid()
            LIMIT 1
        )
    );

CREATE POLICY "notification_delete_own"
    ON public.notification FOR DELETE
    TO authenticated
    USING (
        get_my_role() = 'super_admin'
        OR user_id = (
            SELECT user_id FROM public."user"
            WHERE auth_id = auth.uid()
            LIMIT 1
        )
    );


-- ===========================================================================
-- VERIFICATION
-- ===========================================================================
DO $$
DECLARE
    v_view   text;
    v_table  text;
    v_invoker bool;
    v_rls    bool;
BEGIN
    -- Check views are now security_invoker
    -- reloptions is a text[] on pg_class; check for 'security_invoker=true' element.
    FOR v_view, v_invoker IN
        SELECT relname,
               (reloptions @> ARRAY['security_invoker=true'])
        FROM   pg_class
        WHERE  relnamespace = 'public'::regnamespace
          AND  relkind = 'v'
          AND  relname IN (
                   'v_stock_qty','v_inventory_items','v_customer_stats',
                   'v_supplier_stats','v_stock_on_hand',
                   'view_item_sales_velocity','view_stock_forecast',
                   'view_branch_inventory','sale_item_with_catalog'
               )
    LOOP
        IF v_invoker THEN
            RAISE NOTICE 'VIEW % : security_invoker = true  ✓', v_view;
        ELSE
            RAISE WARNING 'VIEW % : security_invoker NOT set (check PostgreSQL version)', v_view;
        END IF;
    END LOOP;

    -- Check RLS is enabled on target tables
    FOR v_table, v_rls IN
        SELECT relname, relrowsecurity
        FROM   pg_class
        WHERE  relnamespace = 'public'::regnamespace
          AND  relkind = 'r'
          AND  relname IN ('catalog_item','vehicle_type','vehicle',
                           'supplier','audit_log','notification')
    LOOP
        IF v_rls THEN
            RAISE NOTICE 'TABLE % : RLS enabled  ✓', v_table;
        ELSE
            RAISE WARNING 'TABLE % : RLS still disabled', v_table;
        END IF;
    END LOOP;
END;
$$;
