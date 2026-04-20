'use server';

/**
 * src/lib/actions/services.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Next.js Server Actions for the Services & Workshop Module (Phase 2).
 *
 *  1. listServiceJobs        – Paginated/filtered list for Kanban & List views
 *  2. getServiceJobDetail    – Full record with items, customer, vehicle
 *  3. createServiceJob       – Create a Draft Quotation (quotation state)
 *  4. updateServiceJobInfo   – Update header fields (description, vehicle, etc.)
 *  5. upsertServiceJobItems  – Replace/sync Parts & Labor line items
 *  6. deleteServiceJobItem   – Remove a single line item
 *  7. transitionServiceJob   – State machine + inventory_moves on completion
 *  8. cancelServiceJob       – Void/cancel with reason (branch_manager / super_admin)
 *  9. getServiceSmartButtons – Stat block data for the Form View header
 */

import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import {
  type ServiceState,
  SERVICE_STATE_LABELS,
  canTransitionService,
} from '@/lib/serviceUtils';

// ── Type-only re-export (safe in 'use server' files) ─────────────────────────
// Non-async value exports (SERVICE_STATE_LABELS, getNextServiceStates, etc.)
// live in @/lib/serviceUtils — import directly from there in client components.
export type { ServiceState } from '@/lib/serviceUtils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;
type AnyRecord  = Record<string, unknown>;

// ── Priority conversion (DB stores smallint 0-3; TS uses string labels) ────
const PRIORITY_MAP:   Record<string, number> = { low: 0, normal: 1, high: 2, urgent: 3 };
const PRIORITY_LABEL: Record<number, 'low' | 'normal' | 'high' | 'urgent'> = { 0: 'low', 1: 'normal', 2: 'high', 3: 'urgent' };
const toPriorityNum   = (p: string | number): number => typeof p === 'number' ? p : (PRIORITY_MAP[p] ?? 1);
const toPriorityLabel = (n: number | string | null | undefined): 'low' | 'normal' | 'high' | 'urgent' =>
  PRIORITY_LABEL[Number(n) as keyof typeof PRIORITY_LABEL] ?? 'normal';

// ── Input types ────────────────────────────────────────────────────────────

export interface ServiceJobLineInput {
  service_job_item_id?: string;   // present when updating existing row
  item_id?:             string;   // null for free-text labor lines
  description?:         string;   // override or free-text line
  quantity:             number;
  price_at_service:     number;
}

export interface CreateServiceJobInput {
  branch_id:              string;
  user_id:                string;
  customer_id?:           string;
  vehicle_id?:            string;
  job_description:        string;
  vehicle_type_id?:       string;
  mechanic_id?:           string;
  priority?:              'low' | 'normal' | 'high' | 'urgent';
  notes?:                 string;
  diagnostics?:           string;
  estimated_completion?:  string;
  lines?:                 ServiceJobLineInput[];
}

export interface UpdateServiceJobInput {
  job_description?:       string;
  vehicle_id?:            string;
  vehicle_type_id?:       string;
  mechanic_id?:           string;
  priority?:              'low' | 'normal' | 'high' | 'urgent';
  notes?:                 string;
  diagnostics?:           string;
  estimated_completion?:  string;
  customer_id?:           string;
}

export interface ListServiceJobsInput {
  branch_id?:   string;
  state?:       ServiceState | 'all';
  search?:      string;           // searches job_number, customer name
  mechanic_id?: string;
  date_from?:   string;
  date_to?:     string;
  page?:        number;
  page_size?:   number;
}

// ── Shared type returned by list / detail ──────────────────────────────────

export interface ServiceJobRow {
  job_id:                string;
  job_number:            string | null;
  branch_id:             string;
  user_id:               string;
  mechanic_id:           string | null;
  customer_id:           string | null;
  vehicle_id:            string | null;
  vehicle_type_id:       string | null;
  job_description:       string;
  state:                 ServiceState;
  priority:              'low' | 'normal' | 'high' | 'urgent';
  notes:                 string | null;
  diagnostics:           string | null;
  estimated_completion:  string | null;
  job_date:              string;
  created_at:            string;
  updated_at:            string;
  // Joined
  customer_name:         string | null;
  plate_number:          string | null;
  vehicle_make:          string | null;
  vehicle_model:         string | null;
  vehicle_year:          number | null;
  mechanic_name:         string | null;
  branch_name:           string | null;
  branch_address:        string | null;
  branch_phone:          string | null;
  // Computed
  items_count:           number;
  total_amount:          number;
}

