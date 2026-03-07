'use client';

/**
 * /receipt/[id]  — Read-only printable receipt for a completed sale.
 *
 * Shows: branch header, sale number/date, cashier, customer,
 *        items table, discount, total, payment method, note.
 * Provides a Print button (window.print) and back-link to the sale detail.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSaleWithDetails } from '@/lib/actions/sales';
import { Button }             from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function num(v: unknown): number {
  return Number(v ?? 0);
}

function fmtCurrency(v: unknown): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num(v));
}

function fmtDate(v: unknown): string {
  if (!v) return '—';
  return new Date(str(v)).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── component ────────────────────────────────────────────────────────────────

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [sale,    setSale]    = useState<AnyRecord | null>(null);
  const [items,   setItems]   = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getSaleWithDetails(id).then(res => {
      if (!res.success || !res.sale) {
        setError(res.error ?? 'Sale not found');
      } else {
        setSale(res.sale);
        setItems((res.sale.sale_item as AnyRecord[] | null) ?? []);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-destructive text-sm">{error ?? 'Sale not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const branch    = sale.branch   as AnyRecord | null;
  const customer  = sale.customer as AnyRecord | null;
  const cashier   = sale.user     as AnyRecord | null;

  const subtotal  = items.reduce(
    (s, i) => s + num(i.price_at_sale) * num(i.quantity) + num(i.installation_fee),
    0,
  );
  const discount  = num(sale.discount_amount);
  const tax       = num(sale.tax_amount);
  const total     = num(sale.total_amount);

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      {/* ── Toolbar (hidden when printing) ─────────────────────────────── */}
      <div className="no-print mb-6 flex items-center justify-between px-4 max-w-2xl mx-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/sales/${id}`)}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sale
        </Button>
        <Button
          size="sm"
          onClick={() => window.print()}
          className="gap-1.5 bg-[#714B67] hover:bg-[#5a3c53] text-white"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      {/* ── Receipt card ────────────────────────────────────────────────── */}
      <div
        id="receipt"
        className="mx-auto max-w-md rounded-lg bg-white shadow-md print:shadow-none print:rounded-none print:max-w-none"
      >
        {/* Store header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-dashed border-gray-300">
          <h1 className="text-lg font-bold text-foreground">
            {str(branch?.name) || 'eTire Management'}
          </h1>
          {!!str(branch?.address) && (
            <p className="text-xs text-muted-foreground mt-0.5">{str(branch?.address)}</p>
          )}
          {!!str(branch?.phone) && (
            <p className="text-xs text-muted-foreground">{str(branch?.phone)}</p>
          )}
          <p className="mt-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Sales Receipt
          </p>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 text-xs space-y-1 border-b border-dashed border-gray-300">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Receipt #</span>
            <span className="font-mono font-semibold">{str(sale.sale_number) || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{fmtDate(sale.sale_date ?? sale.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cashier</span>
            <span>{str(cashier?.name) || '—'}</span>
          </div>
          {customer && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span>{str(customer.name)}</span>
            </div>
          )}
          <div className="flex justify-between capitalize">
            <span className="text-muted-foreground">Payment</span>
            <span>{str(sale.payment_method).replace('_', ' ') || '—'}</span>
          </div>
        </div>

        {/* Items */}
        <div className="px-6 py-3 border-b border-dashed border-gray-300">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Price</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const ii   = item.inventory_item as AnyRecord | null;
                const name = str(ii?.name) || 'Item';
                const qty  = num(item.quantity);
                const price = num(item.price_at_sale);
                const instFee = num(item.installation_fee);
                return (
                  <React.Fragment key={str(item.sale_item_id) || i}>
                    <tr>
                      <td className="py-1 pr-2">{name}</td>
                      <td className="text-center py-1">{qty}</td>
                      <td className="text-right py-1">{fmtCurrency(price)}</td>
                      <td className="text-right py-1">{fmtCurrency(qty * price)}</td>
                    </tr>
                    {instFee > 0 && (
                      <tr>
                        <td colSpan={3} className="pl-3 py-0.5 text-muted-foreground italic">
                          Installation fee
                        </td>
                        <td className="text-right py-0.5">{fmtCurrency(instFee)}</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-3 text-muted-foreground">No items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-3 text-xs space-y-1 border-b border-dashed border-gray-300">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmtCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>- {fmtCurrency(discount)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{fmtCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-200 mt-1">
            <span>TOTAL</span>
            <span>{fmtCurrency(total)}</span>
          </div>
        </div>

        {/* Note + Footer */}
        <div className="px-6 py-4 text-center text-xs text-muted-foreground">
          {!!str(sale.note) && (
            <p className="mb-2 italic">&ldquo;{str(sale.note)}&rdquo;</p>
          )}
          <p>Thank you for your business!</p>
          <p className="mt-1 text-[10px] text-gray-400">
            Powered by eTire Management System
          </p>
        </div>
      </div>

      {/* Print-only global styles */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
