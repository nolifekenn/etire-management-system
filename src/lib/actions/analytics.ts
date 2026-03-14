'use server';

/**
 * src/lib/actions/analytics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 3 — Reporting & Dashboard Analytics Server Actions
 *
 * All aggregations are derived from the Phase 2 inventory ledger
 * (`inventory_moves`) and the operational state machines.
 *
 *  1. getExecutiveSummary   — KPI card data (revenue, inv value, POs, services)
 *  2. getRevenueCOGSChart   — Daily revenue vs COGS (last 30 days) from ledger
 *  3. getInventoryByCategory — Donut chart: inventory value by category
 *  4. getWorkshopAnalytics  — Parts vs Labor revenue split from completed jobs
 *  5. getSalesReport        — Paginated, filterable, groupable sales rows
 *  6. getInventoryReport    — Inventory valuation rows with ledger on-hand qty
 *  7. getServiceReport      — Service job rows filterable by state/mechanic
 */

import { createClient }  from '@/lib/supabaseServer';
import { isOpenPurchaseOrder } from '@/lib/poUtils';
import { subDays, format } from 'date-fns';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;
type AnyRecord  = Record<string, unknown>;

// ── Shared filter type ────────────────────────────────────────────────────────

export interface DateRangeFilter {
  branch_id?:  string;
  date_from?:  string;   // ISO date string, e.g. '2026-01-01'
  date_to?:    string;   // ISO date string
}

// ── 1. getExecutiveSummary ────────────────────────────────────────────────────

export interface ExecutiveSummary {
  total_sales_revenue:  number;
  total_sales_count:    number;
  inventory_value:      number;
  inventory_item_count: number;
  open_pos_count:       number;
  pending_services:     number;
  // Month-over-month trend (delta %)
  revenue_mom_pct:      number | null;
}

export async function getExecutiveSummary(
  filter: DateRangeFilter = {}
): Promise<{ success: boolean; data: ExecutiveSummary | null; error: string | null }> {
  const supabase: AnyClient = await createClient();
  const { branch_id, date_from, date_to } = filter;

  try {
    // ── Revenue: sum from completed/confirmed sales ──────────────────
    let salesQ = supabase
      .from('sale')
      .select('total_amount, sale_date')
      .is('deleted_at', null)
      .in('state', ['confirmed', 'done']);

    if (branch_id) salesQ = salesQ.eq('branch_id', branch_id);
    if (date_from) salesQ = salesQ.gte('sale_date', date_from);
    if (date_to)   salesQ = salesQ.lte('sale_date', date_to + 'T23:59:59');

    const { data: salesData, error: salesErr } = await salesQ;
    if (salesErr) throw salesErr;

    const totalRevenue = (salesData as AnyRecord[]).reduce(
      (acc, s) => acc + Number(s.total_amount ?? 0), 0
    );
    const salesCount = salesData?.length ?? 0;

    // ── Previous period revenue (for MoM comparison) ─────────────────
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    const sixtyDaysAgo  = subDays(new Date(), 60).toISOString();

    let prevSalesQ = supabase
      .from('sale')
      .select('total_amount')
      .is('deleted_at', null)
      .in('state', ['confirmed', 'done'])
      .gte('sale_date', sixtyDaysAgo)
      .lte('sale_date', thirtyDaysAgo);
    if (branch_id) prevSalesQ = prevSalesQ.eq('branch_id', branch_id);

    const { data: prevSalesData } = await prevSalesQ;
    const prevRevenue = (prevSalesData ?? []).reduce(
      (acc: number, s: AnyRecord) => acc + Number(s.total_amount ?? 0), 0
    );
    const revenueMoM = prevRevenue > 0
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
      : null;

    // ── Inventory value: SUM(stock_quantity * cost_price) ─────────────
    // Uses cached stock_quantity; for precise ledger-based value use v_stock_on_hand
    let invQ = supabase
      .from('inventory_item')
      .select('item_id, stock_quantity, cost_price')
      .is('deleted_at', null);
    if (branch_id) invQ = invQ.eq('branch_id', branch_id);

    const { data: invData, error: invErr } = await invQ;
    if (invErr) throw invErr;

    const inventoryValue = (invData as AnyRecord[]).reduce(
      (acc, i) => acc + Number(i.stock_quantity ?? 0) * Number(i.cost_price ?? 0), 0
    );

    // ── Open POs: treat both legacy status and current state values as open ──
    let poQ = supabase
      .from('purchase_order')
      .select('po_id, state, status')
      .is('deleted_at', null);
    if (branch_id) poQ = poQ.eq('branch_id', branch_id);

    const { data: poData, error: poErr } = await poQ;
    if (poErr) throw poErr;

    const openPOs = (poData ?? []).filter((po: AnyRecord) =>
      isOpenPurchaseOrder((po.state ?? po.status) as string | null | undefined)
    ).length;

    // ── Pending services: jobs in active states ───────────────────────
    let sjQ = supabase
      .from('service_job')
      .select('job_id', { count: 'exact', head: true })
      .in('state', ['quotation', 'confirmed', 'in_progress', 'quality_check'])
      .is('deleted_at', null);
    if (branch_id) sjQ = sjQ.eq('branch_id', branch_id);

    const { count: pendingServices } = await sjQ;

    return {
      success: true,
      error:   null,
      data: {
        total_sales_revenue:  totalRevenue,
        total_sales_count:    salesCount,
        inventory_value:      inventoryValue,
        inventory_item_count: invData?.length ?? 0,
        open_pos_count:       openPOs,
        pending_services:     pendingServices ?? 0,
        revenue_mom_pct:      revenueMoM != null ? Math.round(revenueMoM * 10) / 10 : null,
      },
    };
  } catch (e) {
    return { success: false, data: null, error: String(e) };
  }
}