export interface ServiceJobItemRow {
  service_job_item_id: string;
  job_id:              string;
  item_id:             string | null;
  quantity:            number;
  price_at_service:    number;
  created_at:          string;
  // Joined
  item_name:           string | null;
  item_category:       string | null;
  item_sku:            string | null;
}

export interface ServiceJobDetailResult {
  job:   ServiceJobRow;
  items: ServiceJobItemRow[];
}

// ── 1. listServiceJobs ────────────────────────────────────────────────────

export async function listServiceJobs(input: ListServiceJobsInput = {}) {
  const supabase: AnyClient = await createClient();

  const {
    branch_id,
    state = 'all',
    search,
    mechanic_id,
    date_from,
    date_to,
    page      = 1,
    page_size = 50,
  } = input;

  const offset = (page - 1) * page_size;

  let query = supabase
    .from('service_job')
    .select(`
      job_id,
      job_number,
      branch_id,
      user_id,
      mechanic_id,
      customer_id,
      vehicle_id,
      vehicle_type_id,
      job_description,
      state,
      status,
      priority,
      notes,
      diagnostics,
      estimated_completion,
      job_date,
      created_at,
      updated_at,
      customer:customer_id ( name, phone ),
      vehicle:vehicle_id   ( plate_number, make, model, year ),
      mechanic:mechanic_id ( name ),
      branch:branch_id     ( name, address, phone ),
      service_job_item ( service_job_item_id, price_at_service, quantity )
    `, { count: 'exact' })
    .is('deleted_at', null)
    .is('service_job_item.deleted_at', null)
    .order('job_date', { ascending: false })
    .range(offset, offset + page_size - 1);

  if (branch_id)   query = query.eq('branch_id', branch_id);
  if (mechanic_id) query = query.eq('mechanic_id', mechanic_id);

  if (state && state !== 'all') {
    query = query.eq('state', state);
  }
  // When state='all', return everything (Kanban filters client-side by column; List has its own chip filters)

  if (date_from) query = query.gte('job_date', date_from);
  if (date_to)   query = query.lte('job_date', date_to);

  const { data, error, count } = await query;

  if (error) return { success: false, error: error.message, jobs: [], total: 0 };

  const jobs: ServiceJobRow[] = (data ?? []).map((row: AnyRecord) => {
    const customer  = row.customer  as AnyRecord | null;
    const vehicle   = row.vehicle   as AnyRecord | null;
    const mechanic  = row.mechanic  as AnyRecord | null;
    const branch    = row.branch    as AnyRecord | null;
    const items     = (row.service_job_item as AnyRecord[]) ?? [];

    const coercedState = resolveState(row);

    // Filter by search (customer name or job_number)
    if (search) {
      const q = search.toLowerCase();
      const matchesJob      = ((row.job_number as string) ?? '').toLowerCase().includes(q);
      const matchesCustomer = ((customer?.name as string) ?? '').toLowerCase().includes(q);
      const matchesPlate    = ((vehicle?.plate_number as string) ?? '').toLowerCase().includes(q);
      if (!matchesJob && !matchesCustomer && !matchesPlate) return null;
    }

    const totalAmount = items.reduce(
      (acc: number, i: AnyRecord) =>
        acc + Number(i.price_at_service ?? 0) * Number(i.quantity ?? 1),
      0
    );

    return {
      job_id:               row.job_id as string,
      job_number:           (row.job_number as string) ?? null,
      branch_id:            row.branch_id as string,
      user_id:              row.user_id as string,
      mechanic_id:          (row.mechanic_id as string) ?? null,
      customer_id:          (row.customer_id as string) ?? null,
      vehicle_id:           (row.vehicle_id as string) ?? null,
      vehicle_type_id:      (row.vehicle_type_id as string) ?? null,
      job_description:      row.job_description as string,
      state:                coercedState,
      priority:             toPriorityLabel(row.priority as number | null),
      notes:                (row.notes as string) ?? null,
      diagnostics:          (row.diagnostics as string) ?? null,
      estimated_completion: (row.estimated_completion as string) ?? null,
      job_date:             row.job_date as string,
      created_at:           row.created_at as string,
      updated_at:           (row.updated_at as string) ?? row.created_at as string,
      customer_name:        (customer?.name as string)           ?? null,
      plate_number:         (vehicle?.plate_number as string)    ?? null,
      vehicle_make:         (vehicle?.make as string)            ?? null,
      vehicle_model:        (vehicle?.model as string)           ?? null,
      vehicle_year:         (vehicle?.year as number)            ?? null,
      mechanic_name:        (mechanic?.name as string)           ?? null,
      branch_name:          (branch?.name as string)             ?? null,
      branch_address:       (branch?.address as string)          ?? null,
      branch_phone:         (branch?.phone as string)            ?? null,
      items_count:          items.length,
      total_amount:         totalAmount,
    };
  }).filter(Boolean) as ServiceJobRow[];

  return { success: true, jobs, total: count ?? 0, error: null };
}

