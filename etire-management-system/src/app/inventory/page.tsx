"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { 
  Archive, Coins, AlertTriangle, PlusCircle, PackageSearch, Loader2, Filter,
  TrendingUp, Clock, RefreshCw, Plus, Search, X, Download, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Interface based on the user's 'inventory' table schema
export interface InventoryItem {
  item_id: string;
  name: string;
  category: 'tire' | 'tool' | 'accessory';
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  created_at?: string;
  updated_at?: string;
}

// ===== ENHANCED FILTERING SYSTEM =====
interface FilterState {
  search: string;
  category: 'all' | 'tire' | 'tool' | 'accessory';
  stockStatus: 'all' | 'inStock' | 'lowStock' | 'outOfStock';
  sortBy: 'name' | 'stock' | 'price' | 'updated';
  sortOrder: 'asc' | 'desc';
}

const quickFilters = [
  { label: "All Items", value: "all", icon: PackageSearch },
  { label: "Low Stock", value: "lowStock", icon: AlertTriangle },
  { label: "Out of Stock", value: "outOfStock", icon: AlertTriangle },
  { label: "Tires", value: "tire", icon: PackageSearch },
  { label: "Tools", value: "tool", icon: PackageSearch }
];

// ===== ENHANCED DESIGN SYSTEM =====
const buttonStyles = {
  primary: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-green-600",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg"
};

const microAnimations = {
  cardHover: "transition-all duration-350 ease-spring hover:translate-y-[-6px] hover:shadow-2xl",
  buttonHover: "transition-all duration-200 hover:scale-105 active:scale-95",
  fadeIn: "animate-in fade-in duration-500",
  iconHover: "transition-all duration-350 ease-spring group-hover:scale-105 group-hover:translate-y-[-2px]",
};

const springEasing = "cubic-bezier(0.34, 1.56, 0.64, 1)";

const iconCategories = {
  financial: { background: 'rgba(16, 185, 129, 0.1)', icon: '#10b981' },
  inventory: { background: 'rgba(6, 182, 212, 0.1)', icon: '#06b6d4' },
  analytics: { background: 'rgba(99, 102, 241, 0.1)', icon: '#6366f1' },
  service: { background: 'rgba(139, 92, 246, 0.1)', icon: '#8b5cf6' },
  customers: { background: 'rgba(59, 130, 246, 0.1)', icon: '#3b82f6' },
  warning: { background: 'rgba(245, 158, 11, 0.1)', icon: '#f59e0b' },
  error: { background: 'rgba(239, 68, 68, 0.1)', icon: '#ef4444' }
};

// Enhanced StatCard to EXACTLY match dashboard design
const DashboardStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  category = 'inventory',
  isLoading = false,
}: { 
  title: string;
  value: string;
  icon: any;
  description: string;
  category?: keyof typeof iconCategories;
  isLoading?: boolean;
}) => (
  <div 
    className={`group bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer shadow-sm hover:border-indigo-300/25 active:scale-[0.98] ${microAnimations.cardHover}`}
    style={{ transitionTimingFunction: springEasing }}
  >
    <div className="flex items-center justify-between mb-4">
      <div 
        className={`w-12 h-12 rounded-lg flex items-center justify-center ${microAnimations.iconHover}`}
        style={{ 
          backgroundColor: iconCategories[category]?.background,
          transitionTimingFunction: springEasing
        }}
      >
        <Icon 
          className="w-6 h-6" 
          style={{ color: iconCategories[category]?.icon }} 
        />
      </div>
      <div 
        className="w-9 h-9 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-400 scale-90 translate-y-1 group-hover:scale-100 group-hover:translate-y-0"
        style={{ 
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          transitionTimingFunction: springEasing,
          transitionDelay: '0.1s'
        }}
      >
        <TrendingUp className="w-5 h-5 text-green-600" />
      </div>
    </div>
    
    <div className="space-y-3">
      <p 
        className={`text-5xl font-extrabold tracking-tight tabular-nums leading-none mb-3 ${
          value === '0' || value === '₱0' || isLoading ? 'text-slate-300' : 'text-slate-900'
        }`}
        style={{ letterSpacing: '-0.03em' }}
      >
        {isLoading ? '...' : value}
      </p>
      <p className="text-base font-semibold text-slate-700">{title}</p>
      <p className="text-xs text-slate-500 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {description}
      </p>
    </div>
  </div>
);

