-- ===========================================================================
-- ENFORCE FULL SOFT-DELETE BEHAVIOR (transactional records)
--
-- Goal:
--   1) Ensure line tables can be soft-deleted (deleted_at column)
--   2) Remove DELETE policies for core transactional tables so app paths use
--      UPDATE ... SET deleted_at = now() instead of physical deletes
--
-- Safe to run multiple times.
-- ===========================================================================

-- 1) Add missing soft-delete columns
ALTER TABLE public.sale_item
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.service_job_item
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2) Helpful indexes for active-line lookups
CREATE INDEX IF NOT EXISTS idx_sale_item_sale_active
  ON public.sale_item (sale_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_job_item_job_active
  ON public.service_job_item (job_id)
  WHERE deleted_at IS NULL;

-- 3) Disable hard-delete policies on transactional tables
DROP POLICY IF EXISTS sale_delete_super_admin ON public.sale;
DROP POLICY IF EXISTS sale_item_delete_manager ON public.sale_item;
DROP POLICY IF EXISTS svc_job_delete_admin ON public.service_job;
DROP POLICY IF EXISTS svc_item_delete_manager ON public.service_job_item;
DROP POLICY IF EXISTS po_delete_admin ON public.purchase_order;
DROP POLICY IF EXISTS po_item_delete ON public.purchase_order_item;

-- Legacy/alternate policy names from older migrations
DROP POLICY IF EXISTS po_delete ON public.purchase_order;
DROP POLICY IF EXISTS po_item_delete_manager ON public.purchase_order_item;