// ── 2. getServiceJobDetail ────────────────────────────────────────────────

export async function getServiceJobDetail(
  jobId: string
): Promise<{ success: boolean; data: ServiceJobDetailResult | null; error: string | null }> {
  const supabase: AnyClient = await createClient();

  const { data: row, error } = await supabase
    .from('service_job')
    .select(`
      *,
      customer:customer_id ( customer_id, name, phone, address, email ),
      vehicle:vehicle_id   ( vehicle_id, plate_number, make, model, year, vehicle_type_id ),
      mechanic:mechanic_id ( user_id, name ),
      assigned_user:user_id ( user_id, name ),
      branch:branch_id     ( branch_id, name, address, phone ),
      vehicle_type:vehicle_type_id ( vehicle_type_id, name ),
      service_job_item (
        service_job_item_id,
        job_id,
        item_id,
        quantity,
        price_at_service,
        created_at,
        catalog_item:item_id (
          item_id, name, category, sku, sale_price, cost_price
        )
      )
    `)
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .is('service_job_item.deleted_at', null)
    .single();

  if (error || !row) {
    return { success: false, data: null, error: error?.message ?? 'Job not found' };
  }

  const customer  = row.customer  as AnyRecord | null;
  const vehicle   = row.vehicle   as AnyRecord | null;
  const mechanic  = row.mechanic  as AnyRecord | null;
  const branch    = row.branch    as AnyRecord | null;
  const rawItems  = (row.service_job_item as AnyRecord[]) ?? [];

  const items: ServiceJobItemRow[] = rawItems.map((i: AnyRecord) => {
    const ci = i.catalog_item as AnyRecord | null;
    return {
      service_job_item_id: i.service_job_item_id as string,
      job_id:              i.job_id as string,
      item_id:             (i.item_id as string) ?? null,
      quantity:            Number(i.quantity ?? 1),
      price_at_service:    Number(i.price_at_service ?? 0),
      created_at:          i.created_at as string,
      item_name:           (ci?.name as string)     ?? null,
      item_category:       (ci?.category as string) ?? null,
      item_sku:            (ci?.sku as string)       ?? null,
    };
  });

  const coercedState = resolveState(row as AnyRecord);

  const totalAmount = items.reduce(
    (acc, i) => acc + i.price_at_service * i.quantity,
    0
  );

  const job: ServiceJobRow = {
    job_id:               row.job_id,
    job_number:           row.job_number ?? null,
    branch_id:            row.branch_id,
    user_id:              row.user_id,
    mechanic_id:          row.mechanic_id ?? null,
    customer_id:          row.customer_id ?? null,
    vehicle_id:           row.vehicle_id ?? null,
    vehicle_type_id:      row.vehicle_type_id ?? null,
    job_description:      row.job_description,
    state:                coercedState,
    priority:             toPriorityLabel(row.priority as number | null),
    notes:                row.notes ?? null,
    diagnostics:          row.diagnostics ?? null,
    estimated_completion: row.estimated_completion ?? null,
    job_date:             row.job_date,
    created_at:           row.created_at,
    updated_at:           row.updated_at ?? row.created_at,
    customer_name:        (customer?.name as string)           ?? null,
    plate_number:         (vehicle?.plate_number as string)    ?? null,
    vehicle_make:         (vehicle?.make as string)            ?? null,
    vehicle_model:        (vehicle?.model as string)           ?? null,
    vehicle_year:         (vehicle?.year as number)            ?? null,
    mechanic_name:        (mechanic?.name as string)           ?? null,
    branch_name:          (branch?.name as string)             ?? null,
    branch_address:       (branch?.address as string)          ?? null,
    branch_phone:         (branch?.phone as string)            ?? null,
    items_count:          items.length,
    total_amount:         totalAmount,
  };

  return { success: true, data: { job, items }, error: null };
}

// ── 3. createServiceJob ───────────────────────────────────────────────────

