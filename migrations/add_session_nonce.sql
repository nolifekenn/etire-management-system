-- ============================================================
-- Migration: Add session nonce for single-session enforcement
-- Prevents account hijacking by invalidating stale sessions
-- when a new login occurs for the same account.
-- ============================================================

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS current_session_nonce TEXT DEFAULT NULL;

COMMENT ON COLUMN "user".current_session_nonce IS
  'Rotated on every successful login. Client-side heartbeat compares '
  'this value to detect concurrent session hijacking.';
