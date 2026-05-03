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
  'tire_history',
  'purchase_order',
  'purchase_order_item',
  'delivery',
  'delivery_item',
  'system_settings',
  'audit_log'
] as const;

export type BackupTableName = typeof TABLE_DEPENDENCY_ORDER[number];

export const READ_ONLY_BACKUP_TABLES = [
  'tire_history'
] as const;