// ── 2. getRevenueCOGSChart ────────────────────────────────────────────────────

export interface RevenueCOGSPoint {
  date:    string;   // 'Jan 01'
  revenue: number;
  cogs:    number;
  gross:   number;   // revenue - cogs
}

/**
 * Returns daily Revenue vs COGS for the last N days.
 * Revenue = sale.total_amount (from confirmed/done sales)
 * COGS    = ABS(SUM(inventory_moves.quantity_moved * unit_cost))
 *           WHERE source_document_type = 'sale' AND quantity_moved < 0
 */
export async function getRevenueCOGSChart(
  filter: DateRangeFilter & { days?: number } = {}
): Promise<{ success: boolean; data: RevenueCOGSPoint[]; error: string | null }> {
  const supabase: AnyClient = await createClient();
  const { branch_id, days = 30 } = filter;

  const dateFrom = subDays(new Date(), days);

  try {
    // Revenue per day
    let revQ = supabase
      .from('sale')
      .select('total_amount, sale_date')
      .is('deleted_at', null)
      .in('state', ['confirmed', 'done'])
      .gte('sale_date', dateFrom.toISOString());
    if (branch_id) revQ = revQ.eq('branch_id', branch_id);

    const { data: revData, error: revErr } = await revQ;
    if (revErr) throw revErr;

    // COGS per day from inventory_moves ledger
    let cogsQ = supabase
      .from('inventory_moves')
      .select('quantity_moved, unit_cost, created_at, branch_id')
      .eq('source_document_type', 'sale')
      .lt('quantity_moved', 0)   // only outbound moves
      .gte('created_at', dateFrom.toISOString());
    if (branch_id) cogsQ = cogsQ.eq('branch_id', branch_id);

    const { data: cogsData, error: cogsErr } = await cogsQ;
    if (cogsErr) throw cogsErr;

    // Build day → amounts map
    const revenueByDay = new Map<string, number>();
    const cogsByDay    = new Map<string, number>();

    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'MMM dd');
      revenueByDay.set(d, 0);
      cogsByDay.set(d, 0);
    }

    for (const row of (revData as AnyRecord[]) ?? []) {
      const d = format(new Date(row.sale_date as string), 'MMM dd');
      if (revenueByDay.has(d)) {
        revenueByDay.set(d, (revenueByDay.get(d) ?? 0) + Number(row.total_amount ?? 0));
      }
    }

    for (const row of (cogsData as AnyRecord[]) ?? []) {
      const d = format(new Date(row.created_at as string), 'MMM dd');
      if (cogsByDay.has(d)) {
        const cost = Math.abs(Number(row.quantity_moved ?? 0) * Number(row.unit_cost ?? 0));
        cogsByDay.set(d, (cogsByDay.get(d) ?? 0) + cost);
      }
    }

    const points: RevenueCOGSPoint[] = Array.from(revenueByDay.entries()).map(([date, revenue]) => {
      const cogs = cogsByDay.get(date) ?? 0;
      return { date, revenue: Math.round(revenue), cogs: Math.round(cogs), gross: Math.round(revenue - cogs) };
    });

    return { success: true, data: points, error: null };
  } catch (e) {
    return { success: false, data: [], error: String(e) };
  }
}

