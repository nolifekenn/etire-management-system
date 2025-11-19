"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  Filter,
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
  X
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
import type { Sale, User } from '@/lib/types';

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

interface EnhancedSale extends Sale {
  customer?: { name: string };
  sale_items?: SaleItem[];
  total_amount?: number;
}

const ANONYMOUS_CUSTOMER_ID = "anonymous_customer";

// Design system from dashboard
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 font-poppins",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg font-poppins",
  back: "flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-slate-300 hover:border-slate-400 font-poppins"
};

const microAnimations = {
  cardHover: "transition-all duration-350 ease-spring hover:translate-y-[-6px] hover:shadow-2xl",
  buttonHover: "transition-all duration-200 hover:scale-105 active:scale-95",
  fadeIn: "animate-in fade-in duration-500",
  iconHover: "transition-all duration-350 ease-spring group-hover:scale-105 group-hover:translate-y-[-2px]",
};

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
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
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
interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  searchKeys?: string[];
  rowsPerPageOptions?: number[];
  onRowClick?: (row: any) => void;
}

function DataTableWrapper({
  data,
  columns,
  searchKeys = [],
  rowsPerPageOptions = [5, 10, 25, 50],
  onRowClick
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(row => {
      return searchKeys.some(key => {
        const value = row[key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [data, searchTerm, searchKeys]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search sales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Rows per page:</span>
          <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
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

      <div className="border rounded-lg overflow-hidden bg-white">
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
                    No sales found
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

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} entries
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-600 px-4">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}>
            <ChevronsRight className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
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
                  No customers found matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsOpen(false)}
              className={buttonStyles.back}
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
// SUCCESS ANIMATION COMPONENT
// ============================================
const SuccessAnimation = ({
  isVisible,
  saleId,
  onConfirm
}: {
  isVisible: boolean;
  saleId: string | null;
  onConfirm: () => void;
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
          <CheckCircle className="h-12 w-12 text-white animate-in scale-in duration-700 delay-300" />
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-2 font-poppins">
          Sale Completed!
        </h3>

        <p className="text-slate-600 mb-6 font-poppins">
          The transaction has been processed successfully.
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            className={buttonStyles.primary}
            onClick={onConfirm}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
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

// ============================================
// MAIN POS PAGE COMPONENT
// ============================================
export default function POSPage() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  // State for POS
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(ANONYMOUS_CUSTOMER_ID);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // State for Sales History
  const [sales, setSales] = useState<EnhancedSale[]>([]);
  const [showSalesHistory, setShowSalesHistory] = useState(false);

  // State for Success Animation
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  // State for Void Management
  const [showVoidManagement, setShowVoidManagement] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [managerPassword, setManagerPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [installationModal, setInstallationModal] = useState<{ open: boolean, item: CartItem | null }>({ open: false, item: null });
  const [installationFee, setInstallationFee] = useState<number>(0);

  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Vehicle type configuration
  const vehicleTypes = [
    { value: 'all', label: 'All Vehicles', icon: Package, color: 'bg-slate-500' },
    { value: 'car', label: 'Car', icon: Car, color: 'bg-blue-500' },
    { value: 'motor', label: 'Motorcycle', icon: Bike, color: 'bg-green-500' },
    { value: 'truck', label: 'Truck', icon: Truck, color: 'bg-orange-500' }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'tire', label: 'Tires' },
    { value: 'tool', label: 'Tools' },
    { value: 'accessory', label: 'Accessories' }
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (!supabase) {
      setFetchError("Supabase client not available. Please check your .env.local file.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const [inventoryRes, customersRes, salesRes] = await Promise.all([
        supabase.from('inventory_item').select('*').gt('stock_quantity', 0),
        supabase.from('customer').select('customer_id, name, phone, email'),
        supabase
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
          .order('sale_date', { ascending: false })
          .limit(50)
      ]);

      if (inventoryRes.error) throw inventoryRes.error;
      if (customersRes.error) throw customersRes.error;
      if (salesRes.error) throw salesRes.error;

      setInventory(inventoryRes.data);
      setCustomers(customersRes.data);
      setSales(salesRes.data);
      setLastUpdated(new Date());
    } catch (error: any) {
      let errorMessage = `Failed to load data: ${error.message}.`;
      setFetchError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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

  // Replace the addToCart function (around line 608)
  const addToCart = (item: InventoryItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.item_id === item.item_id);
      if (existingItem) {
        if (existingItem.quantity < item.stock_quantity) {
          // Update inventory in real-time
          setInventory(prevInventory => 
            prevInventory.map(invItem => 
              invItem.item_id === item.item_id 
                ? { ...invItem, stock_quantity: invItem.stock_quantity - 1 }
                : invItem
            )
          );
          return prevCart.map(cartItem =>
            cartItem.item_id === item.item_id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
          );
        } else {
          toast({ title: 'Stock Limit', description: `Cannot add more of ${item.name}. Stock limit reached.`, variant: 'destructive' });
          return prevCart;
        }
      }
      
      // ✅ FIX: Check stock before adding
      if (item.stock_quantity <= 0) {
        toast({ title: 'Out of stock', description: `${item.name} is out of stock.`, variant: 'destructive' });
        return prevCart;
      }
      
      // ✅ FIX: Create new cart item first (before updating inventory)
      const newCartItem = { ...item, quantity: 1, installationFee: 0 };
      
      // ✅ FIX: Now update inventory ONCE
      setInventory(prevInventory => 
        prevInventory.map(invItem => 
          invItem.item_id === item.item_id 
            ? { ...invItem, stock_quantity: invItem.stock_quantity - 1 }
            : invItem
        )
      );
      
      // If item is accessory, show installation modal
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
      
      return [...prevCart, newCartItem];
    });
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

  const removeFromCart = (itemId: string) => {
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

    if (!authUser) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in to process a sale.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // If editing a sale, void the original first
      if (editingSale) {
        const { error: deleteItemsError } = await supabase
          .from('sale_item')
          .delete()
          .eq('sale_id', editingSale.sale_id);

        if (deleteItemsError) throw deleteItemsError;

        const { error: deleteSaleError } = await supabase
          .from('sale')
          .delete()
          .eq('sale_id', editingSale.sale_id);

        if (deleteSaleError) throw deleteSaleError;
      }

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId === ANONYMOUS_CUSTOMER_ID ? null : selectedCustomerId,
          cartItems: cart,
          paymentMethod: "cash",
          userId: authUser.user_id,
          branchId: null,
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
          cashier: authUser as User,
          customer: receiptCustomer,
          businessInfo: businessInfo,
        };

        const html = generateHtmlReceipt(receiptData);
        printReceipt(html);

      } catch (receiptError: any) {
        console.error('Receipt generation failed:', receiptError);
        toast({ title: 'Receipt Error', description: `Sale was saved (ID: ${data.sale_id}), but receipt failed to print: ${receiptError.message}`, variant: 'destructive' });
      }

      setLastSaleId(data.sale_id);
      setShowSuccess(true);

      setTimeout(() => {
        setCart([]);
        setSelectedCustomerId(ANONYMOUS_CUSTOMER_ID);
        setEditingSale(null);
        fetchInitialData();
      }, 3000);

    } catch (err: any) {
      toast({
        title: "Checkout Failed ❌",
        description: err.message,
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

  const handleDownloadReceipt = async (saleId: string) => {
    if (!supabase || !authUser) {
      toast({ title: 'Error', description: 'Client not ready or user not logged in.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
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
        .single();

      if (saleError) throw new Error(`Sale data fetch error: ${saleError.message}`);
      if (!saleData) throw new Error('Sale not found.');

      const businessInfo: BusinessInfo = {
        storeName: 'Queen.R Tire Supply & Vulcanizing Shop',
        address: '68, Sipocot, Camarines Sur',
        phone: 'To be given',
        taxInfo: 'To be given',
        footerMessage: 'Thank You!',
      };

      const receiptItems: ReceiptItem[] = saleData.sale_item.map((item: any) => ({
        name: item.inventory_item?.name || 'Unknown Item',
        quantity: item.quantity,
        price: item.price_at_sale,
      }));

      const receiptCustomer: ReceiptCustomer | undefined = saleData.customer
        ? { name: saleData.customer.name, phone: saleData.customer.phone }
        : undefined;

      const receiptData: ReceiptData = {
        sale: saleData,
        items: receiptItems,
        cashier: saleData.user as User,
        customer: receiptCustomer,
        businessInfo: businessInfo,
      };

      const html = generateHtmlReceipt(receiptData);
      printReceipt(html);

      toast({
        title: "Receipt Ready",
        description: "Opening print dialog for receipt.",
      });

    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSuccess = () => {
    setShowSuccess(false);
    setLastSaleId(null);
  };

  const handleVoidClick = () => {
    setShowPasswordDialog(true);
  };

  // Replace the handlePasswordSubmit function (around line 954)
  // Replace the handlePasswordSubmit function (around line 958)
  const handlePasswordSubmit = async () => {
    if (!supabase) {
      toast({
        title: "Error",
        description: "Database connection not available.",
        variant: "destructive",
      });
      return;
    }
  
    try {
      // Check if it's the default admin password first
      const BRANCH_MANAGER_PASSWORD = 'admin123';
      
      if (managerPassword === BRANCH_MANAGER_PASSWORD) {
        setIsAuthenticated(true);
        setShowVoidManagement(true);
        setShowPasswordDialog(false);
        setManagerPassword('');
        setPasswordError(null);
        toast({
          title: "Access Granted",
          description: "Admin access: You can now manage sales transactions.",
        });
        return;
      }
  
      // ✅ NEW: Fetch all users with role_id = 2 (exclude role 0 - Guest)
      const { data: roleUsers, error } = await supabase
        .from('user')
        .select('user_id, name, password, role')
        .eq('role', 2); // Only role 2 users
  
      if (error) {
        console.error('Error fetching role 2 users:', error);
        setPasswordError('Failed to verify credentials. Please try again.');
        toast({
          title: "Error",
          description: "Could not verify user credentials.",
          variant: "destructive",
        });
        return;
      }
  
      // Check if no role 2 users exist
      if (!roleUsers || roleUsers.length === 0) {
        setPasswordError('No authorized managers found in the system.');
        setManagerPassword('');
        toast({
          title: "Access Denied",
          description: "No authorized managers found.",
          variant: "destructive",
        });
        return;
      }
  
      // ✅ Check if entered password matches any role 2 user's password
      const matchedUser = roleUsers.find(user => user.password === managerPassword);
  
      if (matchedUser) {
        // ✅ SUCCESS: User with role 2 authenticated
        setIsAuthenticated(true);
        setShowVoidManagement(true);
        setShowPasswordDialog(false);
        setManagerPassword('');
        setPasswordError(null);
        toast({
          title: "Access Granted ✓",
          description: `Welcome, ${matchedUser.name}. You can now manage sales transactions.`,
        });
      } else {
        // ❌ FAILED: Password doesn't match any role 2 user
        setPasswordError('Invalid manager password. Access denied.');
        setManagerPassword('');
        toast({
          title: "Access Denied",
          description: "Incorrect password. Only authorized managers can access void management.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Password verification error:', error);
      setPasswordError('An unexpected error occurred. Please try again.');
      toast({
        title: "Error",
        description: "Failed to verify credentials.",
        variant: "destructive",
      });
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
        .eq('sale_id', sale.sale_id);

      if (error) throw error;

      const cartItems: CartItem[] = saleItems.map((item: any) => ({
        ...item.inventory_item,
        quantity: item.quantity,
        installationFee: 0,
      }));

      setCart(cartItems);
      setSelectedCustomerId(sale.customer_id || ANONYMOUS_CUSTOMER_ID);
      setEditingSale(sale);
      setShowVoidManagement(false);
      setShowSalesHistory(false);
      
      toast({
        title: "Sale Loaded for Editing",
        description: `Sale ${sale.sale_id} has been loaded into the cart. Make your changes and process the sale again.`,
      });
    } catch (error: any) {
      toast({
        title: "Error Loading Sale",
        description: error.message,
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

  const handleVoidSale = async (saleId: string) => {
    if (!supabase) return;

    if (!confirm(`Are you sure you want to void sale ${saleId}? This will restore inventory and remove the sale record.`)) {
      return;
    }

    try {
      setIsLoading(true);

      const { data: saleItems, error: fetchError } = await supabase
        .from('sale_item')
        .select('item_id, quantity')
        .eq('sale_id', saleId);

      if (fetchError) throw fetchError;

      for (const item of saleItems) {
        const { error: updateError } = await supabase.rpc('increment_stock', {
          item_id_param: item.item_id,
          quantity_param: item.quantity
        });

        if (updateError) {
          const { data: currentItem } = await supabase
            .from('inventory_item')
            .select('stock_quantity')
            .eq('item_id', item.item_id)
            .single();

          await supabase
            .from('inventory_item')
            .update({ stock_quantity: currentItem.stock_quantity + item.quantity })
            .eq('item_id', item.item_id);
        }
      }

      const { error: deleteItemsError } = await supabase
        .from('sale_item')
        .delete()
        .eq('sale_id', saleId);

      if (deleteItemsError) throw deleteItemsError;

      const { error: deleteSaleError } = await supabase
        .from('sale')
        .delete()
        .eq('sale_id', saleId);

      if (deleteSaleError) throw deleteSaleError;

      toast({
        title: "Sale Voided",
        description: `Sale ${saleId} has been voided and inventory has been restored.`,
      });

      fetchInitialData();
    } catch (error: any) {
      toast({
        title: "Void Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedVehicleType('all');
    setSelectedCategory('all');
    setSearchTerm('');
  };

  // ============================================
  // CLEANED SALES TABLE COLUMNS
  // ============================================
  const salesColumns: Column[] = [
    {
      key: 'sale_id',
      label: 'Sale ID',
      sortable: true,
      render: (value: any) => (
        <span className="font-mono text-sm font-medium text-indigo-600">{value}</span>
      )
    },
    {
      key: 'sale_date',
      label: 'Date & Time',
      sortable: true,
      render: (value: any) => {
        const date = new Date(value);
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
      render: (value: any, row: any) => (
        <span className={!row.customer ? 'text-slate-500 italic' : 'font-medium'}>
          {row.customer?.name || 'Walk-in Customer'}
        </span>
      )
    },
    {
      key: 'products',
      label: 'Products Sold',
      sortable: false,
      render: (_: any, row: any) => {
        const saleItems = row.sale_item || [];
        const productNames = saleItems.map((item: SaleItem) => 
          item.inventory_item?.name || 'Unknown Product'
        );
        
        if (productNames.length === 0) {
          return <span className="text-slate-500 italic">No products</span>;
        }

        const displayText = productNames.slice(0, 2).join(', ');
        const remainingCount = productNames.length - 2;
        
        return (
          <div className="max-w-xs">
            <span className="font-medium">{displayText}</span>
            {remainingCount > 0 && (
              <span className="text-slate-500 text-xs ml-1">
                +{remainingCount} more
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'total_items',
      label: 'Total Items',
      sortable: true,
      render: (_: any, row: any) => {
        const totalQuantity = (row.sale_item || []).reduce((sum: number, item: SaleItem) => sum + item.quantity, 0);
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {totalQuantity} items
          </Badge>
        );
      }
    },
    {
      key: 'payment_method',
      label: 'Payment',
      sortable: true,
      render: (value: any) => (
        <Badge
          variant="outline"
          className={
            value === 'cash' ? 'bg-green-50 text-green-700 border-green-200' :
            value === 'card' ? 'bg-purple-50 text-purple-700 border-purple-200' :
            'bg-blue-50 text-blue-700 border-blue-200'
          }
        >
          {String(value).toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      sortable: true,
      render: (value: any) => (
        <span className="font-semibold text-green-600">
          ₱{formatPrice(Number(value) || 0)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={(e) => {
            e.stopPropagation();
            alert(`View details for ${row.sale_id}`);
          }}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button variant="ghost" size="sm" onClick={ async (e) => {
            e.stopPropagation();
            handleDownloadReceipt(row.sale_id);
          }} 
          disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4 mr-1"/>}
            Receipt
          </Button>
        </div>
      )
    }
  ];

  // ============================================
  // CLEANED VOID MANAGEMENT TABLE COLUMNS
  // ============================================
  const voidManagementColumns: Column[] = [
    {
      key: 'sale_id',
      label: 'Sale ID',
      sortable: true,
      render: (value: any) => (
        <span className="font-mono text-sm font-medium text-indigo-600">{value}</span>
      )
    },
    {
      key: 'sale_date',
      label: 'Date & Time',
      sortable: true,
      render: (value: any) => {
        const date = new Date(value);
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
      render: (value: any, row: any) => (
        <span className={!row.customer ? 'text-slate-500 italic' : 'font-medium'}>
          {row.customer?.name || 'Walk-in Customer'}
        </span>
      )
    },
    {
      key: 'products',
      label: 'Products Sold',
      sortable: false,
      render: (_: any, row: any) => {
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
      render: (value: any) => (
        <span className="font-semibold text-green-600">
          ₱{formatPrice(Number(value) || 0)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              handleEditSale(row);
            }}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              handleVoidSale(row.sale_id);
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
  const todaySales = sales.filter(s => new Date(s.sale_date).toDateString() === new Date().toDateString());
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
    <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">
      {/* Background Sections */}
      <div className="absolute top-0 left-0 w-full h-64 rounded-b-[40px] overflow-hidden">
        <div
          className="absolute inset-0 rounded-b-[40px] bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/image2.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 30%"
          }}
        ></div>
      </div>

      <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">

        {/* Header Section */}
        <div className={`mb-12 pt-7 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>

            <div className="relative z-10 flex-1">
              <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl font-poppins tracking-tight">
                Point of Sale (POS)
              </h1>
              <div className="flex items-center gap-6 text-white/90">
                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium font-poppins">
                  <ShoppingCart className="h-6 w-6 opacity-90" />
                  Quick and easy sales transactions
                </p>
                <div className="flex items-center gap-4 text-lg">
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm font-poppins">
                      <Clock className="w-5 h-5" />
                      Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm font-poppins">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-glow"></div>
                    Live data
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {editingSale && (
                <Button
                  onClick={handleCancelEditSale}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Cancel Edit
                </Button>
              )}
              <Button
                onClick={() => setShowSalesHistory(!showSalesHistory)}
                className={buttonStyles.glass + " active:scale-95 font-poppins"}
              >
                <Receipt className="h-5 w-5 mr-2" />
                {showSalesHistory ? 'Show POS' : 'Sales History'}
              </Button>
              <Button
                onClick={handleVoidClick}
                className={buttonStyles.glass + " active:scale-95 font-poppins"}
              >
                <Lock className="h-5 w-5 mr-2" />
                Void Management
              </Button>
              <Button
                onClick={fetchInitialData}
                disabled={isLoading}
                className={buttonStyles.glass + " active:scale-95 font-poppins"}
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Success Animation */}
        <SuccessAnimation
          isVisible={showSuccess}
          saleId={lastSaleId}
          onConfirm={handleConfirmSuccess}
        />

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
                  setPasswordError(null); // Clear error when user starts typing
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
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordError(null);
                  setManagerPassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                className={buttonStyles.primary}
                onClick={handlePasswordSubmit}
              >
                Authenticate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Void Management Modal */}
        {showVoidManagement && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-red-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 font-poppins">Void Management</h2>
                  <p className="text-slate-600 mt-1 font-poppins">
                    Edit or void sales transactions. Voiding will restore inventory and remove the sale record.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-red-50 text-red-700 font-poppins">
                    Manager Access
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowVoidManagement(false)}
                    className="h-8 w-8 text-slate-500 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                <DataTableWrapper
                  data={sales}
                  columns={voidManagementColumns}
                  searchKeys={['sale_id', 'customer.name']}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </div>
              
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-600 font-poppins">
                    {sales.length} sales found
                  </p>
                  <Button
                    onClick={() => setShowVoidManagement(false)}
                    className={buttonStyles.back}
                  >
                    Close Void Management
                  </Button>
                </div>
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
                className={buttonStyles.primary}
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
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-purple-50/50 border-b border-slate-200/50">
                  <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Available Products</CardTitle>

                  <div className="space-y-4 mt-4">
                    {/* Vehicle Type Selection */}
                    <div>
                      <Label className="text-slate-700 text-sm font-medium mb-3 block font-poppins">Vehicle Type</Label>
                      <div className="grid grid-cols-4 gap-2 w-full">
                        {vehicleTypes.map((vehicle) => {
                          const Icon = vehicle.icon;
                          const isSelected = selectedVehicleType === vehicle.value;
                          return (
                            <Button
                              key={vehicle.value}
                              variant={isSelected ? "default" : "outline"}
                              className={`flex items-center justify-center gap-2 transition-all duration-300 w-full font-poppins ${isSelected
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md transform scale-105'
                                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 hover:border-indigo-400 hover:scale-105'
                                }`}
                              onClick={() => setSelectedVehicleType(vehicle.value)}
                            >
                              <Icon className="h-4 w-4" />
                              {vehicle.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Category Selection */}
                    <div>
                      <Label className="text-slate-700 text-sm font-medium mb-3 block font-poppins">Category</Label>
                      <div className="grid grid-cols-4 gap-2 w-full">
                        {categories.map((category) => {
                          const isSelected = selectedCategory === category.value;
                          return (
                            <Button
                              key={category.value}
                              variant={isSelected ? "secondary" : "outline"}
                              className={`flex items-center justify-center gap-2 transition-all duration-300 w-full font-poppins ${isSelected
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md transform scale-105'
                                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 hover:border-indigo-400 hover:scale-105'
                                }`}
                              onClick={() => setSelectedCategory(category.value)}
                            >
                              <CategoryIcon category={category.value} />
                              {category.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search products by name or category..."
                        className="pl-10 border-slate-300 focus:border-indigo-400 transition-all duration-300 font-poppins"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {(selectedVehicleType !== 'all' || selectedCategory !== 'all' || searchTerm) && (
                        <button
                          onClick={clearFilters}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all duration-300"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Filters Display */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedVehicleType !== 'all' && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 font-poppins">
                        Vehicle: {vehicleTypes.find(v => v.value === selectedVehicleType)?.label}
                      </Badge>
                    )}
                    {selectedCategory !== 'all' && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 font-poppins">
                        Category: {categories.find(c => c.value === selectedCategory)?.label}
                      </Badge>
                    )}
                    {searchTerm && (
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 font-poppins">
                        Search: {searchTerm}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6 max-h-[60vh] overflow-y-auto">
                      {filteredInventory.map(item => {
                        // ✅ Get the current stock from the inventory state (not the filtered item)
                        const currentInventoryItem = inventory.find(inv => inv.item_id === item.item_id);
                        const currentStock = currentInventoryItem?.stock_quantity ?? item.stock_quantity;
                        
                        return (
                          <Card
                            key={item.item_id}
                            className={`border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group ${microAnimations.cardHover} font-poppins`}
                          >
                            <CardContent className="p-4 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CategoryIcon category={item.category} className="h-4 w-4 text-indigo-600" />
                                    <p className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                      {item.name}
                                    </p>
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs capitalize bg-slate-100 text-slate-700 border-slate-300 flex items-center gap-1">
                                      <CategoryIcon category={item.category} className="h-3 w-3" />
                                      {item.category}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        item.vehicle_type === 'car' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                        item.vehicle_type === 'motor' ? 'bg-green-100 text-green-700 border-green-200' :
                                        'bg-orange-100 text-orange-700 border-orange-200'
                                      }`}
                                    >
                                      {item.vehicle_type}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-lg font-bold text-green-600">₱{formatPrice(item.sale_price)}</p>
                                  <p className={`text-xs ${
                                    currentStock === 0 ? 'text-red-500' :
                                    currentStock <= 2 ? 'text-red-500' :
                                    currentStock <= 5 ? 'text-yellow-500' : 'text-green-500'
                                  }`}>
                                    {currentStock} in stock
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 font-poppins"
                                  disabled={currentStock <= 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    addToCart(item);
                                  }}
                                >
                                  <Plus className="mr-1 h-4 w-4" />
                                  Add
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {filteredInventory.length === 0 && (
                        <div className="col-span-full text-center py-12">
                          <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500 text-lg font-poppins">No products found</p>
                          <p className="text-slate-400 text-sm font-poppins">Try adjusting your filters or search term</p>
                          <Button
                            variant="outline"
                            className="mt-4 font-poppins"
                            onClick={clearFilters}
                          >
                            Clear All Filters
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cart & Checkout - Right Side */}
            <div className="lg:col-span-1">
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0 sticky top-8">
                <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-green-50/50 border-b border-slate-200/50">
                  <CardTitle className="flex items-center text-2xl font-bold text-slate-900 font-poppins">
                    <ShoppingCart className="mr-3 h-6 w-6" />
                    Shopping Cart
                    {cart.length > 0 && (
                      <Badge variant="outline" className="ml-3 bg-indigo-100 text-indigo-700 border-indigo-200 font-poppins">
                        {cart.length} items
                      </Badge>
                    )}
                  </CardTitle>
                  {editingSale && (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 font-poppins">
                        Editing Sale: {editingSale.sale_id}
                      </Badge>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Customer Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="customer-select" className="text-slate-700 font-medium font-poppins">Customer</Label>
                    <CustomerSearch
                      customers={customers}
                      selectedCustomerId={selectedCustomerId}
                      onCustomerSelect={setSelectedCustomerId}
                    />
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-4">
                    <Label className="text-slate-700 font-medium font-poppins">Order Items</Label>
                    <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                      {cart.length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-poppins">Your cart is empty</p>
                          <p className="text-slate-400 text-sm font-poppins">Add products to get started</p>
                        </div>
                      ) : (
                        cart.map(item => (
                          <div key={item.item_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <CategoryIcon category={item.category} className="h-3 w-3 text-indigo-600" />
                                <p className="text-sm font-medium text-slate-800 truncate font-poppins">{item.name}</p>
                              </div>
                              {item.installationFee && item.installationFee > 0 ? (
                                <p className="text-xs text-slate-500 font-poppins">
                                  {`₱${formatPrice(item.sale_price)} + ₱${formatPrice(item.installationFee)} install`}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-500 font-poppins">
                                  {`₱${formatPrice(item.sale_price)} each`}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="text-sm font-medium w-8 text-center font-poppins">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock_quantity}
                              >
                                +
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeFromCart(item.item_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Order Summary */}
                  {cart.length > 0 && (
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between text-sm font-poppins">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-medium">₱{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg font-poppins">
                        <span className="text-slate-800">Total Amount</span>
                        <span className="text-green-600">₱{formatPrice(total)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 p-6 bg-slate-50/50 border-t border-slate-200/50">
                  <Button
                    className={`w-full ${buttonStyles.primary}`}
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
                    className="w-full border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 font-poppins"
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-green-500 bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-xl rounded-2xl overflow-hidden border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2 font-poppins">
                    <DollarSign className="h-4 w-4" />
                    Today's Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 font-poppins">₱{formatPrice(todayRevenue)}</div>
                  <p className="text-xs text-slate-500 mt-1 font-poppins">{todaySales.length} transactions today</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-indigo-500 bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-xl rounded-2xl overflow-hidden border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2 font-poppins">
                    <TrendingUp className="h-4 w-4" />
                    Total Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600 font-poppins">₱{formatPrice(totalSalesAmount)}</div>
                  <p className="text-xs text-slate-500 mt-1 font-poppins">{sales.length} total transactions</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-xl rounded-2xl overflow-hidden border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2 font-poppins">
                    <ShoppingCart className="h-4 w-4" />
                    Average Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600 font-poppins">
                    ₱{sales.length > 0 ? formatPrice(totalSalesAmount / sales.length) : '0.00'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-poppins">Per transaction</p>
                </CardContent>
              </Card>
            </div>

            {/* Sales Table */}
            <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
              <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Sales History</CardTitle>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 font-poppins">
                    {sales.length} total sales
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <DataTableWrapper
                  data={sales}
                  columns={salesColumns}
                  searchKeys={['sale_id', 'customer.name', 'payment_method']}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  onRowClick={(row) => {
                    console.log('Clicked row:', row);
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

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
      `}</style>
    </div>
  );
}