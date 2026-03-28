-- Add manager authorization PIN support to public.user
-- Safe to run multiple times.

ALTER TABLE IF EXISTS public."user"
  ADD COLUMN IF NOT EXISTS pin text;

ALTER TABLE IF EXISTS public."user"
  DROP CONSTRAINT IF EXISTS user_pin_format_check;

ALTER TABLE IF EXISTS public."user"
  ADD CONSTRAINT user_pin_format_check
  CHECK (pin IS NULL OR pin ~ '^[0-9]{6}$');

-- Enforce one active user per PIN to avoid ambiguous manager authorization.
CREATE UNIQUE INDEX IF NOT EXISTS user_pin_unique_active_idx
  ON public."user" (pin)
  WHERE pin IS NOT NULL AND deleted_at IS NULL;
