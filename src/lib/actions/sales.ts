'use server';

/**
 * src/lib/actions/sales.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Next.js Server Actions for the Sales/POS Module (Phase 2).
 *
 *  1. createPOSSale      — Atomic POS checkout: insert sale + sale_items +
 *                          outbound inventory_moves + deplete stock
 *  2. createQuotation    — Create a draft Sales Order (Quotation)
 *  3. confirmSaleOrder   — Transition draft → confirmed + write inventory moves
 *  4. listSales          — Paginated/filtered list of sales & orders
 *  5. getSaleWithDetails — Full sale record with items + moves
 *  6. getSaleSmartButtons — Smart button data for the form view
 *  7. voidSale           — Cancel/void a sale (super_admin / branch_manager)
 */

import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;
type AnyRecord = Record<string, unknown>;

// ── Input types ────────────────────────────────────────────────────────────

export interface POSLineInput {
  item_id?:          string;   // null for service lines
  name?:             string;   // display name override (for non-inventory lines)
  quantity:          number;
  price_at_sale:     number;
  installation_fee?: number;
}

export interface CreatePOSSaleInput {
  branch_id:      string;
  user_id:        string;
  customer_id?:   string;
  payment_method: 'cash' | 'card' | 'check' | 'credit';
  discount_amount?: number;
  tax_amount?:      number;
  notes?:           string;
  lines:            POSLineInput[];
}

export interface CreateQuotationInput {
  branch_id:    string;
  user_id:      string;
  customer_id?: string;
  notes?:       string;
  lines:        POSLineInput[];
}