export async function createServiceJob(input: CreateServiceJobInput) {
  // Use admin client to bypass RLS on sj_year_sequence (job-number trigger)
  const supabase: AnyClient = createAdminClient();

  const {
    branch_id, user_id, customer_id, vehicle_id, job_description,
    vehicle_type_id, mechanic_id, priority = 'normal',
    notes, diagnostics, estimated_completion, lines = [],
  } = input;

  const priorityNum = toPriorityNum(priority);

  if (!job_description?.trim()) {
    return { success: false, error: 'Job description is required', job_id: null };
  }

  // Insert service_job (job_number is auto-generated by DB trigger)
  const { data: job, error: jobErr } = await supabase
    .from('service_job')
    .insert({
      branch_id,
      user_id,
      customer_id:           customer_id   ?? null,
      vehicle_id:            vehicle_id    ?? null,
      vehicle_type_id:       vehicle_type_id ?? null,
      mechanic_id:           mechanic_id   ?? null,
      job_description,
      state:                 'quotation',
      status:                'quotation',
      priority:              priorityNum,
      notes:                 notes         ?? null,
      diagnostics:           diagnostics   ?? null,
      estimated_completion:  estimated_completion ?? null,
      job_date:              new Date().toISOString(),
    })
    .select('job_id, job_number')
    .single();

  if (jobErr || !job) {
    return { success: false, error: jobErr?.message ?? 'Insert failed', job_id: null };
  }

  // Insert line items if provided
  if (lines.length > 0) {
    const itemRows = lines.map(l => ({
      job_id:           job.job_id,
      item_id:          l.item_id ?? null,
      quantity:         l.quantity,
      price_at_service: l.price_at_service,
    }));

    const { error: itemErr } = await supabase
      .from('service_job_item')
      .insert(itemRows);

    if (itemErr) {
      // Rollback job via soft-delete
      await supabase
        .from('service_job')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('job_id', job.job_id)
        .is('deleted_at', null);
      return { success: false, error: `Item insert failed: ${itemErr.message}`, job_id: null };
    }
  }

  revalidatePath('/services');

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:       user_id,
    action:        'INSERT',
    table_name:    'service_job',
    record_id:     job.job_id,
    record_number: job.job_number ?? undefined,
    new_values: {
      job_number:      job.job_number,
      job_description,
      customer_id:     customer_id ?? null,
      vehicle_id:      vehicle_id ?? null,
      branch_id,
      priority,
      lines_count:     lines.length,
    },
  });

  return { success: true, error: null, job_id: job.job_id, job_number: job.job_number };
}

export async function updateServiceJobInfo(
  jobId:  string,
  input:  UpdateServiceJobInput
) {
  const supabase: AnyClient = await createClient();

  const updates: AnyRecord = {};
  if (input.job_description       !== undefined) updates.job_description       = input.job_description;
  if (input.vehicle_id            !== undefined) updates.vehicle_id            = input.vehicle_id;
  if (input.vehicle_type_id       !== undefined) updates.vehicle_type_id       = input.vehicle_type_id;
  if (input.mechanic_id           !== undefined) updates.mechanic_id           = input.mechanic_id;
  if (input.priority              !== undefined) updates.priority              = toPriorityNum(input.priority);
  if (input.notes                 !== undefined) updates.notes                 = input.notes;
  if (input.diagnostics           !== undefined) updates.diagnostics           = input.diagnostics;
  if (input.estimated_completion  !== undefined) updates.estimated_completion  = input.estimated_completion;
  if (input.customer_id           !== undefined) updates.customer_id           = input.customer_id;

  const { error } = await supabase
    .from('service_job')
    .update(updates)
    .eq('job_id', jobId)
    .is('deleted_at', null);

  if (error) return { success: false, error: error.message };

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:    null,
    action:     'UPDATE',
    table_name: 'service_job',
    record_id:  jobId,
    new_values: updates,
  });

  revalidatePath(`/services/${jobId}`);
  revalidatePath('/services');
  return { success: true, error: null };
}

// ── 5. upsertServiceJobItems ──────────────────────────────────────────────

/**
 * Full replace of all line items for a job.
 * Deletes existing rows and re-inserts the provided list.
 * Safe to call as an auto-save whenever the table changes.
 */
export async function upsertServiceJobItems(
  jobId: string,
  lines: ServiceJobLineInput[]
) {
  const supabase: AnyClient = await createClient();

  // Soft-delete all old items
  const { error: delErr } = await supabase
    .from('service_job_item')
    .update({ deleted_at: new Date().toISOString() })
    .eq('job_id', jobId)
    .is('deleted_at', null);

  if (delErr) return { success: false, error: delErr.message };

  if (lines.length === 0) {
    revalidatePath(`/services/${jobId}`);
    return { success: true, error: null };
  }

  const rows = lines.map(l => ({
    job_id:           jobId,
    item_id:          l.item_id ?? null,
    quantity:         l.quantity,
    price_at_service: l.price_at_service,
  }));

  const { error: insErr } = await supabase
    .from('service_job_item')
    .insert(rows);

  if (insErr) return { success: false, error: insErr.message };

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:    null,
    action:     'UPSERT_LINES',
    table_name: 'service_job_item',
    record_id:  jobId,
    new_values: { lines_count: lines.length },
  });

  revalidatePath(`/services/${jobId}`);
  return { success: true, error: null };
}

