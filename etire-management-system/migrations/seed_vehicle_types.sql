-- Seed vehicle_type lookup table
-- The table has a CHECK constraint: name must be one of 'car', 'motor', 'truck'
-- Run this in the Supabase SQL Editor to populate the vehicle type dropdown.

INSERT INTO public.vehicle_type (name)
VALUES
  ('car'),
  ('motor'),
  ('truck')
ON CONFLICT (name) DO NOTHING;
