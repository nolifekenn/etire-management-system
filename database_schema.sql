-- WARNING: This schema is for context only and is not meant to be run.

CREATE TABLE public.inventory (
  item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['tire'::character varying, 'tool'::character varying, 'accessory'::character varying]::text[])),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  cost_price numeric NOT NULL CHECK (cost_price >= 0::numeric),
  sale_price numeric NOT NULL CHECK (sale_price >= 0::numeric),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inventory_pkey PRIMARY KEY (item_id)
);
CREATE TABLE public.receipts (
  receipt_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sale_id uuid,
  job_id uuid,
  user_id uuid NOT NULL,
  receipt_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  total_amount numeric NOT NULL CHECK (total_amount >= 0::numeric),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT receipts_pkey PRIMARY KEY (receipt_id),
  CONSTRAINT receipts_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id),
  CONSTRAINT receipts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.service_jobs(job_id),
  CONSTRAINT receipts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.sale_items (
  sale_item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sale_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_sale numeric NOT NULL CHECK (price_at_sale >= 0::numeric),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sale_items_pkey PRIMARY KEY (sale_item_id),
  CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id),
  CONSTRAINT sale_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory(item_id)
);
CREATE TABLE public.sales (
  sale_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  sale_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  total_amount numeric NOT NULL CHECK (total_amount >= 0::numeric),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sales_pkey PRIMARY KEY (sale_id),
  CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.service_jobs (
  job_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  job_description text NOT NULL,
  job_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in-progress'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  service_fee numeric NOT NULL DEFAULT 0 CHECK (service_fee >= 0::numeric),
  remarks text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_jobs_pkey PRIMARY KEY (job_id),
  CONSTRAINT service_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.users (
  user_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  role integer NOT NULL DEFAULT 0 CHECK (role = ANY (ARRAY[0, 1, 2])),
  username character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);