// ── 6. deleteServiceJobItem ───────────────────────────────────────────────

export async function deleteServiceJobItem(serviceJobItemId: string, jobId: string) {
  const supabase: AnyClient = await createClient();

  const { error } = await supabase
    .from('service_job_item')
    .update({ deleted_at: new Date().toISOString() })
    .eq('service_job_item_id', serviceJobItemId)
    .is('deleted_at', null);

  if (error) return { success: false, error: error.message };

  // Audit trail
  await supabase.from('audit_log').insert({
    user_id:    null,
    action:     'DELETE',
    table_name: 'service_job_item',
    record_id:  serviceJobItemId,
    old_values: { job_id: jobId },
  });

  revalidatePath(`/services/${jobId}`);
  return { success: true, error: null };
}

// ── 7. transitionServiceJob ───────────────────────────────────────────────

/**
 * Advances a service job to the next state.
 *
 * CRITICAL: When transitioning to 'completed' (Done), this function:
 *   a) Fetches all physical product line items (category != 'service')
 *   b) For each, looks up the matching inventory_item in the same branch (by SKU)
 *   c) Inserts a negative inventory_move (consumption / internal issue)
 *   d) Decrements inventory_item.stock_quantity
 *
 * All DB writes are wrapped conceptually in a sequential transaction;
 * if the inventory write fails, the state transition is rolled back.
 */
