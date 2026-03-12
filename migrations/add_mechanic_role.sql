-- ============================================================
-- Migration: Add 'mechanic' as a valid user role
-- ============================================================

-- Drop the old CHECK constraint and replace with one that includes 'mechanic'
ALTER TABLE "user"
  DROP CONSTRAINT IF EXISTS user_role_check;

ALTER TABLE "user"
  ADD CONSTRAINT user_role_check
    CHECK (role::text = ANY (
      ARRAY[
        'super_admin'::character varying,
        'branch_manager'::character varying,
        'staff'::character varying,
        'cashier'::character varying,
        'mechanic'::character varying
      ]::text[]
    ));
