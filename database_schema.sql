-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_log (
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
  CONSTRAINT audit_log_pkey PRIMARY KEY (log_id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.branch (
  branch_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  address text,
  phone character varying,
  email character varying,
  manager_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT branch_pkey PRIMARY KEY (branch_id),
  CONSTRAINT branch_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.customer (
  customer_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  phone character varying,
  email character varying,
  address text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customer_pkey PRIMARY KEY (customer_id)
);
CREATE TABLE public.delivery (
  delivery_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  po_id uuid NOT NULL,
  delivery_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  received_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT delivery_pkey PRIMARY KEY (delivery_id),
  CONSTRAINT delivery_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_order(po_id),
  CONSTRAINT delivery_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.user(user_id)
);
CREATE TABLE public.delivery_item (
  delivery_item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  delivery_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity_received integer NOT NULL CHECK (quantity_received >= 0),
  quantity_damaged integer DEFAULT 0 CHECK (quantity_damaged >= 0),
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT delivery_item_pkey PRIMARY KEY (delivery_item_id),
  CONSTRAINT delivery_item_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.delivery(delivery_id),
  CONSTRAINT delivery_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id)
);
CREATE TABLE public.inventory_item (
  item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['tire'::character varying::text, 'tool'::character varying::text, 'accessory'::character varying::text])),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  cost_price numeric NOT NULL CHECK (cost_price >= 0::numeric),
  sale_price numeric NOT NULL CHECK (sale_price >= 0::numeric),
  reorder_level integer DEFAULT 10,
  branch_id uuid,
  supplier_id uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  vehicle_type_id uuid,
  vehicle_type character varying,
  CONSTRAINT inventory_item_pkey PRIMARY KEY (item_id),
  CONSTRAINT inventory_item_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT inventory_item_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id),
  CONSTRAINT inventory_item_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.notification (
  notification_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'success'::text])),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notification_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.purchase_order (
  po_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  po_number character varying NOT NULL UNIQUE,
  supplier_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  expected_delivery_date timestamp with time zone,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::text, 'approved'::text, 'ordered'::text, 'delivered'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  payment_status character varying DEFAULT 'pending'::character varying CHECK (payment_status::text = ANY (ARRAY['pending'::character varying, 'paid'::character varying, 'partial'::character varying, 'overdue'::character varying, 'cancelled'::character varying]::text[])),
  payment_method character varying DEFAULT 'cash'::character varying CHECK (payment_method::text = ANY (ARRAY['cash'::character varying, 'credit'::character varying]::text[])),
  cancellation_reason text,
  CONSTRAINT purchase_order_pkey PRIMARY KEY (po_id),
  CONSTRAINT purchase_order_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id),
  CONSTRAINT purchase_order_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT purchase_order_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.purchase_order_item (
  po_item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  po_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0::numeric),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT purchase_order_item_pkey PRIMARY KEY (po_item_id),
  CONSTRAINT purchase_order_item_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_order(po_id),
  CONSTRAINT purchase_order_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id)
);
CREATE TABLE public.receipts (
  receipt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid,
  customer_id uuid,
  receipt_number text NOT NULL,
  receipt_url text,
  total_amount numeric,
  payment_method text,
  employee_name text,
  email_sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT receipts_pkey PRIMARY KEY (receipt_id),
  CONSTRAINT receipts_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sale(sale_id),
  CONSTRAINT receipts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id)
);
CREATE TABLE public.sale (
  sale_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  customer_id uuid,
  branch_id uuid,
  sale_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  payment_method character varying DEFAULT 'cash'::character varying CHECK (payment_method::text = ANY (ARRAY['cash'::text, 'card'::text, 'check'::text, 'credit'::text])),
  discount_amount numeric DEFAULT 0 CHECK (discount_amount >= 0::numeric),
  tax_amount numeric DEFAULT 0 CHECK (tax_amount >= 0::numeric),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  vehicle_type_id uuid,
  total_amount numeric,
  service_job_id uuid,
  CONSTRAINT sale_pkey PRIMARY KEY (sale_id),
  CONSTRAINT sale_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id),
  CONSTRAINT sale_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT sale_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT sale_service_job_id_fkey FOREIGN KEY (service_job_id) REFERENCES public.service_job(job_id),
  CONSTRAINT sale_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.sale_item (
  sale_item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sale_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_sale numeric NOT NULL CHECK (price_at_sale >= 0::numeric),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  installation_fee numeric DEFAULT 0 CHECK (installation_fee >= 0::numeric),
  CONSTRAINT sale_item_pkey PRIMARY KEY (sale_item_id),
  CONSTRAINT sale_item_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sale(sale_id),
  CONSTRAINT sale_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id)
);
CREATE TABLE public.service_job (
  job_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  customer_id uuid,
  vehicle_id uuid,
  job_description text NOT NULL,
  job_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'in-progress'::character varying::text, 'completed'::character varying::text, 'cancelled'::character varying::text])),
  service_fee numeric NOT NULL DEFAULT 0 CHECK (service_fee >= 0::numeric),
  remarks text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  vehicle_type_id uuid,
  CONSTRAINT service_job_pkey PRIMARY KEY (job_id),
  CONSTRAINT service_job_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id),
  CONSTRAINT service_job_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT service_job_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT service_job_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.service_job_item (
  service_job_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_job_item_pkey PRIMARY KEY (service_job_item_id),
  CONSTRAINT service_job_item_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.service_job(job_id),
  CONSTRAINT service_job_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id)
);
CREATE TABLE public.supplier (
  supplier_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  contact_person character varying,
  phone character varying,
  email character varying,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT supplier_pkey PRIMARY KEY (supplier_id)
);
CREATE TABLE public.system_setting (
  setting_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key character varying NOT NULL UNIQUE,
  value text,
  description text,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT system_setting_pkey PRIMARY KEY (setting_id),
  CONSTRAINT system_setting_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user(user_id)
);
CREATE TABLE public.tire_history (
  history_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL,
  item_id uuid NOT NULL,
  service_type character varying NOT NULL CHECK (service_type::text = ANY (ARRAY['repair'::text, 'replacement'::text, 'rotation'::text, 'balancing'::text])),
  service_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  mileage integer,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tire_history_pkey PRIMARY KEY (history_id),
  CONSTRAINT tire_history_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT tire_history_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id),
  CONSTRAINT tire_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user(user_id)
);
CREATE TABLE public.user (
  user_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  role integer NOT NULL DEFAULT 0 CHECK (role = ANY (ARRAY[0, 1, 2, 3])),
  username character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  uuid uuid,
  CONSTRAINT user_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_uuid_fkey FOREIGN KEY (uuid) REFERENCES auth.users(id)
);
CREATE TABLE public.vehicle (
  vehicle_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL,
  plate_number character varying NOT NULL,
  make character varying,
  model character varying,
  year integer,
  color character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  vehicle_type_id uuid,
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