export interface ListSalesInput {
  branch_id?:   string;
  customer_id?: string;
  status?:      string;
  search?:      string;   // searches sale_number
  date_from?:   string;
  date_to?:     string;
  type?:        'pos' | 'order' | 'all';
  page?:        number;
  page_size?:   number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Write outbound inventory_moves rows + deduct stock_quantity. */
async function writeOutboundMoves(
  supabase:   AnyClient,
  branchId:   string,
  saleId:     string,
  userId:     string,
  lines:      POSLineInput[],
) {
  for (const line of lines) {
    if (!line.item_id) continue;   // service lines have no stock

    // Fetch current cost price for valuation
    const { data: item } = await supabase
      .from('inventory_item')
      .select('cost_price')
      .eq('item_id', line.item_id)
      .single();

    const costPrice = Number((item as AnyRecord | null)?.cost_price ?? 0);

    // Write to inventory_moves ledger
    await supabase.from('inventory_moves').insert({
      item_id:              line.item_id,
      branch_id:            branchId,
      source_document_type: 'sale',
      source_document_id:   saleId,
      quantity_moved:       -line.quantity,   // negative = outbound
      unit_cost:            costPrice,
      created_by:           userId,
    });

    // Deduct stock_quantity (legacy cached column — keep in sync)
    await supabase.rpc('decrement_stock', {
      item_id_param:   line.item_id,
      quantity_param:  line.quantity,
    });
  }
}

/**
 * After a sale, check each sold item's current stock.
 * If at or below reorder_level, fan out a warning notification to all staff/managers/admins.
 * Uses the service-role admin client to bypass RLS on the notification table.
 */
async function notifyLowStockItems(itemIds: string[]): Promise<void> {
  if (!itemIds.length) return;
  try {
    const admin: AnyClient = createAdminClient();

    // Re-read updated stock quantities
    const { data: items } = await admin
      .from('inventory_item')
      .select('item_id, name, category, stock_quantity, reorder_level')
      .in('item_id', itemIds);

    const lowItems = ((items ?? []) as AnyRecord[]).filter(
      i => Number(i.stock_quantity) <= Number(i.reorder_level ?? 5),
    );
    if (!lowItems.length) return;

    // Fetch users to notify
    const { data: users } = await admin
      .from('user')
      .select('user_id')
      .in('role', ['staff', 'branch_manager', 'super_admin'])
      .is('deleted_at', null);

    if (!users?.length) return;

    const rows: AnyRecord[] = [];
    for (const item of lowItems) {
      for (const u of users as AnyRecord[]) {
        rows.push({
          user_id:  u.user_id,
          title:   '⚠️ Low Stock Alert',
          message: `${item.name} (${item.category}) is running low. Stock: ${item.stock_quantity}, Reorder level: ${item.reorder_level ?? 5}`,
          type:    'warning',
          is_read: false,
        });
      }
    }

    if (rows.length) {
      await admin.from('notification').insert(rows);
    }
  } catch (err) {
    // Non-critical — log and continue
    console.error('[notifyLowStockItems] Error:', err);
  }
}

// ── 1. createPOSSale ──────────────────────────────────────────────────────

export async function createPOSSale(input: CreatePOSSaleInput) {
  const supabase: AnyClient = await createClient();

  const {
    branch_id, user_id, customer_id,
    payment_method, discount_amount = 0, tax_amount = 0,
    notes, lines,
  } = input;

  if (!lines.length) return { success: false, error: 'No items in order' };

  // Calculate total
  const subtotal = lines.reduce(
    (s, l) => s + l.price_at_sale * l.quantity + (l.installation_fee ?? 0),
    0,
  );
  const total = subtotal - discount_amount + tax_amount;

  // Insert sale header
  const salePayload: AnyRecord = {
    branch_id,
    user_id,
    payment_method,
    discount_amount,
    tax_amount,
    total_amount:    total,
    state:           'done',   // POS sales are immediately completed
    note:            notes ?? null,
    sale_date:       new Date().toISOString(),
  };
  if (customer_id) salePayload.customer_id = customer_id;

  const { data: saleRow, error: saleErr } = await supabase
    .from('sale')
    .insert(salePayload)
    .select('sale_id, sale_number')
    .single();

  if (saleErr) return { success: false, error: saleErr.message };

  const saleId     = (saleRow as AnyRecord).sale_id     as string;
  const saleNumber = (saleRow as AnyRecord).sale_number as string ?? null;

  // Insert sale_items
  const itemRows = lines.map(l => ({
    sale_id:          saleId,
    item_id:          l.item_id ?? null,
    quantity:         l.quantity,
    price_at_sale:    l.price_at_sale,
    installation_fee: l.installation_fee ?? 0,
  }));

  const { error: itemErr } = await supabase.from('sale_item').insert(itemRows);
  if (itemErr) return { success: false, error: itemErr.message };

  // Write outbound inventory moves
  await writeOutboundMoves(supabase, branch_id, saleId, user_id, lines);

  // Fire low-stock notifications server-side (non-blocking)
  const soldItemIds = lines.map(l => l.item_id).filter(Boolean) as string[];
  notifyLowStockItems(soldItemIds).catch(() => {});

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:       user_id,
    action:        'INSERT',
    table_name:    'sale',
    record_id:     saleId,
    record_number: saleNumber ?? undefined,
    new_values: {
      sale_number:    saleNumber,
      branch_id,
      customer_id:    customer_id ?? null,
      payment_method,
      total_amount:   total,
      lines_count:    lines.length,
      source:         'pos',
    },
  });

  revalidatePath('/pos');
  revalidatePath('/sales');
  revalidatePath('/inventory');
  revalidatePath('/inventory/products');

  return { success: true, saleId, saleNumber };
}

// ── 2. createQuotation ────────────────────────────────────────────────────

export async function createQuotation(input: CreateQuotationInput) {
  const supabase: AnyClient = await createClient();

  const { branch_id, user_id, customer_id, notes, lines } = input;

  const subtotal = lines.reduce(
    (s, l) => s + l.price_at_sale * l.quantity + (l.installation_fee ?? 0),
    0,
  );

  const salePayload: AnyRecord = {
    branch_id,
    user_id,
    total_amount: subtotal,
    state:        'draft',
    payment_method: 'cash',
    note:         notes ?? null,
    sale_date:    new Date().toISOString(),
  };
  if (customer_id) salePayload.customer_id = customer_id;

  const { data: saleRow, error: saleErr } = await supabase
    .from('sale')
    .insert(salePayload)
    .select('sale_id, sale_number')
    .single();

  if (saleErr) return { success: false, error: saleErr.message };

  const saleId     = (saleRow as AnyRecord).sale_id     as string;
  const saleNumber = (saleRow as AnyRecord).sale_number as string ?? null;

  if (lines.length) {
    const itemRows = lines.map(l => ({
      sale_id:          saleId,
      item_id:          l.item_id ?? null,
      quantity:         l.quantity,
      price_at_sale:    l.price_at_sale,
      installation_fee: l.installation_fee ?? 0,
    }));
    const { error: itemErr } = await supabase.from('sale_item').insert(itemRows);
    if (itemErr) return { success: false, error: itemErr.message };
  }

  revalidatePath('/sales');

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:       user_id,
    action:        'INSERT',
    table_name:    'sale',
    record_id:     saleId,
    record_number: saleNumber ?? undefined,
    new_values: {
      sale_number:  saleNumber,
      branch_id,
      customer_id:  customer_id ?? null,
      total_amount: subtotal,
      lines_count:  lines.length,
      source:       'quotation',
    },
  });

  return { success: true, saleId, saleNumber };
}

