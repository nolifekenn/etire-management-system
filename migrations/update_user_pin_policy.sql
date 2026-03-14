-- Update user PIN policy:
-- 1) PIN must be exactly 6 digits.
-- 2) PIN is only allowed for branch managers.
-- 3) PIN remains unique across active branch managers.

ALTER TABLE IF EXISTS public."user"
  ADD COLUMN IF NOT EXISTS pin text;

-- Non-manager roles must not keep legacy PIN values.
UPDATE public."user"
SET pin = NULL
WHERE role <> 'branch_manager';

ALTER TABLE IF EXISTS public."user"
  DROP CONSTRAINT IF EXISTS user_pin_format_check;

ALTER TABLE IF EXISTS public."user"
  DROP CONSTRAINT IF EXISTS user_pin_role_check;

ALTER TABLE IF EXISTS public."user"
  ADD CONSTRAINT user_pin_role_check
  CHECK (
    ((pin IS NULL) OR (pin ~ '^[0-9]{6}$'))
    AND
    ((pin IS NULL) OR (role = 'branch_manager'))
  );

DROP INDEX IF EXISTS public.user_pin_unique_active_idx;

CREATE UNIQUE INDEX IF NOT EXISTS user_pin_unique_branch_manager_active_idx
  ON public."user" (pin)
  WHERE pin IS NOT NULL
    AND role = 'branch_manager'
    AND deleted_at IS NULL;
