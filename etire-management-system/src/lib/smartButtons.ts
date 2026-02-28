/**
 * smartButtons.ts
 * ---------------
 * Fetches the related-record counts that power Odoo's "Smart Button" stat blocks
 * shown at the top of Form Views.
 *
 * Example — Customer form shows:
 *   [ 5 Sales ]  [ 2 Vehicles ]  [ 3 Service Jobs ]  [ ₱12,500 Revenue ]
 *
 * Each function returns counts/aggregates ready to be passed to <StatCard />.
 */
'use server';

import { createClient } from '@/lib/supabaseServer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

// ── Shared result type ─────────────────────────────────────────────────────

export interface SmartButtonData {
  label:    string;
  value:    number | string;
  href?:    string;   // optional click-through link to filtered list view
  icon?:    string;   // lucide icon name string
  color?:   string;   // Tailwind text color class
  loading?: boolean;
}

// ── Customer Smart Buttons ─────────────────────────────────────────────────

export async function getCustomerSmartButtons(
  customerId: string
): Promise<SmartButtonData[]> {
  const supabase: AnyClient = await createClient();

  const [salesRes, vehiclesRes, serviceRes] = await Promise.all([
    // Total sales & revenue
    supabase
      .from('sale')
      .select('sale_id, total_amount')
      .eq('customer_id', customerId)
      .is('deleted_at', null),

    // Registered vehicles
    supabase
      .from('vehicle')
      .select('vehicle_id')
      .eq('customer_id', customerId)
      .is('deleted_at', null),

    // Service jobs
    supabase
      .from('service_job')
      .select('job_id, status')
      .eq('customer_id', customerId)
      .is('deleted_at', null),
  ]);

  const sales        = salesRes.data ?? [];
  const vehicles     = vehiclesRes.data ?? [];
  const serviceJobs  = serviceRes.data ?? [];
  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_amount ?? 0), 0);
  const openJobs     = serviceJobs.filter(j =>
    ['quotation','in_progress','quality_check','pending','in-progress'].includes(j.status)
  ).length;

  return [
    {
      label: 'Sales',
      value: sales.length,
      href:  `/pos?customer=${customerId}`,
      icon:  'ShoppingCart',
      color: 'text-orange-600',
    },
    {
      label: 'Revenue',
      value: `₱${totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon:  'TrendingUp',
      color: 'text-green-600',
    },
    {
      label: 'Vehicles',
      value: vehicles.length,
      href:  `/customers/${customerId}#vehicles`,
      icon:  'Car',
      color: 'text-blue-600',
    },
    {
      label: 'Service Jobs',
      value: serviceJobs.length,
      href:  `/services?customer=${customerId}`,
      icon:  'Wrench',
      color: 'text-yellow-600',
    },
    ...(openJobs > 0
      ? [{
          label: 'Open Jobs',
          value: openJobs,
          href:  `/services?customer=${customerId}&status=open`,
          icon:  'Clock',
          color: 'text-red-600',
        }]
      : []),
  ];
}

// ── Supplier Smart Buttons ─────────────────────────────────────────────────

