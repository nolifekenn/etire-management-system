/**
 * src/lib/reportUtils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure (non-async) utility functions for the Reports module.
 * Kept separate from analytics.ts so they can be imported in client components
 * without triggering the Next.js "Server Actions must be async" rule.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/**
 * Convert an array of records to a CSV string.
 */
export function formatCSV(rows: AnyRecord[], columns: string[]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = columns.join(',');
  const body   = rows.map(row => columns.map(col => escape(row[col])).join(',')).join('\n');
  return `${header}\n${body}`;
}
