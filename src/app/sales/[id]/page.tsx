'use client';

/**
 * /sales/[id] — Odoo-style Sales Order / Quotation Form View.
 *
 * Status bar:  Quotation ──► Sales Order ──► Done
 * Smart btns:  Delivery (count) | Items (total units)
 * Tabs:        Order Lines | Other Info
 * Chatter:     ChatterPanel at the bottom
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getSaleWithDetails, getSaleSmartButtons,
  confirmSaleOrder,  voidSale, upsertSaleLines,
  type POSLineInput,
} from '@/lib/actions/sales';
import { useAuth }        from '@/hooks/useAuth';
import { AuditTrailPanel }   from '@/components/AuditTrailPanel';
import { Button }         from '@/components/ui/button';
import { Badge }          from '@/components/ui/badge';
import { Input }          from '@/components/ui/input';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Separator }      from '@/components/ui/separator';
import { toast }          from '@/hooks/use-toast';
import {
  ArrowLeft, PackageCheck, ShoppingCart,
  CheckCircle2, XCircle, Loader2, Plus, Trash2, Save, ReceiptText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateShortText, validateNumber, type FieldError } from '@/lib/validation';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

interface SmartButton {
  label: string;
  value: number;
  href:  string | null;
  icon:  string;
  color: string;
}

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
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Status bar
// ──────────────────────────────────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: 'draft',     label: 'Quotation'   },
  { key: 'confirmed', label: 'Sales Order' },
  { key: 'done',      label: 'Done'        },
];

function StatusBar({ status }: { status: unknown }) {
  const current = str(status);
  const cancelled = current === 'cancelled';
  const activeIdx = STATUS_STEPS.findIndex(s => s.key === current);

  if (cancelled) {
    return (
      <Badge variant="outline" className="border-red-300 text-red-600 bg-red-50 text-sm px-3 py-1">
        Cancelled
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done    = i < activeIdx;
        const active  = i === activeIdx;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={cn(
                'h-0.5 w-8',
                done || active ? 'bg-blue-500' : 'bg-gray-200',
              )} />
            )}
            <div className="flex flex-col items-center">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                done    ? 'bg-blue-500 text-white'
                  : active ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                  : 'bg-gray-200 text-gray-500',
              )}>
                {done ? '✓' : i + 1}
              </div>
              <span className={cn(
                'mt-1 text-[10px] whitespace-nowrap',
                active ? 'font-semibold text-blue-700' : 'text-gray-500',
              )}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Smart Button
// ──────────────────────────────────────────────────────────────────────────────

function SmartBtn({ btn, onClick }: { btn: SmartButton; onClick?: () => void }) {
  const icons: Record<string, React.ReactNode> = {
    PackageCheck:  <PackageCheck  className={cn('h-5 w-5', btn.color)} />,
    ShoppingCart:  <ShoppingCart  className={cn('h-5 w-5', btn.color)} />,
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm hover:shadow-md transition-shadow"
    >
      {icons[btn.icon] ?? <PackageCheck className="h-5 w-5 text-gray-400" />}
      <span className={cn('text-lg font-bold', btn.color)}>{btn.value}</span>
      <span className="text-[10px] text-gray-500">{btn.label}</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Order Lines Tab (editable for draft orders)
// ──────────────────────────────────────────────────────────────────────────────

interface OrderLine {
  sale_item_id?: string;
  item_id:       string;
  name:          string;
  quantity:      number;
  price_at_sale: number;
  install_fee:   number;
}

function OrderLinesTab({
  lines,
  status,
  saleId,
  onSaved,
}: {
  lines:   AnyRecord[];
  status:  unknown;
  saleId:  string;
  onSaved: () => void;
}) {
  const editable = str(status) === 'draft';
  const [rows,    setRows]    = useState<OrderLine[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [lineErrors, setLineErrors] = useState<Record<number, { name?: FieldError; quantity?: FieldError; price?: FieldError; install?: FieldError }>>({});

  // Build local rows from server data
  useEffect(() => {
    setRows(lines.map(l => {
      const inv = l.inventory_item as AnyRecord | null;
      return {
        sale_item_id: str(l.sale_item_id),
        item_id:      str(l.item_id),
        name:         str(inv?.name ?? l.item_id),
        quantity:     Number(l.quantity ?? 1),
        price_at_sale: Number(l.price_at_sale ?? 0),
        install_fee:  Number(l.installation_fee ?? 0),
      };
    }));
  }, [lines]);

  const lineTotal = (r: OrderLine) =>
    r.price_at_sale * r.quantity + r.install_fee;

  const grandTotal = rows.reduce((s, r) => s + lineTotal(r), 0);

  const handleSave = async () => {
    // Validate all rows before saving
    const errs: typeof lineErrors = {};
    rows.forEach((r, idx) => {
      const nameErr  = r.name.trim() ? validateShortText(r.name, { label: 'Product', required: true, minLength: 1, maxLength: 150 }) : 'Product name is required';
      const qtyErr   = validateNumber(String(r.quantity),     { label: 'Qty',        required: true,  min: 1,   integer: true });
      const priceErr = validateNumber(String(r.price_at_sale), { label: 'Unit price', required: false, min: 0 });
      const installErr = r.install_fee ? validateNumber(String(r.install_fee), { label: 'Install fee', required: false, min: 0 }) : null;
      if (nameErr || qtyErr || priceErr || installErr) {
        errs[idx] = { name: nameErr, quantity: qtyErr, price: priceErr ?? undefined, install: installErr ?? undefined };
      }
    });
    setLineErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const input: POSLineInput[] = rows.map(r => ({
      item_id:          r.item_id || undefined,
      quantity:         r.quantity,
      price_at_sale:    r.price_at_sale,
      installation_fee: r.install_fee || undefined,
    }));
    const result = await upsertSaleLines(saleId, input);
    if (result.success) {
      toast({ title: 'Lines saved' });
      onSaved();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setSaving(false);
  };

  const updateRow = (idx: number, patch: Partial<OrderLine>) =>
    setRows(prev => { const n = [...prev]; n[idx] = { ...n[idx], ...patch }; return n; });

  const addRow = () => setRows(prev => [...prev, {
    item_id: '', name: '', quantity: 1, price_at_sale: 0, install_fee: 0,
  }]);

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Product</TableHead>
            <TableHead className="w-20 text-right">Qty</TableHead>
            <TableHead className="w-28 text-right">Unit Price</TableHead>
            <TableHead className="w-28 text-right">Install Fee</TableHead>
            <TableHead className="w-28 text-right">Subtotal</TableHead>
            {Boolean(editable) && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-gray-400 py-8">
                No order lines yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  {editable ? (
                    <div>
                      <Input
                        value={row.name}
                        onChange={e => {
                          updateRow(idx, { name: e.target.value });
                          const err = e.target.value.trim() ? validateShortText(e.target.value, { label: 'Product', required: true, minLength: 1, maxLength: 150 }) : 'Product name is required';
                          setLineErrors(p => ({ ...p, [idx]: { ...p[idx], name: err } }));
                        }}
                        aria-invalid={!!lineErrors[idx]?.name}
                        className={`h-7 text-sm${lineErrors[idx]?.name ? ' border-red-400' : ''}`}
                        placeholder="Product name"
                      />
                      {lineErrors[idx]?.name && <p className="text-[10px] text-red-500">⚠ {lineErrors[idx].name}</p>}
                    </div>
                  ) : (
                    <span className="text-sm">{row.name || row.item_id}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editable ? (
                    <div>
                      <Input
                        type="number" min="1" value={row.quantity}
                        onChange={e => {
                          const v = Math.max(1, parseInt(e.target.value) || 1);
                          updateRow(idx, { quantity: v });
                          setLineErrors(p => ({ ...p, [idx]: { ...p[idx], quantity: validateNumber(String(v), { label: 'Qty', required: true, min: 1, integer: true }) } }));
                        }}
                        aria-invalid={!!lineErrors[idx]?.quantity}
                        className={`h-7 w-16 text-right text-sm ml-auto${lineErrors[idx]?.quantity ? ' border-red-400' : ''}`}
                      />
                      {lineErrors[idx]?.quantity && <p className="text-[10px] text-red-500">⚠ {lineErrors[idx].quantity}</p>}
                    </div>
                  ) : (
                    <span className="text-sm">{row.quantity}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editable ? (
                    <div>
                      <Input
                        type="number" min="0" value={row.price_at_sale}
                        onChange={e => {
                          const v = Math.max(0, parseFloat(e.target.value) || 0);
                          updateRow(idx, { price_at_sale: v });
                          setLineErrors(p => ({ ...p, [idx]: { ...p[idx], price: validateNumber(String(v), { label: 'Unit price', required: false, min: 0 }) } }));
                        }}
                        aria-invalid={!!lineErrors[idx]?.price}
                        className={`h-7 w-24 text-right text-sm ml-auto${lineErrors[idx]?.price ? ' border-red-400' : ''}`}
                      />
                      {lineErrors[idx]?.price && <p className="text-[10px] text-red-500">⚠ {lineErrors[idx].price}</p>}
                    </div>
                  ) : (
                    <span className="text-sm">{formatCurrency(row.price_at_sale)}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editable ? (
                    <div>
                      <Input
                        type="number" min="0" value={row.install_fee || ''}
                        placeholder="0"
                        onChange={e => {
                          const v = Math.max(0, parseFloat(e.target.value) || 0);
                          updateRow(idx, { install_fee: v });
                          setLineErrors(p => ({ ...p, [idx]: { ...p[idx], install: validateNumber(String(v), { label: 'Install fee', required: false, min: 0 }) } }));
                        }}
                        aria-invalid={!!lineErrors[idx]?.install}
                        className={`h-7 w-24 text-right text-sm ml-auto${lineErrors[idx]?.install ? ' border-red-400' : ''}`}
                      />
                      {lineErrors[idx]?.install && <p className="text-[10px] text-red-500">⚠ {lineErrors[idx].install}</p>}
                    </div>
                  ) : (
                    <span className="text-sm">{formatCurrency(row.install_fee)}</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatCurrency(lineTotal(row))}
                </TableCell>
                {Boolean(editable) && (
                  <TableCell>
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Grand total row */}
      <div className="flex justify-end pr-12">
        <div className="flex gap-12 text-sm font-semibold text-gray-800">
          <span>Total</span>
          <span className="text-blue-700">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Editable controls */}
      {Boolean(editable) && (
        <div className="flex items-center gap-3 pt-1">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Line
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            Save Lines
          </Button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Other Info Tab
// ──────────────────────────────────────────────────────────────────────────────

function OtherInfoTab({ sale }: { sale: AnyRecord }) {
  const customer = sale.customer as AnyRecord | null;
  const userRec  = sale.user     as AnyRecord | null;
  const branchRec = sale.branch  as AnyRecord | null;

  const rows = [
    { label: 'Sale Number',    value: str(sale.sale_number)    },
    { label: 'Customer',       value: str(customer?.name)      },
    { label: 'Phone',          value: str(customer?.phone)     },
    { label: 'Email',          value: str(customer?.email)     },
    { label: 'Branch',         value: str(branchRec?.name)     },
    { label: 'Handled By',     value: str(userRec?.name)       },
    { label: 'Payment Method', value: str(sale.payment_method).toUpperCase() },
    { label: 'Discount',       value: formatCurrency(sale.discount_amount)   },
    { label: 'Tax',            value: formatCurrency(sale.tax_amount)        },
    { label: 'Sale Date',      value: formatDate(sale.sale_date)             },
    { label: 'Notes',          value: str(sale.note)                         },
  ];

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(r => r.value ? (
        <div key={r.label}>
          <dt className="text-xs font-medium text-gray-500">{r.label}</dt>
          <dd className="mt-0.5 text-sm text-gray-800">{r.value}</dd>
        </div>
      ) : null)}
    </dl>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Void Modal
// ──────────────────────────────────────────────────────────────────────────────

function VoidModal({
  open, saleId, onVoided, onClose,
}: {
  open:     boolean;
  saleId:   string;
  onVoided: () => void;
  onClose:  () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auth   = useAuth() as any;
  const user   = auth?.user ?? null;
  const [reason,     setReason]     = useState('');
  const [reasonError, setReasonError] = useState<FieldError>(null);
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    const err = validateShortText(reason, { label: 'Reason', required: true, minLength: 2, maxLength: 200 });
    setReasonError(err);
    if (err) return;
    setSubmitting(true);
    const result = await voidSale(saleId, String(user?.user_id ?? ''), reason);
    setSubmitting(false);
    if (result.success) {
      toast({ title: 'Sale cancelled' });
      onVoided();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={open ? undefined : onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel Sale</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-gray-600">
            This will cancel the sale and cannot be undone. Please provide a reason.
          </p>
          <Input
            placeholder="Reason for cancellation"
            value={reason}
            onChange={e => {
              setReason(e.target.value);
              setReasonError(validateShortText(e.target.value, { label: 'Reason', required: true, minLength: 2, maxLength: 200 }));
            }}
            maxLength={200}
            aria-invalid={!!reasonError}
            className={reasonError ? 'border-red-400 focus-visible:ring-red-300' : ''}
          />
          {reasonError && <p className="text-xs text-red-500">⚠ {reasonError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Keep</Button>
          <Button variant="destructive" onClick={handle} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

export default function SaleFormPage() {
  const params = useParams();
  const router = useRouter();
  const saleId = str(params?.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auth = useAuth() as any;
  const user = auth?.user ?? null;

  const [sale,         setSale]         = useState<AnyRecord | null>(null);
  const [lines,        setLines]        = useState<AnyRecord[]>([]);
  const [moves,        setMoves]        = useState<AnyRecord[]>([]);
  const [buttons,      setButtons]      = useState<SmartButton[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [confirming,   setConfirming]   = useState(false);
  const [showVoid,     setShowVoid]     = useState(false);

  // ── load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    const [detailResult, btnResult] = await Promise.all([
      getSaleWithDetails(saleId),
      getSaleSmartButtons(saleId),
    ]);
    if (detailResult.success && detailResult.sale) {
      const s = detailResult.sale;
      setSale(s);
      setLines((s.sale_item ?? []) as AnyRecord[]);
      setMoves((detailResult.moves ?? []) as AnyRecord[]);
    } else {
      toast({ title: 'Error loading sale', variant: 'destructive' });
    }
    setButtons(btnResult as SmartButton[]);
    setLoading(false);
  }, [saleId]);

  useEffect(() => { load(); }, [load]);

  // ── confirm ────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!saleId || !user?.user_id) return;
    setConfirming(true);
    const result = await confirmSaleOrder(saleId, String(user.user_id));
    setConfirming(false);
    if (result.success) {
      toast({ title: 'Sale confirmed' });
      load();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Loading / not found
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p>Sale not found.</p>
        <Button variant="link" onClick={() => router.push('/sales')}>Back to Sales</Button>
      </div>
    );
  }

  const currentStatus = str(sale.state);
  const isDraft       = currentStatus === 'draft';
  const isConfirmed   = currentStatus === 'confirmed';
  const isDone        = currentStatus === 'done';
  const isCancelled   = currentStatus === 'cancelled';
  const canConfirm    = isDraft || isConfirmed;   // draft→done OR confirmed→done
  const canVoid       = isDraft || isConfirmed;

  return (
    <div className="flex flex-col gap-0">

      {/* ── Breadcrumb / back ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b bg-white px-6 py-2">
        <button
          onClick={() => router.push('/sales')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Sales
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-800">
          {str(sale.sale_number) || 'New Quotation'}
        </span>
      </div>

      {/* ── Form header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b px-6 py-4">

        {/* Top row: title + action buttons */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {str(sale.sale_number) || 'New Quotation'}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {formatDate(sale.sale_date ?? sale.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canConfirm && (
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="bg-[#714B67] hover:bg-[#5a3c53] text-white"
              >
                {confirming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Mark as Done
              </Button>
            )}

            {canVoid && (
              <Button
                variant="outline"
                onClick={() => setShowVoid(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}

            {Boolean(isDone) && (
              <>
                <Badge className="bg-green-100 text-green-700 border border-green-300 text-sm px-3 py-1">
                  ✓ Sale Done
                </Badge>
                <Link
                  href={`/receipt/${saleId}`}
                  className="inline-flex items-center gap-1.5 text-sm text-[#714B67] hover:underline"
                >
                  <ReceiptText className="h-4 w-4" />
                  Print Receipt
                </Link>
              </>
            )}
            {Boolean(isCancelled) && (
              <Badge className="bg-red-100 text-red-700 border border-red-300 text-sm px-3 py-1">
                Cancelled
              </Badge>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4">
          <StatusBar status={sale.state} />
        </div>

        {/* Smart buttons */}
        {buttons.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-3">
              {buttons.map(btn => (
                <SmartBtn
                  key={btn.label}
                  btn={btn}
                  onClick={btn.href ? () => router.push(btn.href!) : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="bg-white px-6 py-4">
        <Tabs defaultValue="lines">
          <TabsList>
            <TabsTrigger value="lines">Order Lines</TabsTrigger>
            <TabsTrigger value="other">Other Info</TabsTrigger>
            {moves.length > 0 && (
              <TabsTrigger value="moves">Inventory Moves</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="lines" className="mt-4">
            <OrderLinesTab
              lines={lines}
              status={sale.state}
              saleId={saleId}
              onSaved={load}
            />
          </TabsContent>

          <TabsContent value="other" className="mt-4">
            <OtherInfoTab sale={sale} />
          </TabsContent>

          {moves.length > 0 && (
            <TabsContent value="moves" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Moved</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moves.map(m => {
                    const inv = m.inventory_item as AnyRecord | null;
                    return (
                      <TableRow key={str(m.move_id)}>
                        <TableCell className="text-sm">{str(inv?.name ?? m.item_id)}</TableCell>
                        <TableCell className={cn(
                          'text-right text-sm font-medium',
                          Number(m.quantity_moved) < 0 ? 'text-red-600' : 'text-green-600',
                        )}>
                          {str(m.quantity_moved)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(m.unit_cost)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(m.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ── Chatter ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-t px-6 py-4">
        <AuditTrailPanel relatedTable="sale" relatedRecordId={saleId} />
      </div>

      {/* Void modal */}
      <VoidModal
        open={showVoid}
        saleId={saleId}
        onVoided={() => { setShowVoid(false); load(); }}
        onClose={() => setShowVoid(false)}
      />
    </div>
  );
}