export async function getSupplierSmartButtons(
  supplierId: string
): Promise<SmartButtonData[]> {
  const supabase: AnyClient = await createClient();

  const [poRes, itemsRes] = await Promise.all([
    supabase
      .from('purchase_order')
      .select('po_id, total_amount, status, state')
      .eq('supplier_id', supplierId)
      .is('deleted_at', null),

    supabase
      .from('inventory_item')
      .select('item_id')
      .eq('supplier_id', supplierId)
      .is('deleted_at', null),
  ]);

  const orders     = poRes.data ?? [];
  const items      = itemsRes.data ?? [];
  const totalSpend = orders.reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0);
  const openOrders = orders.filter(o =>
    ['draft','sent','purchase','pending','approved','ordered'].includes(o.state ?? o.status)
  ).length;

  return [
    {
      label: 'Purchase Orders',
      value: orders.length,
      href:  `/purchasing?supplier=${supplierId}`,
      icon:  'Package',
      color: 'text-purple-600',
    },
    {
      label: 'Total Spend',
      value: `₱${totalSpend.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon:  'DollarSign',
      color: 'text-green-600',
    },
    {
      label: 'Items Supplied',
      value: items.length,
      href:  `/inventory?supplier=${supplierId}`,
      icon:  'Boxes',
      color: 'text-blue-600',
    },
    ...(openOrders > 0
      ? [{
          label: 'Open Orders',
          value: openOrders,
          href:  `/purchasing?supplier=${supplierId}&status=open`,
          icon:  'Clock',
          color: 'text-orange-600',
        }]
      : []),
  ];
}

// ── Purchase Order Smart Buttons ───────────────────────────────────────────

export async function getPurchaseOrderSmartButtons(
  poId: string
): Promise<SmartButtonData[]> {
  const supabase: AnyClient = await createClient();

  const [deliveriesRes, movesRes] = await Promise.all([
    supabase
      .from('delivery')
      .select('delivery_id')
      .eq('po_id', poId),

    supabase
      .from('inventory_moves')
      .select('move_id, quantity_moved')
      .eq('source_document_type', 'purchase')
      .eq('source_document_id', poId),
  ]);

  const deliveries = deliveriesRes.data ?? [];
  const moves = movesRes.data ?? [];
  const totalReceived = moves.reduce((acc, m) => acc + Number(m.quantity_moved ?? 0), 0);

  return [
    {
      label: 'Receipts',
      value: deliveries.length,
      href:  `/purchasing/${poId}/receipts`,
      icon:  'ClipboardList',
      color: 'text-teal-600',
    },
    {
      label: 'Qty Received',
      value: totalReceived,
      icon:  'PackageCheck',
      color: 'text-green-600',
    },
  ];
}

// ── Service Job Smart Buttons ──────────────────────────────────────────────

export async function getServiceJobSmartButtons(
  jobId: string
): Promise<SmartButtonData[]> {
  const supabase: AnyClient = await createClient();

  const [itemsRes, saleRes] = await Promise.all([
    supabase
      .from('service_job_item')
      .select('service_job_item_id, quantity, price_at_service')
      .eq('job_id', jobId),

    supabase
      .from('sale')
      .select('sale_id, total_amount')
      .eq('service_job_id', jobId)
      .is('deleted_at', null),
  ]);

  const items = itemsRes.data ?? [];
  const sales = saleRes.data ?? [];
  const totalBilled = sales.reduce((a, s) => a + Number(s.total_amount ?? 0), 0);

  return [
    {
      label: 'Parts Used',
      value: items.length,
      icon:  'Wrench',
      color: 'text-yellow-600',
    },
    {
      label: 'Invoices',
      value: sales.length,
      href:  `/pos?service_job=${jobId}`,
      icon:  'Receipt',
      color: 'text-blue-600',
    },
    ...(totalBilled > 0
      ? [{
          label: 'Total Billed',
          value: `₱${totalBilled.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          icon:  'DollarSign',
          color: 'text-green-600',
        }]
      : []),
  ];
}

// ── Inventory Item Smart Buttons ───────────────────────────────────────────

export async function getInventoryItemSmartButtons(
  itemId: string,
  branchId?: string
): Promise<SmartButtonData[]> {
  const supabase: AnyClient = await createClient();

  let movesQuery = supabase
    .from('inventory_moves')
    .select('move_id, quantity_moved, source_document_type')
    .eq('item_id', itemId);

  if (branchId) movesQuery = movesQuery.eq('branch_id', branchId);

  const { data: moves } = await movesQuery;

  const allMoves   = moves ?? [];
  const qtyOnHand  = allMoves.reduce((a, m) => a + Number(m.quantity_moved), 0);
  const incoming   = allMoves.filter(m => m.source_document_type === 'purchase' && m.quantity_moved > 0);
  const outgoing   = allMoves.filter(m => m.quantity_moved < 0);

  return [
    {
      label: 'On Hand',
      value: qtyOnHand,
      icon:  'PackageOpen',
      color: qtyOnHand > 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Total Receipts',
      value: incoming.length,
      href:  `/inventory/${itemId}/moves?type=purchase`,
      icon:  'PackagePlus',
      color: 'text-blue-600',
    },
    {
      label: 'Total Deliveries',
      value: outgoing.length,
      href:  `/inventory/${itemId}/moves?type=sale`,
      icon:  'PackageMinus',
      color: 'text-orange-600',
    },
  ];
}