// ── 3. getInventoryByCategory ─────────────────────────────────────────────────

export interface InventoryCategoryPoint {
  category: string;
  value:    number;   // total value = SUM(stock_quantity * cost_price)
  count:    number;   // SKU count
  color:    string;
}

const CATEGORY_COLORS: Record<string, string> = {
  tire:      '#3b82f6',   // blue-500
  tool:      '#f59e0b',   // amber-500
  accessory: '#10b981',   // emerald-500
  service:   '#8b5cf6',   // violet-500
};

export async function getInventoryByCategory(
  filter: DateRangeFilter = {}
): Promise<{ success: boolean; data: InventoryCategoryPoint[]; error: string | null }> {
  const supabase: AnyClient = await createClient();
  const { branch_id } = filter;

  try {
    let q = supabase
      .from('inventory_item')
      .select('category, stock_quantity, cost_price')
      .is('deleted_at', null);
    if (branch_id) q = q.eq('branch_id', branch_id);

    const { data, error } = await q;
    if (error) throw error;

    const map = new Map<string, { value: number; count: number }>();

    for (const row of (data as AnyRecord[]) ?? []) {
      const cat = (row.category as string) || 'other';
      const val = Number(row.stock_quantity ?? 0) * Number(row.cost_price ?? 0);

      if (!map.has(cat)) map.set(cat, { value: 0, count: 0 });
      const entry = map.get(cat)!;
      entry.value  += val;
      entry.count  += 1;
    }

    const points: InventoryCategoryPoint[] = Array.from(map.entries())
      .map(([category, { value, count }]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        value:    Math.round(value),
        count,
        color:    CATEGORY_COLORS[category] ?? '#6b7280',
      }))
      .sort((a, b) => b.value - a.value);

    return { success: true, data: points, error: null };
  } catch (e) {
    return { success: false, data: [], error: String(e) };
  }
}

// ── 4. getWorkshopAnalytics ───────────────────────────────────────────────────

export interface WorkshopAnalytics {
  total_jobs_completed: number;
  total_revenue:        number;
  parts_revenue:        number;
  labor_revenue:        number;
  avg_job_value:        number;
  inventory_consumed_value: number;   // from inventory_moves
}

