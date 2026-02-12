"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronRight,
  Search,
  Eye,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Loader2,
  Plus,
  Trash2,
  XCircle,
  Car,
  Bike,
  Truck,
  Package,
  RefreshCw,
  Clock,
  Receipt,
  User,
  CheckCircle,
  ArrowLeft,
  Download,
  Wrench,
  Settings,
  Edit,
  Ban,
  Lock,
  X,
  Save,
  Archive,
  Printer,
  ListFilter,
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { SecureVoidModal } from '@/components/SecureVoidModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { InventoryItem } from '../inventory/page';
import {
  generateHtmlReceipt,
  printReceipt,
  type BusinessInfo,
  type ReceiptItem,
  type ReceiptData,
  type ReceiptCustomer,
} from '@/lib/receiptGenerator';
import type { Sale, User as AppUser } from '@/lib/types';
import { notifyLowStock } from '@/lib/notificationService';

// ============================================
// INTERFACES & TYPES
// ============================================
interface Customer {
  customer_id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface CartItem extends InventoryItem {
  quantity: number;
  installationFee?: number;
}

interface SaleItem {
  quantity: number;
  price_at_sale: number;
  inventory_item?: {
    name: string;
  };
}

// EnhancedSale uses Omit to remove conflicting properties from Sale, then redefines them
interface EnhancedSale extends Omit<Sale, 'customer' | 'user'> {
  customer?: { name: string; phone?: string };
  sale_item?: SaleItem[];
  user?: { name: string };
}

type SaleItemWithInventoryRecord = {
  item_id: string;
  quantity: number;
  price_at_sale: number;
  inventory_item: InventoryItem;
};

type IncrementStockParams = {
  item_id_param: string;
  quantity_param: number;
};

const ANONYMOUS_CUSTOMER_ID = "anonymous_customer";

// ============================================
// CUSTOM TIRE ICON COMPONENT
// ============================================
const TireIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
    <line x1="12" y1="4" x2="12" y2="8" stroke="currentColor" strokeWidth="1" />
    <line x1="12" y1="16" x2="12" y2="20" stroke="currentColor" strokeWidth="1" />
    <line x1="4" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="1" />
    <line x1="16" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1" />
    <line x1="6" y1="6" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1" />
    <line x1="15.5" y1="15.5" x2="18" y2="18" stroke="currentColor" strokeWidth="1" />
    <line x1="6" y1="18" x2="8.5" y2="15.5" stroke="currentColor" strokeWidth="1" />
    <line x1="15.5" y1="8.5" x2="18" y2="6" stroke="currentColor" strokeWidth="1" />
  </svg>
);

// ============================================
// DATATABLE WRAPPER COMPONENT
// ============================================
type DataRow = Record<string, unknown>;

interface Column<TData extends DataRow> {
  key: keyof TData | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: TData) => React.ReactNode;
}

interface DataTableProps<TData extends DataRow> {
  data: TData[];
  columns: Column<TData>[];
  searchKeys?: Array<keyof TData | string>;
  rowsPerPageOptions?: number[];
  onRowClick?: (row: TData) => void;
  showHeader?: boolean;
  rowsPerPage?: number;
  onRowsPerPageChange?: (n: number) => void;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  className?: string;
}

const getNestedValue = (row: DataRow, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, keyPart) => {
    if (acc && typeof acc === 'object' && keyPart in (acc as DataRow)) {
      return (acc as DataRow)[keyPart];
    }
    return undefined;
  }, row);
};

const toComparableValue = (value: unknown): string | number => {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'boolean') return value ? 1 : 0;
  return String(value ?? '').toLowerCase();
};

