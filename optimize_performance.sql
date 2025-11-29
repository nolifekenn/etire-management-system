-- Create indexes to optimize dashboard queries

-- Index for sale_item foreign keys
CREATE INDEX IF NOT EXISTS idx_sale_item_sale_id ON public.sale_item(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_item_id ON public.sale_item(item_id);

-- Index for sale queries
CREATE INDEX IF NOT EXISTS idx_sale_user_id ON public.sale(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_sale_date ON public.sale(sale_date);

-- Index for inventory low stock queries
CREATE INDEX IF NOT EXISTS idx_inventory_item_stock_quantity ON public.inventory_item(stock_quantity);

-- Index for notification queries
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON public.notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON public.notification(created_at);

-- Index for purchase order queries (often used in dashboard stats)
CREATE INDEX IF NOT EXISTS idx_purchase_order_status ON public.purchase_order(status);

-- Index for service job queries
CREATE INDEX IF NOT EXISTS idx_service_job_status ON public.service_job(status);