'use server';

/**
 * src/lib/actions/purchasing.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Next.js Server Actions for the Purchasing Module (Phase 2).
 *
 * Covers:
 *  1. createRFQ          — Create a new Draft RFQ (auto-sequences PO-YYYY-XXXX)
 *  2. transitionPO       — State machine: draft → sent → purchase → locked → cancelled
 *  3. upsertPOLines      — Save/update purchase_order_item rows
 *  4. validateReceipt    — Validate a delivery, insert inventory_moves, update stock
 *  5. getPOWithDetails   — Full PO fetch with supplier, branch, lines, deliveries
 *  6. listPOs            — Paginated / filtered list for the List View
 */

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import {
  transitionPurchaseOrder,
  POState,
} from '@/lib/stateTransitions';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Validate a TIN value: 9–12 numeric digits (dashes/spaces allowed but stripped). */
function isValidTIN(value: string): boolean {
  const digitsOnly = value.replace(/[-\s]/g, '');
  return /^\d{9,12}$/.test(digitsOnly);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface POLineInput {
  item_id:   string;
  quantity:  number;
  unit_cost: number;
}

export interface CreateRFQInput {
  supplier_id:            string;
  branch_id:              string;
  user_id:                string;
  expected_delivery_date?: string;
  payment_method:         'cash' | 'credit';
  notes?:                 string;
  lines:                  POLineInput[];
}

export interface ListPOsInput {
  branchId?:  string;
  supplierId?: string;
  state?:     POState;
  search?:    string;   // searches po_number
  page?:      number;
  pageSize?:  number;
}

export interface ValidateReceiptInput {
  delivery_id: string;
  po_id:       string;
  branch_id:   string;
  user_id:     string;
  lines: {
    item_id:           string;
    quantity_received: number;
    quantity_damaged:  number;
    unit_cost:         number;
    notes?:            string;
  }[];
}

// ── 1. Create RFQ ──────────────────────────────────────────────────────────

export async function createRFQ(input: CreateRFQInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();

  // ── Server-side role guard: only managers & super admin can create RFQs
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (authUser) {
    const { data: profile } = await supabase
      .from('user')
      .select('role')
      .eq('user_id', authUser.id)
      .single();
    if (profile && (profile.role === 'staff' || profile.role === 'mechanic')) {
      return { success: false, error: 'Insufficient permissions. Only Managers and Super Admins can create quotations.' };
    }
  }

  const totalAmount = input.lines.reduce(
    (sum, l) => sum + l.quantity * l.unit_cost,
    0
  );

  // Insert PO — trigger auto-generates po_number
  const { data: po, error: poErr } = await supabase
    .from('purchase_order')
    .insert({
      po_number:              '',          // trigger fills this
      supplier_id:            input.supplier_id,
      branch_id:              input.branch_id,
      user_id:                input.user_id,
      status:                 'draft',
      state:                  'draft',
      payment_method:         input.payment_method,
      payment_status:         'pending',
      expected_delivery_date: input.expected_delivery_date ?? null,
      notes:                  input.notes ?? null,
      total_amount:           totalAmount,
    })
    .select('po_id, po_number')
    .single();

  if (poErr || !po) {
    return { success: false, error: poErr?.message ?? 'Failed to create PO' };
  }

  // Insert line items
  if (input.lines.length > 0) {
    const lineRows = input.lines.map((l) => ({
      po_id:     po.po_id,
      item_id:   l.item_id,
      quantity:  l.quantity,
      unit_cost: l.unit_cost,
      // total_cost is a generated column — do not insert
    }));

    const { error: lineErr } = await supabase
      .from('purchase_order_item')
      .insert(lineRows);

    if (lineErr) {
      // Roll back the PO
      await supabase.from('purchase_order').delete().eq('po_id', po.po_id);
      return { success: false, error: lineErr.message };
    }
  }

  // Log creation in chatter
  await supabase.from('chatter_message').insert({
    record_table:  'purchase_order',
    record_id:     po.po_id,
    author_id:     input.user_id,
    message_type:  'system',
    body:          `RFQ ${po.po_number} created.`,
    is_internal:   true,
  });

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:       input.user_id,
    action:        'INSERT',
    table_name:    'purchase_order',
    record_id:     po.po_id,
    record_number: po.po_number,
    new_values: {
      po_number:      po.po_number,
      supplier_id:    input.supplier_id,
      branch_id:      input.branch_id,
      payment_method: input.payment_method,
      total_amount:   totalAmount,
      lines_count:    input.lines.length,
    },
  });

  revalidatePath('/purchasing');
  return { success: true, poId: po.po_id, poNumber: po.po_number };
}

