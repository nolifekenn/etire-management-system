'use server';

/**
 * src/lib/actions/inventory.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Next.js Server Actions for the Inventory Module (Phase 2).
 *
 * Covers:
 *  1. listProducts          — Paginated / filtered product list with computed stock
 *  2. getProductWithDetails — Full product fetch with moves ledger
 *  3. upsertProduct         — Create or update a product master record
 *  4. createAdjustment      — Manual inventory adjustment (cycle count / scrap)
 *  5. getProductMoves       — Paginated move history for a product
 *  6. getInventorySmartButtons — Smart button data for product form view
 *  7. getOperationCounts    — Kanban card counts for Operations Dashboard
 */

import { createClient }    from '@/lib/supabaseServer';
import { isOpenPurchaseOrder } from '@/lib/poUtils';
import { revalidatePath }  from 'next/cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

// ── Shared type ────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

// ── Input interfaces ───────────────────────────────────────────────────────

export interface ListProductsInput {
  branch_id?:    string;
  category?:     string;
  low_stock?:    boolean;
  out_of_stock?: boolean;
  search?:       string;
  group_by?:     'category' | 'vehicle_type' | null;
  page?:         number;
  page_size?:    number;
}

export interface UpsertProductInput {
  item_id?:       string;          // omit → create
  branch_id:      string;
  supplier_id?:   string;
  name:           string;
  category:       'tire' | 'tool' | 'accessory' | 'service';
  vehicle_type?:  'car' | 'motor' | 'truck';
  cost_price:     number;
  sale_price:     number;
  reorder_level:  number;
  size_id?:       string;
  brand_id?:      string;
  tire_pattern?:  string;   // optional, shown when category = 'tire'
  ply_rating?:    number;   // optional, shown when category = 'tire'
}

export interface AdjustmentLine {
  item_id:          string;
  quantity_counted: number;        // physical count result
  note?:            string;
}

export interface CreateAdjustmentInput {
  branch_id:   string;
  user_id:     string;
  reason:      'cycle_count' | 'scrap' | 'correction' | 'other';
  note?:       string;
  lines:       AdjustmentLine[];
}

export interface GetProductMovesInput {
  item_id:     string;
  branch_id?:  string;
  page?:       number;
  page_size?:  number;
}

// ── 1. listProducts ────────────────────────────────────────────────────────

