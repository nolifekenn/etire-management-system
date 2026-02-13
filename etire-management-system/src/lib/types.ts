// ==========================================
// eTire Management System - Type Definitions
// Updated for Multi-Branch Architecture
// ==========================================

// Role types for the system
export type UserRole = 'super_admin' | 'branch_manager' | 'staff' | 'cashier';

// User Management
export interface User {
  user_id: string;
  auth_id?: string;
  branch_id?: string;
  name: string;
  username: string;
  password: string; // Mandatory field
  pin?: string;
  role: UserRole;
  created_at?: string;
  deleted_at?: string | null;
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
  deleted_at?: string | null;
  // Joined data
  manager?: { user_id: string; name: string };
  user?: { user_id: string; name: string };
}

// Supplier Management
export interface Supplier {
  supplier_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at?: string;
  deleted_at?: string | null;
  // Calculated fields from RPC function
  purchase_order_count?: number;
  total_orders_value?: number;
}

// Catalog Item (Master product catalog)
export interface CatalogItem {
  item_id: string;
  supplier_id?: string;
  vehicle_type_id?: string;
  name: string;
  category: 'tire' | 'tool' | 'accessory' | 'service';
  cost_price: number;
  sale_price: number;
  sku?: string;
  created_at?: string;
  deleted_at?: string | null;
  // Joined data
  supplier?: Supplier;
  vehicle_type?: VehicleType;
}

// Branch Stock (Per-branch inventory levels)
export interface BranchStock {
  stock_id: string;
  branch_id: string;
  item_id: string;
  quantity: number;
  reorder_level: number;
  updated_at?: string;
  // Joined data
  branch?: Branch;
  catalog_item?: CatalogItem;
}

// View: Branch Inventory (combines catalog_item + branch_stock)
export interface BranchInventoryView {
  item_id: string;
  name: string;
  category: 'tire' | 'tool' | 'accessory' | 'service';
  cost_price: number;
  sale_price: number;
  sku?: string;
  quantity: number;
  reorder_level: number;
  branch_id: string;
  supplier_id?: string;
  vehicle_type_id?: string;
  deleted_at?: string | null;
  // Joined data from view
  supplier_name?: string;
  branch_name?: string;
}

// Legacy InventoryItem interface for backward compatibility during migration
export interface InventoryItem {
  item_id: string;
  name: string;
  category: 'tire' | 'tool' | 'accessory' | 'service';
  vehicle_type?: 'car' | 'motor' | 'truck';
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  branch_id?: string;
  supplier_id?: string;
  reorder_level: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  // Joined data
  supplier?: {
    supplier_id: string;
    name: string;
    contact_person?: string;
    phone?: string;
  };
  branch?: {
    branch_id: string;
    name: string;
    address?: string;
  };
}

// Vehicle Type
export interface VehicleType {
  vehicle_type_id: string;
  name: 'car' | 'motor' | 'truck';
  created_at?: string;
}

// Customer Management
export interface Customer {
  customer_id: string;
  branch_id?: string;
  name: string;
  phone?: string;
  address?: string;
  vehicle_count?: number;
  created_at?: string;
  deleted_at?: string | null;
}

// Vehicle Management
export interface Vehicle {
  vehicle_id: string;
  customer_id: string;
  vehicle_type_id?: string;
  plate_number: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  created_at?: string;
  deleted_at?: string | null;
  // Joined data
  vehicle_type?: VehicleType;
  customer?: Customer;
}

// Service Job Management
export interface ServiceJob {
  job_id: string;
  branch_id: string;
  user_id: string;
  customer_id?: string;
  vehicle_id?: string;
  job_description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'paid';
  service_fee: number;
  job_date: string;
  remarks?: string | null;
  vehicle_type_id?: string | null;
  created_at?: string;
  deleted_at?: string | null;
  // Joined data
  user?: User;
  customer?: Customer;
  vehicle?: Vehicle;
  branch?: Branch;
  vehicle_type?: VehicleType;
}

// Service Job Item
export interface ServiceJobItem {
  job_item_id: string;
  job_id: string;
  item_id?: string;
  quantity: number;
  price_at_service: number;
  created_at?: string;
  // Joined data
  catalog_item?: CatalogItem;
}

// Sale Management
export interface Sale {
  sale_id: string;
  branch_id: string;
  user_id?: string;
  customer_id?: string;
  service_job_id?: string;
  total_amount: number;
  created_at?: string;
  deleted_at?: string | null;
  // Extended fields for backward compatibility
  sale_date?: string;
  discount_amount?: number;
  tax_amount?: number;
  payment_method?: 'cash' | 'card' | 'check' | 'credit';
  // Joined data
  user?: User;
  customer?: Customer;
  branch?: Branch;
  service_job?: ServiceJob;
}

// Sale Item
export interface SaleItem {
  sale_item_id: string;
  sale_id: string;
  item_id?: string;
  quantity: number;
  price_at_sale: number;
  created_at?: string;
  // Joined data
  catalog_item?: CatalogItem;
  inventory_item?: InventoryItem;
  // Extended fields for backward compatibility
  user_id?: string;
  customer_id?: string;
  branch_id?: string;
  sale_date?: string;
  discount_amount?: number;
  tax_amount?: number;
  payment_method?: 'cash' | 'card' | 'check' | 'credit';
}

// Purchase Order Management
export interface PurchaseOrder {
  po_id: string;
  po_number: string;
  supplier_id: string;
  branch_id: string;
  user_id: string;
  order_date: string;
  expected_delivery_date?: string;
  status: 'pending' | 'approved' | 'ordered' | 'delivered' | 'cancelled';
  payment_method?: 'cash' | 'credit';
  payment_status?: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  cancellation_reason?: string | null;
  // Calculated/joined fields
  total_amount?: number;
  supplier?: Supplier;
  branch?: Branch;
  user?: User;
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

// Tire History
export interface TireHistory {
  history_id: string;
  vehicle_id?: string;
  item_id?: string;
  service_type: string;
  service_date: string;
  mileage?: number;
  notes?: string;
  created_by: string;
  created_at?: string;
  // Joined data
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
  deleted_at?: string | null;
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
  new_values?: any;
  created_at?: string;
  // Joined data
  user?: {
    name: string;
  };
}

// Receipt
export interface Receipt {
  receipt_id: string;
  sale_id?: string;
  job_id?: string;
  user_id: string;
  receipt_date: string;
  total_amount: number;
  created_at?: string;
}

// ==========================================
// Extended types with relationships
// ==========================================

export interface SaleWithItems extends Sale {
  sale_items: SaleItem[];
}

export interface ServiceJobWithUser extends ServiceJob {
  items?: ServiceJobItem[];
}

export interface ReceiptWithDetails extends Receipt {
  sale?: Sale;
  service_job?: ServiceJob;
  user?: User;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
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
  item?: InventoryItem;
}
