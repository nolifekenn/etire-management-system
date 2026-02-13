-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_log (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action character varying NOT NULL,
  table_name character varying NOT NULL,
  record_id uuid,
  new_values jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (log_id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.branch (
  branch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  address text,
  phone character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT branch_pkey PRIMARY KEY (branch_id)
);
CREATE TABLE public.branch_stock (
  stock_id uuid NOT NULL DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level integer DEFAULT 10,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT branch_stock_pkey PRIMARY KEY (stock_id),
  CONSTRAINT branch_stock_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT branch_stock_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.catalog_item(item_id)
);
CREATE TABLE public.catalog_item (
  item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid,
  vehicle_type_id uuid,
  name character varying NOT NULL,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['tire'::character varying, 'tool'::character varying, 'accessory'::character varying, 'service'::character varying]::text[])),
  cost_price numeric NOT NULL DEFAULT 0 CHECK (cost_price >= 0::numeric),
  sale_price numeric NOT NULL DEFAULT 0 CHECK (sale_price >= 0::numeric),
  sku character varying UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT catalog_item_pkey PRIMARY KEY (item_id),
  CONSTRAINT catalog_item_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id),
  CONSTRAINT catalog_item_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.customer (
  customer_id uuid NOT NULL DEFAULT gen_random_uuid(),
  branch_id uuid,
  name character varying NOT NULL,
  phone character varying,
  address text,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  email text,
  CONSTRAINT customer_pkey PRIMARY KEY (customer_id),
  CONSTRAINT customer_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id)
);
CREATE TABLE public.delivery (
  delivery_id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  received_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT delivery_pkey PRIMARY KEY (delivery_id),
  CONSTRAINT delivery_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_order(po_id),
  CONSTRAINT delivery_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.user(user_id)
);
CREATE TABLE public.delivery_item (
  delivery_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity_received integer NOT NULL DEFAULT 0,
  quantity_damaged integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT delivery_item_pkey PRIMARY KEY (delivery_item_id),
  CONSTRAINT delivery_item_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.delivery(delivery_id),
  CONSTRAINT delivery_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id)
);
CREATE TABLE public.inventory_item (
  item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  branch_id uuid,
  supplier_id uuid,
  name text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['tire'::text, 'tool'::text, 'accessory'::text, 'service'::text])),
  vehicle_type text CHECK (vehicle_type = ANY (ARRAY['car'::text, 'motor'::text, 'truck'::text])),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  cost_price numeric NOT NULL DEFAULT 0 CHECK (cost_price >= 0::numeric),
  sale_price numeric NOT NULL DEFAULT 0 CHECK (sale_price >= 0::numeric),
  reorder_level integer NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT inventory_item_pkey PRIMARY KEY (item_id),
  CONSTRAINT inventory_item_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT inventory_item_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id)
);
CREATE TABLE public.payment_transactions (
  transaction_id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  method text NOT NULL DEFAULT 'cash'::text CHECK (method = ANY (ARRAY['cash'::text, 'bank'::text, 'check'::text, 'transfer'::text])),
  reference_no text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_transactions_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT payment_transactions_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_order(po_id)
);
CREATE TABLE public.purchase_order (
  po_id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'ordered'::text, 'delivered'::text, 'cancelled'::text])),
  payment_method text DEFAULT 'cash'::text CHECK (payment_method = ANY (ARRAY['cash'::text, 'credit'::text])),
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'partial'::text, 'overdue'::text, 'cancelled'::text])),
  notes text,
  total_amount numeric DEFAULT 0,
  cancellation_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT purchase_order_pkey PRIMARY KEY (po_id),
  CONSTRAINT purchase_order_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id),
  CONSTRAINT purchase_order_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT purchase_order_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.purchase_order_item (
  po_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric DEFAULT ((quantity)::numeric * unit_cost),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT purchase_order_item_pkey PRIMARY KEY (po_item_id),
  CONSTRAINT purchase_order_item_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_order(po_id),
  CONSTRAINT purchase_order_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id)
);
CREATE TABLE public.sale (
  sale_id uuid NOT NULL DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  user_id uuid,
  customer_id uuid,
  service_job_id uuid,
  total_amount numeric DEFAULT 0 CHECK (total_amount >= 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  payment_method text NOT NULL DEFAULT 'cash'::text CHECK (payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'check'::text, 'credit'::text])),
  sale_date timestamp with time zone NOT NULL DEFAULT now(),
  discount_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  CONSTRAINT sale_pkey PRIMARY KEY (sale_id),
  CONSTRAINT sale_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT sale_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id),
  CONSTRAINT sale_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT sale_service_job_id_fkey FOREIGN KEY (service_job_id) REFERENCES public.service_job(job_id)
);
CREATE TABLE public.sale_item (
  sale_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  item_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_sale numeric NOT NULL CHECK (price_at_sale >= 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  installation_fee numeric NOT NULL DEFAULT 0,
  CONSTRAINT sale_item_pkey PRIMARY KEY (sale_item_id),
  CONSTRAINT sale_item_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sale(sale_id),
  CONSTRAINT sale_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id)
);
CREATE TABLE public.service_job (
  job_id uuid NOT NULL DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  user_id uuid NOT NULL,
  customer_id uuid,
  vehicle_id uuid,
  job_description text NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in-progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'paid'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  vehicle_type_id uuid,
  job_date timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_job_pkey PRIMARY KEY (job_id),
  CONSTRAINT service_job_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT service_job_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id),
  CONSTRAINT service_job_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT service_job_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT service_job_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.service_job_item (
  service_job_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  item_id uuid,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_service numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_job_item_pkey PRIMARY KEY (service_job_item_id),
  CONSTRAINT service_job_item_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.service_job(job_id),
  CONSTRAINT service_job_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.catalog_item(item_id)
);
CREATE TABLE public.supplier (
  supplier_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  contact_person character varying,
  phone character varying,
  email character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT supplier_pkey PRIMARY KEY (supplier_id)
);
CREATE TABLE public.user (
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid,
  branch_id uuid,
  name character varying NOT NULL,
  username character varying NOT NULL UNIQUE,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['super_admin'::character varying, 'branch_manager'::character varying, 'staff'::character varying, 'cashier'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  password text NOT NULL DEFAULT ''::text,
  CONSTRAINT user_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id),
  CONSTRAINT user_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id)
);
CREATE TABLE public.vehicle (
  vehicle_id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  vehicle_type_id uuid,
  plate_number character varying NOT NULL,
  make character varying,
  model character varying,
  year integer,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT vehicle_pkey PRIMARY KEY (vehicle_id),
  CONSTRAINT vehicle_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT vehicle_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.vehicle_type (
  vehicle_type_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name = ANY (ARRAY['car'::text, 'motor'::text, 'truck'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicle_type_pkey PRIMARY KEY (vehicle_type_id)
);