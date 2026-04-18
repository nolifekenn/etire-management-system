-- Create system_settings table and seed business information keys used by receipts.

CREATE TABLE IF NOT EXISTS public.system_settings (
  setting_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  description text,
  updated_by uuid REFERENCES public."user"(user_id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_settings (key, value, description)
VALUES
  ('business_name', 'Queen.R Tire Supply & Vulcanizing Shop', 'Registered business name used in receipts'),
  ('business_tin', '193-953-192-000', 'Business tax identification number'),
  ('vat_label', 'VAT Registered', 'Tax label shown in receipt header'),
  ('atp_number', 'ATP-000000000000', 'BIR Authority to Print number'),
  ('printer_name', 'TUP-M BSIS-4A 25-26 Team', 'Accredited printer name'),
  ('printer_address', 'Ayala Blvd., corner San Marcelino St., Ermita, Manila 1000, Metro Manila, Philippines', 'Accredited printer address'),
  ('printer_tin', '000-000-000-000', 'Accredited printer TIN'),
  ('serial_range', '000001-000500', 'Receipt serial number range'),
  ('receipt_type_label', 'SALES INVOICE', 'Receipt heading label'),
  ('vat_inclusive_note', 'Prices shown are VAT-inclusive.', 'Receipt tax treatment note')
ON CONFLICT (key) DO NOTHING;