export async function listProducts(input: ListProductsInput = {}) {
  const supabase: AnyClient = await createClient();

  const {
    branch_id,
    category,
    low_stock    = false,
    out_of_stock = false,
    search       = '',
    page         = 1,
    page_size    = 50,
  } = input;

  let query = supabase
    .from('inventory_item')
    .select(`
      item_id,
      branch_id,
      supplier_id,
      name,
      category,
      vehicle_type,
      stock_quantity,
      cost_price,
      sale_price,
      reorder_level,
      size_id,
      brand_id,
      tire_pattern,
      ply_rating,
      created_at,
      updated_at,
      tire_size:size_id ( label ),
      tire_brand:brand_id ( name ),
      branch:branch_id ( name ),
      supplier:supplier_id ( name )
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range((page - 1) * page_size, page * page_size - 1);

  if (branch_id) query = query.eq('branch_id', branch_id);
  if (category)  query = query.eq('category', category);
  if (search)    query = query.ilike('name', `%${search}%`);
  if (out_of_stock) query = query.eq('stock_quantity', 0);

  const { data, count, error } = await query;

  if (error) return { success: false, error: error.message, items: [], total: 0 };

  // For low_stock filter: stock_quantity > 0 AND stock_quantity < reorder_level
  // (Supabase SDK can't do column-to-column comparisons cleanly, so we filter client-side)
  const items: AnyRecord[] = (data ?? []) as AnyRecord[];
  const filtered = low_stock
    ? items.filter(i => Number(i.stock_quantity) > 0 && Number(i.stock_quantity) < Number(i.reorder_level))
    : items;

  return { success: true, items: filtered, total: count ?? filtered.length };
}

// ── 2. getProductWithDetails ───────────────────────────────────────────────

export async function getProductWithDetails(itemId: string) {
  const supabase: AnyClient = await createClient();

  const fetchMain = () => supabase
    .from('inventory_item')
    .select(`
      *,
      tire_size:size_id ( label ),
      tire_brand:brand_id ( name ),
      branch:branch_id ( name, address, phone ),
      supplier:supplier_id ( name, phone, email )
    `)
    .eq('item_id', itemId)
    .is('deleted_at', null)
    .maybeSingle();

  let { data, error } = await fetchMain();

  // Retry with increasing delays — handles the brief visibility window after a
  // newly-created product is inserted (RLS evaluation timing, pgbouncer routing).
  const RETRY_DELAYS_MS = [400, 700, 1000];
  for (const delay of RETRY_DELAYS_MS) {
    if (data || error) break;
    await new Promise(r => setTimeout(r, delay));
    ({ data, error } = await fetchMain());
  }

  if (error) return { success: false, error: error.message, product: null };
  if (!data)  return { success: false, error: 'Product not found', product: null };

  // Fetch recent delivery moves (incoming stock)
  const { data: deliveryMoves } = await supabase
    .from('delivery_item')
    .select(`
      delivery_item_id,
      quantity_received,
      quantity_damaged,
      notes,
      created_at,
      delivery:delivery_id (
        delivery_date,
        po:po_id ( po_number )
      )
    `)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch recent sales moves (outgoing stock)
  const { data: saleMoves } = await supabase
    .from('sale_item')
    .select(`
      sale_item_id,
      quantity,
      price_at_sale,
      created_at,
      sale:sale_id (
        sale_date,
        branch_id
      )
    `)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch manual adjustments
  const { data: adjustments } = await supabase
    .from('inventory_adjustment_line')
    .select(`
      adj_line_id,
      quantity_before,
      quantity_after,
      delta,
      note,
      created_at,
      adjustment:adjustment_id (
        reason,
        user:user_id ( name )
      )
    `)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Merge into a unified move ledger
  const moves: AnyRecord[] = [
    ...((deliveryMoves ?? []) as AnyRecord[]).map(m => ({
      move_type:   'receipt',
      ref:         (m.delivery as AnyRecord)?.po ? `PO ${((m.delivery as AnyRecord).po as AnyRecord)?.po_number}` : 'Receipt',
      date:        (m.delivery as AnyRecord)?.delivery_date ?? m.created_at,
      qty:         `+${m.quantity_received}`,
      qty_number:  Number(m.quantity_received),
      notes:       m.notes,
      raw:         m,
    })),
    ...((saleMoves ?? []) as AnyRecord[]).map(m => ({
      move_type:  'sale',
      ref:        `Sale`,
      date:       (m.sale as AnyRecord)?.sale_date ?? m.created_at,
      qty:        `-${m.quantity}`,
      qty_number: -Number(m.quantity),
      notes:      null,
      raw:        m,
    })),
    ...((adjustments ?? []) as AnyRecord[]).map(m => {
      const delta = Number(m.delta ?? 0);
      return {
        move_type:  'adjustment',
        ref:        `Adj: ${(m.adjustment as AnyRecord)?.reason ?? ''}`,
        date:       m.created_at,
        qty:        delta >= 0 ? `+${delta}` : `${delta}`,
        qty_number: delta,
        notes:      m.note,
        raw:        m,
      };
    }),
  ].sort((a, b) => new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime());

  return { success: true, product: data as AnyRecord, moves };
}

// ── 3. upsertProduct ──────────────────────────────────────────────────────

export async function upsertProduct(input: UpsertProductInput) {
  const supabase: AnyClient = await createClient();

  const isNew = !input.item_id;

  const payload: AnyRecord = {
    branch_id:    input.branch_id,
    name:         input.name,
    category:     input.category,
    cost_price:   input.cost_price,
    sale_price:   input.sale_price,
    reorder_level:input.reorder_level,
    updated_at:   new Date().toISOString(),
  };

  if (input.supplier_id)  payload.supplier_id  = input.supplier_id;
  if (input.vehicle_type) payload.vehicle_type = input.vehicle_type;
  if (input.size_id)      payload.size_id      = input.size_id;
  if (input.brand_id)     payload.brand_id     = input.brand_id;
  // Tire-specific — always write (allow clearing on edit)
  payload.tire_pattern = input.tire_pattern?.trim() || null;
  payload.ply_rating   = input.ply_rating   ?? null;

  let result: AnyRecord;

  if (isNew) {
    const { data, error } = await supabase
      .from('inventory_item')
      .insert(payload)
      .select('item_id')
      .single();

    if (error) return { success: false, error: error.message };
    result = data as AnyRecord;
  } else {
    const { data, error } = await supabase
      .from('inventory_item')
      .update(payload)
      .eq('item_id', input.item_id!)
      .select('item_id')
      .single();

    if (error) return { success: false, error: error.message };
    result = data as AnyRecord;
  }

  revalidatePath('/inventory');
  revalidatePath('/inventory/products');
  if (isNew) revalidatePath(`/inventory/products/${result.item_id as string}`);
  if (!isNew) revalidatePath(`/inventory/products/${input.item_id}`);

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:       null,
    action:        isNew ? 'INSERT' : 'UPDATE',
    table_name:    'inventory_item',
    record_id:     result.item_id as string,
    record_number: input.name,
    new_values:    payload,
  });

  return { success: true, itemId: result.item_id as string };
}

// ── 4. createAdjustment ───────────────────────────────────────────────────
//
// Performs a safe inventory adjustment:
//  1. Reads current stock_quantity for each line
//  2. Computes delta = quantity_counted - stock_quantity
//  3. Inserts adjustment header + lines into inventory_adjustment(_line)
//  4. Updates stock_quantity on inventory_item
//
// Falls back gracefully if the inventory_adjustment table does not exist yet
// (writes only to inventory_item in that case).

export async function createAdjustment(input: CreateAdjustmentInput) {
  const supabase: AnyClient = await createClient();

  const { branch_id, user_id, reason, note, lines } = input;

  if (!lines.length) return { success: false, error: 'No adjustment lines provided' };

  // Fetch current quantities
  const itemIds = lines.map(l => l.item_id);
  const { data: currItems, error: fetchErr } = await supabase
    .from('inventory_item')
    .select('item_id, stock_quantity')
    .in('item_id', itemIds)
    .is('deleted_at', null);

  if (fetchErr) return { success: false, error: fetchErr.message };

  const qtyMap: Record<string, number> = {};
  for (const item of (currItems ?? []) as AnyRecord[]) {
    qtyMap[String(item.item_id)] = Number(item.stock_quantity);
  }

  // Try to log to adjustment tables (best-effort — table may not exist yet)
  let adjustmentId: string | null = null;
  try {
    const { data: adjHeader, error: adjErr } = await supabase
      .from('inventory_adjustment')
      .insert({ branch_id, user_id, reason, note })
      .select('adjustment_id')
      .single();

    if (!adjErr && adjHeader) {
      adjustmentId = (adjHeader as AnyRecord).adjustment_id as string;

      const adjLines = lines.map(l => ({
        adjustment_id:   adjustmentId,
        item_id:         l.item_id,
        quantity_before: qtyMap[l.item_id] ?? 0,
        quantity_after:  l.quantity_counted,
        delta:           l.quantity_counted - (qtyMap[l.item_id] ?? 0),
        note:            l.note ?? null,
      }));

      await supabase.from('inventory_adjustment_line').insert(adjLines);
    }
  } catch {
    // Migration not yet applied — skip ledger write
  }

  // Always update inventory_item.stock_quantity
  for (const line of lines) {
    if (line.quantity_counted < 0) continue; // prevent negative stock
    const { error: updErr } = await supabase
      .from('inventory_item')
      .update({
        stock_quantity: line.quantity_counted,
        updated_at: new Date().toISOString(),
      })
      .eq('item_id', line.item_id);

    if (updErr) return { success: false, error: updErr.message };
  }

  revalidatePath('/inventory');
  revalidatePath('/inventory/products');

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:    user_id,
    action:     'ADJUSTMENT',
    table_name: 'inventory_item',
    record_id:  adjustmentId ?? undefined,
    new_values: {
      reason,
      branch_id,
      lines_count: lines.length,
      adjustment_id: adjustmentId,
    },
  });

  return { success: true, adjustmentId };
}

// ── 5. getProductMoves ────────────────────────────────────────────────────

export async function getProductMoves(input: GetProductMovesInput) {
  const { item_id, page = 1, page_size = 30 } = input;

  const result = await getProductWithDetails(item_id);
  if (!result.success) return { success: false, error: result.error, moves: [] };

  const start = (page - 1) * page_size;
  const moves = (result.moves ?? []).slice(start, start + page_size);

  return { success: true, moves, total: (result.moves ?? []).length };
}

// ── 6. getInventorySmartButtons ───────────────────────────────────────────

export async function getInventorySmartButtons(itemId: string) {
  const supabase: AnyClient = await createClient();

  const [delivRes, saleRes, adjRes] = await Promise.all([
    supabase
      .from('delivery_item')
      .select('delivery_item_id, quantity_received')
      .eq('item_id', itemId),
    supabase
      .from('sale_item')
      .select('sale_item_id, quantity')
      .eq('item_id', itemId),
    supabase
      .from('inventory_adjustment_line')
      .select('adj_line_id')
      .eq('item_id', itemId)
      .catch(() => ({ data: null, error: null })),
  ]);

  const receipts    = (delivRes.data ?? []) as AnyRecord[];
  const sales       = (saleRes.data ?? []) as AnyRecord[];
  const adjustments = (adjRes?.data ?? []) as AnyRecord[];

  const totalReceived = receipts.reduce((s, r) => s + Number(r.quantity_received), 0);
  const totalSold     = sales.reduce((s, r) => s + Number(r.quantity), 0);

  return [
    {
      label:  'Moves',
      value:  receipts.length + sales.length + adjustments.length,
      href:   `/inventory/products/${itemId}/moves`,
      icon:   'ArrowLeftRight',
      color:  'text-blue-600',
    },
    {
      label:  'Received',
      value:  totalReceived,
      href:   `/purchasing`,
      icon:   'PackageCheck',
      color:  'text-green-600',
    },
    {
      label:  'Sold',
      value:  totalSold,
      href:   `/pos`,
      icon:   'ShoppingCart',
      color:  'text-orange-600',
    },
  ];
}

// ── 7. getOperationCounts ─────────────────────────────────────────────────
//
// Powers the Kanban cards on the Operations Dashboard (/inventory).

// ── 8. getStockForecast ───────────────────────────────────────────────────
//
// Reads the view_stock_forecast DB view.  Optionally filters by branch and
// criticality level.  Falls back to an empty array if the view does not yet
// exist in the environment.

export interface StockForecastRow {
  item_id:                  string;
  name:                     string;
  branch_id:                string;
  category:                 string;
  vehicle_type:             string | null;
  stock_quantity:           number;
  current_reorder_level:    number;
  units_sold_30d:           number;
  units_sold_90d:           number;
  avg_daily_demand_30d:     number;
  avg_daily_demand_90d:     number;
  blended_daily_demand:     number;
  days_of_stock_remaining:  number;
  suggested_reorder_level:  number;
  reorder_level_needs_update: boolean;
  criticality:              'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'MODERATE' | 'HEALTHY' | 'NO_DEMAND';
  criticality_priority:     number;
}

export async function getStockForecast(branchId?: string, criticality?: string) {
  const supabase: AnyClient = await createClient();

  try {
    let query = supabase
      .from('view_stock_forecast')
      .select('*')
      .order('criticality_priority', { ascending: true })
      .order('name', { ascending: true });

    if (branchId)    query = query.eq('branch_id', branchId);
    if (criticality && criticality !== 'all') query = query.eq('criticality', criticality);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message, rows: [] };
    return { success: true, rows: (data ?? []) as StockForecastRow[] };
  } catch {
    return { success: false, error: 'view_stock_forecast not available', rows: [] };
  }
}

// ── 9. listAdjustments ────────────────────────────────────────────────────
//
// Returns recent adjustment headers joined with lines + item names for the
// Inventory Adjustments page.  Falls back gracefully if tables do not exist.

export async function listAdjustments(branchId?: string, limit = 50) {
  const supabase: AnyClient = await createClient();

  try {
    let query = supabase
      .from('inventory_adjustment')
      .select(`
        adjustment_id,
        branch_id,
        user_id,
        reason,
        note,
        created_at,
        branch:branch_id ( name ),
        lines:inventory_adjustment_line (
          adj_line_id,
          item_id,
          quantity_before,
          quantity_after,
          delta,
          note,
          item:item_id ( name )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message, rows: [] };
    return { success: true, rows: (data ?? []) as AnyRecord[] };
  } catch {
    return { success: false, error: 'Adjustment tables not available', rows: [] };
  }
}

