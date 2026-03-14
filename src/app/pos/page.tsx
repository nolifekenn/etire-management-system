'use client';

/**
 * /pos — Odoo-style Point of Sale terminal.
 *
 * Layout
 * ──────
 *   ┌─────────────────────────────────────────────┬──────────────────────┐
 *   │  Category pills                              │                      │
 *   │  Search bar                                  │   Order sidebar      │
 *   │  Product grid  (3-5 col, scroll)             │  LineItems + totals  │
 *   │                                              │  Customer selector   │
 *   │                                              │  [Charge] button     │
 *   └─────────────────────────────────────────────┴──────────────────────┘
 *
 *  Payment modal  → on Validate → createPOSSale() → receipt print.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase as _supabase } from '@/lib/supabaseClient';
import { createPOSSale, type CreatePOSSaleInput } from '@/lib/actions/sales';
import {
  generateHtmlReceipt, printReceipt,
  type BusinessInfo, type ReceiptItem, type ReceiptData,
  type ReceiptCustomer,
} from '@/lib/receiptGenerator';
import type { Sale, User, Branch } from '@/lib/types';
import { useAuth }       from '@/hooks/useAuth';
import { Badge }         from '@/components/ui/badge';
import { Button }        from '@/components/ui/button';
import { Input }         from '@/components/ui/input';
import { ScrollArea }    from '@/components/ui/scroll-area';
import { Separator }     from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, ShoppingCart, Plus, Minus, Trash2,
  CreditCard, Banknote, CircleDollarSign,
  Percent, ReceiptText, UserCircle2, Loader2,
  Package, RefreshCw, History, X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface CartLine {
  item:             InventoryItem;
  quantity:         number;
  price:            number;
  installationFee:  number;
}

type PaymentMethod = 'cash' | 'card' | 'check' | 'credit';

interface Customer {
  customer_id: string;
  name:        string;
  phone?:      string;
}

interface BranchInfo {
  branch_id: string;
  name:      string;
  address?:  string;
  phone?:    string;
}

type TaxPreset = 'none' | 'vat' | 'custom';

// ──────────────────────────────────────────────────────────────────────────────
// Custom TireIcon
// ──────────────────────────────────────────────────────────────────────────────

const TireIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2"  x2="12" y2="8" />
    <line x1="12" y1="16" x2="12" y2="22" />
    <line x1="2"  y1="12" x2="8"  y2="12" />
    <line x1="16" y1="12" x2="22" y2="12" />
  </svg>
);

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const ANONYMOUS_CUSTOMER_ID = 'anonymous_customer';
const ALL_CATEGORIES        = '__all__';
const ALL_VEHICLES          = '__all_vehicle__';
const DEFAULT_TAX_RATE      = 12;   // VAT %
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: 'Car',
  motor: 'Motorcycle',
  truck: 'Truck',
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-PH', {
    style:    'currency',
    currency: 'PHP',
  }).format(val);
}

// ──────────────────────────────────────────────────────────────────────────────
// ProductCard
// ──────────────────────────────────────────────────────────────────────────────

const ProductCard: React.FC<{
  item:    InventoryItem;
  onClick: (item: InventoryItem) => void;
}> = ({ item, onClick }) => {
  const outOfStock = item.stock_quantity <= 0;
  const lowStock   = item.stock_quantity <= (item.reorder_level ?? 5) && !outOfStock;

  return (
    <button
      onClick={() => !outOfStock && onClick(item)}
      disabled={outOfStock}
      className={cn(
        'flex flex-col items-center justify-between rounded-xl border p-3 text-left transition-all',
        'hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400',
        outOfStock
          ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
          : 'bg-white border-gray-200 cursor-pointer active:scale-95',
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 mb-2">
        <TireIcon className="h-6 w-6 text-blue-500" />
      </div>

      <p className="line-clamp-2 text-center text-xs font-medium leading-tight text-gray-800">
        {item.name}
      </p>

      <div className="mt-2 w-full space-y-1">
        <p className="text-center text-sm font-semibold text-blue-600">
          {formatCurrency(item.sale_price)}
        </p>

        <Badge
          variant="outline"
          className={cn(
            'w-full justify-center text-[10px]',
            outOfStock ? 'border-red-300 text-red-500'
              : lowStock  ? 'border-amber-300 text-amber-600'
              : 'border-green-300 text-green-600',
          )}
        >
          {outOfStock ? 'Out of Stock'
            : lowStock  ? `Low: ${item.stock_quantity}`
            : `Qty: ${item.stock_quantity}`}
        </Badge>
      </div>
    </button>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// CartLineRow
// ──────────────────────────────────────────────────────────────────────────────

const CartLineRow: React.FC<{
  line:        CartLine;
  onQtyUp:     () => void;
  onQtyDown:   () => void;
  onRemove:    () => void;
  onFeeChange: (fee: number) => void;
}> = ({ line, onQtyUp, onQtyDown, onRemove, onFeeChange }) => {
  const lineTotal = line.price * line.quantity + line.installationFee;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-white p-2">
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm font-medium leading-tight text-gray-800 line-clamp-2">
          {line.item.name}
        </p>
        <button onClick={onRemove} className="text-gray-300 hover:text-red-400 shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={onQtyDown}
            className="flex h-5 w-5 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-6 text-center text-sm">{line.quantity}</span>
          <button
            onClick={onQtyUp}
            className="flex h-5 w-5 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <p className="text-sm font-semibold text-gray-800">
          {formatCurrency(lineTotal)}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-400 whitespace-nowrap">Install fee:</span>
        <Input
          type="number"
          min="0"
          value={line.installationFee || ''}
          placeholder="0"
          className="h-5 w-20 px-1 text-xs"
          onChange={e => onFeeChange(parseFloat(e.target.value) || 0)}
        />
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// PaymentModal
// ──────────────────────────────────────────────────────────────────────────────

const PaymentModal: React.FC<{
  open:        boolean;
  orderTotal:  number;
  onValidate:  (method: PaymentMethod, tendered: number) => Promise<void>;
  onClose:     () => void;
  submitting:  boolean;
}> = ({ open, orderTotal, onValidate, onClose, submitting }) => {
  const [method,   setMethod]   = useState<PaymentMethod>('cash');
  const [tendered, setTendered] = useState<string>('');

  const MAX_ALLOWED = 120_000;

  const tenderedNum = parseFloat(tendered) || 0;
  const change      = Math.max(0, tenderedNum - orderTotal);

  const methods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'cash',   label: 'Cash',    icon: <Banknote         className="h-5 w-5" /> },
    { value: 'card',   label: 'Card',    icon: <CreditCard        className="h-5 w-5" /> },
    { value: 'check',  label: 'Check',   icon: <ReceiptText       className="h-5 w-5" /> },
    { value: 'credit', label: 'Credit',  icon: <CircleDollarSign  className="h-5 w-5" /> },
  ];

  return (
<<<<<<< HEAD
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
=======
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
>>>>>>> 81351a0b187ac92f64bf65cdf238a9a9f52f1fb8
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-sm text-blue-600">Amount Due</p>
            <p className="text-3xl font-bold text-blue-900">
              {formatCurrency(orderTotal)}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {methods.map(m => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all',
                  method === m.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                {m.icon}
                <span className="text-[10px] font-medium">{m.label}</span>
              </button>
            ))}
          </div>

          {method === 'cash' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Tendered</label>
              <Input
                type="number"
                min="0"
                max={MAX_ALLOWED}
                value={tendered}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') { setTendered(''); return; }
                  const num = parseFloat(val);
                  if (Number.isNaN(num)) return;
                  if (num > MAX_ALLOWED) {
                    setTendered(String(MAX_ALLOWED));
                    toast({ title: 'Value too large', description: 'Maximum allowed is ₱ 120,000.', variant: 'destructive' });
                  } else {
                    setTendered(val);
                  }
                }}
                placeholder={String(orderTotal)}
                className="text-lg font-semibold"
                autoFocus
              />
              {tenderedNum >= orderTotal && (
                <div className="rounded bg-green-50 p-2 text-center">
                  <p className="text-xs text-green-600">Change</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(change)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const tenderToUse = Math.min(method === 'cash' ? (tenderedNum || orderTotal) : orderTotal, MAX_ALLOWED);
              onValidate(method, tenderToUse);
            }}
            disabled={
              submitting ||
              (method === 'cash' && tenderedNum > 0 && tenderedNum < orderTotal) ||
              (method === 'cash' && tenderedNum > MAX_ALLOWED)
            }
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validating…</>
            ) : (
              'Validate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// SalesHistoryDrawer
// ──────────────────────────────────────────────────────────────────────────────

interface SaleRecord {
  sale_id:         string;
  sale_number:     string | null;
  total_amount:    number;
  payment_method:  string;
  sale_date:       string;
  discount_amount: number;
  tax_amount:      number;
  customer?: { name: string } | null;
  sale_item?: { quantity: number; price_at_sale: number; item?: { name: string } | null }[];
}

const SalesHistoryDrawer: React.FC<{
  open:     boolean;
  onClose:  () => void;
  branchId: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
}> = ({ open, onClose, branchId, supabase }) => {
  const [sales,   setSales]   = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !branchId) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('sale')
      .select(`
        sale_id,
        sale_number,
        total_amount,
        payment_method,
        sale_date,
        discount_amount,
        tax_amount,
        customer:customer_id ( name ),
        sale_item (
          quantity,
          price_at_sale,
          installation_fee,
          item:item_id ( name )
        )
      `)
      .eq('branch_id', branchId)
      .eq('state', 'done')
      .order('sale_date', { ascending: false })
      .limit(100)
      .then(({ data, error }: { data: SaleRecord[] | null; error: unknown }) => {
        if (!error && data) setSales(data);
        setLoading(false);
      });
  }, [open, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = sales.filter(s =>
    !search ||
    (s.sale_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.customer?.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const payBadge = (method: string) => {
    const map: Record<string, string> = {
      cash:   'bg-green-100 text-green-700',
      card:   'bg-blue-100 text-blue-700',
      check:  'bg-amber-100 text-amber-700',
      credit: 'bg-purple-100 text-purple-700',
    };
    return map[method] ?? 'bg-gray-100 text-gray-700';
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="flex h-[88vh] w-[min(96vw,1200px)] max-w-none flex-col p-0">
        <DialogHeader className="border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-foreground" />
              <DialogTitle className="text-lg font-semibold text-foreground">Sales History</DialogTitle>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                className="w-full rounded-md border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Search by sale # or customer…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5">
                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <span className="whitespace-nowrap text-xs text-gray-400">{filtered.length} records</span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#714B67]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <History className="mb-2 h-12 w-12 opacity-40" />
              <p className="text-sm text-gray-400">No sales found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs">Sale #</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs">Customer</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs">Payment</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs">Total</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sale => (
                  <React.Fragment key={sale.sale_id}>
                    <tr
                      className="cursor-pointer border-t border-gray-100 transition-colors hover:bg-gray-50"
                      onClick={() => setExpanded(prev => prev === sale.sale_id ? null : sale.sale_id)}
                    >
                      <td className="px-4 py-2.5 font-semibold text-foreground">
                        {sale.sale_number ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {sale.customer?.name ?? <span className="text-gray-400 italic">Walk-in</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${payBadge(sale.payment_method)}`}>
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500 text-xs">
                        {new Date(sale.sale_date).toLocaleString('en-PH', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                    {expanded === sale.sale_id && (
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="px-6 pb-3 pt-1">
                          <div className="mb-1.5 mt-1 text-xs font-medium text-gray-500">Items</div>
                          <div className="space-y-1">
                            {(sale.sale_item ?? []).map((si, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-gray-700">
                                <span>{si.item?.name ?? 'Item'} × {si.quantity}</span>
                                <span>{formatCurrency(si.price_at_sale * si.quantity)}</span>
                              </div>
                            ))}
                          </div>
                          {(sale.discount_amount > 0 || sale.tax_amount > 0) && (
                            <div className="mt-2 space-y-0.5 border-t border-gray-200 pt-2">
                              {sale.discount_amount > 0 && (
                                <div className="flex justify-between text-xs text-red-500">
                                  <span>Discount</span>
                                  <span>-{formatCurrency(sale.discount_amount)}</span>
                                </div>
                              )}
                              {sale.tax_amount > 0 && (
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>VAT</span>
                                  <span>{formatCurrency(sale.tax_amount)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="mt-1.5 flex justify-between border-t border-gray-200 pt-1.5 text-xs font-bold text-foreground">
                            <span>Total</span>
                            <span>{formatCurrency(sale.total_amount)}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────

export default function POSPage() {
  const { user, activeBranchId } = useAuth();

  const supabase = _supabase;

  // ── state ──────────────────────────────────────────────────────────────────

  const [branch,      setBranch]      = useState<BranchInfo | null>(null);
  const [products,    setProducts]    = useState<InventoryItem[]>([]);
  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState(ALL_CATEGORIES);
  const [vehicleType, setVehicleType] = useState(ALL_VEHICLES);
  const [cart,        setCart]        = useState<CartLine[]>([]);
  const [customerId,  setCustomerId]  = useState<string>(ANONYMOUS_CUSTOMER_ID);
  const [discount,    setDiscount]    = useState(0);
  const [taxPreset,   setTaxPreset]   = useState<TaxPreset>('none');
  const [taxRate,     setTaxRate]     = useState<string>(String(DEFAULT_TAX_RATE));
  const [showPayment, setShowPayment] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCart,    setShowCart]    = useState(false);

  // ── branch load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeBranchId) return;
    supabase
      .from('branch')
      .select('branch_id, name, address, phone')
      .eq('branch_id', activeBranchId)
      .single()
      .then(({ data }) => { if (data) setBranch(data as BranchInfo); });
  }, [activeBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── data load ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: prodData }, { data: custData }] = await Promise.all([
      supabase
        .from('inventory_item')
        .select('*')
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('customer')
        .select('customer_id, name, phone')
        .is('deleted_at', null)
        .order('name'),
    ]);
    setProducts((prodData ?? []) as InventoryItem[]);
    setCustomers((custData ?? []) as Customer[]);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  // ── derived ────────────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set).sort();
  }, [products]);

  const vehicleTypes = useMemo(() => {
    const set = new Set<string>();
    products.forEach(product => {
      if (product.vehicle_type) set.add(product.vehicle_type);
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      (category === ALL_CATEGORIES || p.category === category) &&
      (vehicleType === ALL_VEHICLES || p.vehicle_type === vehicleType) &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase())),
    );
  }, [products, category, vehicleType, search]);

  const subtotal    = cart.reduce((s, l) => s + l.price * l.quantity + l.installationFee, 0);
  const discountAmt = (subtotal * discount) / 100;
  const parsedTaxRate = Math.max(0, Number(taxRate) || 0);
  const activeTaxRate = taxPreset === 'none' ? 0 : parsedTaxRate;
  const taxAmt      = activeTaxRate > 0 ? ((subtotal - discountAmt) * activeTaxRate) / 100 : 0;
  const orderTotal  = subtotal - discountAmt + taxAmt;

  // ── cart helpers ───────────────────────────────────────────────────────────

  const addToCart = (item: InventoryItem) => {
    setCart(prev => {
      const idx = prev.findIndex(l => l.item.item_id === item.item_id);
      if (idx >= 0) {
        const next = [...prev];
        if (next[idx].quantity < item.stock_quantity) {
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        }
        return next;
      }
      return [...prev, { item, quantity: 1, price: item.sale_price, installationFee: 0 }];
    });
  };

  const adjustQty = (idx: number, delta: 1 | -1) => {
    setCart(prev => {
      const next = [...prev];
      const newQty = next[idx].quantity + delta;
      if (newQty <= 0) next.splice(idx, 1);
      else if (newQty <= next[idx].item.stock_quantity) next[idx] = { ...next[idx], quantity: newQty };
      return next;
    });
  };

  const removeLine = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));
  const setFee     = (idx: number, fee: number) =>
    setCart(prev => { const n = [...prev]; n[idx] = { ...n[idx], installationFee: fee }; return n; });

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setTaxPreset('none');
    setTaxRate(String(DEFAULT_TAX_RATE));
    setCustomerId(ANONYMOUS_CUSTOMER_ID);
  };

  // ── checkout ───────────────────────────────────────────────────────────────

  const handleValidate = async (method: PaymentMethod, tendered: number) => {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      if (!user?.user_id) {
        toast({ title: 'Session error', description: 'Please log in again.', variant: 'destructive' });
        return;
      }

      const resolvedBranchId = branch?.branch_id ?? activeBranchId;
      if (!resolvedBranchId) {
        toast({ title: 'Branch not loaded', description: 'Please wait a moment and try again.', variant: 'destructive' });
        return;
      }

      const inputPayload: CreatePOSSaleInput = {
        branch_id:       resolvedBranchId,
        user_id:         String(user.user_id),
        customer_id:     customerId === ANONYMOUS_CUSTOMER_ID ? undefined : customerId,
        payment_method:  method,
        discount_amount: discountAmt,
        tax_amount:      taxAmt,
        lines: cart.map(l => ({
          item_id:          l.item.item_id,
          quantity:         l.quantity,
          price_at_sale:    l.price,
          installation_fee: l.installationFee || undefined,
        })),
      };

      const result = await createPOSSale(inputPayload);

      if (!result.success) {
        toast({ title: 'Checkout failed', description: result.error, variant: 'destructive' });
        return;
      }

      // Audit log: POS sale created
      if (user?.user_id && result.saleId) {
        await _supabase.from('audit_log').insert({
          user_id: String(user.user_id),
          action: 'INSERT',
          table_name: 'sale',
          record_id: result.saleId,
          old_values: null,
          new_values: inputPayload,
          record_number: result.saleNumber ?? null,
        });
      }

      // Build and print receipt
      const customerObj  = customers.find(c => c.customer_id === customerId);
      const biz: BusinessInfo = {
        storeName:     branch?.name    ?? 'eTire POS',
        address:       branch?.address ?? '',
        phone:         branch?.phone   ?? '',
        taxInfo:       '',
        footerMessage: 'Thank you for your business!',
      };
      const receiptItems: ReceiptItem[] = cart.map(l => ({
        name:     l.item.name,
        quantity: l.quantity,
        price:    l.price,
      }));
      const saleRecord: Sale = {
        sale_id:         result.saleId ?? '',
        branch_id:       resolvedBranchId,
        user_id:         String(user.user_id),
        customer_id:     customerId === ANONYMOUS_CUSTOMER_ID ? undefined : customerId,
        payment_method:  method,
        discount_amount: discountAmt,
        tax_amount:      taxAmt,
        total_amount:    orderTotal,
        sale_number:     result.saleNumber ?? undefined,
        status:          'done',
        sale_date:       new Date().toISOString(),
      };
      const cashierUser = {
        user_id:  String(user.user_id),
        name:     String(user.name ?? 'Cashier'),
        username: String(user.username ?? ''),
        password: '',
        role:     String(user.role ?? 'staff'),
      } as unknown as User;
      const receiptCustomer: ReceiptCustomer | undefined = customerObj
        ? { name: customerObj.name, phone: customerObj.phone }
        : undefined;
      const branchRecord = branch?.branch_id
        ? {
            branch_id: branch.branch_id,
            name:      branch.name  ?? '',
            address:   branch.address ?? '',
            phone:     branch.phone ?? '',
            is_active: true,
          } as unknown as Branch
        : undefined;

      const receiptPayload: ReceiptData = {
        sale:         saleRecord,
        items:        receiptItems,
        cashier:      cashierUser,
        businessInfo: biz,
        customer:     receiptCustomer,
        branch:       branchRecord,
      };
      const html = generateHtmlReceipt(receiptPayload);
      printReceipt(html);

      toast({ title: 'Sale completed', description: `Order ${result.saleNumber ?? '—'}` });
      setShowPayment(false);
      clearCart();
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-gray-100 md:flex-row">

      {/* ── Mobile tab bar ─────────────────────────────────────────────────── */}
      <div className="flex md:hidden border-b bg-white shrink-0">
        <button
          onClick={() => setShowCart(false)}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium transition-colors',
            !showCart ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500',
          )}
        >
          Products
        </button>
        <button
          onClick={() => setShowCart(true)}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium transition-colors relative',
            showCart ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500',
          )}
        >
          Cart
          {cart.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* ── LEFT — Product browser ─────────────────────────────────────────── */}
      <div className={cn(
        'flex min-w-0 flex-1 flex-col overflow-hidden',
        showCart ? 'hidden md:flex' : 'flex',
      )}>

        {/* Search bar */}
        <div className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-2">
          <div className="relative min-w-[220px] flex-1 md:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 w-[160px] text-sm">
              <SelectValue placeholder="Type of item" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All item types</SelectItem>
              <SelectItem value="tire">Tire</SelectItem>
              <SelectItem value="tool">Tool</SelectItem>
              <SelectItem value="accessory">Accessory</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vehicleType} onValueChange={setVehicleType}>
            <SelectTrigger className="h-8 w-[170px] text-sm">
              <SelectValue placeholder="Type of vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VEHICLES}>All vehicles</SelectItem>
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="motor">Motorcycle</SelectItem>
              <SelectItem value="truck">Truck</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={loadData}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium text-[#714B67] border border-[#714B67]/30 hover:bg-[#714B67]/10 transition-colors"
            title="Sales History"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <p className="text-xs text-gray-400 hidden sm:block">
            {filteredProducts.length} items
          </p>
        </div>

        {/* Quick item filters */}
        <div className="flex gap-2 overflow-x-auto border-b bg-white px-4 py-2 scrollbar-thin">
          <button
            onClick={() => setCategory(ALL_CATEGORIES)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              category === ALL_CATEGORIES
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            All
          </button>
          {categories.filter(cat => ['tire', 'tool', 'accessory'].includes(cat)).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              <span className="capitalize">{cat}</span>
            </button>
          ))}
        </div>

        {/* Product grid */}
        <ScrollArea className="flex-1 p-3">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Package className="h-12 w-12 mb-2 opacity-40" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filteredProducts.map(item => (
                <ProductCard key={item.item_id} item={item} onClick={addToCart} />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── RIGHT — Order sidebar ──────────────────────────────────────────── */}
      <div className={cn(
        'flex min-w-0 flex-col border-l bg-white shadow-lg',
        'w-full md:w-[22rem] xl:w-[26rem]',
        !showCart ? 'hidden md:flex' : 'flex',
      )}>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-gray-800">Order</span>
            {cart.length > 0 && (
              <Badge className="bg-blue-600 text-white">{cart.length}</Badge>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600">
              Clear
            </button>
          )}
        </div>

        {/* Customer */}
        <div className="border-b px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <UserCircle2 className="h-3.5 w-3.5" />
            <span>Customer</span>
          </div>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Walk-in Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANONYMOUS_CUSTOMER_ID}>Walk-in Customer</SelectItem>
              {customers.map(c => (
                <SelectItem key={c.customer_id} value={c.customer_id}>
                  {c.name}{c.phone ? ` · ${c.phone}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cart lines */}
        <ScrollArea className="flex-1 px-3 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <ShoppingCart className="h-12 w-12 mb-2" />
              <p className="text-sm">Tap a product to add</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((line, idx) => (
                <CartLineRow
                  key={line.item.item_id}
                  line={line}
                  onQtyUp={()    => adjustQty(idx, 1)}
                  onQtyDown={()  => adjustQty(idx, -1)}
                  onRemove={()   => removeLine(idx)}
                  onFeeChange={f => setFee(idx, f)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Totals */}
        <div className="border-t px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {/* Discount */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Percent className="h-3.5 w-3.5" />
            <span>Discount</span>
            <Input
              type="number"
              min="0"
              max="100"
              value={discount || ''}
              placeholder="0"
              onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
              className="ml-auto h-6 w-16 text-right text-xs px-1"
            />
            <span className="text-xs">%</span>
          </div>
          {discountAmt > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmt)}</span>
            </div>
          )}

          {/* Tax toggle */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-500">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-medium text-gray-700">Tax</span>
              {activeTaxRate > 0 && <span>{formatCurrency(taxAmt)}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={taxPreset === 'vat' ? 'default' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setTaxPreset('vat');
                  setTaxRate(String(DEFAULT_TAX_RATE));
                }}
              >
                VAT {DEFAULT_TAX_RATE}%
              </Button>
              <Button
                type="button"
                size="sm"
                variant={taxPreset === 'custom' ? 'default' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setTaxPreset('custom');
                  if (Number(taxRate) <= 0) setTaxRate(String(DEFAULT_TAX_RATE));
                }}
              >
                Custom
              </Button>
              <Button
                type="button"
                size="sm"
                variant={taxPreset === 'none' ? 'secondary' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => setTaxPreset('none')}
              >
                None
              </Button>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={taxRate}
                onChange={(event) => {
                  setTaxPreset('custom');
                  setTaxRate(event.target.value);
                }}
                className="ml-auto h-7 w-20 text-right text-xs"
                aria-label="Custom tax percentage"
              />
              <span className="text-xs">%</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span className="text-blue-700">{formatCurrency(orderTotal)}</span>
          </div>
        </div>

        {/* Charge button */}
        <div className="px-4 pb-4 pt-1">
          <Button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
          >
            {cart.length > 0 ? `Charge ${formatCurrency(orderTotal)}` : 'Charge'}
          </Button>
        </div>
      </div>

      {/* Payment modal */}
      <PaymentModal
        open={showPayment}
        orderTotal={orderTotal}
        onValidate={handleValidate}
        onClose={() => setShowPayment(false)}
        submitting={submitting}
      />

      {/* Sales History drawer */}
      <SalesHistoryDrawer
        open={showHistory}
        onClose={() => setShowHistory(false)}
        branchId={branch?.branch_id ?? activeBranchId ?? undefined}
        supabase={supabase}
      />
    </div>
  );
}
