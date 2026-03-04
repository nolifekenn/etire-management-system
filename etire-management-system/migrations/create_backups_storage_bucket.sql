-- ============================================================
-- Migration: Create 'backups' storage bucket in Supabase
-- ============================================================
-- Run this in your Supabase SQL Editor once.
-- Supabase Storage buckets can also be created via the
-- Dashboard (Storage > New Bucket), but this script lets
-- you do it programmatically and consistently.
-- ============================================================

-- Create the bucket (private — only the service-role key can access it)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false,                    -- private bucket (no public URL)
  52428800,                 -- 50 MB per file limit
  ARRAY['application/json', 'text/csv', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS policies ─────────────────────────────────────────────────────────
-- The application uses the service-role admin client which bypasses RLS.
-- These policies are defensive / future-proofing only.

-- Allow service-role to do everything (already true by default for service-role)
-- No extra policies needed — the admin client in supabaseServer.ts uses
-- SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely.