function DataTableWrapper<TData extends DataRow>({
  data,
  columns,
  searchKeys = [],
  rowsPerPageOptions = [5, 10, 25, 50],
  onRowClick,
  showHeader = true,
  rowsPerPage: externalRowsPerPage,
  onRowsPerPageChange,
  searchTerm: externalSearchTerm,
  onSearchTermChange,
  className
}: DataTableProps<TData>) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(rowsPerPageOptions[0]);

  // Use external props if provided, otherwise internal state
  const rowsPerPage = typeof externalRowsPerPage === 'number' ? externalRowsPerPage : internalRowsPerPage;
  const searchTerm = typeof externalSearchTerm === 'string' ? externalSearchTerm : internalSearchTerm;

  const [sortConfig, setSortConfig] = useState<{ key: keyof TData | string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(row => {
      return searchKeys.some(key => {
        const value = getNestedValue(row, String(key));
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [data, searchTerm, searchKeys]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const keyPath = String(sortConfig.key);
      const aValue = getNestedValue(a, keyPath);
      const bValue = getNestedValue(b, keyPath);
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      const aComparable = toComparableValue(aValue);
      const bComparable = toComparableValue(bValue);
      if (aComparable < bComparable) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aComparable > bComparable) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleRowsPerPageChange = (n: number) => {
    if (onRowsPerPageChange) {
      onRowsPerPageChange(n);
    } else {
      setInternalRowsPerPage(n);
    }
  };

  const handleSearchChange = (val: string) => {
    if (onSearchTermChange) {
      onSearchTermChange(val);
    } else {
      setInternalSearchTerm(val);
    }
  };

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {showHeader && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rows per page:</span>
            <Select value={String(rowsPerPage)} onValueChange={(v) => handleRowsPerPageChange(Number(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rowsPerPageOptions.map(option => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className={`overflow-hidden bg-white ${showHeader ? 'border rounded-lg' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider ${column.sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                      }`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && sortConfig?.key === column.key && (
                        <span className="text-indigo-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                    No records found
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr
                    key={index}
                    className={`${onRowClick ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-6 py-4 text-sm text-slate-800">
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Pager */}
      <div className="flex items-center justify-between p-6 border-t">
        <div className="text-sm text-slate-600">
          Showing {totalPages === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} entries
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 px-2 min-w-[36px]" onClick={() => { setCurrentPage(1); }} disabled={currentPage === 1}>
            «
          </Button>
          <Button variant="outline" className="h-8 px-2 min-w-[36px]" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
            ‹
          </Button>
          <span className="text-sm text-slate-600 px-2 font-medium">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button variant="outline" className="h-8 px-2 min-w-[36px]" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
            ›
          </Button>
          <Button variant="outline" className="h-8 px-2 min-w-[36px]" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}>
            »
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CUSTOMER SEARCH COMPONENT
// ============================================
const CustomerSearch = ({
  customers,
  selectedCustomerId,
  onCustomerSelect
}: {
  customers: Customer[];
  selectedCustomerId: string;
  onCustomerSelect: (customerId: string) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const selectedCustomer = customers.find(c => c.customer_id === selectedCustomerId);

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full justify-start border-slate-300 hover:border-indigo-400 transition-all duration-300 bg-white/80 font-poppins"
        onClick={() => setIsOpen(true)}
      >
        <User className="h-4 w-4 mr-2" />
        {selectedCustomerId === ANONYMOUS_CUSTOMER_ID ? 'Walk-in Customer' : selectedCustomer?.name || 'Select Customer'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl mt-20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Select Customer
            </DialogTitle>
            <DialogDescription className="text-slate-600 font-poppins">
              Search and select a customer for this sale
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search customers by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              <Button
                variant={selectedCustomerId === ANONYMOUS_CUSTOMER_ID ? "default" : "outline"}
                className="w-full justify-start border-slate-300 hover:border-indigo-400 transition-all duration-300 bg-white/80 font-poppins"
                onClick={() => {
                  onCustomerSelect(ANONYMOUS_CUSTOMER_ID);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <User className="h-4 w-4 mr-2" />
                Walk-in Customer
              </Button>

              {filteredCustomers.map(customer => (
                <Button
                  key={customer.customer_id}
                  variant={selectedCustomerId === customer.customer_id ? "default" : "outline"}
                  className="w-full justify-start border-slate-300 hover:border-indigo-400 transition-all duration-300 bg-white/80 font-poppins"
                  onClick={() => {
                    onCustomerSelect(customer.customer_id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium text-slate-800">{customer.name}</div>
                    {(customer.phone || customer.email) && (
                      <div className="text-xs text-slate-500 mt-1">
                        {customer.phone && `📞 ${customer.phone}`}
                        {customer.phone && customer.email && ' • '}
                        {customer.email && `✉️ ${customer.email}`}
                      </div>
                    )}
                  </div>
                </Button>
              ))}

              {filteredCustomers.length === 0 && searchTerm && (
                <div className="text-center py-4 text-slate-500">
                  No customers found matching &quot;{searchTerm}&quot;
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors border border-slate-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================
// SUCCESS ANIMATION COMPONENT (PORTAL) - Simplified
// ============================================
const SuccessAnimation = ({
  isVisible,
  title,
  message,
  actionType,
  onConfirm
}: {
  isVisible: boolean;
  title: string;
  message: string;
  actionType: 'sale' | 'receipt' | 'void' | 'access' | 'edit' | 'export';
  onConfirm: () => void;
}) => {
  if (!isVisible) return null;

  const getActionIcon = () => {
    switch (actionType) {
      case 'sale': return CheckCircle;
      case 'receipt': return Printer;
      case 'void': return Archive;
      case 'access': return Lock;
      case 'edit': return Save;
      case 'export': return Download;
      default: return CheckCircle;
    }
  };

  const ActionIcon = getActionIcon();

  const content = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <ActionIcon className="h-7 w-7 text-primary-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <Button onClick={onConfirm} className="w-full">
          <CheckCircle className="h-4 w-4 mr-2" />
          Confirm
        </Button>
      </div>
    </div>
  );

  // Portal to document.body so it overlays everything (guard for SSR)
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return null;
};


// ============================================
// PRICE FORMATTING UTILITY
// ============================================
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

// ============================================
// CATEGORY ICON COMPONENT
// ============================================
const CategoryIcon = ({ category, className = "h-4 w-4" }: { category: string; className?: string }) => {
  switch (category.toLowerCase()) {
    case 'tire':
      return <TireIcon className={className} />;
    case 'tool':
      return <Wrench className={className} />;
    case 'accessory':
      return <Settings className={className} />;
    default:
      return <Package className={className} />;
  }
};

const vehicleTypeVisuals = {
  all: {
    label: 'All',
    icon: Package,
    buttonActive: 'bg-primary text-primary-foreground shadow-sm border-transparent',
    buttonInactive: 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-400 hover:bg-slate-50',
    badge: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  car: {
    label: 'Car',
    icon: Car,
    buttonActive: 'bg-primary text-primary-foreground shadow-sm border-transparent',
    buttonInactive: 'bg-white text-slate-700 hover:text-primary border-slate-200 hover:border-primary/30 hover:bg-primary/5',
    badge: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  motor: {
    label: 'Motorcycle',
    icon: Bike,
    buttonActive: 'bg-primary text-primary-foreground shadow-sm border-transparent',
    buttonInactive: 'bg-white text-slate-700 hover:text-primary border-slate-200 hover:border-primary/30 hover:bg-primary/5',
    badge: 'bg-violet-50 text-violet-700 border-violet-200'
  },
  truck: {
    label: 'Truck',
    icon: Truck,
    buttonActive: 'bg-primary text-primary-foreground shadow-sm border-transparent',
    buttonInactive: 'bg-white text-slate-700 hover:text-primary border-slate-200 hover:border-primary/30 hover:bg-primary/5',
    badge: 'bg-pink-50 text-pink-700 border-pink-200'
  }
} as const;

// ✅ UPDATED: Filter out 'all' so the button doesn't show up in the map
const vehicleTypes = Object.entries(vehicleTypeVisuals)
  .filter(([value]) => value !== 'all')
  .map(([value, config]) => ({
    value,
    label: config.label,
    icon: config.icon
  }));

const categoryVisuals = {
  all: {
    label: 'All',
    buttonActive: 'bg-primary text-primary-foreground shadow-sm border-transparent',
    buttonInactive: 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-400 hover:bg-slate-50',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400'
  },
  tire: {
    label: 'Tires',
    buttonActive: 'bg-primary text-primary-foreground shadow-sm border-transparent',
    buttonInactive: 'bg-white text-slate-700 hover:text-primary border-slate-200 hover:border-primary/30 hover:bg-primary/5',
    badge: 'bg-purple-50 text-purple-700 border-purple-100',
    dot: 'bg-purple-500'
  },
  tool: {
    label: 'Tools',
    buttonActive: 'bg-primary text-primary-foreground shadow-sm border-transparent',
    buttonInactive: 'bg-white text-slate-700 hover:text-primary border-slate-200 hover:border-primary/30 hover:bg-primary/5',
    badge: 'bg-violet-50 text-violet-700 border-violet-100',
    dot: 'bg-violet-500'
  },
  accessory: {
    label: 'Accessories',
    buttonActive: 'bg-primary text-primary-foreground shadow-sm border-transparent',
    buttonInactive: 'bg-white text-slate-700 hover:text-primary border-slate-200 hover:border-primary/30 hover:bg-primary/5',
    badge: 'bg-pink-50 text-pink-700 border-pink-100',
    dot: 'bg-pink-500'
  }
} as const;


// ✅ UPDATED: Filter out 'all' so the button doesn't show up in the map
const categories = Object.entries(categoryVisuals)
  .filter(([value]) => value !== 'all')
  .map(([value, config]) => ({
    value,
    label: config.label
  }));

// ============================================
// NEW PRODUCTS CELL COMPONENT (Dropdown for >2 items)
// ============================================
const ProductsCell: React.FC<{ items?: SaleItem[] }> = ({ items = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Aggregate items by name and sum quantities
  const aggregated = items
    .filter(it => it.inventory_item?.name)
    .reduce<Record<string, number>>((acc, it) => {
      const name = it.inventory_item!.name;
      acc[name] = (acc[name] || 0) + (it.quantity || 0);
      return acc;
    }, {});

  const entries = Object.entries(aggregated); // [ [name, qty], ... ]

  if (entries.length === 0) {
    return <span className="text-slate-400 italic text-xs">No products listed</span>;
  }

  // If 2 or fewer distinct products, show them inline with qty on the right
  if (entries.length <= 2) {
    return (
      <div className="flex flex-col gap-1">
        {entries.map(([name, qty], idx) => (
          <div key={idx} className="flex justify-between items-center gap-3 max-w-[220px]">
            <span className="font-medium text-sm text-slate-700 truncate" title={name}>{name}</span>
            <span className="text-xs text-slate-500 font-medium">x{qty}</span>
          </div>
        ))}
      </div>
    );
  }

  // More than 2 distinct products -> show first 2 and a dropdown for the rest
  const display = entries.slice(0, 2);
  const remainingCount = entries.length - 2;

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-col gap-1">
        {display.map(([name, qty], idx) => (
          <div key={idx} className="flex justify-between items-center gap-3 max-w-[220px]">
            <span className="font-medium text-sm text-slate-700 truncate" title={name}>{name}</span>
            <span className="text-xs text-slate-500 font-medium">x{qty}</span>
          </div>
        ))}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(v => !v);
          }}
          className={`mt-1 inline-flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-md transition-all duration-200 border
            ${isOpen ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'}
          `}
          aria-expanded={isOpen}
        >
          <Plus className="h-3 w-3" />
          {remainingCount} more
          <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Full Item List ({entries.length})
            </span>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {entries.map(([name, qty], idx) => (
              <div
                key={idx}
                className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between"
              >
                <div className="truncate pr-4">{name}</div>
                <div className="text-xs text-slate-500 font-medium">x{qty}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN POS PAGE COMPONENT
// ============================================
export default function POSPage() {
  const { toast } = useToast();
  const { user: authUser, activeBranchId } = useAuth();

  // State for POS
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(ANONYMOUS_CUSTOMER_ID);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // State for Sales History
  const [sales, setSales] = useState<EnhancedSale[]>([]);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [rowsPerPageSales, setRowsPerPageSales] = useState<number>(5);
  // NEW: State for Receipt View Modal
  const [viewReceiptModalOpen, setViewReceiptModalOpen] = useState(false);
  const [viewReceiptHtml, setViewReceiptHtml] = useState('');

  // Sort State
  const [sortOption, setSortOption] = useState('date-desc');

  // State for Success Animation
  const [successAnimation, setSuccessAnimation] = useState<{
    isVisible: boolean;
    title: string;
    message: string;
    actionType: 'sale' | 'receipt' | 'void' | 'access' | 'edit' | 'export';
  }>({
    isVisible: false,
    title: '',
    message: '',
    actionType: 'sale'
  });

  // State for Void Management
  const [showVoidManagement, setShowVoidManagement] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [managerPassword, setManagerPassword] = useState('');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [voidSearchTerm, setVoidSearchTerm] = useState('');


  // Void Modal State
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [itemToVoid, setItemToVoid] = useState<string | null>(null);
  const [rowsPerPageVoid, setRowsPerPageVoid] = useState(5);

  // State for Void Confirmation Dialog
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [saleToVoid, setSaleToVoid] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [installationModal, setInstallationModal] = useState<{ open: boolean, item: CartItem | null }>({ open: false, item: null });
  const [installationFee, setInstallationFee] = useState<number>(0);

  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!supabase) {
      setFetchError("Supabase client not available. Please check your .env.local file.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      let invQuery = supabase.from('view_branch_inventory')
        .select('*, stock_quantity:quantity')
        .gt('quantity', 0)
        .is('deleted_at', null);

      if (activeBranchId) {
        invQuery = invQuery.eq('branch_id', activeBranchId);
      }

      let custQuery = supabase.from('customer')
        .select('customer_id, name, phone, email')
        .is('deleted_at', null);

      if (activeBranchId) {
        custQuery = custQuery.eq('branch_id', activeBranchId);
      }

      let salesQuery = supabase
        .from('sale')
        .select(`
          *,
          customer (name),
          sale_item (
            quantity, 
            price_at_sale,
            inventory_item (name)
          )
        `)
        .is('deleted_at', null)
        .order('sale_date', { ascending: false })
        .limit(50);

      if (activeBranchId) {
        salesQuery = salesQuery.eq('branch_id', activeBranchId);
      }

      const [inventoryRes, customersRes, salesRes] = await Promise.all([
        invQuery,
        custQuery,
        salesQuery
      ]);

      if (inventoryRes.error) throw inventoryRes.error;
      if (customersRes.error) throw customersRes.error;
      if (salesRes.error) throw salesRes.error;

      setInventory(inventoryRes.data);
      setCustomers(customersRes.data);
      setSales(salesRes.data);
      setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = `Failed to load data: ${getErrorMessage(error)}.`;
      setFetchError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, activeBranchId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Filter inventory based on selections
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVehicle = selectedVehicleType === 'all' || item.vehicle_type === selectedVehicleType;
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      return matchesSearch && matchesVehicle && matchesCategory;
    });
  }, [inventory, searchTerm, selectedVehicleType, selectedCategory]);

  // Sorted Sales Logic
  const sortedSales = useMemo(() => {
    const sorted = [...sales];
    switch (sortOption) {
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.sale_date || 0).getTime() - new Date(a.sale_date || 0).getTime());
        break;
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.sale_date || 0).getTime() - new Date(b.sale_date || 0).getTime());
        break;
      case 'amount-desc':
        sorted.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
        break;
      case 'amount-asc':
        sorted.sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0));
        break;
      case 'items-desc':
        sorted.sort((a, b) => {
          const aItems = a.sale_item?.reduce((acc: number, i: SaleItem) => acc + i.quantity, 0) || 0;
          const bItems = b.sale_item?.reduce((acc: number, i: SaleItem) => acc + i.quantity, 0) || 0;
          return bItems - aItems;
        });
        break;
      default:
        break;
    }
    return sorted;
  }, [sales, sortOption]);

  const addToCart = (item: InventoryItem) => {
    // Get the CURRENT stock from inventory state (not the passed item)
    const currentInventoryItem = inventory.find(inv => inv.item_id === item.item_id);
    const currentStock = currentInventoryItem?.stock_quantity ?? 0;

    // Check stock before doing anything
    if (currentStock <= 0) {
      toast({
        title: 'Out of stock',
        description: `${item.name} is out of stock.`,
        variant: 'destructive'
      });
      return;
    }

    const existingItem = cart.find(cartItem => cartItem.item_id === item.item_id);

    if (existingItem) {
      // Item already in cart - check against CURRENT stock, not cart quantity
      if (currentStock > 0) {
        setCart(prevCart =>
          prevCart.map(cartItem =>
            cartItem.item_id === item.item_id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          )
        );

        // Update inventory
        setInventory(prevInventory =>
          prevInventory.map(invItem =>
            invItem.item_id === item.item_id
              ? { ...invItem, stock_quantity: invItem.stock_quantity - 1 }
              : invItem
          )
        );
      } else {
        toast({
          title: 'Stock Limit',
          description: `Cannot add more of ${item.name}. Stock limit reached.`,
          variant: 'destructive'
        });
      }
    } else {
      // New item - add to cart
      const newCartItem: CartItem = {
        ...item,
        quantity: 1,
        installationFee: 0
      };

      setCart(prevCart => [...prevCart, newCartItem]);

      // Update inventory
      setInventory(prevInventory =>
        prevInventory.map(invItem =>
          invItem.item_id === item.item_id
            ? { ...invItem, stock_quantity: invItem.stock_quantity - 1 }
            : invItem
        )
      );

      // Handle installation modal for accessories
      if (item.category === 'accessory' && item.name.toLowerCase() !== 'installation service') {
        const serviceItemTemplate = inventory.find(i => i.name.toLowerCase() === 'installation service');
        if (serviceItemTemplate) {
          setInstallationModal({ open: true, item: newCartItem });
          setInstallationFee(0);
        } else {
          toast({
            title: "Setup Incomplete",
            description: "Accessory added. To add installation fees, please create an item named 'Installation Service' in your inventory.",
            variant: 'default',
            duration: 7000,
          });
        }
      }
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    const item = inventory.find(p => p.item_id === itemId);
    if (!item) return;

    const cartItem = cart.find(c => c.item_id === itemId);
    if (!cartItem) return;

    const quantityDifference = newQuantity - cartItem.quantity;

    if (newQuantity > 0 && newQuantity <= item.stock_quantity + cartItem.quantity) {
      // Update inventory based on quantity change
      setInventory(prevInventory =>
        prevInventory.map(invItem =>
          invItem.item_id === itemId
            ? { ...invItem, stock_quantity: invItem.stock_quantity - quantityDifference }
            : invItem
        )
      );

      setCart(cart.map(cartItem => cartItem.item_id === itemId ? { ...cartItem, quantity: newQuantity } : cartItem));
    } else if (newQuantity > item.stock_quantity + cartItem.quantity) {
      toast({ title: 'Stock Limit', description: `Only ${item.stock_quantity} units of ${item.name} available.`, variant: 'destructive' });
    } else if (newQuantity <= 0) {
      removeFromCart(itemId);
    }
  };

  const handleRequestVoid = (itemId: string) => {
    setItemToVoid(itemId);
    setIsVoidModalOpen(true);
  };

  const handleVoidAuthorized = () => {
    if (itemToVoid) {
      const itemId = itemToVoid;
      const cartItem = cart.find(item => item.item_id === itemId);

      if (cartItem) {
        // Restore the stock when removing from cart
        setInventory(prevInventory =>
          prevInventory.map(invItem =>
            invItem.item_id === itemId
              ? { ...invItem, stock_quantity: invItem.stock_quantity + cartItem.quantity }
              : invItem
          )
        );
      }
      setCart(cart.filter(item => item.item_id !== itemId));
      setItemToVoid(null);
      toast({
        title: "Item Removed",
        description: "Manager authorized item removal.",
        variant: "default"
      });
    }
  };

  const removeFromCart = (itemId: string) => {
    handleRequestVoid(itemId);
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.sale_price * item.quantity) + (item.installationFee || 0), 0);
  const total = subtotal;

  const handleProcessSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items before processing a sale.",
        variant: "destructive"
      });
      return;
    }

    if (!authUser || !supabase) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in to process a sale.', variant: 'destructive' });
      return;
    }

    const saleBranchId = activeBranchId || authUser.branch_id || null;
    if (!saleBranchId) {
      toast({
        title: "Missing Branch",
        description: "Select an active branch before processing a sale.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // If editing a sale, void the original first (soft delete)
      if (editingSale) {
        // Soft delete sale items
        const { error: softDeleteItemsError } = await supabase
          .from('sale_item')
          .update({ deleted_at: new Date().toISOString() })
          .eq('sale_id', editingSale.sale_id);

        if (softDeleteItemsError) throw softDeleteItemsError;

        // Soft delete the sale
        const { error: softDeleteSaleError } = await supabase
          .from('sale')
          .update({ deleted_at: new Date().toISOString() })
          .eq('sale_id', editingSale.sale_id);

        if (softDeleteSaleError) throw softDeleteSaleError;
      }

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId === ANONYMOUS_CUSTOMER_ID ? null : selectedCustomerId,
          cartItems: cart,
          paymentMethod: "cash",
          userId: authUser.user_id,
          branchId: saleBranchId,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to process sale");

      // Generate receipt
      try {
        const businessInfo: BusinessInfo = {
          storeName: 'Queen.R Tire Supply & Vulcanizing Shop',
          address: '68, Sipocot, Camarines Sur',
          phone: 'To be given',
          taxInfo: 'To be given',
          footerMessage: 'Thank You!',
        };

        const receiptItems: ReceiptItem[] = cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.sale_price,
        }));

        const selectedCustomerObj = customers.find(c => c.customer_id === selectedCustomerId);
        const receiptCustomer: ReceiptCustomer | undefined = selectedCustomerObj
          ? { name: selectedCustomerObj.name, phone: selectedCustomerObj.phone }
          : undefined;

        const newSaleObject: Sale = {
          sale_id: data.sale_id,
          branch_id: authUser.branch_id || '', // Fallback to empty string if not found
          sale_date: new Date().toISOString(),
          customer_id: selectedCustomerId === ANONYMOUS_CUSTOMER_ID ? undefined : selectedCustomerId,
          user_id: authUser.user_id,
          payment_method: 'cash',
          discount_amount: 0,
          tax_amount: 0,
          total_amount: total,
        };

        const receiptData: ReceiptData = {
          sale: newSaleObject,
          items: receiptItems,
          cashier: authUser as AppUser,
          customer: receiptCustomer,
          businessInfo: businessInfo,
        };

        const html = generateHtmlReceipt(receiptData);
        printReceipt(html);

      } catch (receiptError) {
        const receiptMessage = getErrorMessage(receiptError);
        console.error('Receipt generation failed:', receiptError);
        toast({ title: 'Receipt Error', description: `Sale was saved (ID: ${data.sale_id}), but receipt failed to print: ${receiptMessage}`, variant: 'destructive' });
      }

      // Show success animation
      setSuccessAnimation({
        isVisible: true,
        title: "Sale Completed!",
        message: "The transaction has been processed successfully.",
        actionType: 'sale'
      });

      // Check for low stock items and notify (runs in background)
      const checkLowStock = async () => {
        if (!supabase || cart.length === 0) return;

        try {
          // Batch query: get all cart items in a single request
          const itemIds = cart.map(item => item.item_id);
          const { data: items, error } = await supabase
            .from('inventory_item')
            .select('item_id, name, stock_quantity, reorder_level')
            .in('item_id', itemIds)
            .returns<{ item_id: string; name: string; stock_quantity: number; reorder_level: number }[]>();

          if (error || !items) {
            console.error('Error fetching inventory for low stock check:', error);
            return;
          }

          // Filter to low stock items only
          const lowStockItems = items.filter(item => item.stock_quantity <= item.reorder_level);

          if (lowStockItems.length === 0) return;

          // Show immediate toast alert
          const itemNames = lowStockItems.map(i => i.name);
          toast({
            title: "⚠️ Low Stock Alert",
            description: itemNames.length === 1
              ? `${itemNames[0]} is running low on stock!`
              : `${itemNames.length} items are running low: ${itemNames.slice(0, 3).join(', ')}${itemNames.length > 3 ? '...' : ''}`,
            variant: "destructive",
            duration: 8000,
          });

          // Create notifications in background (don't await - fire and forget)
          lowStockItems.forEach(item => {
            notifyLowStock(item.item_id).catch(err =>
              console.error('Failed to create notification for:', item.name, err)
            );
          });

        } catch (err) {
          console.error('Error in low stock check:', err);
        }
      };

      // Run low stock check in background after a short delay
      setTimeout(() => checkLowStock(), 1000);

    } catch (err) {
      toast({
        title: "Checkout Failed ❌",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmInstallation = () => {
    if (!installationModal.item) return;

    setCart(prevCart =>
      prevCart.map(cartItem =>
        cartItem.item_id === installationModal.item?.item_id
          ? { ...cartItem, installationFee: installationFee }
          : cartItem
      )
    );

    toast({
      title: 'Success',
      description: `Installation fee of ₱${formatPrice(installationFee)} added.`,
    });

    setInstallationModal({ open: false, item: null });
    setInstallationFee(0);
  };

  // Helper to fetch data and generate HTML string (used by both View and Download)
  const generateReceiptHtmlString = async (saleId: string) => {
    if (!supabase || !authUser) throw new Error('Client not ready');

    const { data: saleData, error: saleError } = await supabase
      .from('sale')
      .select(`
          *,
          customer (*),
          user (*),
          sale_item (
            *,
            inventory_item (name)
          )
        `)
      .eq('sale_id', saleId)
      .single<EnhancedSale>();

    if (saleError) throw new Error(`Sale data fetch error: ${saleError.message}`);
    if (!saleData) throw new Error('Sale not found.');

    const businessInfo: BusinessInfo = {
      storeName: 'Queen.R Tire Supply & Vulcanizing Shop',
      address: '68, Sipocot, Camarines Sur',
      phone: 'To be given',
      taxInfo: 'To be given',
      footerMessage: 'Thank You!',
    };

    const receiptItems: ReceiptItem[] = (saleData.sale_item || []).map((item: SaleItem) => ({
      name: item.inventory_item?.name || 'Unknown Item',
      quantity: item.quantity,
      price: item.price_at_sale,
    }));

    const receiptCustomer: ReceiptCustomer | undefined = saleData.customer
      ? { name: saleData.customer.name, phone: saleData.customer.phone }
      : undefined;

    const receiptData: ReceiptData = {
      sale: saleData as unknown as Sale,
      items: receiptItems,
      cashier: saleData.user as AppUser,
      customer: receiptCustomer,
      businessInfo: businessInfo,
    };

    return generateHtmlReceipt(receiptData);
  };

  // Handler 1: VIEW (Opens Modal)
  const handleViewReceipt = async (saleId: string) => {
    setIsSubmitting(true);
    try {
      const html = await generateReceiptHtmlString(saleId);
      setViewReceiptHtml(html);
      setViewReceiptModalOpen(true);
    } catch (error) {
      toast({
        title: "View Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler 2: DOWNLOAD (Direct Download, No Preview)
  const handleDownloadReceipt = async (saleId: string) => {
    setIsSubmitting(true);
    try {
      const html = await generateReceiptHtmlString(saleId);

      // Create a Blob from the HTML string
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Create temporary link and click it
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${saleId}.html`; // Downloads as .html file
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: "Receipt saved to your device.",
        className: "bg-green-600 text-white border-none"
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidClick = (saleId: string) => {
    setSaleToVoid(saleId);
    setShowVoidConfirm(true);
  };

  const handlePasswordSubmit = async () => {
    // QUICK GUARDS + helpful logs for debugging
    if (!managerPassword || managerPassword.trim() === '') {
      setPasswordError('Please enter the manager password.');
      return;
    }

    if (!supabase) {
      toast({
        title: "Error",
        description: "Database connection not available.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Attempting manager auth'); // debug
      // Query Supabase directly for a user with role 2 (Manager) matching the entered password
      const { data: matchedUser, error } = await supabase
        .from('user')
        .select('user_id, name')
        .eq('role', 2)
        .eq('password', managerPassword)
        .maybeSingle<AppUser>();

      if (error) {
        console.error('Database error verifying credentials:', error);
        setPasswordError('System error verifying credentials.');
        return;
      }

      if (matchedUser) {
        setShowVoidManagement(true);
        setShowPasswordDialog(false);
        setManagerPassword('');
        setPasswordError(null);

        setSuccessAnimation({
          isVisible: true,
          title: "Access Granted!",
          message: `Welcome, ${matchedUser.name}. You can now manage sales transactions.`,
          actionType: 'access'
        });
      } else {
        setPasswordError('Invalid manager password. Access denied.');
        setManagerPassword('');
        toast({
          title: "Access Denied",
          description: "Incorrect password. Only authorized managers can access void management.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Unexpected auth error:', error);
      setPasswordError(`An unexpected error occurred: ${getErrorMessage(error)}`);
    }
  };

  const handleEditSale = async (sale: EnhancedSale) => {
    if (!supabase) return;

    try {
      setIsLoading(true);

      const { data: saleItems, error } = await supabase
        .from('sale_item')
        .select(`
          *,
          inventory_item (*)
        `)
        .eq('sale_id', sale.sale_id)
        .returns<SaleItemWithInventoryRecord[] | null>();

      if (error) throw error;

      const cartItems: CartItem[] = (saleItems || [])
        .filter((item): item is SaleItemWithInventoryRecord => Boolean(item.inventory_item))
        .map(item => ({
          ...item.inventory_item,
          quantity: item.quantity,
          installationFee: 0,
        }));

      setCart(cartItems);
      setSelectedCustomerId(sale.customer_id || ANONYMOUS_CUSTOMER_ID);
      setEditingSale(sale as unknown as Sale);
      setShowVoidManagement(false);
      setShowSalesHistory(false);

      // Show success animation for edit
      setSuccessAnimation({
        isVisible: true,
        title: "Sale Loaded!",
        message: `Sale ${sale.sale_id} has been loaded into the cart. Make your changes and process the sale again.`,
        actionType: 'edit'
      });
    } catch (error) {
      toast({
        title: "Error Loading Sale",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCart = () => {
    // Restore stock for all items in cart
    setInventory(prevInventory =>
      prevInventory.map(invItem => {
        const cartItem = cart.find(c => c.item_id === invItem.item_id);
        if (cartItem) {
          return { ...invItem, stock_quantity: invItem.stock_quantity + cartItem.quantity };
        }
        return invItem;
      })
    );
    setCart([]);
  };

  const handleCancelEditSale = () => {
    // Restore stock for all items in cart when canceling edit
    setInventory(prevInventory =>
      prevInventory.map(invItem => {
        const cartItem = cart.find(c => c.item_id === invItem.item_id);
        if (cartItem) {
          return { ...invItem, stock_quantity: invItem.stock_quantity + cartItem.quantity };
        }
        return invItem;
      })
    );
    setCart([]);
    setEditingSale(null);
    setSelectedCustomerId(ANONYMOUS_CUSTOMER_ID);
    toast({
      title: "Edit Cancelled",
      description: "The sale edit has been cancelled and the cart has been cleared.",
    });
  };

  const executeVoidSale = async () => {
    if (!supabase || !saleToVoid) return;

    // Close dialog immediately to prevent double clicks
    setShowVoidConfirm(false);

    try {
      setIsLoading(true);

      const { data: saleItems, error: fetchError } = await supabase
        .from('sale_item')
        .select('item_id, quantity')
        .eq('sale_id', saleToVoid).returns<{ item_id: string; quantity: number }[]>();

      if (fetchError) throw fetchError;

      for (const item of saleItems) {
        const incrementPayload: IncrementStockParams = {
          item_id_param: item.item_id,
          quantity_param: item.quantity
        };
        const { error: updateError } = await supabase.rpc('increment_stock', incrementPayload);

        if (updateError) {
          // Fallback if RPC fails
          const { data: currentItem } = await supabase
            .from('inventory_item')
            .select('stock_quantity')
            .eq('item_id', item.item_id)
            .single<{ stock_quantity: number }>();

          if (!currentItem) continue;

          await supabase
            .from('inventory_item')
            .update({ stock_quantity: currentItem.stock_quantity + item.quantity })
            .eq('item_id', item.item_id);
        }
      }

      // Soft delete sale items
      const { error: softDeleteItemsError } = await supabase
        .from('sale_item')
        .update({ deleted_at: new Date().toISOString() })
        .eq('sale_id', saleToVoid);

      if (softDeleteItemsError) throw softDeleteItemsError;

      // Soft delete the sale
      const { error: softDeleteSaleError } = await supabase
        .from('sale')
        .update({ deleted_at: new Date().toISOString() })
        .eq('sale_id', saleToVoid);

      if (softDeleteSaleError) throw softDeleteSaleError;

      setSuccessAnimation({
        isVisible: true,
        title: "Sale Voided!",
        message: `Sale ${saleToVoid} has been voided and inventory has been restored.`,
        actionType: 'void'
      });

      fetchInitialData();
    } catch (error) {
      toast({
        title: "Void Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSaleToVoid(null); // Reset state
    }
  };

  const clearFilters = () => {
    setSelectedVehicleType('all');
    setSelectedCategory('all');
    setSearchTerm('');
  };

  // CLEANED SALES TABLE COLUMNS
  const salesColumns: Column<EnhancedSale>[] = [
    {
      key: 'sale_id',
      label: 'Sale ID',
      sortable: true,
      render: (value) => (
        // tightened spacing and smaller text for compact Sale ID display
        <div className="inline-block px-0 py-0">
          <span className="font-mono text-xs font-medium text-indigo-600 tracking-tight">
            {String(value ?? '')}
          </span>
        </div>
      )
    },
    {
      key: 'sale_date',
      label: 'Date & Time',
      sortable: true,
      render: (value) => {
        const date = new Date(value as string | number | Date);
        return (
          <div>
            <div className="font-medium">{date.toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">{date.toLocaleTimeString()}</div>
          </div>
        );
      }
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (_value, row) => (
        <span className={!row.customer ? 'text-slate-500 italic' : 'font-medium'}>
          {row.customer?.name || 'Walk-in Customer'}
        </span>
      )
    },
    // ✅ UPDATED COLUMN: Uses the new ProductsCell component
    {
      key: 'products',
      label: 'Products Sold',
      sortable: false,
      render: (_value, row) => {
        return <ProductsCell items={row.sale_item || []} />;
      }
    },
    {
      key: 'total_items',
      label: 'Total Items',
      sortable: true,
      render: (_value, row) => {
        const totalQuantity = (row.sale_item || []).reduce((sum: number, item: SaleItem) => sum + item.quantity, 0);
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {totalQuantity} items
          </Badge>
        );
      }
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-green-600">
          ₱{formatPrice(Number(value) || 0)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, row) => (
        // reduced gap and compact button padding for tighter actions column
        <div className="flex gap-1 items-center">
          {/* VIEW BUTTON - Opens Modal */}
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1"
            onClick={(e) => {
              e.stopPropagation();
              handleViewReceipt(row.sale_id);
            }}
            disabled={isSubmitting}
          >
            <Eye className="h-4 w-4" />
          </Button>

          {/* DOWNLOAD BUTTON - Direct Download */}
          <Button
            variant="ghost"
            size="sm"
            className="text-green-600 hover:text-green-700 hover:bg-green-50 px-2 py-1"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadReceipt(row.sale_id);
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1"
            onClick={(e) => {
              e.stopPropagation();
              handleEditSale(row);
            }}
            disabled={isSubmitting}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  // CLEANED VOID MANAGEMENT TABLE COLUMNS
  const voidManagementColumns: Column<EnhancedSale>[] = [
    {
      key: 'sale_id',
      label: 'Sale ID',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm font-medium text-indigo-600">{String(value ?? '')}</span>
      )
    },
    {
      key: 'sale_date',
      label: 'Date & Time',
      sortable: true,
      render: (value) => {
        const date = new Date(value as string | number | Date);
        return (
          <div>
            <div className="font-medium">{date.toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">{date.toLocaleTimeString()}</div>
          </div>
        );
      }
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (_value, row) => (
        <span className={!row.customer ? 'text-slate-500 italic' : 'font-medium'}>
          {row.customer?.name || 'Walk-in Customer'}
        </span>
      )
    },
    {
      key: 'products',
      label: 'Products Sold',
      sortable: false,
      render: (_value, row) => {
        const saleItems = row.sale_item || [];
        const productNames = saleItems.map((item: SaleItem) =>
          item.inventory_item?.name || 'Unknown Product'
        );

        if (productNames.length === 0) {
          return <span className="text-slate-500 italic">No products</span>;
        }

        return (
          <div className="max-w-xs">
            <span className="font-medium">{productNames.slice(0, 3).join(', ')}</span>
            {productNames.length > 3 && (
              <span className="text-slate-500 text-xs ml-1">
                +{productNames.length - 3} more
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-green-600">
          ₱{formatPrice(Number(value) || 0)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, row) => (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleVoidClick(row.sale_id);
            }}
          >
            <Ban className="h-4 w-4 mr-1" />
            Void
          </Button>
        </div>
      )
    }
  ];

  // Calculate summary statistics
  const totalSalesAmount = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const todaySales = sales.filter(s => new Date(s.sale_date || 0).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

  if (fetchError) {
    return (
      <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">
        <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
          <PageHeader title="Point of Sale (POS)" description="Create new sales transactions for products." />
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Database Error</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 py-4">

        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              Point of Sale
            </h1>
            {lastUpdated && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editingSale && (
              <Button onClick={handleCancelEditSale} variant="outline" size="sm" className="text-amber-600 border-amber-300">
                <XCircle className="h-4 w-4 mr-1" />
                Cancel Edit
              </Button>
            )}
            <Button onClick={() => setShowSalesHistory(!showSalesHistory)} variant="outline" size="sm">
              <Receipt className="h-4 w-4 mr-1" />
              {showSalesHistory ? 'Show POS' : 'History'}
            </Button>
            <Button onClick={fetchInitialData} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Enhanced Success Animation */}
        <SuccessAnimation
          isVisible={successAnimation.isVisible}
          title={successAnimation.title}
          message={successAnimation.message}
          actionType={successAnimation.actionType}
          onConfirm={() => {
            setSuccessAnimation(prev => ({ ...prev, isVisible: false }));
            // Clear cart only for sale completion
            if (successAnimation.actionType === 'sale') {
              setCart([]);
              setSelectedCustomerId(ANONYMOUS_CUSTOMER_ID);
              setEditingSale(null);
              fetchInitialData();
            }
          }}
        />

        {/* Custom Void Confirmation Dialog */}
        <Dialog open={showVoidConfirm} onOpenChange={setShowVoidConfirm}>
          <DialogContent className="sm:max-w-md bg-white font-poppins border-0 shadow-2xl">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-center text-xl font-bold text-slate-900">
                Confirm Void Transaction
              </DialogTitle>
              <DialogDescription className="text-center text-slate-500 pt-2">
                Are you sure you want to void this sale info?
              </DialogDescription>
            </DialogHeader>

            {saleToVoid && (
              <div className="bg-slate-50 rounded-xl p-4 my-2 border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sale ID</span>
                  <span className="font-mono text-sm font-bold text-indigo-600">{saleToVoid}</span>
                </div>
                <div className="text-xs text-slate-400 text-center mt-2">
                  This action cannot be undone. Inventory will be restored.
                </div>
              </div>
            )}

            <DialogFooter className="grid grid-cols-2 gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowVoidConfirm(false)}
                className="w-full border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={executeVoidSale}
                className="w-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30"
              >
                Confirm Void
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Receipt View Modal */}
        <Dialog open={viewReceiptModalOpen} onOpenChange={setViewReceiptModalOpen}>
          <DialogContent className="max-w-2xl h-[85vh] flex flex-col bg-white p-0 overflow-hidden font-poppins">
            <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-600" />
                Receipt Preview
              </DialogTitle>
              <DialogDescription>
                Viewing receipt content.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 w-full bg-slate-100 p-4 overflow-hidden">
              <div className="w-full h-full bg-white shadow-sm rounded-lg overflow-hidden border border-slate-200">
                {/* iframe allows us to render the full HTML receipt safely */}
                <iframe
                  srcDoc={viewReceiptHtml}
                  className="w-full h-full border-none"
                  title="Receipt Preview"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white">
              <Button variant="outline" onClick={() => setViewReceiptModalOpen(false)}>
                Close
              </Button>
              <Button
                className=""
                onClick={() => {
                  // Allow downloading directly from the view modal if they want
                  const blob = new Blob([viewReceiptHtml], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Receipt-Viewed.html`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Dialog for Void Management */}
        <Dialog open={showPasswordDialog} onOpenChange={(open) => {
          setShowPasswordDialog(open);
          setPasswordError(null); // Clear error when dialog closes
          setManagerPassword(''); // Clear password when dialog closes
        }}>
          <DialogContent className="sm:max-w-md bg-white font-poppins">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800">
                Manager Authentication Required
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Please enter the branch manager password to access void management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Label htmlFor="manager-password" className="font-medium">Manager Password</Label>
              <Input
                id="manager-password"
                type="password"
                value={managerPassword}
                onChange={(e) => {
                  setManagerPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Enter password"
                className={`text-lg ${passwordError ? 'border-red-500 focus:border-red-500' : ''}`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
                  }
                }}
              />
              {passwordError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-md border border-red-200">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{passwordError}</span>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordError(null);
                  setManagerPassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className=""
                onClick={(e) => { e.preventDefault(); handlePasswordSubmit(); }}
              >
                Authenticate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Void Management Modal - Redesigned */}
        {showVoidManagement && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

              {/* 1. Custom Gradient Header */}
              <div className="w-full bg-destructive text-white p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl shadow-inner border border-white/10">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold tracking-tight font-poppins">Void Management</div>
                    <div className="text-sm text-white/90 font-medium font-poppins opacity-90">
                      Authorized Manager Access
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowVoidManagement(false)}
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* 2. Toolbar Section (Search & Sort) */}
              <div className="bg-white border-b border-slate-100 p-4 flex flex-col gap-2 relative overflow-visible min-h-[72px] shrink-0">
                <div className="w-full flex flex-col sm:flex-row gap-4 justify-between items-end">
                  {/* Search */}
                  <div className="relative w-full flex-1">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block font-poppins">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search voidable sales by ID or Customer..."
                        value={voidSearchTerm}
                        onChange={(e) => setVoidSearchTerm(e.target.value)}
                        className="pl-10 h-10 border-slate-200 focus:border-red-500 focus:ring-red-200 bg-slate-50/50 w-full font-poppins transition-all"
                      />
                    </div>
                  </div>

                  {/* Rows Control */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-full sm:w-auto">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block font-poppins">Rows</Label>
                      <Select value={String(rowsPerPageVoid)} onValueChange={(v) => setRowsPerPageVoid(Number(v))}>
                        <SelectTrigger className="h-10 w-[70px] border-slate-200 bg-white font-poppins">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[60] font-poppins">
                          {[5, 10, 20, 50].map(opt => (
                            <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Table Content */}
              <div className="flex-1 overflow-auto bg-slate-50/30 p-0">
                <DataTableWrapper
                  className="border-0 rounded-none shadow-none"
                  data={sales}
                  columns={voidManagementColumns}
                  searchKeys={['sale_id', 'customer.name']}
                  showHeader={false} // We built our own header above
                  rowsPerPage={rowsPerPageVoid}
                  onRowsPerPageChange={setRowsPerPageVoid}
                  searchTerm={voidSearchTerm}
                  onSearchTermChange={setVoidSearchTerm}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-between items-center">
                <p className="text-xs text-slate-500 font-poppins">
                  * Voiding a sale is permanent and will immediately restore inventory stock.
                </p>
                <Button
                  onClick={() => setShowVoidManagement(false)}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-6 font-poppins"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        <Dialog open={installationModal.open} onOpenChange={(isOpen) => setInstallationModal({ open: isOpen, item: null })}>
          <DialogContent className="sm:max-w-md bg-white font-poppins">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800">
                Installation Fee
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Add an installation fee for <span className="font-medium text-indigo-600">{installationModal.item?.name}</span>?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Label htmlFor="installation-fee" className="font-medium">Fee Amount (₱)</Label>
              <Input
                id="installation-fee"
                type="number"
                value={installationFee}
                onChange={(e) => setInstallationFee(Number(e.target.value) || 0)}
                placeholder="0.00"
                className="text-lg"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setInstallationModal({ open: false, item: null })}
              >
                Skip
              </Button>
              <Button
                className=""
                onClick={handleConfirmInstallation}
              >
                Confirm Fee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Main Content */}
        {!showSalesHistory ? (
          // POS Interface
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Product Selection - Left Side */}
            <div className="lg:col-span-2">
              <Card className="bg-white border-slate-200 shadow-xl rounded-[20px] overflow-hidden flex flex-col font-poppins">

                {/* Header & Filters Section */}
                <div className="p-6 pb-0 space-y-6">

                  {/* Title */}
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Available Products
                  </h2>

                  {/* Vehicle Type Filter */}
                  <div className="space-y-3">
                    <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider ml-1">
                      Vehicle Type
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {vehicleTypes.map((vehicle) => {
                        const Icon = vehicle.icon;
                        const isSelected = selectedVehicleType === vehicle.value;
                        const visual = vehicleTypeVisuals[vehicle.value as keyof typeof vehicleTypeVisuals];

                        return (
                          <button
                            key={vehicle.value}
                            onClick={() => setSelectedVehicleType(selectedVehicleType === vehicle.value ? 'all' : vehicle.value)}
                            className={`
                              relative group flex items-center justify-center gap-3 py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-300
                              ${isSelected
                                ? `${visual.buttonActive} ring-2 ring-offset-2 ring-indigo-100 border-transparent`
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                              }
                            `}
                          >
                            <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                            <span>{vehicle.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-3">
                    <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider ml-1">
                      Category
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {categories.map((category) => {
                        const isSelected = selectedCategory === category.value;
                        const visual = categoryVisuals[category.value as keyof typeof categoryVisuals];

                        return (
                          <button
                            key={category.value}
                            onClick={() => setSelectedCategory(selectedCategory === category.value ? 'all' : category.value)}
                            className={`
                              relative group flex items-center justify-center gap-3 py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-300
                              ${isSelected
                                ? `${visual.buttonActive} ring-2 ring-offset-2 ring-pink-100 border-transparent`
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                              }
                            `}
                          >
                            <CategoryIcon category={category.value} className="h-5 w-5" />
                            <span>{category.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <Input
                      placeholder="Search products by name or category..."
                      className="pl-10 pr-10 py-6 text-base bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl transition-all shadow-sm placeholder:text-slate-400"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Active Filter Badges */}
                  {(selectedVehicleType !== 'all' || selectedCategory !== 'all') && (
                    <div className="flex items-center gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filters:</span>

                      {selectedVehicleType !== 'all' && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 px-3 py-1 text-xs gap-1">
                          Vehicle: <span className="font-bold">{vehicleTypes.find(v => v.value === selectedVehicleType)?.label}</span>
                        </Badge>
                      )}

                      {selectedCategory !== 'all' && (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100 border-green-100 px-3 py-1 text-xs gap-1">
                          Category: <span className="font-bold">{categories.find(c => c.value === selectedCategory)?.label}</span>
                        </Badge>
                      )}

                      <button
                        onClick={clearFilters}
                        className="text-xs text-slate-400 hover:text-red-500 ml-auto flex items-center gap-1 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-slate-200 w-full my-4"></div>
                </div>

                {/* Scrollable Product Grid */}
                <div className="flex-1 overflow-y-auto p-6 pt-6">
                  {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-64 text-slate-400 gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                      <p>Loading inventory...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-6">
                      {filteredInventory.map(item => {
                        const currentInventoryItem = inventory.find(inv => inv.item_id === item.item_id);
                        const currentStock = currentInventoryItem?.stock_quantity ?? item.stock_quantity;
                        const vehicleVisual = vehicleTypeVisuals[item.vehicle_type as keyof typeof vehicleTypeVisuals] || vehicleTypeVisuals.all;
                        const categoryVisual = categoryVisuals[item.category as keyof typeof categoryVisuals] || categoryVisuals.all;
                        const VehicleIcon = vehicleVisual.icon;

                        return (
                          <div
                            key={item.item_id}
                            className="group relative bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm hover:border-indigo-100 transition-all duration-300 flex flex-col justify-between h-full"
                          >
                            {/* Hover Glow Effect */}
                            <div className="absolute inset-0 bg-primary/5 blur-2xl"></div>

                            <div className="relative z-10">
                              {/* Header: Icon + Title (same row/column, smaller sizes) */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${categoryVisual.buttonActive} bg-opacity-12 text-white shadow-sm flex items-center justify-center`}>
                                  <CategoryIcon category={item.category} className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-slate-800 text-m line-clamp-3 leading-tight group-hover:text-indigo-600 transition-colors">
                                  {item.name}
                                </h3>
                              </div>

                              {/* Tags */}
                              <div className="flex flex-wrap gap-2 mb-6">
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold capitalize flex items-center gap-1 ${categoryVisual.badge}`}>
                                  <span className={`h-2 w-2 rounded-full ${categoryVisual.dot}`} />
                                  {item.category}
                                </span>
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold capitalize flex items-center gap-1 ${vehicleVisual.badge}`}>
                                  <VehicleIcon className="w-3 h-3 mr-1" />
                                  {item.vehicle_type}
                                </span>
                              </div>
                            </div>

                            {/* Footer: Price & Add Button */}
                            <div className="relative z-10 flex items-end justify-between mt-auto pt-2">
                              <div>
                                <div className="text-xl font-bold text-green-600 tracking-tight">
                                  ₱{formatPrice(item.sale_price)}
                                </div>
                                <div className={`text-xs font-semibold mt-1 flex items-center gap-1.5 ${currentStock === 0 ? 'text-red-500' :
                                  currentStock <= 5 ? 'text-amber-500' : 'text-green-600'
                                  }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${currentStock === 0 ? 'bg-red-500' : currentStock <= 5 ? 'bg-amber-500' : 'bg-green-500'}`} />
                                  {currentStock === 0 ? 'Out of Stock' : `${currentStock} in stock`}
                                </div>
                              </div>

                              <Button
                                size="sm"
                                disabled={currentStock <= 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(item);
                                }}
                                className={`
                                  h-10 px-5 font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-300
                                  ${currentStock > 0
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  }
                                `}
                              >
                                <Plus className="h-4 w-4 mr-1.5" />
                                Add
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Empty State */}
                      {filteredInventory.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Package className="h-10 w-10 text-slate-300" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
                          <p className="text-slate-500 max-w-xs mx-auto mt-2">
                            We could not find anything matching your filters. Try adjusting your search.
                          </p>
                          <Button variant="outline" onClick={clearFilters} className="mt-6 border-dashed border-slate-300 text-slate-600">
                            Clear Filters
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Cart & Checkout - Right Side */}
            <div className="lg:col-span-1">
              <Card className="bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-[0_30px_50px_-28px_rgba(79,70,229,0.7)] rounded-3xl overflow-hidden border-0 sticky top-8 min-h-[720px] flex flex-col">
                <CardHeader className="pb-4 bg-primary text-primary-foreground border-b relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]"></div>
                  <div className="relative z-10 flex-1">
                    <CardTitle className="flex items-center text-2xl font-bold text-white font-poppins">
                      <ShoppingCart className="mr-3 h-6 w-6" />
                      Shopping Cart
                      {cart.length > 0 && (
                        <Badge variant="outline" className="ml-3 bg-white/15 text-white border-white/30 font-poppins">
                          {cart.length} item{cart.length === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-white/70 mt-2">
                      Manage quantities, add services, and finalize totals in one glance.
                    </p>
                    {editingSale && (
                      <div className="mt-2">
                        <Badge variant="outline" className="bg-amber-500/20 text-amber-100 border-amber-200/40 font-poppins">
                          Editing Sale: {editingSale.sale_id}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6 flex-1 flex flex-col">
                  {/* Customer Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="customer-select" className="text-slate-600 text-sm font-semibold uppercase tracking-[0.2em] font-poppins">
                      Customer
                    </Label>
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
                      <CustomerSearch
                        customers={customers}
                        selectedCustomerId={selectedCustomerId}
                        onCustomerSelect={setSelectedCustomerId}
                      />
                    </div>
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-700 font-semibold font-poppins text-base">Order Items</Label>
                      {cart.length > 0 && (
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          {cart.length} line{cart.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-3 pr-1 flex-1">
                      {cart.length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-poppins font-medium">Your cart is empty</p>
                          <p className="text-slate-400 text-sm font-poppins">Add products to see them glow here</p>
                        </div>
                      ) : (
                        cart.map(item => {
                          const visual = vehicleTypeVisuals[item.vehicle_type as keyof typeof vehicleTypeVisuals] || vehicleTypeVisuals.all;
                          const VehicleIcon = visual.icon;
                          const categoryVisual = categoryVisuals[item.category as keyof typeof categoryVisuals] || categoryVisuals.all;
                          const currentInventoryItem = inventory.find(inv => inv.item_id === item.item_id);
                          const liveStock = currentInventoryItem?.stock_quantity ?? 0;
                          const lineTotal = (item.sale_price * item.quantity) + (item.installationFee || 0);
                          return (
                            <div key={item.item_id} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm hover:border-indigo-200 hover:shadow-lg transition-all duration-300">
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                                <div className="absolute -inset-8 bg-primary/5 blur-2xl"></div>
                              </div>
                              <div className="relative z-10 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0 flex-1 space-y-1">
                                    {/* FIXED: Changed badges to use capitalize and flex-wrap for long text */}
                                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                      <Badge variant="outline" className={`capitalize tracking-wide flex items-center gap-1 ${categoryVisual.badge}`}>
                                        <span className={`h-2 w-2 rounded-full ${categoryVisual.dot}`} />
                                        {categoryVisual.label}
                                      </Badge>
                                      <Badge variant="outline" className={`flex items-center gap-1 font-medium capitalize ${visual.badge}`}>
                                        <VehicleIcon className="h-3 w-3 mr-1" />
                                        {visual.label}
                                      </Badge>
                                    </div>
                                    <p className="text-base font-semibold text-slate-900 truncate font-poppins">
                                      {item.name}
                                    </p>
                                    <p className="text-xs text-slate-500 font-poppins">
                                      ₱{formatPrice(item.sale_price)} each{item.installationFee ? ` · ₱${formatPrice(item.installationFee)} install` : ''}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400 block">Line total</span>
                                    <p className="text-lg font-bold text-slate-900">₱{formatPrice(lineTotal)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs text-slate-500 font-medium">
                                    {liveStock > 0 ? `${liveStock} in stock` : 'Out of stock soon'}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 rounded-xl border-slate-200 bg-white/80 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all duration-200"
                                      onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                                    >
                                      -
                                    </Button>
                                    <span className="text-sm font-semibold w-8 text-center font-poppins">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 rounded-xl border-slate-200 bg-white/80 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all duration-200 disabled:opacity-40"
                                      onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                                      disabled={item.quantity >= item.stock_quantity}
                                    >
                                      +
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => removeFromCart(item.item_id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Order Summary */}
                  {cart.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 space-y-4">
                      <div className="flex justify-between text-sm font-poppins">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-medium text-slate-800">₱{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total</p>
                          <p className="text-2xl font-bold text-slate-900 font-poppins">₱{formatPrice(total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Taxes handled at receipt</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 p-6 bg-slate-50/80 border-t border-slate-200/60">
                  <Button
                    className="w-full"
                    onClick={handleProcessSale}
                    disabled={cart.length === 0 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="mr-2 h-4 w-4" />
                    )}
                    {editingSale ? 'Update Sale' : 'Process Sale'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 font-poppins rounded-2xl"
                    onClick={handleClearCart}
                    disabled={cart.length === 0}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Clear Cart
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        ) : (
          // Sales History View
          <div className="space-y-6">

            {/* Summary Cards - Redesigned to match Service Management Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-poppins">

              {/* Card 1: Today's Sales (Purple/Pink Gradient) */}
              <div className="relative overflow-hidden rounded-xl bg-primary p-5 shadow-lg transition-all duration-200 hover:shadow-xl">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-20 w-20 rounded-full bg-black/10 blur-2xl"></div>

                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-white/80 tracking-wide">Today&apos;s Sales</p>
                    <h3 className="text-3xl font-bold text-white mt-1">₱{formatPrice(todayRevenue)}</h3>
                  </div>
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="relative z-10 mt-6 flex items-center gap-2 text-white/80 text-sm">
                  <span className="flex items-center justify-center bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold text-white backdrop-blur-sm border border-white/10">
                    {todaySales.length}
                  </span>
                  <span className="text-xs font-medium opacity-80">Transactions today</span>
                </div>
              </div>

              {/* Card 2: Total Sales (Blue/Cyan Gradient) */}
              <div className="relative overflow-hidden rounded-xl bg-blue-600 p-5 shadow-lg transition-all duration-200 hover:shadow-xl">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-20 w-20 rounded-full bg-black/10 blur-2xl"></div>

                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-white/80 tracking-wide">Total Sales</p>
                    <h3 className="text-3xl font-bold text-white mt-1">₱{formatPrice(totalSalesAmount)}</h3>
                  </div>
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="relative z-10 mt-6 flex items-center gap-2 text-white/80 text-sm">
                  <div className="flex items-center text-xs font-medium opacity-80">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    All time revenue
                  </div>
                </div>
              </div>

              {/* Card 3: Average Order (Teal/Emerald Gradient) */}
              <div className="relative overflow-hidden rounded-xl bg-teal-600 p-5 shadow-lg transition-all duration-200 hover:shadow-xl">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-20 w-20 rounded-full bg-black/10 blur-2xl"></div>

                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-white/80 tracking-wide">Average Order</p>
                    <h3 className="text-3xl font-bold text-white mt-1">
                      ₱{sales.length > 0 ? formatPrice(totalSalesAmount / sales.length) : '0.00'}
                    </h3>
                  </div>
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="relative z-10 mt-6 flex items-center gap-2 text-white/80 text-sm">
                  <span className="flex items-center justify-center bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold text-white backdrop-blur-sm border border-white/10">
                    {sales.length}
                  </span>
                  <span className="text-xs font-medium opacity-80">Total orders processed</span>
                </div>
              </div>

            </div>

            {/* Sales Table - Inventory Style Design */}
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xl font-poppins">

              {/* 1. Gradient Header (Title + Total like Inventory page) */}
              <div className="w-full bg-primary text-primary-foreground p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl shadow-inner">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold tracking-tight">Sales History</div>
                    <div className="text-sm text-white/80 font-medium font-poppins">
                      View and manage past transactions
                    </div>

                    {/* TOTAL moved here — same visual placement as Inventory header */}
                    <div className="text-sm text-white/90 mt-1">
                      Total: <strong className="font-semibold">{sales.length}</strong> sales
                    </div>
                  </div>
                </div>

                {/* Right side: Void Management button (placed in header) */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowPasswordDialog(true)} // open auth dialog — don't pass event into handleVoidClick
                    className="bg-white text-slate-800 hover:bg-slate-100 px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-slate-200"
                    title="Void Management"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Void Management
                  </Button>
                </div>
              </div>

              {/* 2. New Toolbar Section (Search, Sort & Rows) */}
              <div className="bg-white border-b border-slate-100 p-4 flex flex-col gap-2 relative overflow-visible min-h-[72px]">
                {/* Top row: Search + Controls */}
                <div className="w-full flex flex-col sm:flex-row gap-4 justify-between items-end">
                  {/* Left: Search */}
                  <div className="relative w-full flex-1">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block font-poppins">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search by ID or Customer Name..."
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        className="pl-10 h-10 border-slate-200 focus:border-indigo-500 bg-slate-50/50 w-full"
                      />
                    </div>
                  </div>
                  {/* Right: Sort & Rows Controls */}
                  <div className="flex items-end gap-3 w-full sm:w-auto">
                    {/* Sort By Dropdown */}
                    <div className="w-full sm:w-auto">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block font-poppins">Sort By</Label>
                      <Select value={sortOption} onValueChange={setSortOption}>
                        <SelectTrigger className="h-10 w-full sm:w-[220px] border-slate-200 bg-white">
                          <ListFilter className="w-4 h-4 mr-2 text-slate-500" />
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>

                        {/* Single SelectContent with z-index so dropdown doesn't push layout */}
                        <SelectContent className="z-50">
                          <SelectItem value="date-desc">Date: Newest First</SelectItem>
                          <SelectItem value="date-asc">Date: Oldest First</SelectItem>
                          <SelectItem value="amount-desc">Amount: High to Low</SelectItem>
                          <SelectItem value="amount-asc">Amount: Low to High</SelectItem>
                          <SelectItem value="items-desc">Items: Most First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rows Per Page */}
                    <div className="w-full sm:w-auto">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block font-poppins">Rows</Label>
                      <Select value={String(rowsPerPageSales)} onValueChange={(v) => setRowsPerPageSales(Number(v))}>
                        <SelectTrigger className="h-10 w-[70px] border-slate-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          {[5, 10, 20, 50].map(opt => (
                            <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Table Wrapper */}
              <div className="p-0">
                <DataTableWrapper
                  className="border-0 rounded-none"
                  data={sortedSales}
                  columns={salesColumns}
                  searchKeys={['sale_id', 'customer.name']}
                  rowsPerPageOptions={[5, 10, 20, 50]}
                  // Hide default header since we built a custom one above
                  showHeader={false}
                  rowsPerPage={rowsPerPageSales}
                  onRowsPerPageChange={setRowsPerPageSales}
                  searchTerm={historySearchTerm}
                  onSearchTermChange={setHistorySearchTerm}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Secure Void Modal for POS */}
      <SecureVoidModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onAuthorized={handleVoidAuthorized}
        actionDescription="Manager authorization required to void item from cart."
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }

        .ease-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% {
            opacity: 0.8;
            transform: scale(0.95);
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite ease-in-out;
        }

        @keyframes card-glow {
          0% {
            opacity: 0.3;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
          100% {
            opacity: 0.3;
            transform: scale(0.95);
          }
        }

        .animate-card-glow {
          animation: card-glow 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}