// ── 3. confirmSaleOrder ───────────────────────────────────────────────────

export async function confirmSaleOrder(saleId: string, userId: string) {
  const supabase: AnyClient = await createClient();

  // Try atomic DB function first
  const { data: fnResult } = await supabase.rpc('fn_confirm_sale', {
    p_sale_id:  saleId,
    p_user_id:  userId,
  });

  if (fnResult) {
    const res = fnResult as AnyRecord;
    if (res.success) {
      revalidatePath('/sales');
      revalidatePath(`/sales/${saleId}`);
      revalidatePath('/inventory');
      return { success: true };
    }
    // DB function exists but returned an error
    if ('error' in res) return { success: false, error: res.error as string };
  }

  // Fallback: manual confirmation if DB function not yet deployed
  const { data: sale, error: fetchErr } = await supabase
    .from('sale')
    .select('*, sale_item(*)')
    .eq('sale_id', saleId)
    .single();

  if (fetchErr) return { success: false, error: fetchErr.message };

  const saleRecord = sale as AnyRecord;
  const lines = (saleRecord.sale_item ?? []) as AnyRecord[];

  // Write inventory moves for each line
  const moves = lines
    .filter(l => l.item_id)
    .map(l => ({
      item_id:              l.item_id,
      branch_id:            saleRecord.branch_id,
      source_document_type: 'sale',
      source_document_id:   saleId,
      quantity_moved:       -Number(l.quantity),
      unit_cost:            0,
      created_by:           userId,
    }));

  if (moves.length) {
    await supabase.from('inventory_moves').insert(moves);

    // Deduct stock
    for (const l of lines.filter(x => x.item_id)) {
      await supabase
        .from('inventory_item')
        .update({
          stock_quantity: supabase.raw(`GREATEST(0, stock_quantity - ${l.quantity})`),
          updated_at:     new Date().toISOString(),
        })
        .eq('item_id', l.item_id);
    }
  }

  // Update sale state
  const { error: updErr } = await supabase
    .from('sale')
    .update({ state: 'done' })
    .eq('sale_id', saleId);

  if (updErr) return { success: false, error: updErr.message };

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:    userId,
    action:     'STATE_TRANSITION',
    table_name: 'sale',
    record_id:  saleId,
    old_values: { state: 'draft' },
    new_values: { state: 'done' },
  });

  revalidatePath('/sales');
  revalidatePath(`/sales/${saleId}`);
  revalidatePath('/inventory');

  return { success: true };
}

// ── 4. listSales ──────────────────────────────────────────────────────────

