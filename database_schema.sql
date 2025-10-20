-- Enhanced eTire Manager Database Schema
-- This script safely creates or updates the database schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with branch support (create if not exists)
CREATE TABLE IF NOT EXISTS public.users (
  user_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  role integer NOT NULL DEFAULT 0 CHECK (role = ANY (ARRAY[0, 1, 2, 3])),
  username character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  branch_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (user_id),
  CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id)
);

-- Add missing columns to existing users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS branch_id uuid,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add foreign key constraint for branch_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'users_branch_id_fkey' 
                 AND table_name = 'users') THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);
  END IF;
END $$;

-- Branch Management
CREATE TABLE IF NOT EXISTS public.branches (
  branch_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  address text,
  phone character varying,
  email character varying,
  manager_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT branches_pkey PRIMARY KEY (branch_id),
  CONSTRAINT branches_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(user_id)
);

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  supplier_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  contact_person character varying,
  phone character varying,
  email character varying,
  address text,
  payment_terms character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id)
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  customer_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  phone character varying,
  email character varying,
  address text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customers_pkey PRIMARY KEY (customer_id)
);

-- Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  vehicle_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL,
  plate_number character varying NOT NULL,
  make character varying,
  model character varying,
  year integer,
  color character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vehicles_pkey PRIMARY KEY (vehicle_id),
  CONSTRAINT vehicles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id)
);

-- Enhanced Inventory with branch support
CREATE TABLE IF NOT EXISTS public.inventory (
  item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['tire'::character varying, 'tool'::character varying, 'accessory'::character varying]::text[])),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  cost_price numeric NOT NULL CHECK (cost_price >= 0::numeric),
  sale_price numeric NOT NULL CHECK (sale_price >= 0::numeric),
  branch_id uuid,
  supplier_id uuid,
  reorder_level integer DEFAULT 10,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inventory_pkey PRIMARY KEY (item_id),
  CONSTRAINT inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT inventory_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id)
);

-- Add missing columns to existing inventory table
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS branch_id uuid,
ADD COLUMN IF NOT EXISTS supplier_id uuid,
ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 10;

-- Add foreign key constraints for new columns
DO $$
BEGIN
  -- Add branch_id foreign key if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'inventory_branch_id_fkey' 
                 AND table_name = 'inventory') THEN
    ALTER TABLE public.inventory 
    ADD CONSTRAINT inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);
  END IF;
  
  -- Add supplier_id foreign key if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'inventory_supplier_id_fkey' 
                 AND table_name = 'inventory') THEN
    ALTER TABLE public.inventory 
    ADD CONSTRAINT inventory_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);
  END IF;
END $$;

-- Sales will be created as a view instead of a table

-- Sale Items (enhanced to include sale metadata)
CREATE TABLE IF NOT EXISTS public.sale_items (
  sale_item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sale_id uuid NOT NULL, -- This will be a generated UUID for grouping items
  user_id uuid NOT NULL,
  customer_id uuid,
  branch_id uuid,
  item_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_sale numeric NOT NULL CHECK (price_at_sale >= 0::numeric),
  sale_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  discount_amount numeric DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount numeric DEFAULT 0 CHECK (tax_amount >= 0),
  payment_method character varying DEFAULT 'cash' CHECK (payment_method = ANY (ARRAY['cash', 'card', 'check', 'credit'])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sale_items_pkey PRIMARY KEY (sale_item_id),
  CONSTRAINT sale_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT sale_items_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id),
  CONSTRAINT sale_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT sale_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory(item_id)
);

-- Add missing columns to existing sale_items table
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS customer_id uuid,
ADD COLUMN IF NOT EXISTS branch_id uuid,
ADD COLUMN IF NOT EXISTS sale_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0 CHECK (discount_amount >= 0),
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0 CHECK (tax_amount >= 0),
ADD COLUMN IF NOT EXISTS payment_method character varying DEFAULT 'cash' CHECK (payment_method = ANY (ARRAY['cash', 'card', 'check', 'credit'])),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key constraints for new columns
DO $$
BEGIN
  -- Add user_id foreign key if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'sale_items_user_id_fkey' 
                 AND table_name = 'sale_items') THEN
    ALTER TABLE public.sale_items 
    ADD CONSTRAINT sale_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);
  END IF;
  
  -- Add customer_id foreign key if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'sale_items_customer_id_fkey' 
                 AND table_name = 'sale_items') THEN
    ALTER TABLE public.sale_items 
    ADD CONSTRAINT sale_items_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);
  END IF;
  
  -- Add branch_id foreign key if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'sale_items_branch_id_fkey' 
                 AND table_name = 'sale_items') THEN
    ALTER TABLE public.sale_items 
    ADD CONSTRAINT sale_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);
  END IF;
END $$;

-- Enhanced Service Jobs with customer and vehicle support
CREATE TABLE IF NOT EXISTS public.service_jobs (
  job_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  customer_id uuid,
  vehicle_id uuid,
  branch_id uuid,
  job_description text NOT NULL,
  job_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in-progress'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  service_fee numeric NOT NULL DEFAULT 0 CHECK (service_fee >= 0::numeric),
  remarks text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_jobs_pkey PRIMARY KEY (job_id),
  CONSTRAINT service_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT service_jobs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id),
  CONSTRAINT service_jobs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(vehicle_id),
  CONSTRAINT service_jobs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id)
);

