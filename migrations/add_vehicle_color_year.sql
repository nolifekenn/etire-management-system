-- Add missing columns to the vehicle table
-- The app sends 'color' and potentially 'year' but these were missing from the schema.

ALTER TABLE public.vehicle
  ADD COLUMN IF NOT EXISTS color character varying,
  ADD COLUMN IF NOT EXISTS year integer;