// ── 2. Transition PO State ─────────────────────────────────────────────────

export async function transitionPO(
  poId:      string,
  nextState: POState,
  userId:    string,
  note?:     string
) {
  const result = await transitionPurchaseOrder(poId, nextState, userId, note);

  if (result.success) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    // When confirming to 'purchase', create a pending delivery record
    if (nextState === 'purchase') {
      // Fetch PO lines so we know what quantities to expect
      const { data: poLines } = await supabase
        .from('purchase_order_item')
        .select('po_item_id, item_id, quantity, unit_cost')
        .eq('po_id', poId)
        .is('deleted_at', null);

      // Create delivery record
      const { data: delivery, error: deliveryErr } = await supabase
        .from('delivery')
        .insert({
          po_id:         poId,
          delivery_date: new Date().toISOString().split('T')[0],
          notes:         'Auto-generated receipt on PO confirmation.',
        })
        .select('delivery_id')
        .single();

      if (!deliveryErr && delivery && poLines) {
        // Create delivery items (quantity_received = 0, pending validation)
        const deliveryItems = poLines.map((l: { item_id: string; quantity: number }) => ({
          delivery_id:        delivery.delivery_id,
          item_id:            l.item_id,
          quantity_received:  0,
          quantity_damaged:   0,
          notes:              null,
        }));

        await supabase.from('delivery_item').insert(deliveryItems);
      }
    }

    // Audit log: PO state transition
    await supabase.from('audit_log').insert({
      user_id:    userId,
      action:     'STATE_TRANSITION',
      table_name: 'purchase_order',
      record_id:  poId,
      new_values: { state: nextState },
    });

    revalidatePath('/purchasing');
    revalidatePath(`/purchasing/${poId}`);
  }

  return result;
}

// ── 3. Upsert PO Line Items ────────────────────────────────────────────────

