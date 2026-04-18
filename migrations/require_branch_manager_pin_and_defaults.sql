-- Enforce branch manager PIN policy and default handling.
-- 1) Branch managers must always have a valid 6-digit PIN.
-- 2) Non-branch-manager roles must not have PIN values.
-- 3) Default branch-manager PIN is 112233 when missing.
-- 4) Remove legacy global PIN uniqueness so each branch can have its own manager PIN set.

ALTER TABLE IF EXISTS public."user"
  ADD COLUMN IF NOT EXISTS pin text;

-- Clean up legacy values before applying stricter constraint.
UPDATE public."user"
SET pin = '112233'
WHERE role = 'branch_manager'
  AND (pin IS NULL OR pin !~ '^[0-9]{6}$');

UPDATE public."user"
SET pin = NULL
WHERE role <> 'branch_manager'
  AND pin IS NOT NULL;

ALTER TABLE IF EXISTS public."user"
  DROP CONSTRAINT IF EXISTS user_pin_format_check;

ALTER TABLE IF EXISTS public."user"
  DROP CONSTRAINT IF EXISTS user_pin_role_check;

ALTER TABLE IF EXISTS public."user"
  DROP CONSTRAINT IF EXISTS user_pin_role_required_check;

ALTER TABLE IF EXISTS public."user"
  ADD CONSTRAINT user_pin_role_required_check
  CHECK (
    (
      role = 'branch_manager'
      AND pin IS NOT NULL
      AND pin ~ '^[0-9]{6}$'
    )
    OR
    (
      role <> 'branch_manager'
      AND pin IS NULL
    )
  );

DROP INDEX IF EXISTS public.user_pin_unique_active_idx;
DROP INDEX IF EXISTS public.user_pin_unique_branch_manager_active_idx;