export async function getWorkshopAnalytics(
  filter: DateRangeFilter = {}
): Promise<{ success: boolean; data: WorkshopAnalytics | null; error: string | null }> {
  const supabase: AnyClient = await createClient();
  const { branch_id, date_from, date_to } = filter;

  try {
    // Completed jobs
    let jobsQ = supabase
      .from('service_job')
      .select(`
        job_id,
        service_job_item ( quantity, price_at_service,
          catalog_item:item_id ( category ) )
      `)
      .in('state', ['completed', 'invoiced'])
      .is('deleted_at', null);

    if (branch_id) jobsQ = jobsQ.eq('branch_id', branch_id);
    if (date_from) jobsQ = jobsQ.gte('job_date', date_from);
    if (date_to)   jobsQ = jobsQ.lte('job_date', date_to + 'T23:59:59');

    const { data: jobs, error: jobsErr } = await jobsQ;
    if (jobsErr) throw jobsErr;

    let partsRevenue = 0;
    let laborRevenue = 0;

    for (const job of (jobs as AnyRecord[]) ?? []) {
      for (const item of (job.service_job_item as AnyRecord[]) ?? []) {
        const ci  = item.catalog_item as AnyRecord | null;
        const sub = Number(item.price_at_service ?? 0) * Number(item.quantity ?? 1);
        if (ci?.category === 'service' || !ci) {
          laborRevenue += sub;
        } else {
          partsRevenue += sub;
        }
      }
    }

    const totalRevenue = partsRevenue + laborRevenue;
    const count        = (jobs as AnyRecord[]).length;

    // Total stock consumed through service moves
    let movesQ = supabase
      .from('inventory_moves')
      .select('quantity_moved, unit_cost')
      .eq('source_document_type', 'service')
      .lt('quantity_moved', 0);
    if (branch_id) movesQ = movesQ.eq('branch_id', branch_id);
    if (date_from) movesQ = movesQ.gte('created_at', date_from);
    if (date_to)   movesQ = movesQ.lte('created_at', date_to + 'T23:59:59');

    const { data: movesData } = await movesQ;
    const inventoryConsumed = (movesData as AnyRecord[] ?? []).reduce(
      (acc, m) => acc + Math.abs(Number(m.quantity_moved ?? 0) * Number(m.unit_cost ?? 0)), 0
    );

    return {
      success: true,
      error:   null,
      data: {
        total_jobs_completed:      count,
        total_revenue:             Math.round(totalRevenue * 100) / 100,
        parts_revenue:             Math.round(partsRevenue * 100) / 100,
        labor_revenue:             Math.round(laborRevenue * 100) / 100,
        avg_job_value:             count > 0 ? Math.round((totalRevenue / count) * 100) / 100 : 0,
        inventory_consumed_value:  Math.round(inventoryConsumed * 100) / 100,
      },
    };
  } catch (e) {
    return { success: false, data: null, error: String(e) };
  }
}

// ── 5. getSalesReport ─────────────────────────────────────────────────────────

export interface SalesReportFilter extends DateRangeFilter {
  status?:   string;
  search?:   string;
  group_by?: 'day' | 'week' | 'month' | 'customer' | 'payment_method' | 'none';
  page?:     number;
  page_size?: number;
}

export interface SalesReportRow {
  sale_id:        string;
  sale_number:    string | null;
  sale_date:      string;
  customer_name:  string | null;
  branch_name:    string | null;
  payment_method: string;
  status:         string;
  total_amount:   number;
  discount:       number;
  items_count:    number;
}

