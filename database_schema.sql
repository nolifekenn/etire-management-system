-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.account_invoice (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE,
  invoice_type USER-DEFINED NOT NULL,
  state USER-DEFINED NOT NULL DEFAULT 'draft'::invoice_state,
  payment_state USER-DEFINED NOT NULL DEFAULT 'not_paid'::payment_state_enum,
  partner_customer_id uuid,
  partner_supplier_id uuid,
  branch_id uuid,
  created_by uuid,
  origin_po_id uuid,
  origin_sale_id uuid,
  origin_service_id uuid,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  amount_untaxed numeric NOT NULL DEFAULT 0,
  amount_tax numeric NOT NULL DEFAULT 0,
  amount_total numeric NOT NULL DEFAULT 0,
  amount_residual numeric NOT NULL DEFAULT 0,
  currency_code text DEFAULT 'PHP'::text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT account_invoice_pkey PRIMARY KEY (id),
  CONSTRAINT account_invoice_partner_customer_id_fkey FOREIGN KEY (partner_customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT account_invoice_partner_supplier_id_fkey FOREIGN KEY (partner_supplier_id) REFERENCES public.supplier(supplier_id),
  CONSTRAINT account_invoice_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT account_invoice_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user(user_id),
  CONSTRAINT account_invoice_origin_po_id_fkey FOREIGN KEY (origin_po_id) REFERENCES public.purchase_order(po_id),
  CONSTRAINT account_invoice_origin_sale_id_fkey FOREIGN KEY (origin_sale_id) REFERENCES public.sale(sale_id),
  CONSTRAINT account_invoice_origin_service_id_fkey FOREIGN KEY (origin_service_id) REFERENCES public.service_job(job_id)
);
CREATE TABLE public.account_invoice_line (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  item_id uuid,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0::numeric),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0::numeric),
  discount_pct numeric NOT NULL DEFAULT 0 CHECK (discount_pct >= 0::numeric AND discount_pct <= 100::numeric),
  tax_pct numeric NOT NULL DEFAULT 0 CHECK (tax_pct >= 0::numeric),
  subtotal numeric DEFAULT round(((quantity * unit_price) * ((1)::numeric - (discount_pct / (100)::numeric))), 4),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_invoice_line_pkey PRIMARY KEY (id),
  CONSTRAINT account_invoice_line_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.account_invoice(id),
  CONSTRAINT account_invoice_line_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id)
);
CREATE TABLE public.audit_log (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action character varying NOT NULL,
  table_name character varying NOT NULL,
  record_id uuid,
  new_values jsonb,
  created_at timestamp with time zone DEFAULT now(),
  record_number text,
  old_values jsonb,
  ip_address text,
  user_agent text,
  session_id text,
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
CREATE TABLE public.chatter_message (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_table text NOT NULL,
  record_id uuid NOT NULL,
  author_id uuid,
  message_type USER-DEFINED NOT NULL DEFAULT 'comment'::chatter_message_type,
  subject text,
  body text NOT NULL,
  old_state text,
  new_state text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chatter_message_pkey PRIMARY KEY (id),
  CONSTRAINT chatter_message_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.chatter_messages (
  message_id uuid NOT NULL DEFAULT gen_random_uuid(),
  related_table character varying NOT NULL,
  related_record_id uuid NOT NULL,
  user_id uuid,
  type character varying NOT NULL DEFAULT 'note'::character varying CHECK (type::text = ANY (ARRAY['note'::character varying, 'log'::character varying, 'activity'::character varying]::text[])),
  message text NOT NULL,
  old_value text,
  new_value text,
  activity_type character varying,
  activity_due_date date,
  activity_done boolean NOT NULL DEFAULT false,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_internal boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chatter_messages_pkey PRIMARY KEY (message_id),
  CONSTRAINT chatter_messages_user_fk FOREIGN KEY (user_id) REFERENCES public.user(user_id)
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
  customer_rank integer NOT NULL DEFAULT 0,
  supplier_rank integer NOT NULL DEFAULT 0,
  ref text,
  vat text,
  country text DEFAULT 'Philippines'::text,
  city text,
  zip text,
  website text,
  notes text,
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
  size_id uuid,
  brand_id uuid,
  stock_quantity_legacy integer,
  sku text UNIQUE,
  barcode text UNIQUE,
  internal_ref text,
  description_sale text,
  description_purchase text,
  weight_kg numeric DEFAULT 0,
  uom text DEFAULT 'unit'::text,
  tire_pattern text,
  ply_rating smallint,
  CONSTRAINT inventory_item_pkey PRIMARY KEY (item_id),
  CONSTRAINT inventory_item_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT inventory_item_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id),
  CONSTRAINT inventory_item_size_id_fkey FOREIGN KEY (size_id) REFERENCES public.tire_size(size_id),
  CONSTRAINT inventory_item_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.tire_brand(brand_id)
);
CREATE TABLE public.inventory_moves (
  move_id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  source_document_type character varying NOT NULL CHECK (source_document_type::text = ANY (ARRAY['purchase'::character varying, 'sale'::character varying, 'service'::character varying, 'adjustment'::character varying, 'transfer'::character varying]::text[])),
  source_document_id uuid,
  quantity_moved integer NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT inventory_moves_pkey PRIMARY KEY (move_id),
  CONSTRAINT inventory_moves_item_fk FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id),
  CONSTRAINT inventory_moves_branch_fk FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT inventory_moves_user_fk FOREIGN KEY (created_by) REFERENCES public.user(user_id)
);
CREATE TABLE public.ir_sequence (
  id integer NOT NULL DEFAULT nextval('ir_sequence_id_seq'::regclass),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  prefix text NOT NULL DEFAULT ''::text,
  padding integer NOT NULL DEFAULT 4,
  number_next integer NOT NULL DEFAULT 1,
  number_increment integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ir_sequence_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notification (
  notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'success'::text])),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT notification_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
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
CREATE TABLE public.po_year_sequence (
  year smallint NOT NULL,
  number_next integer NOT NULL DEFAULT 1,
  CONSTRAINT po_year_sequence_pkey PRIMARY KEY (year)
);
CREATE TABLE public.purchase_order (
  po_id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'purchase'::text, 'locked'::text, 'cancelled'::text, 'pending'::text, 'approved'::text, 'ordered'::text, 'delivered'::text])),
  payment_method text DEFAULT 'cash'::text CHECK (payment_method = ANY (ARRAY['cash'::text, 'credit'::text])),
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'partial'::text, 'overdue'::text, 'cancelled'::text])),
  notes text,
  total_amount numeric DEFAULT 0,
  cancellation_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  state USER-DEFINED NOT NULL DEFAULT 'draft'::po_state,
  receipt_status text DEFAULT 'nothing'::text CHECK (receipt_status = ANY (ARRAY['nothing'::text, 'partial'::text, 'full'::text])),
  bill_status text DEFAULT 'nothing'::text CHECK (bill_status = ANY (ARRAY['nothing'::text, 'partial'::text, 'billed'::text])),
  source_document text,
  currency_code text DEFAULT 'PHP'::text,
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
CREATE TABLE public.record_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_table text NOT NULL,
  record_id uuid NOT NULL,
  activity_type text NOT NULL DEFAULT 'todo'::text CHECK (activity_type = ANY (ARRAY['email'::text, 'call'::text, 'meeting'::text, 'todo'::text, 'upload_document'::text, 'other'::text])),
  summary text,
  note text,
  date_deadline date NOT NULL,
  assigned_to uuid,
  created_by uuid,
  is_done boolean NOT NULL DEFAULT false,
  done_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT record_activity_pkey PRIMARY KEY (id),
  CONSTRAINT record_activity_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user(user_id),
  CONSTRAINT record_activity_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user(user_id)
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
  state USER-DEFINED NOT NULL DEFAULT 'confirmed'::sale_order_state,
  sale_number text UNIQUE,
  payment_state USER-DEFINED NOT NULL DEFAULT 'not_paid'::payment_state_enum,
  note text,
  invoiced_at timestamp with time zone,
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
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['quotation'::text, 'confirmed'::text, 'pending'::text, 'in-progress'::text, 'in_progress'::text, 'quality_check'::text, 'completed'::text, 'cancelled'::text, 'paid'::text, 'invoiced'::text])),
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  vehicle_type_id uuid,
  job_date timestamp with time zone NOT NULL DEFAULT now(),
  state USER-DEFINED NOT NULL DEFAULT 'quotation'::service_state,
  job_number text UNIQUE,
  priority smallint NOT NULL DEFAULT 0 CHECK (priority >= 0 AND priority <= 3),
  date_start timestamp with time zone,
  date_end timestamp with time zone,
  internal_notes text,
  mechanic_id uuid,
  notes text,
  diagnostics text,
  estimated_completion timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_job_pkey PRIMARY KEY (job_id),
  CONSTRAINT service_job_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT service_job_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id),
  CONSTRAINT service_job_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT service_job_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT service_job_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id),
  CONSTRAINT service_job_mechanic_id_fkey FOREIGN KEY (mechanic_id) REFERENCES public.user(user_id)
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
CREATE TABLE public.sj_year_sequence (
  year smallint NOT NULL,
  number_next integer NOT NULL DEFAULT 1,
  CONSTRAINT sj_year_sequence_pkey PRIMARY KEY (year)
);
CREATE TABLE public.so_year_sequence (
  year smallint NOT NULL,
  number_next integer NOT NULL DEFAULT 1,
  CONSTRAINT so_year_sequence_pkey PRIMARY KEY (year)
);
CREATE TABLE public.stock_move (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  move_number text UNIQUE,
  move_type USER-DEFINED NOT NULL,
  branch_id uuid NOT NULL,
  dest_branch_id uuid,
  item_id uuid NOT NULL,
  origin_po_id uuid,
  origin_sale_id uuid,
  origin_service_job_id uuid,
  origin_ref text,
  qty_demand numeric NOT NULL DEFAULT 0 CHECK (qty_demand >= 0::numeric),
  qty_done numeric NOT NULL DEFAULT 0 CHECK (qty_done >= 0::numeric),
  unit_cost numeric NOT NULL DEFAULT 0,
  is_done boolean NOT NULL DEFAULT false,
  is_cancelled boolean NOT NULL DEFAULT false,
  done_at timestamp with time zone,
  scheduled_date timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_move_pkey PRIMARY KEY (id),
  CONSTRAINT stock_move_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT stock_move_dest_branch_id_fkey FOREIGN KEY (dest_branch_id) REFERENCES public.branch(branch_id),
  CONSTRAINT stock_move_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id),
  CONSTRAINT stock_move_origin_po_id_fkey FOREIGN KEY (origin_po_id) REFERENCES public.purchase_order(po_id),
  CONSTRAINT stock_move_origin_sale_id_fkey FOREIGN KEY (origin_sale_id) REFERENCES public.sale(sale_id),
  CONSTRAINT stock_move_origin_service_job_id_fkey FOREIGN KEY (origin_service_job_id) REFERENCES public.service_job(job_id),
  CONSTRAINT stock_move_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user(user_id)
);
CREATE TABLE public.stock_valuation_layer (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stock_move_id uuid NOT NULL,
  item_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL,
  total_value numeric DEFAULT (quantity * unit_cost),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_valuation_layer_pkey PRIMARY KEY (id),
  CONSTRAINT stock_valuation_layer_stock_move_id_fkey FOREIGN KEY (stock_move_id) REFERENCES public.stock_move(id),
  CONSTRAINT stock_valuation_layer_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_item(item_id),
  CONSTRAINT stock_valuation_layer_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id)
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
  ref text,
  vat text,
  payment_terms text DEFAULT 'immediate'::text,
  country text DEFAULT 'Philippines'::text,
  city text,
  address text,
  website text,
  notes text,
  CONSTRAINT supplier_pkey PRIMARY KEY (supplier_id)
);
CREATE TABLE public.tire_brand (
  brand_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT tire_brand_pkey PRIMARY KEY (brand_id)
);
CREATE TABLE public.tire_size (
  size_id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  CONSTRAINT tire_size_pkey PRIMARY KEY (size_id)
);
CREATE TABLE public.user (
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid,
  branch_id uuid,
  name character varying NOT NULL,
  username character varying NOT NULL UNIQUE,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['super_admin'::character varying::text, 'branch_manager'::character varying::text, 'staff'::character varying::text, 'cashier'::character varying::text, 'mechanic'::character varying::text])),
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  password text NOT NULL DEFAULT ''::text,
  pin text,
  current_session_nonce text,
  CONSTRAINT user_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_pin_role_check CHECK (((pin IS NULL) OR (pin ~ '^[0-9]{6}$'::text)) AND ((pin IS NULL) OR (role::text = 'branch_manager'::text))),
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
  color character varying,
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