export async function transitionServiceJob(
  jobId:     string,
  nextState: ServiceState,
  userId:    string,
  note?:     string
): Promise<{ success: boolean; newState: ServiceState | null; error: string | null }> {
  const supabase: AnyClient = await createClient();

  // 1. Fetch current job
  const { data: job, error: fetchErr } = await supabase
    .from('service_job')
    .select(`
      job_id, job_number, state, status, branch_id,
      service_job_item (
        service_job_item_id,
        item_id,
        quantity,
        price_at_service,
        catalog_item:item_id ( item_id, name, category, sku, cost_price )
      )
    `)
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .is('service_job_item.deleted_at', null)
    .single();

  if (fetchErr || !job) {
    return { success: false, newState: null, error: `Service job not found: ${fetchErr?.message}` };
  }

  const currentState = resolveState(job as AnyRecord);

  if (!canTransitionService(currentState, nextState)) {
    return {
      success:  false,
      newState: null,
      error: `Illegal transition: "${SERVICE_STATE_LABELS[currentState]}" → "${SERVICE_STATE_LABELS[nextState]}"`,
    };
  }

  // 2. If transitioning to 'completed' → consume workshop stock
  if (nextState === 'completed') {
    const physicalItems = ((job.service_job_item as AnyRecord[]) ?? []).filter((i: AnyRecord) => {
      const ci = i.catalog_item as AnyRecord | null;
      // Only consume physical product categories (not service/labor lines)
      return ci && ci.category !== 'service' && ci.category !== null && i.item_id != null;
    });

    const stockErrors: string[] = [];

    for (const jobItem of physicalItems) {
      const ci       = jobItem.catalog_item as AnyRecord;
      const qty      = Number(jobItem.quantity ?? 1);
      const sku      = ci.sku as string | null;

      // Find matching inventory_item in the same branch (match by SKU first, then name)
      let invItem: AnyRecord | null = null;

      if (sku) {
        const { data } = await supabase
          .from('inventory_item')
          .select('item_id, cost_price, stock_quantity')
          .eq('branch_id', job.branch_id)
          .eq('sku', sku)
          .is('deleted_at', null)
          .maybeSingle();
        invItem = data;
      }

      if (!invItem) {
        // Fallback: match by name
        const { data } = await supabase
          .from('inventory_item')
          .select('item_id, cost_price, stock_quantity')
          .eq('branch_id', job.branch_id)
          .eq('name', ci.name)
          .is('deleted_at', null)
          .maybeSingle();
        invItem = data;
      }

      if (!invItem) {
        // Soft-warn: inventory item not found, log but don't block transition
        stockErrors.push(`No inventory_item found for "${ci.name as string}" (SKU: ${sku ?? 'N/A'})`);
        continue;
      }

      const unitCost = Number(invItem.cost_price ?? ci.cost_price ?? 0);

      // Insert inventory_move (Internal Issue / Delivery — negative qty = stock OUT)
      const { error: moveErr } = await supabase
        .from('inventory_moves')
        .insert({
          item_id:              invItem.item_id,
          branch_id:            job.branch_id,
          source_document_type: 'service',
          source_document_id:   jobId,
          quantity_moved:       -qty,     // negative = outbound / consumed
          unit_cost:            unitCost,
          notes:                `Workshop consumption for job ${job.job_number ?? jobId}`,
          created_by:           userId,
        });

      if (moveErr) {
        return {
          success:  false,
          newState: null,
          error: `Failed to log inventory move for "${ci.name as string}": ${moveErr.message}`,
        };
      }

      // Decrement cached stock_quantity
      const newQty = Math.max(0, Number(invItem.stock_quantity ?? 0) - qty);
      await supabase
        .from('inventory_item')
        .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
        .eq('item_id', invItem.item_id);
    }

    // Attach any stock warnings to the chatter note
    if (stockErrors.length > 0) {
      const warningNote = stockErrors.join('; ');
      await _addChatterLog({ supabase, jobId, userId, currentState, nextState,
        message: `⚠️ Stock deduction partial: ${warningNote}` });
    }
  }

  // 3. Update state on the service_job record
  const { error: updateErr } = await supabase
    .from('service_job')
    .update({
      state:      nextState,
      status:     nextState,       // keep legacy column in sync
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId);

  if (updateErr) {
    return { success: false, newState: null, error: updateErr.message };
  }

  // 4. Log the state change to chatter
  await _addChatterLog({
    supabase, jobId, userId, currentState, nextState,
    message: note ?? `Status changed: "${SERVICE_STATE_LABELS[currentState]}" → "${SERVICE_STATE_LABELS[nextState]}"`,
  });

  // Audit log: service job state transition
  await supabase.from('audit_log').insert({
    user_id:    userId,
    action:     'STATE_TRANSITION',
    table_name: 'service_job',
    record_id:  jobId,
    old_values: { state: currentState },
    new_values: { state: nextState },
  });

  revalidatePath(`/services/${jobId}`);
  revalidatePath('/services');
  return { success: true, newState: nextState, error: null };
}

// ── 8. cancelServiceJob ───────────────────────────────────────────────────

export async function cancelServiceJob(
  jobId:  string,
  userId: string,
  reason: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase: AnyClient = await createClient();

  const { data: job, error: fetchErr } = await supabase
    .from('service_job')
    .select('job_id, state, status')
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchErr || !job) {
    return { success: false, error: `Job not found: ${fetchErr?.message}` };
  }

  const currentState = resolveState(job as AnyRecord);

  if (currentState === 'invoiced') {
    return { success: false, error: 'Invoiced jobs cannot be cancelled. Contact a super admin.' };
  }

  const { error: updateErr } = await supabase
    .from('service_job')
    .update({
      state:      'cancelled',
      status:     'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId);

  if (updateErr) return { success: false, error: updateErr.message };

  // Log cancellation with reason
  await _addChatterLog({
    supabase, jobId, userId,
    currentState, nextState: 'cancelled',
    message: `Job cancelled. Reason: ${reason}`,
  });

  // Audit log: job cancellation
  await supabase.from('audit_log').insert({
    user_id:    userId,
    action:     'CANCEL_JOB',
    table_name: 'service_job',
    record_id:  jobId,
    old_values: { state: currentState },
    new_values: { state: 'cancelled', reason },
  });

  revalidatePath(`/services/${jobId}`);
  revalidatePath('/services');
  return { success: true, error: null };
}

// ── 9. getServiceSmartButtons ─────────────────────────────────────────────

export interface SmartButtonData {
  label:  string;
  value:  number | string;
  href?:  string;
  icon:   string;
  color:  string;
}

export async function getServiceSmartButtons(
  jobId:      string,
  customerId: string | null
): Promise<SmartButtonData[]> {
  const supabase: AnyClient = await createClient();

  const buttons: SmartButtonData[] = [];

  // Parts & labor line count
  const { count: itemCount } = await supabase
    .from('service_job_item')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .is('deleted_at', null);

  buttons.push({
    label: 'Parts / Labor',
    value: itemCount ?? 0,
    icon:  'Package',
    color: 'text-amber-600',
  });

  // Chatter message count
  const { count: chatCount } = await supabase
    .from('chatter_messages')
    .select('*', { count: 'exact', head: true })
    .eq('related_table', 'service_job')
    .eq('related_record_id', jobId);

  buttons.push({
    label: 'Chatter',
    value: chatCount ?? 0,
    icon:  'MessageSquare',
    color: 'text-blue-600',
  });

  // Inventory moves generated by this job
  const { count: movesCount } = await supabase
    .from('inventory_moves')
    .select('*', { count: 'exact', head: true })
    .eq('source_document_type', 'service')
    .eq('source_document_id', jobId);

  buttons.push({
    label: 'Stock Moves',
    value: movesCount ?? 0,
    icon:  'ArrowLeftRight',
    color: 'text-purple-600',
  });

  // Customer history
  if (customerId) {
    const { count: custJobCount } = await supabase
      .from('service_job')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .is('deleted_at', null);

    buttons.push({
      label: 'Customer Jobs',
      value: custJobCount ?? 0,
      href:  `/services?customer=${customerId}`,
      icon:  'History',
      color: 'text-green-600',
    });
  }

  return buttons;
}

// ── 10. getServiceFormOptions ─────────────────────────────────────────────
//
// Returns reference lists needed to populate the New Job / Edit Job form:
//   customers  – all active customers for current branch
//   mechanics  – all active users (potential mechanics) for current branch
//   vehicles   – vehicles for a specific customer (optional)
//   vehicleTypes – static list: car | motor | truck

export interface ServiceFormCustomer {
  customer_id: string;
  name:        string;
  phone:       string | null;
}

export interface ServiceFormMechanic {
  user_id: string;
  name:    string;
  role:    string;
}

export interface ServiceFormVehicle {
  vehicle_id:      string;
  plate_number:    string;
  make:            string | null;
  model:           string | null;
  year:            number | null;
  vehicle_type_id: string | null;
}

export interface ServiceFormCatalogItem {
  item_id:    string;
  name:       string;
  category:   string;
  sale_price: number;
  sku:        string | null;
}

interface ServiceCatalogManageInput {
  item_id?: string;
  name: string;
  sku?: string | null;
  sale_price: number;
}

export async function getServiceFormOptions(branchId?: string, customerId?: string) {
  const supabase: AnyClient = await createClient();

  const [custRes, mechRes, vtRes, catalogRes] = await Promise.all([
    supabase
      .from('customer')
      .select('customer_id, name, phone')
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .limit(500),
    supabase
      .from('user')
      .select('user_id, name, role')
      .eq('role', 'mechanic')
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('vehicle_type')
      .select('vehicle_type_id, name')
      .order('name', { ascending: true }),
    supabase
      .from('catalog_item')
      .select('item_id, name, category, sale_price, sku')
      .eq('category', 'service')
      .is('deleted_at', null)
      .order('name', { ascending: true }),
  ]);

  let vehicles: ServiceFormVehicle[] = [];
  if (customerId) {
    const { data: vehData } = await supabase
      .from('vehicle')
      .select('vehicle_id, plate_number, make, model, year, vehicle_type_id')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .order('plate_number', { ascending: true });
    vehicles = (vehData ?? []) as ServiceFormVehicle[];
  }

  return {
    customers:    (custRes.data   ?? []) as ServiceFormCustomer[],
    mechanics:    (mechRes.data   ?? []) as ServiceFormMechanic[],
    vehicles,
    catalogItems: (catalogRes.data ?? []) as ServiceFormCatalogItem[],
    vehicleTypes: ((vtRes.data ?? []) as { vehicle_type_id: string; name: string }[]).map(vt => ({
      value: vt.vehicle_type_id,
      label: vt.name.charAt(0).toUpperCase() + vt.name.slice(1),
    })),
  };
}

// ── 11. getVehiclesByCustomer ─────────────────────────────────────────────
//
// Lightweight helper to reload the vehicles list when the customer changes
// in the form (without re-fetching customers + mechanics).

export async function getVehiclesByCustomer(customerId: string): Promise<ServiceFormVehicle[]> {
  const supabase: AnyClient = await createClient();
  const { data } = await supabase
    .from('vehicle')
    .select('vehicle_id, plate_number, make, model, year, vehicle_type_id')
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('plate_number', { ascending: true });
  return (data ?? []) as ServiceFormVehicle[];
}

// ── Private helpers ────────────────────────────────────────────────────────

/**
 * Resolves the canonical state from either the `state` (new enum column)
 * or legacy `status` text column, mapping legacy values to ServiceState.
 */
function resolveState(row: AnyRecord): ServiceState {
  const raw = ((row.state ?? row.status) as string) ?? 'quotation';

  const legacyMap: Record<string, ServiceState> = {
    'pending':      'quotation',
    'in-progress':  'in_progress',
    'completed':    'completed',
    'paid':         'invoiced',
    'cancelled':    'cancelled',
  };

  if (legacyMap[raw]) return legacyMap[raw];

  const valid: ServiceState[] = [
    'quotation','confirmed','in_progress','quality_check',
    'completed','invoiced','cancelled',
  ];

  return valid.includes(raw as ServiceState) ? (raw as ServiceState) : 'quotation';
}

async function _addChatterLog(params: {
  supabase:     AnyClient;
  jobId:        string;
  userId:       string;
  currentState: ServiceState;
  nextState:    ServiceState;
  message:      string;
}) {
  const { supabase, jobId, userId, currentState, nextState, message } = params;
  await supabase.from('chatter_messages').insert({
    related_table:     'service_job',
    related_record_id: jobId,
    user_id:           userId,
    type:              'log',
    message,
    old_value:         currentState,
    new_value:         nextState,
    is_internal:       true,
  });
}

// ── searchCatalogItems ────────────────────────────────────────────────────

/**
 * Full-text / ilike search of catalog_item for the "Add from Catalog" picker
 * in the Parts & Labor tab.  Returns items whose name or SKU contains the
 * query string, ordered by category then name.
 */
export interface CatalogItemOption {
  item_id:    string;
  name:       string;
  category:   string;
  sku:        string | null;
  sale_price: number;
  cost_price: number;
}

export async function searchCatalogItems(
  query:         string,
  vehicleTypeId?: string,
  limit          = 20,
): Promise<{ success: boolean; items: CatalogItemOption[]; error?: string }> {
  const supabase: AnyClient = await createClient();

  let qb = supabase
    .from('catalog_item')
    .select('item_id, name, category, sku, sale_price, cost_price')
    .is('deleted_at', null)
    .order('category')
    .order('name')
    .limit(limit);

  if (query.trim()) {
    qb = qb.ilike('name', `%${query.trim()}%`);
  }

  if (vehicleTypeId) {
    // Include items that are for this vehicle type OR have no vehicle type restriction
    qb = qb.or(`vehicle_type_id.eq.${vehicleTypeId},vehicle_type_id.is.null`);
  }

  const { data, error } = await qb;
  if (error) return { success: false, items: [], error: error.message };

  return {
    success: true,
    items: (data ?? []).map((r: AnyRecord) => ({
      item_id:    r.item_id    as string,
      name:       r.name       as string,
      category:   r.category   as string,
      sku:        r.sku        as string | null,
      sale_price: Number(r.sale_price ?? 0),
      cost_price: Number(r.cost_price ?? 0),
    })),
  };
}

// ── Settings: Service Catalog Management (server-side bypass with role guard) ─

async function _getCallerRole(): Promise<string | null> {
  const supabase: AnyClient = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.id) return null;

  const { data: row } = await supabase
    .from('user')
    .select('role')
    .eq('auth_id', authUser.id)
    .is('deleted_at', null)
    .maybeSingle();

  return (row?.role as string | undefined) ?? null;
}

async function _assertCatalogManagerRole(): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await _getCallerRole();
  if (role === 'super_admin' || role === 'branch_manager') return { ok: true };
  return { ok: false, error: 'You do not have permission to manage services.' };
}

