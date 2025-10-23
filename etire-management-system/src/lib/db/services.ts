import { supabase } from '../supabaseClient';
import type {
  User,
  Branch,
  Supplier,
  Customer,
  Vehicle,
  InventoryItem,
  Sale,
  SaleItem,
  ServiceJob,
  PurchaseOrder,
  PurchaseOrderItem,
  Delivery,
  DeliveryItem,
  TireHistory,
  Notification,
  SystemSetting,
  AuditLog,
  Receipt
} from '../types';

// ============================================
// GENERIC DATABASE OPERATIONS
// ============================================

async function getAll<T>(tableName: string) {
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) throw error;
  return data as T[];
}

async function getById<T>(tableName: string, idColumn: string, id: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq(idColumn, id)
    .single();
  if (error) throw error;
  return data as T;
}

async function create<T>(tableName: string, record: Partial<T>) {
  const { data, error } = await supabase
    .from(tableName)
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data as T;
}

async function update<T>(tableName: string, idColumn: string, id: string, record: Partial<T>) {
  const { data, error } = await supabase
    .from(tableName)
    .update(record)
    .eq(idColumn, id)
    .select()
    .single();
  if (error) throw error;
  return data as T;
}

async function remove(tableName: string, idColumn: string, id: string) {
  const { error } = await supabase.from(tableName).delete().eq(idColumn, id);
  if (error) throw error;
  return true;
}

// ============================================
// BRANCH SERVICES
// ============================================

export const BranchService = {
  getAll: () => getAll<Branch>('branches'),
  getById: (id: string) => getById<Branch>('branches', 'branch_id', id),
  create: (branch: Partial<Branch>) => create<Branch>('branches', branch),
  update: (id: string, branch: Partial<Branch>) => update<Branch>('branches', 'branch_id', id, branch),
  delete: (id: string) => remove('branches', 'branch_id', id),
  
  getActive: async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return data as Branch[];
  },

  getWithManager: async (branchId: string) => {
    const { data, error } = await supabase
      .from('branches')
      .select('*, manager:users(user_id, name, username)')
      .eq('branch_id', branchId)
      .single();
    if (error) throw error;
    return data;
  }
};

// ============================================
// USER SERVICES
// ============================================

export const UserService = {
  getAll: () => getAll<User>('users'),
  getById: (id: string) => getById<User>('users', 'user_id', id),
  create: (user: Partial<User>) => create<User>('users', user),
  update: (id: string, user: Partial<User>) => update<User>('users', 'user_id', id, user),
  delete: (id: string) => remove('users', 'user_id', id),
  
  getByUsername: async (username: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    if (error) throw error;
    return data as User;
  },
  
  getByBranch: async (branchId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('branch_id', branchId);
    if (error) throw error;
    return data as User[];
  },

  getByRole: async (role: number) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role);
    if (error) throw error;
    return data as User[];
  }
};

// ============================================
// INVENTORY SERVICES
// ============================================

export const InventoryService = {
  getAll: () => getAll<InventoryItem>('inventory'),
  getById: (id: string) => getById<InventoryItem>('inventory', 'item_id', id),
  create: (item: Partial<InventoryItem>) => create<InventoryItem>('inventory', item),
  update: (id: string, item: Partial<InventoryItem>) => update<InventoryItem>('inventory', 'item_id', id, item),
  delete: (id: string) => remove('inventory', 'item_id', id),
  
  getByBranch: async (branchId: string) => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('branch_id', branchId);
    if (error) throw error;
    return data as InventoryItem[];
  },
  
  getLowStock: async () => {
    const { data, error } = await supabase
      .from('low_stock_products')
      .select('*');
    if (error) throw error;
    return data;
  },

  searchByName: async (searchTerm: string) => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .ilike('name', `%${searchTerm}%`);
    if (error) throw error;
    return data as InventoryItem[];
  },

  getByCategory: async (category: string) => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('category', category);
    if (error) throw error;
    return data as InventoryItem[];
  }
};

// ============================================
// CUSTOMER SERVICES
// ============================================