// Stock Level Indicator Component
const StockLevelIndicator = ({ quantity }: { quantity: number }) => {
  const getStockLevel = (qty: number) => {
    if (qty === 0) return { level: 'out', color: 'bg-red-500', text: 'Out of Stock' };
    if (qty <= 2) return { level: 'critical', color: 'bg-red-400', text: 'Critical' };
    if (qty <= 5) return { level: 'low', color: 'bg-yellow-500', text: 'Low Stock' };
    return { level: 'good', color: 'bg-green-500', text: 'In Stock' };
  };

  const stock = getStockLevel(quantity);
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${stock.color}`} />
        <span className={`text-sm font-medium ${
          stock.level === 'out' ? 'text-red-600' :
          stock.level === 'critical' ? 'text-red-600' :
          stock.level === 'low' ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {quantity}
        </span>
      </div>
      <div className="text-xs text-slate-500 hidden sm:block">
        {stock.text}
      </div>
    </div>
  );
};

// Enhanced Filter Component
const AdvancedFilters = ({ 
  filters, 
  onFiltersChange,
  onClearFilters 
}: { 
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-200 shadow-sm">
      {/* Quick Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        {/* Search Box */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search products by name..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10 border-slate-300 focus:border-indigo-400"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand/Collapse Filters */}
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {isExpanded ? 'Hide Filters' : 'Show Filters'}
        </Button>

        {/* Clear Filters */}
        {(filters.search || filters.category !== 'all' || filters.stockStatus !== 'all') && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickFilters.map((filter) => {
          const Icon = filter.icon;
          const isActive = 
            (filter.value === 'all' && filters.category === 'all' && filters.stockStatus === 'all') ||
            (filter.value === filters.category) ||
            (filter.value === filters.stockStatus);

          return (
            <Badge
              key={filter.value}
              variant={isActive ? "default" : "outline"}
              className={`cursor-pointer transition-all flex items-center gap-2 ${
                isActive 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
              onClick={() => {
                if (filter.value === 'all') {
                  onClearFilters();
                } else if (['tire', 'tool', 'accessory'].includes(filter.value)) {
                  onFiltersChange({ ...filters, category: filter.value as any, stockStatus: 'all' });
                } else {
                  onFiltersChange({ ...filters, stockStatus: filter.value as any, category: 'all' });
                }
              }}
            >
              <Icon className="h-3 w-3" />
              {filter.label}
            </Badge>
          );
        })}
      </div>

      {/* Advanced Filters (Collapsible) */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
          {/* Category Filter */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">Category</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => onFiltersChange({ ...filters, category: value as any })}
            >
              <SelectTrigger className="border-slate-300">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="tire">Tires</SelectItem>
                <SelectItem value="tool">Tools</SelectItem>
                <SelectItem value="accessory">Accessories</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">Stock Status</Label>
            <Select
              value={filters.stockStatus}
              onValueChange={(value) => onFiltersChange({ ...filters, stockStatus: value as any })}
            >
              <SelectTrigger className="border-slate-300">
                <SelectValue placeholder="All stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="inStock">In Stock (6+)</SelectItem>
                <SelectItem value="lowStock">Low Stock (1-5)</SelectItem>
                <SelectItem value="outOfStock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">Sort By</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value as any })}
            >
              <SelectTrigger className="border-slate-300">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="stock">Stock Level</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="updated">Last Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">Order</Label>
            <Select
              value={filters.sortOrder}
              onValueChange={(value) => onFiltersChange({ ...filters, sortOrder: value as any })}
            >
              <SelectTrigger className="border-slate-300">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Empty State
const EnhancedEmptyState = ({ 
  filters, 
  onClearFilters, 
  onAddItem 
}: { 
  filters: FilterState;
  onClearFilters: () => void;
  onAddItem: () => void;
}) => {
  const hasActiveFilters = filters.search || filters.category !== 'all' || filters.stockStatus !== 'all';

  if (hasActiveFilters) {
    return (
      <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <PackageSearch className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">No items match your filters</h3>
        <p className="text-slate-500 mb-4">
          Try adjusting your search criteria or clear filters to see all items.
        </p>
        <div className="flex gap-3 justify-center">
          <Button 
            onClick={onClearFilters}
            variant="outline"
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
          <Button 
            onClick={onAddItem}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Item
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
      <PackageSearch className="h-16 w-16 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 mb-2">No Inventory Items</h3>
      <p className="text-slate-500 mb-4">
        Get started by adding your first inventory item to track stock levels and pricing.
      </p>
      <Button 
        onClick={onAddItem}
        className="bg-green-600 hover:bg-green-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add First Item
      </Button>
    </div>
  );
};

// Stock Alerts Component
const StockAlertsBar = ({ criticalCount, warningCount }: { criticalCount: number; warningCount: number }) => {
  if (criticalCount === 0 && warningCount === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {criticalCount > 0 && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Critical Stock Alert</AlertTitle>
          <AlertDescription className="text-red-700">
            {criticalCount} item{criticalCount !== 1 ? 's are' : ' is'} out of stock and needs immediate attention.
          </AlertDescription>
        </Alert>
      )}
      {warningCount > 0 && (
        <Alert variant="warning" className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Low Stock Warning</AlertTitle>
          <AlertDescription className="text-yellow-700">
            {warningCount} item{warningCount !== 1 ? 's are' : ' is'} running low and may need reordering soon.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default function EnhancedInventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  // Enhanced Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'all',
    stockStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Form state for Add/Edit dialog
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<InventoryItem['category']>('tire');
  const [itemCostPrice, setItemCostPrice] = useState('');
  const [itemSalePrice, setItemSalePrice] = useState('');
  const [itemStockQuantity, setItemStockQuantity] = useState('0');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!supabase) {
      setFetchError("Supabase client is not available. Please check your environment variables.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('inventory_item')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error.message);
      setFetchError(`Could not fetch inventory: ${error.message}`);
      setItems([]);
    } else {
      setItems(data as InventoryItem[]);
      setFetchError(null);
      setLastUpdated(new Date());
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Enhanced data processing with filtering and sorting
  const processedItems = useMemo(() => {
    let filtered = [...items];

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Apply stock status filter
    if (filters.stockStatus !== 'all') {
      switch (filters.stockStatus) {
        case 'inStock':
          filtered = filtered.filter(item => item.stock_quantity > 5);
          break;
        case 'lowStock':
          filtered = filtered.filter(item => item.stock_quantity > 0 && item.stock_quantity <= 5);
          break;
        case 'outOfStock':
          filtered = filtered.filter(item => item.stock_quantity === 0);
          break;
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'stock':
          aValue = a.stock_quantity;
          bValue = b.stock_quantity;
          break;
        case 'price':
          aValue = a.sale_price;
          bValue = b.sale_price;
          break;
        case 'updated':
          aValue = new Date(a.updated_at || a.created_at || '');
          bValue = new Date(b.updated_at || b.created_at || '');
          break;
        default:
          return 0;
      }

      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [items, filters]);

  // Enhanced columns with better rendering
  const enhancedColumns = [
    { key: 'name', header: 'Product Name' },
    { key: 'category', header: 'Category' },
    { key: 'stock_quantity', header: 'Stock Level' },
    { key: 'cost_price', header: 'Cost (₱)' },
    { key: 'sale_price', header: 'Price (₱)' },
    { key: 'profit_margin', header: 'Margin %' },
  ];

  // Calculate stats
  const totalStockValue = processedItems.reduce((acc, p) => acc + (p.sale_price * p.stock_quantity), 0);
  const lowStockCount = items.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length;
  const outOfStockCount = items.filter(p => p.stock_quantity === 0).length;
  const criticalStockCount = items.filter(p => p.stock_quantity <= 2).length;

  // Helper functions
  const resetForm = () => {
    setItemName('');
    setItemCategory('tire');
    setItemCostPrice('');
    setItemSalePrice('');
    setItemStockQuantity('0');
  };

  const populateForm = (product: InventoryItem) => {
    setItemName(product.name);
    setItemCategory(product.category);
    setItemCostPrice(String(product.cost_price));
    setItemSalePrice(String(product.sale_price));
    setItemStockQuantity(String(product.stock_quantity));
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setEditingItem(null);
    setIsAddItemDialogOpen(true);
  };

  const handleOpenEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setIsEditItemDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (item: InventoryItem) => {
    setDeletingItem(item);
    setIsDeleteConfirmationOpen(true);
  };

  const handleSubmit = async () => {
    if (!supabase) return;
    if (!itemName || !itemCostPrice || !itemSalePrice) { 
      toast({ title: "Validation Error", description: "Name, Cost Price, and Sale Price are required.", variant: "destructive" });
      return;
    }
    
    const itemData = {
      name: itemName,
      category: itemCategory,
      cost_price: parseFloat(itemCostPrice),
      sale_price: parseFloat(itemSalePrice),
      stock_quantity: parseInt(itemStockQuantity, 10),
    };

    setIsLoading(true);

    let error;
    if (editingItem) {
        const { error: updateError } = await supabase.from('inventory_item').update(itemData).eq('item_id', editingItem.item_id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('inventory_item').insert([itemData]);
        error = insertError;
    }

    setIsLoading(false);

    if (error) {
      console.error('Error saving item:', error);
      toast({ title: "Save Error", description: `Could not save item: ${error.message}`, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Item ${editingItem ? 'updated' : 'saved'} successfully.` });
      setIsAddItemDialogOpen(false);
      setIsEditItemDialogOpen(false);
      setEditingItem(null);
      fetchProducts();
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem || !supabase) return;
    setIsLoading(true);
    const { error } = await supabase
      .from('inventory_item')
      .delete()
      .eq('item_id', deletingItem.item_id);
    setIsLoading(false);

    if (error) {
      console.error('Error deleting item:', error);
      toast({ title: "Delete Error", description: `Could not delete item: ${error.message}`, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Item deleted successfully." });
      setIsDeleteConfirmationOpen(false);
      setDeletingItem(null);
      fetchProducts();
    }
  };

  const handleRefresh = () => {
    fetchProducts();
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      stockStatus: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  // Calculate profit margin
  const calculateMargin = (item: InventoryItem) => {
    if (!item.cost_price || item.cost_price === 0) return 0;
    return ((item.sale_price - item.cost_price) / item.cost_price) * 100;
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">
      
      {/* Background Sections */}
      <div className="absolute top-0 left-0 w-full h-64 rounded-b-[40px] overflow-hidden">
        <div 
          className="absolute inset-0 rounded-b-[40px] bg-cover bg-center"
          style={{ 
            backgroundImage: "url('/images/image.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 30%"
          }}
        ></div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-green-300/20 rounded-br-full"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-300/20 rounded-bl-full"></div>
      </div>

      <div className="absolute top-64 left-0 w-full h-full bg-blue-50/10">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-100/15 to-blue-50/10"></div>
      </div>

      <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
        
        {/* Header Section */}
        <div className={`mb-12 pt-7 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>
            
            <div className="relative z-10 flex-1">
              <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl font-poppins tracking-tight">
                Inventory Management
              </h1>
              <div className="flex items-center gap-6 text-white/90">
                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium">
                  <PackageSearch className="h-6 w-6 opacity-90" />
                  Track all products, stock levels, and pricing
                </p>
                <div className="flex items-center gap-4 text-lg">
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                      <Clock className="w-5 h-5" />
                      Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Live data
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleRefresh}
              disabled={isLoading}
              className={buttonStyles.glass + " active:scale-95"}
            >
              <RefreshCw className={`h-6 w-6 mr-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Stock Alerts */}
        <StockAlertsBar 
          criticalCount={outOfStockCount} 
          warningCount={criticalStockCount} 
        />

        {/* Enhanced Filters */}
        <AdvancedFilters 
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
        />

        {/* Key Metrics */}
        <section className="mb-12" aria-labelledby="inventory-metrics-heading">
          <h2 id="inventory-metrics-heading" className="text-2xl font-bold text-slate-900 mb-8">
            Inventory Overview
            {filters.search || filters.category !== 'all' || filters.stockStatus !== 'all' ? (
              <span className="text-sm font-normal text-slate-500 ml-2">
                (Filtered: {processedItems.length} of {items.length} items)
              </span>
            ) : null}
          </h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <DashboardStatCard 
              title="Total Items" 
              value={String(processedItems.length)} 
              icon={Archive} 
              description="Filtered items"
              category="inventory"
              isLoading={isLoading}
            />
            <DashboardStatCard 
              title="Total Stock Value" 
              value={`₱${totalStockValue.toLocaleString()}`} 
              icon={Coins} 
              description="Based on sale price"
              category="financial"
              isLoading={isLoading}
            />
            <DashboardStatCard 
              title="Low Stock Alerts" 
              value={String(lowStockCount)} 
              icon={AlertTriangle} 
              description="≤ 5 units left"
              category="warning"
              isLoading={isLoading}
            />
            <DashboardStatCard 
              title="Out of Stock" 
              value={String(outOfStockCount)} 
              icon={PackageSearch} 
              description="Needs restocking"
              category="error"
              isLoading={isLoading}
            />
          </div>
        </section>

        {/* Enhanced Inventory Table */}
        <section aria-labelledby="inventory-list-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="inventory-list-heading" className="text-2xl font-bold text-slate-900">
              Inventory Items
            </h2>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  // Simple export functionality - could be enhanced
                  const csvContent = "data:text/csv;charset=utf-8," 
                    + "Name,Category,Stock,Cost Price,Sale Price,Margin%\n"
                    + processedItems.map(item => 
                        `"${item.name}",${item.category},${item.stock_quantity},${item.cost_price},${item.sale_price},${calculateMargin(item).toFixed(1)}`
                      ).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", "inventory_export.csv");
                  document.body.appendChild(link);
                  link.click();
                }}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button 
                onClick={handleOpenAddDialog}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Table Card */}
          <Card className="bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-0">
              {isLoading && items.length === 0 && !fetchError ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : processedItems.length === 0 ? (
                <EnhancedEmptyState 
                  filters={filters}
                  onClearFilters={handleClearFilters}
                  onAddItem={handleOpenAddDialog}
                />
              ) : (
                <DataTableWrapper
                  title=""
                  columns={enhancedColumns}
                  data={processedItems.map(i => ({...i, id: i.item_id}))}
                  onAddNew={handleOpenAddDialog}
                  onEdit={handleOpenEditDialog}
                  onDelete={handleOpenDeleteDialog}
                  renderCell={(item, columnKey, value) => {
                    const inventoryItem = item as InventoryItem;
                    
                    switch (columnKey) {
                      case 'sale_price':
                      case 'cost_price':
                        return `₱${Number(value).toFixed(2)}`;
                      
                      case 'category':
                        return (
                          <Badge 
                            variant="outline" 
                            className="capitalize bg-slate-100 text-slate-700 border-slate-300"
                          >
                            {String(value)}
                          </Badge>
                        );
                      
                      case 'stock_quantity':
                        return <StockLevelIndicator quantity={Number(value)} />;
                      
                      case 'profit_margin':
                        const margin = calculateMargin(inventoryItem);
                        return (
                          <Badge 
                            variant={margin >= 30 ? "default" : "outline"}
                            className={
                              margin >= 30 ? 'bg-green-100 text-green-700 border-green-200' :
                              margin >= 15 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                              'bg-red-100 text-red-700 border-red-200'
                            }
                          >
                            {margin.toFixed(1)}%
                          </Badge>
                        );
                      
                      default:
                        return String(value);
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </section>

        {/* Keep existing dialogs - they remain the same */}
        <Dialog open={isAddItemDialogOpen || isEditItemDialogOpen} onOpenChange={(isOpen) => {
            if (isLoading) return;
            if (!isOpen) {
              setIsAddItemDialogOpen(false);
              setIsEditItemDialogOpen(false);
              setEditingItem(null);
            }
        }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                {editingItem ? `Update details for ${editingItem.name}.` : 'Enter the details for the new item.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="itemName" className="text-slate-700 font-medium">Item Name</Label>
                <Input 
                  id="itemName" 
                  value={itemName} 
                  onChange={(e) => setItemName(e.target.value)} 
                  placeholder="Michelin Tire XZ" 
                  className="border-slate-300 focus:border-indigo-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemCategory" className="text-slate-700 font-medium">Category</Label>
                <Select value={itemCategory} onValueChange={(v) => setItemCategory(v as InventoryItem['category'])}>
                  <SelectTrigger className="border-slate-300 focus:border-indigo-400">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tire">Tire</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                    <SelectItem value="accessory">Accessory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemStockQuantity" className="text-slate-700 font-medium">Stock Quantity</Label>
                <Input 
                  id="itemStockQuantity" 
                  type="number" 
                  value={itemStockQuantity} 
                  onChange={(e) => setItemStockQuantity(e.target.value)} 
                  placeholder="10" 
                  className="border-slate-300 focus:border-indigo-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemCostPrice" className="text-slate-700 font-medium">Cost Price</Label>
                <Input 
                  id="itemCostPrice" 
                  type="number" 
                  value={itemCostPrice} 
                  onChange={(e) => setItemCostPrice(e.target.value)} 
                  placeholder="5000.00" 
                  className="border-slate-300 focus:border-indigo-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemSalePrice" className="text-slate-700 font-medium">Sale Price</Label>
                <Input 
                  id="itemSalePrice" 
                  type="number" 
                  value={itemSalePrice} 
                  onChange={(e) => setItemSalePrice(e.target.value)} 
                  placeholder="7500.00" 
                  className="border-slate-300 focus:border-indigo-400"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isLoading}
                  className="flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-green-600 active:scale-95"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingItem ? 'Save Changes' : 'Save Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900">Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600">
                Are you sure you want to delete <strong>{deletingItem?.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteItem} 
                disabled={isLoading} 
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-red-600 active:scale-95"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Error Display */}
      {fetchError && (
        <div className="w-full bg-red-50 border-t border-red-200 py-4">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{fetchError}</span>
              </div>
              <button 
                onClick={() => setFetchError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }

        .ease-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}