export async function listServiceCatalogForSettings(): Promise<{
  success: boolean;
  items: ServiceFormCatalogItem[];
  error?: string;
}> {
  const access = await _assertCatalogManagerRole();
  if (!access.ok) return { success: false, items: [], error: access.error };

  const admin: AnyClient = createAdminClient();
  const { data, error } = await admin
    .from('catalog_item')
    .select('item_id, name, category, sale_price, sku')
    .eq('category', 'service')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) return { success: false, items: [], error: error.message };
  return { success: true, items: (data ?? []) as ServiceFormCatalogItem[] };
}

export async function upsertServiceCatalogItem(input: ServiceCatalogManageInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const access = await _assertCatalogManagerRole();
  if (!access.ok) return { success: false, error: access.error };

  const admin: AnyClient = createAdminClient();
  const payload = {
    name: input.name.trim(),
    sku: input.sku?.trim() || null,
    category: 'service',
    cost_price: 0,
    sale_price: Number(input.sale_price),
    deleted_at: null,
  };

  const qb = input.item_id
    ? admin.from('catalog_item').update(payload).eq('item_id', input.item_id)
    : admin.from('catalog_item').insert(payload);

  const { error } = await qb;
  if (error) return { success: false, error: error.message };

  revalidatePath('/settings');
  revalidatePath('/services');
  revalidatePath('/services/list');
  return { success: true };
}

export async function archiveServiceCatalogItem(itemId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const access = await _assertCatalogManagerRole();
  if (!access.ok) return { success: false, error: access.error };

  const admin: AnyClient = createAdminClient();
  const { error } = await admin
    .from('catalog_item')
    .update({ deleted_at: new Date().toISOString() })
    .eq('item_id', itemId)
    .eq('category', 'service');

  if (error) return { success: false, error: error.message };

  revalidatePath('/settings');
  revalidatePath('/services');
  revalidatePath('/services/list');
  return { success: true };
}