export const CustomerService = {
  getAll: () => getAll<Customer>('customers'),
  getById: (id: string) => getById<Customer>('customers', 'customer_id', id),
  create: (customer: Partial<Customer>) => create<Customer>('customers', customer),
  update: (id: string, customer: Partial<Customer>) => update<Customer>('customers', 'customer_id', id, customer),
  delete: (id: string) => remove('customers', 'customer_id', id),

  searchByName: async (name: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .ilike('name', `%${name}%`);
    if (error) throw error;
    return data as Customer[];
  },

  getWithVehicles: async (customerId: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*, vehicles(*)')
      .eq('customer_id', customerId)
      .single();
    if (error) throw error;
    return data;
  }
};

// ============================================
// VEHICLE SERVICES
// ============================================

export const VehicleService = {
  getAll: () => getAll<Vehicle>('vehicles'),
  getById: (id: string) => getById<Vehicle>('vehicles', 'vehicle_id', id),
  create: (vehicle: Partial<Vehicle>) => create<Vehicle>('vehicles', vehicle),
  update: (id: string, vehicle: Partial<Vehicle>) => update<Vehicle>('vehicles', 'vehicle_id', id, vehicle),
  delete: (id: string) => remove('vehicles', 'vehicle_id', id),
  
  getByCustomer: async (customerId: string) => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', customerId);
    if (error) throw error;
    return data as Vehicle[];
  },
  
  getByPlateNumber: async (plateNumber: string) => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, customer:customers(*)')
      .eq('plate_number', plateNumber)
      .single();
    if (error) throw error;
    return data;
  }
};

// ============================================
// SUPPLIER SERVICES
// ============================================

export const SupplierService = {
  getAll: () => getAll<Supplier>('suppliers'),
  getById: (id: string) => getById<Supplier>('suppliers', 'supplier_id', id),
  create: (supplier: Partial<Supplier>) => create<Supplier>('suppliers', supplier),
  update: (id: string, supplier: Partial<Supplier>) => update<Supplier>('suppliers', 'supplier_id', id, supplier),
  delete: (id: string) => remove('suppliers', 'supplier_id', id)
};

// ============================================
// SALES SERVICES
// ============================================

export const SalesService = {
  getAll: async () => {
    const { data, error } = await supabase.from('sales').select('*');
    if (error) throw error;
    return data as Sale[];
  },
  
  getById: async (saleId: string) => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('sale_id', saleId)
      .single();
    if (error) throw error;
    return data as Sale;
  },

  getSaleItems: async (saleId: string) => {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*, inventory(*)')
      .eq('sale_id', saleId);
    if (error) throw error;
    return data;
  },

  createSale: async (saleItems: Partial<SaleItem>[]) => {
    const { data, error } = await supabase
      .from('sale_items')
      .insert(saleItems)
      .select();
    if (error) throw error;
    return data;
  },

  getDailySales: async (date?: string) => {
    let query = supabase.from('daily_sales_report').select('*');
    
    if (date) {
      query = query.eq('sale_date', date);
    }
    
    const { data, error } = await query.order('sale_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  getSalesByBranch: async (branchId: string) => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('branch_id', branchId)
      .order('sale_date', { ascending: false });
    if (error) throw error;
    return data as Sale[];
  }
};

// ============================================
// SERVICE JOB SERVICES
// ============================================

