'use client';

/**
 * /sales — Odoo-style Sales Order List View.
 *
 * Columns: Sale Number | Customer | Date | Payment | Total | Status
 * Toolbar: New Quotation | search | filter by status | branch selector
 * Clicking a row navigates to /sales/[id]
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter }      from 'next/navigation';
import Link              from 'next/link';
import { listSales, createQuotation, type ListSalesInput } from '@/lib/actions/sales';
import { useAuth }        from '@/hooks/useAuth';
import { Button }         from '@/components/ui/button';
import { Input }          from '@/components/ui/input';
import { Badge }          from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast }          from '@/hooks/use-toast';
import {
  Plus, Search, RefreshCw, Loader2, ShoppingBag, ChevronLeft, ChevronRight,
  ReceiptText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function str(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

function formatCurrency(val: unknown) {
  return new Intl.NumberFormat('en-PH', {
    style:    'currency',
    currency: 'PHP',
  }).format(Number(val ?? 0));
}

function formatDate(val: unknown): string {
  if (!val) return '—';
  return new Date(String(val)).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Quotation',     className: 'border-gray-300   text-gray-600  bg-gray-50'   },
  confirmed: { label: 'Sales Order',   className: 'border-blue-300   text-blue-700  bg-blue-50'   },
  done:      { label: 'Done',          className: 'border-green-300  text-green-700 bg-green-50'  },
  cancelled: { label: 'Cancelled',     className: 'border-red-300    text-red-700   bg-red-50'    },
};

function StatusBadge({ status }: { status: unknown }) {
  const cfg = STATUS_CONFIG[str(status)] ?? STATUS_CONFIG['draft'];
  return (
    <Badge variant="outline" className={cn('text-xs', cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

const PAGE_SIZE = 50;

// ──────────────────────────────────────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────────────────────────────────────

export default function SalesListPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auth   = useAuth() as any;
  const user   = auth?.user   ?? null;
  const branch = auth?.branch ?? null;

  const [sales,      setSales]      = useState<AnyRecord[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('');
  const [page,       setPage]       = useState(1);

  // ── load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const input: ListSalesInput = {
      branch_id: branch?.branch_id,
      page,
      page_size: PAGE_SIZE,
    };
    if (search)  input.search = search;
    if (status)  input.status = status;

    const result = await listSales(input);
    if (result.success) {
      setSales(result.sales);
      setTotal(result.total);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setLoading(false);
  }, [branch?.branch_id, page, search, status]);

  useEffect(() => { load(); }, [load]);

  // ── new quotation ──────────────────────────────────────────────────────────

  const handleNewQuotation = async () => {
    if (!user?.id) return;
    setCreating(true);
    try {
      const result = await createQuotation({
        branch_id: branch?.branch_id ?? '',
        user_id:   String(user.id),
        lines:     [],
      });
      if (result.success && result.saleId) {
        router.push(`/sales/${result.saleId}`);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setCreating(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Control bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-white px-6 py-3">
        <Button
          onClick={handleNewQuotation}
          disabled={creating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {creating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          New Quotation
        </Button>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search order number…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Status filter */}
        <Select
          value={status || 'all'}
          onValueChange={v => { setStatus(v === 'all' ? '' : v); setPage(1); }}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Quotation</SelectItem>
            <SelectItem value="confirmed">Sales Order</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={load}
          className="ml-auto rounded p-1.5 text-gray-500 hover:bg-gray-100"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <span className="text-xs text-gray-400">{total} records</span>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <ShoppingBag className="h-14 w-14 mb-3 opacity-30" />
            <p className="text-base font-medium">No orders found</p>
            <p className="text-sm mt-1">Create a new quotation to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-40">Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map(sale => {
                const customer = sale.customer as AnyRecord | null;
                return (
                  <TableRow
                    key={str(sale.sale_id)}
                    onClick={() => router.push(`/sales/${str(sale.sale_id)}`)}
                    className="cursor-pointer hover:bg-blue-50/50"
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      <Link
                        href={`/receipt/${str(sale.sale_id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[#714B67] hover:underline"
                      >
                        <ReceiptText className="h-3.5 w-3.5" />
                        {str(sale.sale_number) || '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {customer ? str(customer.name) : '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">
                      {formatDate(sale.sale_date ?? sale.created_at)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500 capitalize">
                      {str(sale.payment_method) || '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sale.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t bg-white px-6 py-3">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
