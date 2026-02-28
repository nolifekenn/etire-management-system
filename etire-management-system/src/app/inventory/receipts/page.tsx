'use client';

/**
 * /inventory/receipts  — All transaction receipts from completed sales.
 *
 * Lists every sale in state=done (or confirmed) with a direct link
 * to the printable receipt for each transaction.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link          from 'next/link';
import { listSales, type ListSalesInput } from '@/lib/actions/sales';
import { useAuth }   from '@/hooks/useAuth';
import { Button }    from '@/components/ui/button';
import { Input }     from '@/components/ui/input';
import { Badge }     from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast }     from '@/hooks/use-toast';
import {
  Search, RefreshCw, Loader2, ReceiptText,
  ChevronLeft, ChevronRight, ArrowLeft,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function fmtCurrency(v: unknown): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
    .format(Number(v ?? 0));
}

function fmtDate(v: unknown): string {
  if (!v) return '—';
  return new Date(str(v)).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const STATE_COLORS: Record<string, string> = {
  done:      'border-green-300 text-green-700 bg-green-50',
  confirmed: 'border-blue-300  text-blue-700  bg-blue-50',
  draft:     'border-gray-300  text-gray-600  bg-gray-50',
  cancelled: 'border-red-300   text-red-700   bg-red-50',
};

const STATE_LABELS: Record<string, string> = {
  done:      'Completed',
  confirmed: 'Sales Order',
  draft:     'Quotation',
  cancelled: 'Cancelled',
};

const PAGE_SIZE = 50;

// ── page ─────────────────────────────────────────────────────────────────────

export default function InventoryReceiptsPage() {
  const router = useRouter();
  const { activeBranchId } = useAuth();

  const [sales,   setSales]   = useState<AnyRecord[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('done');
  const [page,    setPage]    = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const input: ListSalesInput = {
      branch_id: activeBranchId ?? undefined,
      page,
      page_size: PAGE_SIZE,
    };
    if (search) input.search = search;
    if (status && status !== 'all') input.status = status;

    const res = await listSales(input);
    if (res.success) {
      setSales(res.sales);
      setTotal(res.total);
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
    setLoading(false);
  }, [activeBranchId, page, search, status]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/inventory')}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Inventory
        </Button>
        <div className="h-4 w-px bg-border" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Receipts</h1>
          <p className="text-sm text-muted-foreground">All transaction receipts from completed sales</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search receipt / sale number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="done">Completed</SelectItem>
            <SelectItem value="confirmed">Sales Order</SelectItem>
            <SelectItem value="draft">Quotation</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => load()}
          className="h-9 gap-1.5"
          disabled={loading}
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />
          }
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[150px]">Receipt #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Payment</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                  No receipts found
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => {
                const customer = sale.customer as AnyRecord | null;
                const state    = str(sale.state);
                return (
                  <TableRow
                    key={str(sale.sale_id)}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => router.push(`/sales/${str(sale.sale_id)}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      <span className="text-[#714B67]">
                        {str(sale.sale_number) || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(sale.sale_date ?? sale.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {customer ? str(customer.name) : <span className="text-muted-foreground">Walk-in</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm capitalize">
                      {str(sale.payment_method).replace('_', ' ') || '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATE_COLORS[state] ?? STATE_COLORS.draft}`}
                      >
                        {STATE_LABELS[state] ?? state}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {fmtCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/receipt/${str(sale.sale_id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs text-[#714B67] hover:underline whitespace-nowrap"
                      >
                        <ReceiptText className="h-3.5 w-3.5" />
                        Receipt
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} receipt{total !== 1 ? 's' : ''} total</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
