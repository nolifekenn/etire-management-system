-- ============================================================
-- Migration: Create tire_history view
-- Derived from service_job and service_job_item for reporting/backup.
-- ============================================================

CREATE OR REPLACE VIEW public.tire_history AS
SELECT
  'svc-' || sj.job_id::text                               AS history_id,
  sj.job_id                                               AS service_job_id,
  sj.vehicle_id,
  (ARRAY_AGG(sji.item_id ORDER BY sji.item_id) FILTER (
    WHERE LOWER(COALESCE(ci.category::text, '')) = 'tire'
  ))[1]                                                  AS item_id,
  CASE
    WHEN LOWER(COALESCE(sj.job_description, '')) LIKE '%rotat%' THEN 'rotation'
    WHEN LOWER(COALESCE(sj.job_description, '')) LIKE '%balanc%' THEN 'balancing'
    WHEN LOWER(COALESCE(sj.job_description, '')) LIKE '%replace%' THEN 'replacement'
    ELSE 'repair'
  END                                                     AS service_type,
  COALESCE(sj.job_date, sj.created_at)                    AS service_date,
  sj.notes                                                AS notes,
  sj.user_id                                              AS created_by,
  sj.created_at,
  sj.deleted_at,
  JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'item_id', COALESCE(ci.item_id, sji.item_id),
      'name', COALESCE(ci.name, 'Unknown item'),
      'quantity', COALESCE(sji.quantity, 1)
    )
  ) FILTER (
    WHERE LOWER(COALESCE(ci.category::text, '')) = 'tire'
  )                                                       AS items
FROM public.service_job sj
LEFT JOIN public.service_job_item sji ON sji.job_id = sj.job_id
LEFT JOIN public.catalog_item ci ON ci.item_id = sji.item_id
WHERE sj.deleted_at IS NULL
  AND COALESCE(sj.state::text, sj.status::text, '') IN ('completed', 'invoiced', 'paid')
GROUP BY
  sj.job_id,
  sj.vehicle_id,
  sj.job_description,
  sj.job_date,
  sj.created_at,
  sj.notes,
  sj.user_id,
  sj.deleted_at;