// ── 10. archiveProduct ────────────────────────────────────────────────────
//
// Soft-deletes an inventory item by setting deleted_at.
// The item is hidden from all list views but its history is preserved.

export async function archiveProduct(itemId: string): Promise<{ success: boolean; error?: string }> {
  const supabase: AnyClient = await createClient();
  const { error } = await supabase
    .from('inventory_item')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('item_id', itemId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/inventory');
  revalidatePath('/inventory/products');
  return { success: true };
}

export async function getOperationCounts() {
  const supabase: AnyClient = await createClient();

  const [salesRes, lowStockRes] = await Promise.all([
    // Completed sales receipts
    supabase
      .from('sale')
      .select('sale_id', { count: 'exact' })
      .eq('state', 'done')
      .is('deleted_at', null)
      .then((r: AnyRecord) => r),

    // Low stock items
    supabase
      .from('inventory_item')
      .select('item_id, stock_quantity, reorder_level', { count: 'exact' })
      .is('deleted_at', null)
      .then((r: AnyRecord) => r),
  ]);

  const allItems     = (lowStockRes.data ?? []) as AnyRecord[];

  const lowStock  = allItems.filter(i => Number(i.stock_quantity) > 0 && Number(i.stock_quantity) < Number(i.reorder_level));
  const outOfStock = allItems.filter(i => Number(i.stock_quantity) === 0);

  // Active purchase orders
  const { data: purchaseOrders } = await supabase
    .from('purchase_order')
    .select('po_id, state, status')
    .is('deleted_at', null);

  const pendingPOs = (purchaseOrders ?? []).filter((po: AnyRecord) =>
    isOpenPurchaseOrder((po.state ?? po.status) as string | null | undefined)
  );

  return {
    receipts:       salesRes.count ?? 0,
    pending_pos:    pendingPOs.length,
    low_stock:      lowStock.length,
    out_of_stock:   outOfStock.length,
    total_products: allItems.length,
  };
}
