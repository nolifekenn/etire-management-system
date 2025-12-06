
export interface User {
  user_id: string;
  name: string;
  username: string;
  password?: string; // Password should be handled carefully
  role: number; // 0: Guest, 1: Staff, 2: Branch Manager, 3: Admin
  created_at?: string;
  updated_at?: string;
}

// Branch Management
export interface Branch {
  branch_id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Supplier Management
// Also update Supplier with the new fields
export interface Supplier {
  supplier_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // ✅ Add calculated fields from RPC function
  purchase_order_count?: number;  // Calculated count
  total_orders_value?: number;    // Calculated total
}

// Purchase Order Management
// Purchase Order Management
export interface PurchaseOrder {
  po_id: string;                  // ✅ Correct primary key
  po_number: string;
  supplier_id: string;
  branch_id: string;
  user_id: string;
  order_date: string;
  expected_delivery_date?: string;
  status: 'pending' | 'approved' | 'ordered' | 'delivered' | 'cancelled';  // ✅ Keep this!
  payment_method?: 'cash' | 'credit';  // ✅ Added
  payment_status?: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';  // ✅ Added
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // ✅ Add calculated/joined fields from RPC function
  total_amount?: number;          // Calculated from purchase_order_item
  supplier?: {                    // Joined data
    supplier_id: string;
    name: string;
    contact_person?: string;
    phone?: string;
  };
  branch?: {                      // Joined data
    branch_id: string;
    name: string;
    address?: string;
  };
  user?: {                        // Joined data
    user_id: string;
    name: string;
  };
  cancellation_reason?: string | null; // ✅ Add this
}

export interface PurchaseOrderItem {
  po_item_id: string;
  po_id: string;
  item_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created_at?: string;
}

// Delivery Management
export interface Delivery {
  delivery_id: string;
  po_id: string;
  delivery_date: string;
  received_by: string;
  notes?: string;
  created_at?: string;
}

export interface DeliveryItem {
  delivery_item_id: string;
  delivery_id: string;
  item_id: string;
  quantity_received: number;
  quantity_damaged: number;
  notes?: string;
  created_at?: string;
}

// Customer & Vehicle Management
export interface Customer {
  customer_id: string;
  name: string;
  phone?: string;
  vehicle_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  vehicle_id: string;
  customer_id: string;
  plate_number: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicle_type_id?: string;
  vehicle_type?: {
    vehicle_type_id: string;
    name: string;
  };
  customer?: Customer;
  created_at?: string;
  updated_at?: string;
}

export interface TireHistory {
  history_id: string;
  vehicle_id: string;
  item_id?: string;
  service_type: string;
  service_date: string;
  mileage?: number;
  notes?: string;
  created_by: string;
  created_at?: string;
  vehicle?: Vehicle;
  items?: Array<{
    item_id: string;
    name: string;
    quantity: number;
  }>;
  user?: User;
}

// Notifications
export interface Notification {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  created_at?: string;
}

// System Settings
export interface SystemSetting {
  setting_id: string;
  key: string;
  value?: string;
  description?: string;
  updated_by?: string;
  updated_at?: string;
}

// Audit Logs
export interface AuditLog {
  log_id: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
  user?: {
    name: string;
  };
}

// Enhanced Inventory with branch support
export interface InventoryItem {
  item_id: string;
  name: string;
  category: 'tire' | 'tool' | 'accessory';
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  branch_id?: string;
  supplier_id?: string;
  reorder_level: number;
  created_at?: string;
  updated_at?: string;
}

// Sales View (aggregated from sale_items)
export interface Sale {
  sale_id: string;
  user_id: string;
  customer_id?: string;
  branch_id?: string;
  sale_date: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: 'cash' | 'card' | 'check' | 'credit';
  created_at?: string;
  updated_at?: string;
}

// Enhanced Sale Items with sale metadata
export interface SaleItem {
  sale_item_id: string;
  sale_id: string;
  user_id: string;
  customer_id?: string;
  branch_id?: string;
  item_id: string;
  quantity: number;
  price_at_sale: number;
  sale_date: string;
  discount_amount: number;
  tax_amount: number;
  payment_method: 'cash' | 'card' | 'check' | 'credit';
  created_at?: string;
  updated_at?: string;
}

// Enhanced Service Jobs with customer and vehicle support
export interface ServiceJob {
  job_id: string;
  user_id: string;
  customer_id?: string;
  vehicle_id?: string;
  branch_id?: string;
  job_description: string;
  job_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  service_fee: number;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Receipt {
  receipt_id: string;
  sale_id?: string;
  job_id?: string;
  user_id: string;
  receipt_date: string;
  total_amount: number;
  created_at?: string;
}

// Extended types with relationships
export interface SaleWithItems extends Sale {
  sale_items: SaleItem[];
  user?: User;
  customer?: Customer;
  branch?: Branch;
}

export interface ServiceJobWithUser extends ServiceJob {
  user?: User;
  customer?: Customer;
  vehicle?: Vehicle;
  branch?: Branch;
}

export interface ReceiptWithDetails extends Receipt {
  sale?: Sale;
  service_job?: ServiceJob;
  user?: User;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier?: Supplier;
  branch?: Branch;
  user?: User;
  items?: PurchaseOrderItem[];
}

export interface DeliveryWithDetails extends Delivery {
  purchase_order?: PurchaseOrder;
  user?: User;
  items?: DeliveryItem[];
}

export interface VehicleWithCustomer extends Vehicle {
  customer?: Customer;
}

export interface TireHistoryWithDetails extends TireHistory {
  vehicle?: Vehicle;
  item?: InventoryItem;
  user?: User;
}