export async function getSalesReport(filter: SalesReportFilter = {}) {
  const supabase: AnyClient = await createClient();
  const {
    branch_id, date_from, date_to, status, search,
    page = 1, page_size = 100,
  } = filter;

  const offset = (page - 1) * page_size;

  let q = supabase
    .from('sale')
    .select(`
      sale_id, sale_number, sale_date, payment_method, state,
      total_amount, discount_amount,
      customer:customer_id ( name ),
      branch:branch_id     ( name ),
      sale_item ( sale_item_id )
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .range(offset, offset + page_size - 1);

  if (branch_id) q = q.eq('branch_id', branch_id);
  if (status)    q = q.eq('state', status);
  if (date_from) q = q.gte('sale_date', date_from);
  if (date_to)   q = q.lte('sale_date', date_to + 'T23:59:59');

  const { data, count, error } = await q;
  if (error) return { success: false, rows: [], total: 0, error: error.message };

  const rows: SalesReportRow[] = (data as AnyRecord[]).filter(row => {
    if (!search) return true;
    const q2 = search.toLowerCase();
    return (
      ((row.sale_number as string) ?? '').toLowerCase().includes(q2) ||
      ((row.customer as AnyRecord)?.name as string ?? '').toLowerCase().includes(q2)
    );
  }).map(row => {
    const customer  = row.customer  as AnyRecord | null;
    const branch    = row.branch    as AnyRecord | null;
    const saleItems = (row.sale_item as AnyRecord[]) ?? [];
    return {
      sale_id:        row.sale_id as string,
      sale_number:    (row.sale_number as string) ?? null,
      sale_date:      row.sale_date as string,
      customer_name:  (customer?.name as string) ?? null,
      branch_name:    (branch?.name as string)   ?? null,
      payment_method: (row.payment_method as string) ?? 'cash',
      status:         (row.state as string)      ?? 'draft',
      total_amount:   Number(row.total_amount    ?? 0),
      discount:       Number(row.discount_amount ?? 0),
      items_count:    saleItems.length,
    };
  });

  return { success: true, rows, total: count ?? 0, error: null };
}

// ── 6. getInventoryReport ─────────────────────────────────────────────────────

export interface InventoryReportFilter extends DateRangeFilter {
  category?: string;
  low_stock_only?: boolean;
  group_by?: 'category' | 'supplier' | 'none';
}

export interface InventoryReportRow {
  item_id:           string;
  name:              string;
  category:          string;
  sku:               string | null;
  branch_name:       string | null;
  supplier_name:     string | null;
  stock_quantity:    number;
  ledger_on_hand:    number;    // from SUM(inventory_moves)
  cost_price:        number;
  sale_price:        number;
  stock_value:       number;    // stock_quantity * cost_price
  reorder_level:     number;
  is_low_stock:      boolean;
}

export async function getInventoryReport(filter: InventoryReportFilter = {}) {
  const supabase: AnyClient = await createClient();
  const { branch_id, category, low_stock_only } = filter;

  // Get inventory items with joins
  let q = supabase
    .from('inventory_item')
    .select(`
      item_id, name, category, sku, stock_quantity, cost_price,
      sale_price, reorder_level,
      branch:branch_id     ( name ),
      supplier:supplier_id ( name )
    `)
    .is('deleted_at', null)
    .order('name');

  if (branch_id) q = q.eq('branch_id', branch_id);
  if (category)  q = q.eq('category', category);

  const { data, error } = await q;
  if (error) return { success: false, rows: [], error: error.message };

  // Get ledger-based on-hand quantities
  let ledgerQ = supabase
    .from('inventory_moves')
    .select('item_id, quantity_moved');
  if (branch_id) ledgerQ = ledgerQ.eq('branch_id', branch_id);

  const { data: ledgerData } = await ledgerQ;
  const ledgerMap = new Map<string, number>();
  for (const m of (ledgerData as AnyRecord[]) ?? []) {
    const id  = m.item_id as string;
    ledgerMap.set(id, (ledgerMap.get(id) ?? 0) + Number(m.quantity_moved ?? 0));
  }

  let rows: InventoryReportRow[] = (data as AnyRecord[]).map(row => {
    const branch    = row.branch    as AnyRecord | null;
    const supplier  = row.supplier  as AnyRecord | null;
    const stockQty  = Number(row.stock_quantity ?? 0);
    const costPrice = Number(row.cost_price     ?? 0);
    const reorder   = Number(row.reorder_level  ?? 5);
    const ledgerQty = ledgerMap.get(row.item_id as string) ?? stockQty;

    return {
      item_id:        row.item_id as string,
      name:           row.name as string,
      category:       row.category as string,
      sku:            (row.sku as string) ?? null,
      branch_name:    (branch?.name   as string) ?? null,
      supplier_name:  (supplier?.name as string) ?? null,
      stock_quantity: stockQty,
      ledger_on_hand: ledgerQty,
      cost_price:     costPrice,
      sale_price:     Number(row.sale_price ?? 0),
      stock_value:    Math.round(stockQty * costPrice * 100) / 100,
      reorder_level:  reorder,
      is_low_stock:   stockQty <= reorder,
    };
  });

  if (low_stock_only) rows = rows.filter(r => r.is_low_stock);

  return { success: true, rows, error: null };
}

// ── 7. getServiceReport ───────────────────────────────────────────────────────

export interface ServiceReportFilter extends DateRangeFilter {
  state?:      string;
  mechanic_id?: string;
  group_by?:   'state' | 'mechanic' | 'priority' | 'none';
}

export interface ServiceReportRow {
  job_id:          string;
  job_number:      string | null;
  job_date:        string;
  state:           string;
  priority:        string;
  customer_name:   string | null;
  plate_number:    string | null;
  mechanic_name:   string | null;
  branch_name:     string | null;
  items_count:     number;
  total_value:     number;
  parts_value:     number;
  labor_value:     number;
}

export async function getServiceReport(filter: ServiceReportFilter = {}) {
  const supabase: AnyClient = await createClient();
  const { branch_id, date_from, date_to, state, mechanic_id } = filter;

  let q = supabase
    .from('service_job')
    .select(`
      job_id, job_number, job_date, state, priority,
      customer:customer_id ( name ),
      vehicle:vehicle_id   ( plate_number ),
      mechanic:mechanic_id ( name ),
      branch:branch_id     ( name ),
      service_job_item (
        quantity, price_at_service,
        catalog_item:item_id ( category )
      )
    `)
    .is('deleted_at', null)
    .order('job_date', { ascending: false });

  if (branch_id)   q = q.eq('branch_id', branch_id);
  if (state)       q = q.eq('state', state);
  if (mechanic_id) q = q.eq('mechanic_id', mechanic_id);
  if (date_from)   q = q.gte('job_date', date_from);
  if (date_to)     q = q.lte('job_date', date_to + 'T23:59:59');

  const { data, error } = await q;
  if (error) return { success: false, rows: [], error: error.message };

  const rows: ServiceReportRow[] = (data as AnyRecord[]).map(row => {
    const customer  = row.customer  as AnyRecord | null;
    const vehicle   = row.vehicle   as AnyRecord | null;
    const mechanic  = row.mechanic  as AnyRecord | null;
    const branch    = row.branch    as AnyRecord | null;
    const items     = (row.service_job_item as AnyRecord[]) ?? [];

    let partsValue = 0;
    let laborValue = 0;

    for (const item of items) {
      const ci  = item.catalog_item as AnyRecord | null;
      const sub = Number(item.price_at_service ?? 0) * Number(item.quantity ?? 1);
      if (!ci || ci.category === 'service') laborValue += sub;
      else partsValue += sub;
    }

    return {
      job_id:       row.job_id as string,
      job_number:   (row.job_number as string) ?? null,
      job_date:     row.job_date as string,
      state:        (row.state as string) ?? 'quotation',
      priority:     ({ 0: 'low', 1: 'normal', 2: 'high', 3: 'urgent' }[Number(row.priority)] ?? 'normal'),

      customer_name: (customer?.name       as string) ?? null,
      plate_number:  (vehicle?.plate_number as string) ?? null,
      mechanic_name: (mechanic?.name       as string) ?? null,
      branch_name:   (branch?.name         as string) ?? null,
      items_count:   items.length,
      total_value:   Math.round((partsValue + laborValue) * 100) / 100,
      parts_value:   Math.round(partsValue * 100) / 100,
      labor_value:   Math.round(laborValue * 100) / 100,
    };
  });

  return { success: true, rows, error: null };
}