export async function listSales(input: ListSalesInput = {}) {
  const supabase: AnyClient = await createClient();

  const {
    branch_id,
    customer_id,
    status,
    search    = '',
    date_from,
    date_to,
    page      = 1,
    page_size = 50,
  } = input;

  let query = supabase
    .from('sale')
    .select(`
      sale_id,
      sale_number,
      branch_id,
      user_id,
      customer_id,
      total_amount,
      payment_method,
      state,
      discount_amount,
      tax_amount,
      sale_date,
      created_at,
      note,
      customer:customer_id ( name, phone ),
      user:user_id          ( name ),
      branch:branch_id      ( name )
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .range((page - 1) * page_size, page * page_size - 1);

  if (branch_id)   query = query.eq('branch_id',   branch_id);
  if (customer_id) query = query.eq('customer_id', customer_id);
  if (status)      query = query.eq('state',       status);
  if (date_from)   query = query.gte('sale_date',  date_from);
  if (date_to)     query = query.lte('sale_date',  date_to);
  if (search)      query = query.ilike('sale_number', `%${search}%`);

  const { data, count, error } = await query;
  if (error) return { success: false, error: error.message, sales: [], total: 0 };

  return { success: true, sales: (data ?? []) as AnyRecord[], total: count ?? 0 };
}

// ── 5. getSaleWithDetails ─────────────────────────────────────────────────

export async function getSaleWithDetails(saleId: string) {
  const supabase: AnyClient = await createClient();

  const { data: sale, error } = await supabase
    .from('sale')
    .select(`
      *,
      customer:customer_id ( customer_id, name, phone, email ),
      user:user_id          ( user_id, name ),
      branch:branch_id      ( branch_id, name, address, phone ),
      sale_item (
        sale_item_id,
        item_id,
        quantity,
        price_at_sale,
        installation_fee,
        created_at,
        inventory_item:item_id (
          name, category, vehicle_type, sale_price, cost_price
        )
      )
    `)
    .eq('sale_id', saleId)
    .is('deleted_at', null)
    .single();

  if (error) return { success: false, error: error.message, sale: null };

  // Fetch related inventory moves
  const { data: moves } = await supabase
    .from('inventory_moves')
    .select(`
      move_id,
      item_id,
      quantity_moved,
      unit_cost,
      created_at,
      inventory_item:item_id ( name )
    `)
    .eq('source_document_type', 'sale')
    .eq('source_document_id',   saleId)
    .order('created_at', { ascending: false });

  return {
    success: true,
    sale:    sale as AnyRecord,
    moves:   (moves ?? []) as AnyRecord[],
  };
}

// ── 6. getSaleSmartButtons ────────────────────────────────────────────────

export async function getSaleSmartButtons(saleId: string) {
  const supabase: AnyClient = await createClient();

  const { data: moves } = await supabase
    .from('inventory_moves')
    .select('move_id')
    .eq('source_document_type', 'sale')
    .eq('source_document_id',   saleId);

  const { data: items } = await supabase
    .from('sale_item')
    .select('sale_item_id, quantity')
    .eq('sale_id', saleId);

  const totalUnits = ((items ?? []) as AnyRecord[])
    .reduce((s, i) => s + Number(i.quantity), 0);

  return [
    {
      label:  'Delivery',
      value:  (moves ?? []).length,
      href:   `/inventory/products`,
      icon:   'PackageCheck',
      color:  'text-blue-600',
    },
    {
      label:  'Items',
      value:  totalUnits,
      href:   null,
      icon:   'ShoppingCart',
      color:  'text-purple-600',
    },
  ];
}

// ── 7. voidSale ───────────────────────────────────────────────────────────

export async function voidSale(saleId: string, userId: string, reason: string) {
  const supabase: AnyClient = await createClient();

  const { error } = await supabase
    .from('sale')
    .update({
      state:      'cancelled',
      note:       reason,
      // deleted_at: new Date().toISOString(),
    })
    .eq('sale_id', saleId)
    .in('state', ['draft', 'confirmed']);   // cannot void a 'done' POS sale

  if (error) return { success: false, error: error.message };

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:    userId,
    action:     'VOID',
    table_name: 'sale',
    record_id:  saleId,
    old_values: { state: 'confirmed' },
    new_values: { state: 'cancelled', reason },
  });

  revalidatePath('/sales');
  return { success: true };
}

// ── 8. upsertSaleLines (for editing a draft quotation) ────────────────────

export async function upsertSaleLines(
  saleId: string,
  lines:  POSLineInput[],
) {
  const supabase: AnyClient = await createClient();

  // Delete old lines
  await supabase.from('sale_item').delete().eq('sale_id', saleId);

  const subtotal = lines.reduce(
    (s, l) => s + l.price_at_sale * l.quantity + (l.installation_fee ?? 0),
    0,
  );

  // Insert new lines
  if (lines.length) {
    const rows = lines.map(l => ({
      sale_id:          saleId,
      item_id:          l.item_id ?? null,
      quantity:         l.quantity,
      price_at_sale:    l.price_at_sale,
      installation_fee: l.installation_fee ?? 0,
    }));
    await supabase.from('sale_item').insert(rows);
  }

  // Recalculate total
  const { error: totalErr } = await supabase
    .from('sale')
    .update({ total_amount: subtotal })
    .eq('sale_id', saleId);

  if (totalErr) return { success: false, error: totalErr.message };

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:    null,
    action:     'UPDATE_LINES',
    table_name: 'sale',
    record_id:  saleId,
    new_values: { lines_count: lines.length, total_amount: subtotal },
  });

  revalidatePath('/sales');
  revalidatePath(`/sales/${saleId}`);

  return { success: true, error: undefined };
}
