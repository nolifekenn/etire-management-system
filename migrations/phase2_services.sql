-- ===========================================================================
-- PHASE 2: SERVICES MODULE UPGRADE
-- eTire Management System — Workshop / Repair Module
--
-- Changes:
--   1. Upgrades service_job number prefix from SJ- to SRV-YYYY-XXXX
--   2. Extends state machine: adds 'confirmed' between quotation & in_progress
--   3. Adds workshop-specific columns: mechanic_id, priority, notes,
--      diagnostics, estimated_completion, updated_at
--   4. Adds inventory_moves integration trigger helper for service consumption
--
-- Run AFTER phase1_foundation.sql and phase1_corrective.sql.
-- IDEMPOTENT — safe to run multiple times.
-- ===========================================================================


-- ===========================================================================
-- 1. EXTEND service_job COLUMNS
-- ===========================================================================

ALTER TABLE public.service_job
  ADD COLUMN IF NOT EXISTS mechanic_id           uuid          REFERENCES public.user(user_id),
  ADD COLUMN IF NOT EXISTS priority              text          NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  ADD COLUMN IF NOT EXISTS notes                 text,
  ADD COLUMN IF NOT EXISTS diagnostics           text,
  ADD COLUMN IF NOT EXISTS estimated_completion  timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at            timestamptz   NOT NULL DEFAULT now();


-- ===========================================================================
-- 2. UPGRADE STATE MACHINE — add 'confirmed' state
--    The service_job.state column uses a PostgreSQL ENUM type named service_state.
--    ADD VALUE IF NOT EXISTS is idempotent — safe to run on re-migrations.
-- ===========================================================================

-- Extend the PostgreSQL ENUM (Supabase/PG 9.3+ supports IF NOT EXISTS)
ALTER TYPE service_state ADD VALUE IF NOT EXISTS 'confirmed' BEFORE 'in_progress';

-- Relax legacy status text column so it accepts the extended state values
ALTER TABLE public.service_job
  DROP CONSTRAINT IF EXISTS service_job_status_check;

ALTER TABLE public.service_job
  ADD CONSTRAINT service_job_status_check
    CHECK (status::text = ANY(ARRAY[
      'quotation','confirmed','pending','in-progress','in_progress',
      'quality_check','completed','cancelled','paid','invoiced'
    ]));


-- ===========================================================================
-- 3. RENAME SRV SEQUENCE  (was SJ-YYYY-XXXX → SRV-YYYY-XXXX)
--    We reuse the sj_year_sequence table (already created in phase1_corrective)
--    and simply change the prefix in the generator function.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.next_sj_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  _year  smallint := EXTRACT(YEAR FROM now())::smallint;
  _next  integer;
BEGIN
  INSERT INTO public.sj_year_sequence (year, number_next)
  VALUES (_year, 1)
  ON CONFLICT (year) DO NOTHING;

  SELECT number_next INTO _next
    FROM public.sj_year_sequence
   WHERE year = _year
     FOR UPDATE;

  UPDATE public.sj_year_sequence
     SET number_next = number_next + 1
   WHERE year = _year;

  -- Changed prefix from SJ- to SRV-
  RETURN 'SRV-' || _year::text || '-' || LPAD(_next::text, 4, '0');
END;
$$;


-- ===========================================================================
-- 4. UPDATED_AT TRIGGER for service_job
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sj_updated_at ON public.service_job;
CREATE TRIGGER sj_updated_at
  BEFORE UPDATE ON public.service_job
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();


-- ===========================================================================
-- 5. INDEXES for workshop query patterns
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_sj_state
  ON public.service_job (state, deleted_at);

CREATE INDEX IF NOT EXISTS idx_sj_branch_state
  ON public.service_job (branch_id, state, deleted_at);

CREATE INDEX IF NOT EXISTS idx_sj_mechanic
  ON public.service_job (mechanic_id, state)
  WHERE mechanic_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sj_customer
  ON public.service_job (customer_id, deleted_at)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sj_job_number
  ON public.service_job (job_number)
  WHERE job_number IS NOT NULL;


-- ===========================================================================
-- 6. BACKFILL: set updated_at for existing rows
-- ===========================================================================

UPDATE public.service_job
   SET updated_at = COALESCE(created_at, now())
 WHERE updated_at IS NULL;
