/**
 * poUtils.ts
 * ----------
 * Pure (non-async) Purchase Order state machine utilities.
 * No server-side imports — safe to use in both client and server components.
 *
 * Async DB transition functions remain in stateTransitions.ts.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type POState = 'draft' | 'sent' | 'purchase' | 'locked' | 'cancelled';

export interface POTransitionResult {
  success:  boolean;
  newState: POState | null;
  error:    string | null;
}

// ── Allowed transitions (adjacency map) ────────────────────────────────────

const PO_TRANSITIONS: Record<POState, POState[]> = {
  draft:     ['sent', 'cancelled'],
  sent:      ['purchase', 'cancelled'],
  purchase:  ['locked', 'cancelled'],
  locked:    [],
  cancelled: [],
};

// ── Human-readable labels ──────────────────────────────────────────────────

export const PO_STATE_LABELS: Record<POState, string> = {
  draft:     'Draft RFQ',
  sent:      'RFQ Sent',
  purchase:  'Purchase Order',
  locked:    'Locked',
  cancelled: 'Cancelled',
};

// ── State colour for badge chips ───────────────────────────────────────────

export const PO_STATE_COLORS: Record<POState, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-100 text-blue-700',
  purchase:  'bg-green-100 text-green-700',
  locked:    'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const OPEN_PURCHASE_ORDER_STATES = [
  'draft',
  'sent',
  'purchase',
  'pending',
  'approved',
  'ordered',
] as const;

// ── Validation helpers ─────────────────────────────────────────────────────

export function canTransitionPO(current: POState, next: POState): boolean {
  return PO_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getNextPOStates(current: POState): POState[] {
  return PO_TRANSITIONS[current] ?? [];
}

export function isOpenPurchaseOrder(stateOrStatus?: string | null): boolean {
  if (!stateOrStatus) return false;
  return OPEN_PURCHASE_ORDER_STATES.includes(stateOrStatus as (typeof OPEN_PURCHASE_ORDER_STATES)[number]);
}
