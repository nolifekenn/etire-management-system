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
  Package, RefreshCw,
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
const DEFAULT_TAX_RATE      = 12;   // VAT %

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

  const tenderedNum = parseFloat(tendered) || 0;
  const change      = Math.max(0, tenderedNum - orderTotal);

  const methods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'cash',   label: 'Cash',    icon: <Banknote         className="h-5 w-5" /> },
    { value: 'card',   label: 'Card',    icon: <CreditCard        className="h-5 w-5" /> },
    { value: 'check',  label: 'Check',   icon: <ReceiptText       className="h-5 w-5" /> },
    { value: 'credit', label: 'Credit',  icon: <CircleDollarSign  className="h-5 w-5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={open ? undefined : onClose}>
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
                value={tendered}
                onChange={e => setTendered(e.target.value)}
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
            onClick={() => onValidate(method, tenderedNum || orderTotal)}
            disabled={
              submitting ||
              (method === 'cash' && tenderedNum > 0 && tenderedNum < orderTotal)
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
  const [cart,        setCart]        = useState<CartLine[]>([]);
  const [customerId,  setCustomerId]  = useState<string>(ANONYMOUS_CUSTOMER_ID);
  const [discount,    setDiscount]    = useState(0);
  const [applyTax,    setApplyTax]    = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

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

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      (category === ALL_CATEGORIES || p.category === category) &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase())),
    );
  }, [products, category, search]);

  const subtotal    = cart.reduce((s, l) => s + l.price * l.quantity + l.installationFee, 0);
  const discountAmt = (subtotal * discount) / 100;
  const taxAmt      = applyTax ? ((subtotal - discountAmt) * DEFAULT_TAX_RATE) / 100 : 0;
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
    setApplyTax(false);
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
    <div className="flex h-screen w-full overflow-hidden bg-gray-100">

      {/* ── LEFT — Product browser ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Search bar */}
        <div className="flex items-center gap-3 border-b bg-white px-4 py-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <button
            onClick={loadData}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <p className="text-xs text-gray-400 hidden sm:block">
            {filteredProducts.length} items
          </p>
        </div>

        {/* Category pills */}
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
          {categories.map(cat => (
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
              {cat}
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
      <div className="flex w-80 xl:w-96 flex-col border-l bg-white shadow-lg">

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
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button
              onClick={() => setApplyTax(v => !v)}
              className={cn(
                'relative h-4 w-7 rounded-full transition-colors',
                applyTax ? 'bg-blue-500' : 'bg-gray-200',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform',
                  applyTax ? 'translate-x-3.5' : 'translate-x-0.5',
                )}
              />
            </button>
            <span>VAT {DEFAULT_TAX_RATE}%</span>
            {applyTax && <span className="ml-auto">{formatCurrency(taxAmt)}</span>}
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
    </div>
  );
}