export const ServiceJobService = {
  getAll: () => getAll<ServiceJob>('service_jobs'),
  getById: (id: string) => getById<ServiceJob>('service_jobs', 'job_id', id),
  create: (job: Partial<ServiceJob>) => create<ServiceJob>('service_jobs', job),
  update: (id: string, job: Partial<ServiceJob>) => update<ServiceJob>('service_jobs', 'job_id', id, job),
  delete: (id: string) => remove('service_jobs', 'job_id', id),

  getByStatus: async (status: string) => {
    const { data, error } = await supabase
      .from('service_jobs')
      .select('*')
      .eq('status', status);
    if (error) throw error;
    return data as ServiceJob[];
  },

  getByVehicle: async (vehicleId: string) => {
    const { data, error } = await supabase
      .from('service_jobs')
      .select('*, vehicle:vehicles(*), customer:customers(*)')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};

// ============================================
// PURCHASE ORDER SERVICES
// ============================================

export const PurchaseOrderService = {
  getAll: () => getAll<PurchaseOrder>('purchase_orders'),
  getById: (id: string) => getById<PurchaseOrder>('purchase_orders', 'po_id', id),
  create: (po: Partial<PurchaseOrder>) => create<PurchaseOrder>('purchase_orders', po),
  update: (id: string, po: Partial<PurchaseOrder>) => update<PurchaseOrder>('purchase_orders', 'po_id', id, po),
  delete: (id: string) => remove('purchase_orders', 'po_id', id),

  getItems: async (poId: string) => {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*, inventory(*)')
      .eq('po_id', poId);
    if (error) throw error;
    return data;
  },

  addItem: (item: Partial<PurchaseOrderItem>) => create<PurchaseOrderItem>('purchase_order_items', item),

  getBySupplier: async (supplierId: string) => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(*)')
      .eq('supplier_id', supplierId)
      .order('order_date', { ascending: false });
    if (error) throw error;
    return data;
  }
};

// ============================================
// DELIVERY SERVICES
// ============================================

export const DeliveryService = {
  getAll: () => getAll<Delivery>('deliveries'),
  getById: (id: string) => getById<Delivery>('deliveries', 'delivery_id', id),
  create: (delivery: Partial<Delivery>) => create<Delivery>('deliveries', delivery),
  update: (id: string, delivery: Partial<Delivery>) => update<Delivery>('deliveries', 'delivery_id', id, delivery),
  delete: (id: string) => remove('deliveries', 'delivery_id', id),

  getItems: async (deliveryId: string) => {
    const { data, error } = await supabase
      .from('delivery_items')
      .select('*, inventory(*)')
      .eq('delivery_id', deliveryId);
    if (error) throw error;
    return data;
  },

  addItem: (item: Partial<DeliveryItem>) => create<DeliveryItem>('delivery_items', item)
};

// ============================================
// RECEIPT SERVICES
// ============================================

export const ReceiptService = {
  getAll: () => getAll<Receipt>('receipts'),
  getById: (id: string) => getById<Receipt>('receipts', 'receipt_id', id),
  create: (receipt: Partial<Receipt>) => create<Receipt>('receipts', receipt),
  
  getBySale: async (saleId: string) => {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('sale_id', saleId)
      .single();
    if (error) throw error;
    return data as Receipt;
  },

  getByServiceJob: async (jobId: string) => {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('job_id', jobId)
      .single();
    if (error) throw error;
    return data as Receipt;
  }
};

// ============================================
// NOTIFICATION SERVICES
// ============================================

export const NotificationService = {
  getAll: () => getAll<Notification>('notifications'),
  getById: (id: string) => getById<Notification>('notifications', 'notification_id', id),
  create: (notification: Partial<Notification>) => create<Notification>('notifications', notification),
  update: (id: string, notification: Partial<Notification>) => 
    update<Notification>('notifications', 'notification_id', id, notification),
  delete: (id: string) => remove('notifications', 'notification_id', id),

  getUnread: async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Notification[];
  },

  markAsRead: async (notificationId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('notification_id', notificationId)
      .select()
      .single();
    if (error) throw error;
    return data as Notification;
  }
};

// ============================================
// SYSTEM SETTINGS SERVICES
// ============================================

export const SystemSettingsService = {
  getAll: () => getAll<SystemSetting>('system_settings'),
  getByKey: async (key: string) => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single();
    if (error) throw error;
    return data as SystemSetting;
  },
  update: (id: string, setting: Partial<SystemSetting>) => 
    update<SystemSetting>('system_settings', 'setting_id', id, setting)
};

// ============================================
// AUDIT LOG SERVICES
// ============================================

export const AuditLogService = {
  getAll: () => getAll<AuditLog>('audit_logs'),
  create: (log: Partial<AuditLog>) => create<AuditLog>('audit_logs', log),

  getByUser: async (userId: string, limit = 50) => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as AuditLog[];
  },

  getByAction: async (action: string) => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', action)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as AuditLog[];
  }
};