-- Enhanced Receipts
CREATE TABLE IF NOT EXISTS public.receipts (
  receipt_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sale_id uuid, -- This will reference the sale_id from sale_items (for grouping)
  job_id uuid,
  user_id uuid NOT NULL,
  receipt_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  total_amount numeric NOT NULL CHECK (total_amount >= 0::numeric),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT receipts_pkey PRIMARY KEY (receipt_id),
  CONSTRAINT receipts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.service_jobs(job_id),
  CONSTRAINT receipts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  po_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  po_number character varying NOT NULL UNIQUE,
  supplier_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  expected_delivery_date timestamp with time zone,
  status character varying NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending', 'approved', 'ordered', 'delivered', 'cancelled'])),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (po_id),
  CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id),
  CONSTRAINT purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
  CONSTRAINT purchase_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  po_item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  po_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0),
  total_cost numeric NOT NULL CHECK (total_cost >= 0),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (po_item_id),
  CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(po_id),
  CONSTRAINT purchase_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory(item_id)
);

-- Deliveries
CREATE TABLE IF NOT EXISTS public.deliveries (
  delivery_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  po_id uuid NOT NULL,
  delivery_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  received_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT deliveries_pkey PRIMARY KEY (delivery_id),
  CONSTRAINT deliveries_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(po_id),
  CONSTRAINT deliveries_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(user_id)
);

-- Delivery Items
CREATE TABLE IF NOT EXISTS public.delivery_items (
  delivery_item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  delivery_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity_received integer NOT NULL CHECK (quantity_received >= 0),
  quantity_damaged integer DEFAULT 0 CHECK (quantity_damaged >= 0),
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT delivery_items_pkey PRIMARY KEY (delivery_item_id),
  CONSTRAINT delivery_items_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.deliveries(delivery_id),
  CONSTRAINT delivery_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory(item_id)
);

-- Tire History
CREATE TABLE IF NOT EXISTS public.tire_history (
  history_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL,
  item_id uuid NOT NULL,
  service_type character varying NOT NULL CHECK (service_type = ANY (ARRAY['repair', 'replacement', 'rotation', 'balancing'])),
  service_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  mileage integer,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tire_history_pkey PRIMARY KEY (history_id),
  CONSTRAINT tire_history_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(vehicle_id),
  CONSTRAINT tire_history_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory(item_id),
  CONSTRAINT tire_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  notification_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  type character varying NOT NULL CHECK (type = ANY (ARRAY['info', 'warning', 'error', 'success'])),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);

-- System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  setting_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key character varying NOT NULL UNIQUE,
  value text,
  description text,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT system_settings_pkey PRIMARY KEY (setting_id),
  CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id)
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  log_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action character varying NOT NULL,
  table_name character varying NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);

-- Sales View (aggregated from sale_items)
-- First drop the existing sales table, then create as view
DROP TABLE IF EXISTS sales CASCADE;
CREATE VIEW sales AS
SELECT 
  sale_id,
  user_id,
  customer_id,
  branch_id,
  sale_date,
  SUM(quantity * price_at_sale) as total_amount,
  SUM(discount_amount) as discount_amount,
  SUM(tax_amount) as tax_amount,
  payment_method,
  MIN(created_at) as created_at,
  MAX(updated_at) as updated_at
FROM sale_items
GROUP BY sale_id, user_id, customer_id, branch_id, sale_date, payment_method;

-- Views for reporting (drop and recreate to handle column changes)
DROP VIEW IF EXISTS daily_sales_report;
CREATE VIEW daily_sales_report AS
SELECT 
  DATE(sale_date) as sale_date,
  COUNT(DISTINCT sale_id) as total_transactions,
  SUM(quantity * price_at_sale) as total_sales,
  AVG(quantity * price_at_sale) as average_sale
FROM sale_items
GROUP BY DATE(sale_date)
ORDER BY sale_date DESC;

DROP VIEW IF EXISTS low_stock_products;
CREATE VIEW low_stock_products AS
SELECT 
  item_id,
  name,
  category,
  stock_quantity,
  reorder_level,
  (reorder_level - stock_quantity) as shortage
FROM inventory
WHERE stock_quantity <= reorder_level
ORDER BY shortage DESC;

-- Insert default data (only if not exists)
INSERT INTO branches (name, address, phone, email) 
SELECT 'Main Branch', '123 Main Street, City', '+1-555-0101', 'main@etire.com'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Main Branch');

INSERT INTO branches (name, address, phone, email) 
SELECT 'Secondary Branch', '456 Oak Avenue, City', '+1-555-0102', 'secondary@etire.com'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Secondary Branch');

INSERT INTO suppliers (name, contact_person, phone, email, address) 
SELECT 'Neugen Tire Sales Inc', 'John Smith', '+1-555-0201', 'orders@neugen.com', '789 Tire Street, City'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Neugen Tire Sales Inc');

INSERT INTO suppliers (name, contact_person, phone, email, address) 
SELECT 'Anda Motors Inc', 'Jane Doe', '+1-555-0202', 'sales@andamotors.com', '321 Motor Avenue, City'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Anda Motors Inc');

INSERT INTO suppliers (name, contact_person, phone, email, address) 
SELECT 'Tasco Inc Warehouse', 'Bob Johnson', '+1-555-0203', 'warehouse@tasco.com', '654 Warehouse Road, City'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Tasco Inc Warehouse');

INSERT INTO system_settings (key, value, description) 
SELECT 'vat_rate', '0.12', 'VAT rate as decimal (12%)'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'vat_rate');

INSERT INTO system_settings (key, value, description) 
SELECT 'low_stock_threshold', '10', 'Default low stock threshold'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'low_stock_threshold');

INSERT INTO system_settings (key, value, description) 
SELECT 'company_name', 'Q.R Tire Supply & Vulcanizing Shop', 'Company name for receipts'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'company_name');

INSERT INTO system_settings (key, value, description) 
SELECT 'company_address', '123 Main Street, City', 'Company address for receipts'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'company_address');

INSERT INTO system_settings (key, value, description) 
SELECT 'company_phone', '+1-555-0101', 'Company phone for receipts'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'company_phone');
