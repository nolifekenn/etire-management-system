/**
 * stateTransitions.ts
 * -------------------
 * Server-side state machine for ERP document lifecycles.
 * Mirrors Odoo 19's button-driven status flow with DB-level validation.
 *
 * Each transition function:
 *  1. Validates the transition is legal
 *  2. Calls the DB function / chatter log
 *  3. Returns { success, newState, error }
 */

import { createClient } from '@/lib/supabaseServer';
import { canTransitionPO, PO_STATE_LABELS, type POState } from '@/lib/poUtils';

// Convenience alias — cast to any to handle tables added by migration
// that are not yet in the generated Database types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

// ── Re-exports from pure utility modules (safe for client components) ──────

export type { POState } from '@/lib/poUtils';
export { PO_STATE_LABELS, PO_STATE_COLORS, canTransitionPO, getNextPOStates } from '@/lib/poUtils';

// ── Types ──────────────────────────────────────────────────────────────────

export type ServiceState = 'quotation' | 'in_progress' | 'quality_check' | 'completed' | 'invoiced' | 'cancelled';
export type SaleState    = 'draft' | 'confirmed' | 'done' | 'cancelled';

export interface TransitionResult<T extends string> {
  success:  boolean;
  newState: T | null;
  error:    string | null;
}

// ── Allowed transitions (adjacency map) ────────────────────────────────────

const SERVICE_TRANSITIONS: Record<ServiceState, ServiceState[]> = {
  quotation:     ['in_progress', 'cancelled'],
  in_progress:   ['quality_check', 'cancelled'],
  quality_check: ['in_progress', 'completed'],   // fail QC → back to in_progress
  completed:     ['invoiced'],
  invoiced:      [],
  cancelled:     [],
};

const SALE_TRANSITIONS: Record<SaleState, SaleState[]> = {
  draft:     ['confirmed', 'cancelled'],
  confirmed: ['done', 'cancelled'],
  done:      [],
  cancelled: [],
};

// ── Human-readable label for each state ────────────────────────────────────

export const SERVICE_STATE_LABELS: Record<ServiceState, string> = {
  quotation:     'Quotation',
  in_progress:   'In Progress',
  quality_check: 'Quality Check',
  completed:     'Completed',
  invoiced:      'Invoiced',
  cancelled:     'Cancelled',
};

export const SALE_STATE_LABELS: Record<SaleState, string> = {
  draft:     'Quotation',
  confirmed: 'Sales Order',
  done:      'Locked',
  cancelled: 'Cancelled',
};

// ── Validation helpers ─────────────────────────────────────────────────────

export function canTransitionService(current: ServiceState, next: ServiceState): boolean {
  return SERVICE_TRANSITIONS[current]?.includes(next) ?? false;
}

export function canTransitionSale(current: SaleState, next: SaleState): boolean {
  return SALE_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getNextServiceStates(current: ServiceState): ServiceState[] {
  return SERVICE_TRANSITIONS[current] ?? [];
}


export async function transitionPurchaseOrder(
  poId:     string,
  nextState: POState,
  userId:   string,
  note?:    string
): Promise<TransitionResult<POState>> {
  const supabase: AnyClient = await createClient();

  // 1. Fetch current state
  const { data: po, error: fetchErr } = await supabase
    .from('purchase_order')
    .select('po_id, po_number, status, state')
    .eq('po_id', poId)
    .single();

  if (fetchErr || !po) {
    return { success: false, newState: null, error: `PO not found: ${fetchErr?.message}` };
  }

  // Resolve current state from ENUM column (preferred) or legacy text
  const currentState = (po.state ?? po.status) as POState;

  if (!canTransitionPO(currentState, nextState)) {
    return {
      success:  false,
      newState: null,
      error:    `Illegal transition: ${PO_STATE_LABELS[currentState]} → ${PO_STATE_LABELS[nextState]}`,
    };
  }

  // 2. Update state
  const { error: updateErr } = await supabase
    .from('purchase_order')
    .update({
      state:      nextState,
      status:     nextState,   // keep legacy column in sync
      updated_at: new Date().toISOString(),
    })
    .eq('po_id', poId);

  if (updateErr) {
    return { success: false, newState: null, error: updateErr.message };
  }

  // 3. Log to chatter
  await addChatterLog({
    relatedTable:    'purchase_order',
    relatedRecordId: poId,
    userId,
    oldValue:  currentState,
    newValue:  nextState,
    message:   note ?? `Status changed: "${PO_STATE_LABELS[currentState]}" → "${PO_STATE_LABELS[nextState]}"`,
  });

  return { success: true, newState: nextState, error: null };
}

// ── Service Job transitions ────────────────────────────────────────────────

export async function transitionServiceJob(
  jobId:     string,
  nextState: ServiceState,
  userId:    string,
  note?:     string
): Promise<TransitionResult<ServiceState>> {
  const supabase: AnyClient = await createClient();

  const { data: job, error: fetchErr } = await supabase
    .from('service_job')
    .select('job_id, job_number, status, state')
    .eq('job_id', jobId)
    .single();

  if (fetchErr || !job) {
    return { success: false, newState: null, error: `Job not found: ${fetchErr?.message}` };
  }

  const currentState = (job.state ?? job.status) as ServiceState;

  if (!canTransitionService(currentState, nextState)) {
    return {
      success:  false,
      newState: null,
      error:    `Illegal transition: ${SERVICE_STATE_LABELS[currentState]} → ${SERVICE_STATE_LABELS[nextState]}`,
    };
  }

  const { error: updateErr } = await supabase
    .from('service_job')
    .update({
      state:      nextState,
      status:     nextState,
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId);

  if (updateErr) {
    return { success: false, newState: null, error: updateErr.message };
  }

  await addChatterLog({
    relatedTable:    'service_job',
    relatedRecordId: jobId,
    userId,
    oldValue:  currentState,
    newValue:  nextState,
    message:   note ?? `Status changed: "${SERVICE_STATE_LABELS[currentState]}" → "${SERVICE_STATE_LABELS[nextState]}"`,
  });

  return { success: true, newState: nextState, error: null };
}

// ── Internal: write a log entry to chatter_message ────────────────────────

async function addChatterLog(params: {
  relatedTable:    string;
  relatedRecordId: string;
  userId:          string;
  oldValue:        string;
  newValue:        string;
  message:         string;
}) {
  const supabase: AnyClient = await createClient();
  await supabase.from('chatter_message').insert({
    record_table:  params.relatedTable,
    record_id:     params.relatedRecordId,
    author_id:     params.userId,
    message_type:  'state_change',
    body:          params.message,
    old_state:     params.oldValue,
    new_state:     params.newValue,
    is_internal:   true,
  });
}
