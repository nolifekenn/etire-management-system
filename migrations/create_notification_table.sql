-- ============================================================
-- Migration: Create notification table
-- ============================================================
-- The application's notification bell relies on a `notification`
-- table that was missing from the public schema.  Run this script
-- once against your Supabase database (SQL Editor or psql).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification (
  notification_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  message         TEXT        NOT NULL,
  type            TEXT        NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notification_user_id
  ON public.notification (user_id);

CREATE INDEX IF NOT EXISTS idx_notification_user_unread
  ON public.notification (user_id, is_read)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_created_at
  ON public.notification (created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────
-- The app uses a service-role admin client to read/write
-- notifications (custom auth, not Supabase Auth), so RLS is
-- disabled here.  Enable and add policies if you switch to
-- Supabase Auth in the future.
ALTER TABLE public.notification DISABLE ROW LEVEL SECURITY;

-- ── Comment ──────────────────────────────────────────────────
COMMENT ON TABLE public.notification IS
  'In-app notifications delivered to individual users via the bell icon.';