export async function upsertPOLines(
  poId:   string,
  lines:  POLineInput[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();

  // Delete existing lines, re-insert
  await supabase
    .from('purchase_order_item')
    .update({ deleted_at: new Date().toISOString() })
    .eq('po_id', poId)
    .is('deleted_at', null);

  if (lines.length > 0) {
    const rows = lines.map((l) => ({
      po_id:     poId,
      item_id:   l.item_id,
      quantity:  l.quantity,
      unit_cost: l.unit_cost,
      // total_cost is a generated column — do not insert
    }));

    const { error } = await supabase.from('purchase_order_item').insert(rows);
    if (error) return { success: false, error: error.message };
  }

  // Recalculate total
  const { data: allLines } = await supabase
    .from('purchase_order_item')
    .select('total_cost')
    .eq('po_id', poId)
    .is('deleted_at', null);

  const total = (allLines ?? []).reduce(
    (s: number, r: { total_cost: number }) => s + Number(r.total_cost ?? 0),
    0
  );

  await supabase
    .from('purchase_order')
    .update({ total_amount: total, updated_at: new Date().toISOString() })
    .eq('po_id', poId);

  // Audit trail (no userId available in this helper — log with system marker)
  await supabase.from('audit_log').insert({
    user_id:    null,
    action:     'UPDATE_LINES',
    table_name: 'purchase_order',
    record_id:  poId,
    new_values: { total_amount: total, lines_count: lines.length },
  });

  revalidatePath(`/purchasing/${poId}`);
  return { success: true };
}

// ── 4. Validate Receipt (insert inventory_moves) ───────────────────────────

export async function validateReceipt(input: ValidateReceiptInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();

  // 1. Update delivery_item rows with actual received quantities
  for (const line of input.lines) {
    await supabase
      .from('delivery_item')
      .update({
        quantity_received: line.quantity_received,
        quantity_damaged:  line.quantity_damaged,
        notes:             line.notes ?? null,
      })
      .eq('delivery_id', input.delivery_id)
      .eq('item_id',     line.item_id);
  }

  // 2. Insert inventory_moves for each line received
  const moveRows = input.lines
    .filter((l) => l.quantity_received > 0)
    .map((l) => ({
      item_id:              l.item_id,
      branch_id:            input.branch_id,
      source_document_type: 'purchase',
      source_document_id:   input.po_id,
      quantity_moved:       l.quantity_received,
      unit_cost:            l.unit_cost,
      notes:                `Receipt from PO. Damaged: ${l.quantity_damaged}`,
      created_by:           input.user_id,
    }));

  if (moveRows.length > 0) {
    const { error: moveErr } = await supabase
      .from('inventory_moves')
      .insert(moveRows);

    if (moveErr) return { success: false, error: moveErr.message };

    // 3. Update legacy stock_quantity on inventory_item directly
    //    (fn_record_stock_move RPC does not exist — apply increment manually)
    for (const line of input.lines.filter((l) => l.quantity_received > 0)) {
      // Fetch current stock
      const { data: item } = await supabase
        .from('inventory_item')
        .select('stock_quantity')
        .eq('item_id', line.item_id)
        .single();

      const currentQty = Number(item?.stock_quantity ?? 0);
      await supabase
        .from('inventory_item')
        .update({
          stock_quantity: currentQty + line.quantity_received,
          cost_price:     line.unit_cost > 0 ? line.unit_cost : undefined,
          updated_at:     new Date().toISOString(),
        })
        .eq('item_id', line.item_id);
    }
  }

  // 4. Log to chatter
  const totalReceived = input.lines.reduce((s, l) => s + l.quantity_received, 0);
  await supabase.from('chatter_message').insert({
    record_table:  'purchase_order',
    record_id:     input.po_id,
    author_id:     input.user_id,
    message_type:  'system',
    body:          `Receipt validated: ${totalReceived} unit(s) received into stock.`,
    is_internal:   true,
  });

  // Audit log: receipt validation
  await supabase.from('audit_log').insert({
    user_id:    input.user_id,
    action:     'VALIDATE_RECEIPT',
    table_name: 'purchase_order',
    record_id:  input.po_id,
    new_values: {
      delivery_id:    input.delivery_id,
      total_received: totalReceived,
      lines: input.lines.map(l => ({
        item_id:           l.item_id,
        quantity_received: l.quantity_received,
        quantity_damaged:  l.quantity_damaged,
      })),
    },
  });

  revalidatePath(`/purchasing/${input.po_id}`);
  revalidatePath('/inventory');
  return { success: true };
}

// ── 5. Get Full PO Detail ──────────────────────────────────────────────────

export async function getPOWithDetails(poId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();

  const { data, error } = await supabase
    .from('purchase_order')
    .select(`
      *,
      supplier:supplier_id ( supplier_id, name, contact_person, phone, email ),
      branch:branch_id     ( branch_id, name ),
      created_by:user_id   ( user_id, name ),
      lines:purchase_order_item (
        po_item_id, quantity, unit_cost, total_cost, deleted_at,
        item:item_id (
          item_id, name, category, sku,
          brand:brand_id ( name ),
          size:size_id  ( label )
        )
      ),
      deliveries:delivery (
        delivery_id, delivery_date, notes,
        received_by:received_by ( name ),
        items:delivery_item (
          delivery_item_id, quantity_received, quantity_damaged, notes,
          item:item_id ( item_id, name )
        )
      )
    `)
    .eq('po_id', poId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

// ── 6. List POs ────────────────────────────────────────────────────────────

export async function listPOs(input: ListPOsInput = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();

  const page     = input.page     ?? 1;
  const pageSize = input.pageSize ?? 25;
  const from     = (page - 1) * pageSize;
  const to       = from + pageSize - 1;

  let query = supabase
    .from('purchase_order')
    .select(`
      po_id, po_number, order_date, expected_delivery_date,
      status, state, total_amount, payment_method, payment_status,
      created_at,
      supplier:supplier_id ( name ),
      branch:branch_id     ( name )
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (input.branchId)  query = query.eq('branch_id', input.branchId);
  if (input.supplierId) query = query.eq('supplier_id', input.supplierId);
  if (input.state)     query = query.eq('state', input.state);
  if (input.search)    query = query.ilike('po_number', `%${input.search}%`);

  const { data, error, count } = await query;

  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

// ── Vendor (Supplier) CRUD ─────────────────────────────────────────────────

export interface VendorInput {
  name:            string;
  contact_person?: string;
  phone?:          string;
  email?:          string;
  address?:        string;
  city?:           string;
  vat?:            string;
  website?:        string;
  payment_terms?:  string;
  notes?:          string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function listVendors(search?: string): Promise<{ vendors: Record<string, unknown>[]; error: string | null }> {
  const supabase = await createClient();
  let query = (supabase as any)
    .from('supplier')
    .select('supplier_id, name, contact_person, phone, email, address, city, vat, website, payment_terms, notes, is_active, created_at')
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error } = await query;
  if (error) return { vendors: [], error: error.message };
  return { vendors: (data ?? []) as Record<string, unknown>[], error: null };
}

export async function createVendor(input: VendorInput): Promise<{ vendor: Record<string, unknown> | null; error: string | null }> {
  // Server-side TIN validation
  if (input.vat && input.vat.trim() !== '' && !isValidTIN(input.vat)) {
    return { vendor: null, error: 'TIN must be 9–12 numeric digits.' };
  }
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('supplier')
    .insert({ ...input, is_active: true })
    .select()
    .single();
  if (error) return { vendor: null, error: error.message };
  // Audit trail
  await (supabase as any).from('audit_log').insert({
    user_id:       null,
    action:        'INSERT',
    table_name:    'supplier',
    record_id:     (data as Record<string, unknown>).supplier_id,
    record_number: input.name,
    new_values:    { name: input.name, phone: input.phone, email: input.email },
  });
  revalidatePath('/purchasing');
  revalidatePath('/purchasing/vendors');
  return { vendor: data as Record<string, unknown>, error: null };
}

export async function updateVendor(vendorId: string, input: Partial<VendorInput> & { is_active?: boolean }): Promise<{ error: string | null }> {
  // Server-side TIN validation
  if (input.vat !== undefined && input.vat.trim() !== '' && !isValidTIN(input.vat)) {
    return { error: 'TIN must be 9–12 numeric digits.' };
  }
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from('supplier')
    .update({ ...input })
    .eq('supplier_id', vendorId);
  if (error) return { error: error.message };
  // Audit trail
  await (supabase as any).from('audit_log').insert({
    user_id:    null,
    action:     'UPDATE',
    table_name: 'supplier',
    record_id:  vendorId,
    new_values: input,
  });
  revalidatePath('/purchasing');
  revalidatePath('/purchasing/vendors');
  return { error: null };
}

export async function deleteVendor(vendorId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from('supplier')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('supplier_id', vendorId);
  if (error) return { error: error.message };
  // Audit trail
  await (supabase as any).from('audit_log').insert({
    user_id:    null,
    action:     'DELETE',
    table_name: 'supplier',
    record_id:  vendorId,
    new_values: { deleted_at: new Date().toISOString() },
  });
  revalidatePath('/purchasing');
  revalidatePath('/purchasing/vendors');
  return { error: null };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
