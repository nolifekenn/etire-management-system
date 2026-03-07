/**
 * src/lib/serviceUtils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure (non-async) utility functions for the Services module.
 * Kept separate from services.ts so they can be imported in client components
 * without triggering the Next.js "Server Actions must be async" rule.
 */

export type ServiceState =
  | 'quotation'
  | 'confirmed'
  | 'in_progress'
  | 'quality_check'
  | 'completed'
  | 'invoiced'
  | 'cancelled';

export const SERVICE_STATE_LABELS: Record<ServiceState, string> = {
  quotation:     'Draft Quotation',
  confirmed:     'Confirmed',
  in_progress:   'In Progress',
  quality_check: 'Quality Check',
  completed:     'Done',
  invoiced:      'Invoiced',
  cancelled:     'Cancelled',
};

export const SERVICE_STATE_COLORS: Record<ServiceState, string> = {
  quotation:     'bg-gray-100 text-gray-700',
  confirmed:     'bg-blue-100 text-blue-700',
  in_progress:   'bg-amber-100 text-amber-700',
  quality_check: 'bg-purple-100 text-purple-700',
  completed:     'bg-green-100 text-green-700',
  invoiced:      'bg-indigo-100 text-indigo-700',
  cancelled:     'bg-red-100 text-red-700',
};

const ALLOWED_TRANSITIONS: Record<ServiceState, ServiceState[]> = {
  quotation:     ['confirmed', 'cancelled'],
  confirmed:     ['in_progress', 'cancelled'],
  in_progress:   ['quality_check', 'cancelled'],
  quality_check: ['in_progress', 'completed'],
  completed:     ['invoiced'],
  invoiced:      [],
  cancelled:     [],
};

export function getNextServiceStates(current: ServiceState): ServiceState[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

export function canTransitionService(current: ServiceState, next: ServiceState): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}
