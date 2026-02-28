/* ────────────────────────────────────────────────────────────────────────────
 * src/app/reports/page.tsx
 * Phase 3 — Pivot / Report View
 * Date-range picker · Tab selector · Group-by · Sortable table · CSV export
 * ──────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign, Package, Wrench, RefreshCw,
  Loader2, Search, AlertTriangle, ChevronUp, ChevronDown,
  ArrowUpRight, Filter, FileSpreadsheet, FileText,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import {
  getSalesReport,     type SalesReportRow,
  getInventoryReport, type InventoryReportRow,
  getServiceReport,   type ServiceReportRow,
} from '@/lib/actions/analytics';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportTab = 'sales' | 'inventory' | 'services';
type SortDir   = 'asc' | 'desc';

// ── Formatting ────────────────────────────────────────────────────────────────

const fmt =   (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n);
const fmtQty = (n: number) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n);

// Radix UI: SelectItem must not have value="" — use sentinel
const NONE   = '__none__';
const toVal  = (v: string) => (v === NONE ? '' : v);
const toSel  = (v: string) => (v === ''   ? NONE : v);

// ── Date-range preset ────────────────────────────────────────────────────────

interface DateRange { from: string; to: string; label: string }

const PRESETS: DateRange[] = [
  { from: format(subDays(new Date(), 6),  'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd'), label: 'Last 7 days' },
  { from: format(subDays(new Date(), 29), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd'), label: 'Last 30 days' },
  { from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd'), label: 'This Month' },
  { from: format(startOfYear(new Date()),  'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd'), label: 'This Year' },
];

// ── Status color maps ────────────────────────────────────────────────────────

const SALE_STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  done:      'bg-blue-100 text-blue-700',
  draft:     'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

const SVC_STATE_COLORS: Record<string, string> = {
  quotation:     'bg-gray-100 text-gray-600',
  confirmed:     'bg-blue-100 text-blue-700',
  in_progress:   'bg-amber-100 text-amber-700',
  quality_check: 'bg-violet-100 text-violet-700',
  completed:     'bg-emerald-100 text-emerald-700',
  invoiced:      'bg-green-100 text-green-700',
  cancelled:     'bg-red-100 text-red-600',
};

// ── Sort helpers ─────────────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: SortDir }) {
  if (col !== sortCol) return <ChevronUp className="h-3 w-3 opacity-20" />;
  return sortDir === 'asc'
    ? <ChevronUp className="h-3 w-3" />
    : <ChevronDown className="h-3 w-3" />;
}

function useSortedData<T extends Record<string, unknown>>(
  data: T[], sortCol: string, sortDir: SortDir
): T[] {
  return useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc'
        ? String(va ?? '').localeCompare(String(vb ?? ''))
        : String(vb ?? '').localeCompare(String(va ?? ''));
    });
    return sorted;
  }, [data, sortCol, sortDir]);
}

// ── CSV export (accounting format) ──────────────────────────────────────────

const BOM = '\uFEFF'; // UTF-8 BOM so Excel reads ₱ correctly

function downloadCSV(
  filename: string,
  rows: Record<string, unknown>[],
  cols: string[],
  headers: string[],
  numericCols: string[] = [],
) {
  const escape = (v: unknown, col: string) => {
    const raw = v ?? '';
    // Numeric columns: output plain decimal with 2 dp so Excel applies Accounting format correctly
    if (numericCols.includes(col) && typeof raw === 'number') {
      return raw.toFixed(2);
    }
    const s = String(raw);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers.join(','), ...rows.map(r => cols.map(c => escape(r[c], c)).join(','))];
  const blob  = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  const a     = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF export helpers ────────────────────────────────────────────────────────

const BRAND_COLOR: [number, number, number] = [113, 75, 103]; // eTire purple

function fmtAcct(n: number): string {
  if (n < 0) return `(${Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  return n === 0 ? '-  ' : n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pdfHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_COLOR);
  doc.text('eTire MIS', 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(title, 14, 19);
  doc.text(subtitle, 14, 24);
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}`, 14, 29);
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.4);
  doc.line(14, 31, doc.internal.pageSize.width - 14, 31);
}

// ── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 px-4 py-2.5">
      {items.map(({ label, value, color = 'text-foreground' }) => (
        <div key={label} className="text-center min-w-20">
          <p className={`text-lg font-bold tracking-tight ${color}`}>{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Th helper ────────────────────────────────────────────────────────────────

function Th({
  col, label, sortCol, sortDir, onClick, align = 'left',
}: {
  col: string; label: string; sortCol: string; sortDir: SortDir;
  onClick: (c: string) => void; align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap
        ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onClick(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </span>
    </th>
  );
}

// ── Sales Table ───────────────────────────────────────────────────────────────

function SalesTable({
  rows, loading, search,
}: { rows: SalesReportRow[]; loading: boolean; search: string }) {
  const [sortCol, setSortCol] = useState('sale_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => rows.filter(r =>
    !search ||
    (r.sale_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.customer_name ?? '').toLowerCase().includes(search.toLowerCase())
  ), [rows, search]);

  const sorted = useSortedData(filtered as unknown as Record<string, unknown>[], sortCol, sortDir);

  const handleSort = (col: string) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const totalRevenue  = filtered.reduce((a, r) => a + r.total_amount, 0);
  const totalDiscount = filtered.reduce((a, r) => a + r.discount, 0);

  return (
    <>
      <SummaryBar items={[
        { label: 'Transactions', value: fmtQty(filtered.length) },
        { label: 'Total Revenue', value: fmt(totalRevenue), color: 'text-blue-600' },
        { label: 'Total Discounts', value: fmt(totalDiscount), color: 'text-red-500' },
        { label: 'Net', value: fmt(totalRevenue - totalDiscount), color: 'text-emerald-600' },
      ]} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <Th col="sale_number"   label="Sale #"         sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="sale_date"     label="Date"           sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="customer_name" label="Customer"       sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="branch_name"   label="Branch"         sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="payment_method" label="Payment"       sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="status"        label="Status"         sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="items_count"   label="Items"  align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="discount"      label="Discount" align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="total_amount"  label="Total"  align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-muted-foreground text-sm">No sales data found</td></tr>
            ) : (
              (sorted as unknown as SalesReportRow[]).map(row => (
                <tr key={row.sale_id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono text-xs text-blue-600">
                    <a href={`/receipt/${row.sale_id}`} className="hover:underline inline-flex items-center gap-1">
                      {row.sale_number ?? '—'} <ArrowUpRight className="h-3 w-3 opacity-60" />
                    </a>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(row.sale_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-3 py-2">{row.customer_name ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.branch_name ?? '—'}</td>
                  <td className="px-3 py-2 text-xs capitalize">{row.payment_method}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${SALE_STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-xs">{row.items_count}</td>
                  <td className="px-3 py-2 text-right text-xs text-red-500">{row.discount > 0 ? `-${fmt(row.discount)}` : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(row.total_amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Inventory Table ────────────────────────────────────────────────────────────

function InventoryTable({
  rows, loading, search,
}: { rows: InventoryReportRow[]; loading: boolean; search: string }) {
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => rows.filter(r =>
    !search ||
    (r.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.category ?? '').toLowerCase().includes(search.toLowerCase())
  ), [rows, search]);

  const sorted = useSortedData(filtered as unknown as Record<string, unknown>[], sortCol, sortDir);

  const handleSort = (col: string) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const totalValue   = filtered.reduce((a, r) => a + r.stock_value, 0);
  const lowStockCnt  = filtered.filter(r => r.is_low_stock).length;

  return (
    <>
      <SummaryBar items={[
        { label: 'SKUs', value: fmtQty(filtered.length) },
        { label: 'Total Value', value: fmt(totalValue), color: 'text-emerald-600' },
        { label: 'Low Stock', value: String(lowStockCnt), color: lowStockCnt > 0 ? 'text-red-500' : 'text-foreground' },
      ]} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <Th col="name"           label="Item Name"   sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="category"       label="Category"    sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="sku"            label="SKU"         sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="branch_name"    label="Branch"      sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="supplier_name"  label="Supplier"    sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="stock_quantity" label="On Hand"  align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="ledger_on_hand" label="Ledger Qty" align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="cost_price"     label="Cost"    align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="sale_price"     label="Sales Price" align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="stock_value"    label="Value"   align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="reorder_level"  label="Reorder" align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={11} className="py-12 text-center text-muted-foreground text-sm">No inventory data found</td></tr>
            ) : (
              (sorted as unknown as InventoryReportRow[]).map(row => (
                <tr
                  key={row.item_id}
                  className={`border-t transition-colors ${row.is_low_stock ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-muted/30'}`}
                >
                  <td className="px-3 py-2 font-medium">
                    {row.name}
                    {row.is_low_stock && (
                      <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">Low</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs capitalize text-muted-foreground">{row.category}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.sku ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.branch_name ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.supplier_name ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{fmtQty(row.stock_quantity)}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{fmtQty(row.ledger_on_hand)}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmt(row.cost_price)}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmt(row.sale_price)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(row.stock_value)}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{row.reorder_level}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Services Table ────────────────────────────────────────────────────────────

function ServicesTable({
  rows, loading, search,
}: { rows: ServiceReportRow[]; loading: boolean; search: string }) {
  const [sortCol, setSortCol] = useState('job_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => rows.filter(r =>
    !search ||
    (r.job_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.plate_number ?? '').toLowerCase().includes(search.toLowerCase())
  ), [rows, search]);

  const sorted = useSortedData(filtered as unknown as Record<string, unknown>[], sortCol, sortDir);

  const handleSort = (col: string) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const totalValue  = filtered.reduce((a, r) => a + r.total_value, 0);
  const partsValue  = filtered.reduce((a, r) => a + r.parts_value, 0);
  const laborValue  = filtered.reduce((a, r) => a + r.labor_value, 0);

  return (
    <>
      <SummaryBar items={[
        { label: 'Jobs', value: fmtQty(filtered.length) },
        { label: 'Total Value', value: fmt(totalValue), color: 'text-violet-600' },
        { label: 'Parts', value: fmt(partsValue), color: 'text-blue-600' },
        { label: 'Labor', value: fmt(laborValue), color: 'text-amber-600' },
      ]} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <Th col="job_number"    label="Job #"       sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="job_date"      label="Date"        sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="state"         label="State"       sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="priority"      label="Priority"    sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="customer_name" label="Customer"    sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="plate_number"  label="Plate"       sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="mechanic_name" label="Mechanic"    sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="branch_name"   label="Branch"      sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="items_count"   label="Items" align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="parts_value"   label="Parts" align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="labor_value"   label="Labor" align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
              <Th col="total_value"   label="Total" align="right" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={12} className="py-12 text-center text-muted-foreground text-sm">No service data found</td></tr>
            ) : (
              (sorted as unknown as ServiceReportRow[]).map(row => (
                <tr key={row.job_id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs text-violet-600">
                    <a href={`/services/${row.job_id}`} className="hover:underline inline-flex items-center gap-1">
                      {row.job_number ?? '—'} <ArrowUpRight className="h-3 w-3 opacity-60" />
                    </a>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(row.job_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${SVC_STATE_COLORS[row.state] ?? 'bg-gray-100 text-gray-600'}`}>
                      {row.state.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs capitalize text-muted-foreground">{row.priority}</td>
                  <td className="px-3 py-2">{row.customer_name ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.plate_number ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.mechanic_name ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.branch_name ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-xs">{row.items_count}</td>
                  <td className="px-3 py-2 text-right text-xs text-blue-600">{fmt(row.parts_value)}</td>
                  <td className="px-3 py-2 text-right text-xs text-amber-600">{fmt(row.labor_value)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(row.total_value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { activeBranchId } = useAuth();

  const [activeTab,     setActiveTab]     = useState<ReportTab>('sales');
  const [dateRange,     setDateRange]     = useState<DateRange>(PRESETS[1]);
  const [customFrom,    setCustomFrom]    = useState('');
  const [customTo,      setCustomTo]      = useState('');
  const [showCustom,    setShowCustom]    = useState(false);

  // Filter state per tab
  const [salesStatus,   setSalesStatus]   = useState('');
  const [invCategory,   setInvCategory]   = useState('');
  const [invLowStock,   setInvLowStock]   = useState(false);
  const [svcState,      setSvcState]      = useState('');
  const [search,        setSearch]        = useState('');

  // Data
  const [salesRows,     setSalesRows]     = useState<SalesReportRow[]>([]);
  const [invRows,       setInvRows]       = useState<InventoryReportRow[]>([]);
  const [svcRows,       setSvcRows]       = useState<ServiceReportRow[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const branchFilter = activeBranchId ? { branch_id: activeBranchId } : {};

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadSales = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await getSalesReport({
      ...branchFilter,
      date_from: dateRange.from,
      date_to:   dateRange.to,
      status:    salesStatus || undefined,
      page_size: 500,
    });
    if (res.success) setSalesRows(res.rows);
    else setError(res.error ?? 'Failed to load sales');
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, dateRange, salesStatus]);

  const loadInventory = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await getInventoryReport({
      ...branchFilter,
      category:       invCategory || undefined,
      low_stock_only: invLowStock,
    });
    if (res.success) setInvRows(res.rows);
    else setError(res.error ?? 'Failed to load inventory');
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, invCategory, invLowStock]);

  const loadServices = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await getServiceReport({
      ...branchFilter,
      date_from: dateRange.from,
      date_to:   dateRange.to,
      state:     svcState || undefined,
    });
    if (res.success) setSvcRows(res.rows);
    else setError(res.error ?? 'Failed to load services');
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, dateRange, svcState]);

  // Reload when tab or relevant filters change
  useEffect(() => {
    setSearch('');
    if (activeTab === 'sales')     loadSales();
    if (activeTab === 'inventory') loadInventory();
    if (activeTab === 'services')  loadServices();
  }, [activeTab, loadSales, loadInventory, loadServices]);

  // ── CSV export ──────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (activeTab === 'sales') {
      downloadCSV(
        `sales-report-${dateRange.from}-${dateRange.to}.csv`,
        salesRows as unknown as Record<string, unknown>[],
        ['sale_number','sale_date','customer_name','branch_name','payment_method','status','items_count','discount','total_amount'],
        ['Sale #','Date','Customer','Branch','Payment Method','Status','Items','Discount (PHP)','Total Amount (PHP)'],
        ['discount','total_amount'],
      );
    } else if (activeTab === 'inventory') {
      downloadCSV(
        `inventory-report-${format(new Date(), 'yyyy-MM-dd')}.csv`,
        invRows as unknown as Record<string, unknown>[],
        ['name','category','sku','branch_name','supplier_name','stock_quantity','ledger_on_hand','cost_price','sale_price','stock_value','reorder_level','is_low_stock'],
        ['Product','Category','SKU','Branch','Supplier','Stock Qty','Ledger On Hand','Cost Price (PHP)','Selling Price (PHP)','Stock Value (PHP)','Reorder Level','Low Stock Alert'],
        ['cost_price','sale_price','stock_value'],
      );
    } else {
      downloadCSV(
        `services-report-${dateRange.from}-${dateRange.to}.csv`,
        svcRows as unknown as Record<string, unknown>[],
        ['job_number','job_date','state','priority','customer_name','plate_number','mechanic_name','branch_name','items_count','parts_value','labor_value','total_value'],
        ['Job #','Date','Status','Priority','Customer','Plate Number','Mechanic','Branch','Items','Parts (PHP)','Labor (PHP)','Total Value (PHP)'],
        ['parts_value','labor_value','total_value'],
      );
    }
  };

  // ── PDF export ──────────────────────────────────────────────────────────

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    if (activeTab === 'sales') {
      pdfHeader(doc, 'Sales Report', `Period: ${dateRange.from}  to  ${dateRange.to}`);
      const totalAmount   = salesRows.reduce((s, r) => s + (r.total_amount ?? 0), 0);
      const totalDiscount = salesRows.reduce((s, r) => s + (r.discount    ?? 0), 0);
      autoTable(doc, {
        startY: 35,
        head: [['Sale #','Date','Customer','Branch','Payment Method','Status','Items','Discount (PHP)','Total Amount (PHP)']],        body: salesRows.map(r => [
          r.sale_number ?? '-',
          r.sale_date ? r.sale_date.slice(0, 10) : '-',
          r.customer_name ?? '-',
          r.branch_name   ?? '-',
          (r.payment_method ?? 'cash').replace(/_/g,' '),
          (r.status ?? '').toUpperCase(),
          String(r.items_count ?? 0),
          fmtAcct(r.discount ?? 0),
          fmtAcct(r.total_amount ?? 0),
        ]),
        foot: [['','','','','','','Totals', fmtAcct(totalDiscount), fmtAcct(totalAmount)]],
        styles:      { fontSize: 8, cellPadding: 2 },
        headStyles:  { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        footStyles:  { fillColor: [240, 235, 245], textColor: [50, 20, 70], fontStyle: 'bold' },
        columnStyles: { 7: { halign: 'right' }, 8: { halign: 'right' } },
        alternateRowStyles: { fillColor: [251, 248, 252] },
      });
      doc.save(`sales-report-${dateRange.from}-${dateRange.to}.pdf`);

    } else if (activeTab === 'inventory') {
      pdfHeader(doc, 'Inventory Report', `As of ${format(new Date(), 'MMMM dd, yyyy')}`);
      const totalStockValue = invRows.reduce((s, r) => s + (r.stock_value ?? 0), 0);
      autoTable(doc, {
        startY: 35,
        head: [['Product','Category','SKU','Branch','Supplier','Stock Qty','Ledger QOH','Cost (PHP)','Price (PHP)','Stock Value (PHP)','Reorder','Alert']],
        body: invRows.map(r => [
          r.name,
          r.category ?? '-',
          r.sku ?? '-',
          r.branch_name   ?? '-',
          r.supplier_name ?? '-',
          String(r.stock_quantity ?? 0),
          String(r.ledger_on_hand ?? 0),
          fmtAcct(r.cost_price ?? 0),
          fmtAcct(r.sale_price  ?? 0),
          fmtAcct(r.stock_value ?? 0),
          String(r.reorder_level ?? 5),
          r.is_low_stock ? 'LOW' : '',
        ]),
        foot: [['','','','','','','','','Total Stock Value', fmtAcct(totalStockValue),'','']],
        styles:      { fontSize: 7, cellPadding: 1.8 },
        headStyles:  { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7 },
        footStyles:  { fillColor: [240, 235, 245], textColor: [50, 20, 70], fontStyle: 'bold' },
        columnStyles: { 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' } },
        alternateRowStyles: { fillColor: [251, 248, 252] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 11) {
            const val = data.cell.raw as string;
            if (val === 'LOW') data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });
      doc.save(`inventory-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    } else {
      pdfHeader(doc, 'Services Report', `Period: ${dateRange.from}  to  ${dateRange.to}`);
      const totalParts  = svcRows.reduce((s, r) => s + (r.parts_value ?? 0), 0);
      const totalLabor  = svcRows.reduce((s, r) => s + (r.labor_value ?? 0), 0);
      const totalValue  = svcRows.reduce((s, r) => s + (r.total_value ?? 0), 0);
      autoTable(doc, {
        startY: 35,
        head: [['Job #','Date','Status','Priority','Customer','Plate','Mechanic','Branch','Items','Parts (PHP)','Labor (PHP)','Total (PHP)']],
        body: svcRows.map(r => [
          r.job_number ?? '-',
          r.job_date ? r.job_date.slice(0, 10) : '-',
          (r.state ?? '').replace(/_/g,' '),
          (r.priority ?? '-'),
          r.customer_name ?? '-',
          r.plate_number  ?? '-',
          r.mechanic_name ?? '-',
          r.branch_name   ?? '-',
          String(r.items_count ?? 0),
          fmtAcct(r.parts_value ?? 0),
          fmtAcct(r.labor_value ?? 0),
          fmtAcct(r.total_value ?? 0),
        ]),
        foot: [['','','','','','','','Totals','', fmtAcct(totalParts), fmtAcct(totalLabor), fmtAcct(totalValue)]],
        styles:      { fontSize: 7.5, cellPadding: 2 },
        headStyles:  { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        footStyles:  { fillColor: [240, 235, 245], textColor: [50, 20, 70], fontStyle: 'bold' },
        columnStyles: { 9: { halign: 'right' }, 10: { halign: 'right' }, 11: { halign: 'right' } },
        alternateRowStyles: { fillColor: [251, 248, 252] },
      });
      doc.save(`services-report-${dateRange.from}-${dateRange.to}.pdf`);
    }
  };

  // ── Consolidated PDF (all 3 reports in one document) ────────────────────────

  const handleExportConsolidatedPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;

    // ── Cover page ──
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageW, 45, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('eTire MIS', 14, 20);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Consolidated Business Report', 14, 29);
    doc.setFontSize(9);
    doc.text(`Period: ${dateRange.from}  to  ${dateRange.to}`, 14, 37);
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}`, 14, 54);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLOR);
    doc.text('Table of Contents', 14, 68);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('1.  Sales Report', 20, 78);
    doc.text('2.  Inventory Report', 20, 86);
    doc.text('3.  Services Report', 20, 94);
    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.3);
    doc.line(14, 100, pageW - 14, 100);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text('eTire Management Information System  |  Confidential', pageW / 2, pageH - 8, { align: 'center' });

    // ── Page 2: Sales ──
    doc.addPage();
    pdfHeader(doc, 'Section 1  -  Sales Report', `Period: ${dateRange.from}  to  ${dateRange.to}`);
    const sTotalAmount   = salesRows.reduce((s, r) => s + (r.total_amount ?? 0), 0);
    const sTotalDiscount = salesRows.reduce((s, r) => s + (r.discount    ?? 0), 0);
    autoTable(doc, {
      startY: 35,
      head: [['Sale #','Date','Customer','Branch','Payment Method','Status','Items','Discount (PHP)','Total Amount (PHP)']],
      body: salesRows.map(r => [
        r.sale_number ?? '-',
        r.sale_date ? r.sale_date.slice(0, 10) : '-',
        r.customer_name ?? '-',
        r.branch_name   ?? '-',
        (r.payment_method ?? 'cash').replace(/_/g,' '),
        (r.status ?? '').toUpperCase(),
        String(r.items_count ?? 0),
        fmtAcct(r.discount ?? 0),
        fmtAcct(r.total_amount ?? 0),
      ]),
      foot: [['','','','','','','Totals', fmtAcct(sTotalDiscount), fmtAcct(sTotalAmount)]],
      styles:      { fontSize: 8, cellPadding: 2 },
      headStyles:  { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      footStyles:  { fillColor: [240, 235, 245], textColor: [50, 20, 70], fontStyle: 'bold' },
      columnStyles: { 7: { halign: 'right' }, 8: { halign: 'right' } },
      alternateRowStyles: { fillColor: [251, 248, 252] },
    });

    // ── Page 3: Inventory ──
    doc.addPage();
    pdfHeader(doc, 'Section 2  -  Inventory Report', `As of ${format(new Date(), 'MMMM dd, yyyy')}`);
    const iTotalStockValue = invRows.reduce((s, r) => s + (r.stock_value ?? 0), 0);
    autoTable(doc, {
      startY: 35,
      head: [['Product','Category','SKU','Branch','Supplier','Stock Qty','Ledger QOH','Cost (PHP)','Price (PHP)','Stock Value (PHP)','Reorder','Alert']],
      body: invRows.map(r => [
        r.name,
        r.category ?? '-',
        r.sku ?? '-',
        r.branch_name   ?? '-',
        r.supplier_name ?? '-',
        String(r.stock_quantity ?? 0),
        String(r.ledger_on_hand ?? 0),
        fmtAcct(r.cost_price ?? 0),
        fmtAcct(r.sale_price  ?? 0),
        fmtAcct(r.stock_value ?? 0),
        String(r.reorder_level ?? 5),
        r.is_low_stock ? 'LOW' : '',
      ]),
      foot: [['','','','','','','','','Total Stock Value', fmtAcct(iTotalStockValue),'','']],
      styles:      { fontSize: 7, cellPadding: 1.8 },
      headStyles:  { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7 },
      footStyles:  { fillColor: [240, 235, 245], textColor: [50, 20, 70], fontStyle: 'bold' },
      columnStyles: { 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' } },
      alternateRowStyles: { fillColor: [251, 248, 252] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 11 && data.cell.raw === 'LOW') {
          data.cell.styles.textColor = [220, 38, 38];
        }
      },
    });

    // ── Page 4: Services ──
    doc.addPage();
    pdfHeader(doc, 'Section 3  -  Services Report', `Period: ${dateRange.from}  to  ${dateRange.to}`);
    const svTotalParts = svcRows.reduce((s, r) => s + (r.parts_value ?? 0), 0);
    const svTotalLabor = svcRows.reduce((s, r) => s + (r.labor_value ?? 0), 0);
    const svTotalValue = svcRows.reduce((s, r) => s + (r.total_value ?? 0), 0);
    autoTable(doc, {
      startY: 35,
      head: [['Job #','Date','Status','Priority','Customer','Plate','Mechanic','Branch','Items','Parts (PHP)','Labor (PHP)','Total (PHP)']],
      body: svcRows.map(r => [
        r.job_number ?? '-',
        r.job_date ? r.job_date.slice(0, 10) : '-',
        (r.state ?? '').replace(/_/g,' '),
        (r.priority ?? '-'),
        r.customer_name ?? '-',
        r.plate_number  ?? '-',
        r.mechanic_name ?? '-',
        r.branch_name   ?? '-',
        String(r.items_count ?? 0),
        fmtAcct(r.parts_value ?? 0),
        fmtAcct(r.labor_value ?? 0),
        fmtAcct(r.total_value ?? 0),
      ]),
      foot: [['','','','','','','','Totals','', fmtAcct(svTotalParts), fmtAcct(svTotalLabor), fmtAcct(svTotalValue)]],
      styles:      { fontSize: 7.5, cellPadding: 2 },
      headStyles:  { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      footStyles:  { fillColor: [240, 235, 245], textColor: [50, 20, 70], fontStyle: 'bold' },
      columnStyles: { 9: { halign: 'right' }, 10: { halign: 'right' }, 11: { halign: 'right' } },
      alternateRowStyles: { fillColor: [251, 248, 252] },
    });

    doc.save(`consolidated-report-${dateRange.from}-${dateRange.to}.pdf`);
  };

  // ── Apply custom date range ───────────────────────────────────────────────

  const applyCustomRange = () => {
    if (customFrom && customTo) {
      setDateRange({ from: customFrom, to: customTo, label: `${customFrom} → ${customTo}` });
      setShowCustom(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pivot reports with date filtering, CSV and PDF export (accounting format)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => {
              if (activeTab === 'sales')     loadSales();
              if (activeTab === 'inventory') loadInventory();
              if (activeTab === 'services')  loadServices();
            }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExportCSV} variant="outline" className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button size="sm" onClick={handleExportPDF} className="gap-1.5 bg-[#714B67] hover:bg-[#5a3c53] text-white">
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
          <Button size="sm" onClick={handleExportConsolidatedPDF} variant="outline" className="gap-1.5 border-[#714B67] text-[#714B67] hover:bg-[#714B67]/10">
            <FileText className="h-3.5 w-3.5" />
            Full Report
          </Button>
        </div>
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ReportTab)}>
        <TabsList className="h-9">
          <TabsTrigger value="sales" className="gap-1.5 text-sm">
            <DollarSign className="h-3.5 w-3.5" /> Sales
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 text-sm">
            <Package className="h-3.5 w-3.5" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5 text-sm">
            <Wrench className="h-3.5 w-3.5" /> Services
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Filter Bar ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="py-3 flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

          {/* Date range — not shown for inventory */}
          {activeTab !== 'inventory' && (
            <Popover open={showCustom} onOpenChange={setShowCustom}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  {dateRange.label}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map(p => (
                    <Button
                      key={p.label}
                      variant={dateRange.label === p.label ? 'default' : 'outline'}
                      size="sm" className="text-xs h-7"
                      onClick={() => { setDateRange(p); setShowCustom(false); }}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs font-semibold text-muted-foreground">Custom</p>
                <div className="flex gap-2 items-center">
                  <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-7 text-xs" />
                  <span className="text-xs text-muted-foreground">→</span>
                  <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-7 text-xs" />
                </div>
                <Button size="sm" className="w-full h-7 text-xs" onClick={applyCustomRange}>Apply</Button>
              </PopoverContent>
            </Popover>
          )}

          {/* Sales filter */}
          {activeTab === 'sales' && (
            <Select value={toSel(salesStatus)} onValueChange={v => setSalesStatus(toVal(v))}>
              <SelectTrigger className="h-8 w-34 text-xs">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>All States</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Inventory filters */}
          {activeTab === 'inventory' && (
            <>
              <Select value={toSel(invCategory)} onValueChange={v => setInvCategory(toVal(v))}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All Categories</SelectItem>
                  <SelectItem value="tire">Tire</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="accessory">Accessory</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={invLowStock ? 'default' : 'outline'}
                size="sm" className="h-8 text-xs gap-1"
                onClick={() => setInvLowStock(v => !v)}
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Low Stock Only
              </Button>
            </>
          )}

          {/* Services filter */}
          {activeTab === 'services' && (
            <Select value={toSel(svcState)} onValueChange={v => setSvcState(toVal(v))}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>All States</SelectItem>
                <SelectItem value="quotation">Quotation</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="quality_check">Quality Check</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-8 pl-8 text-xs w-44"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => setError(null)}>×</Button>
        </div>
      )}

      {/* ── Data Table ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {activeTab === 'sales'     && <SalesTable     rows={salesRows} loading={loading} search={search} />}
        {activeTab === 'inventory' && <InventoryTable  rows={invRows}   loading={loading} search={search} />}
        {activeTab === 'services'  && <ServicesTable   rows={svcRows}   loading={loading} search={search} />}
      </div>

    </div>
  );
}
