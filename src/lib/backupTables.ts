export const TABLE_DEPENDENCY_ORDER = [
  'vehicle_type',
  'user',
  'branch',
  'supplier',
  'inventory_item',
  'customer',
  'vehicle',
  'sale',
  'sale_item',
  'service_job',
  'purchase_order',
  'purchase_order_item',
  'tire_history',
  'delivery',
  'delivery_item',
  'system_setting',
  'audit_log'
] as const;

export type BackupTableName = typeof TABLE_DEPENDENCY_ORDER[number];
