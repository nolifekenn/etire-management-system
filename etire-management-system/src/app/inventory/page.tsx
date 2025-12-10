"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import {
  Archive, Coins, AlertTriangle, PlusCircle, PackageSearch, Loader2, Filter,
  TrendingUp, Clock, RefreshCw, Plus, Search, X, Download, SlidersHorizontal,
  ArrowUpDown, Eye, Save, CheckCircle, ListFilter, ChevronLeft, ChevronRight,
  Pencil, Trash2
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
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Update the InventoryItem interface
export interface InventoryItem {
  item_id: string;
  name: string;
  category: 'tire' | 'tool' | 'accessory';
  vehicle_type: 'car' | 'motor' | 'truck';
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  reorder_level?: number;
  created_at?: string;
  updated_at?: string;

  // Calculated fields
  profit_margin?: number;
  total_value?: number;
  potential_profit?: number;
  stock_status?: 'in_stock' | 'low_stock' | 'critical' | 'out_of_stock';
  days_since_update?: number;

  // Joined data
  supplier?: {
    supplier_id: string;
    name: string;
    contact_person?: string;
    phone?: string;
  };
  branch?: {
    branch_id: string;
    name: string;
    address?: string;
  };
}

// ===== ENHANCED FILTERING SYSTEM =====
interface FilterState {
  search: string;
  category: 'all' | 'tire' | 'tool' | 'accessory';
  vehicleType: 'all' | 'car' | 'motor' | 'truck';
  stockStatus: 'all' | 'inStock' | 'lowStock' | 'critical' | 'outOfStock';
  sortBy: 'name' | 'stock' | 'price' | 'updated' | 'vehicleType';
  sortOrder: 'asc' | 'desc';
}

const quickFilters = [
  { label: "All Items", value: "all", icon: PackageSearch },
  { label: "Low Stock", value: "lowStock", icon: AlertTriangle },
  { label: "Critical Stock", value: "critical", icon: AlertTriangle },
  { label: "Out of Stock", value: "outOfStock", icon: AlertTriangle },
  { label: "Tires", value: "tire", icon: PackageSearch },
  { label: "Tools", value: "tool", icon: PackageSearch },
  { label: "Accessories", value: "accessory", icon: PackageSearch },
  { label: "Car Items", value: "car", icon: PackageSearch },
  { label: "Motorcycle Items", value: "motor", icon: PackageSearch },
  { label: "Truck Items", value: "truck", icon: PackageSearch }
];

// Vehicle type configuration
const vehicleTypeConfig: Record<'car' | 'motor' | 'truck', { label: string; color: string }> = {
  car: { label: 'Car', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  motor: { label: 'Motorcycle', color: 'bg-green-100 text-green-700 border-green-200' },
  truck: { label: 'Truck', color: 'bg-orange-100 text-orange-700 border-orange-200' }
};

// ===== ENHANCED DESIGN SYSTEM =====
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg"
};

const microAnimations = {
  cardHover: "transition-all duration-350 ease-spring hover:translate-y-[-6px] hover:shadow-2xl",
  buttonHover: "transition-all duration-200 hover:scale-105 active:scale-95",
  fadeIn: "animate-in fade-in duration-500",
  iconHover: "transition-all duration-350 ease-spring group-hover:scale-105 group-hover:translate-y-[-2px]",
};

// Stock Level Indicator Component
const StockLevelIndicator = ({ quantity, reorderLevel = 5 }: { quantity: number; reorderLevel?: number }) => {
  const getStockLevel = (qty: number) => {
    if (qty === 0) return {
      level: 'out',
      color: 'bg-gray-500',
      text: 'Out of Stock',
      badgeColor: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    if (qty <= 2) return {
      level: 'critical',
      color: 'bg-red-500',
      text: 'Critical',
      badgeColor: 'bg-red-100 text-red-800 border-red-200'
    };
    if (qty <= reorderLevel) return {
      level: 'low',
      color: 'bg-yellow-500',
      text: 'Low Stock',
      badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return {
      level: 'good',
      color: 'bg-green-500',
      text: 'In Stock',
      badgeColor: 'bg-green-100 text-green-800 border-green-200'
    };
  };

  const stock = getStockLevel(quantity);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${stock.color}`} />
        <span className={`text-sm font-medium ${stock.level === 'out' ? 'text-gray-600' :
          stock.level === 'critical' ? 'text-red-600' :
            stock.level === 'low' ? 'text-yellow-600' : 'text-green-600'
          }`}>
          {quantity}
        </span>
      </div>
      <Badge variant="outline" className={`text-xs ${stock.badgeColor}`}>
        {stock.text}
      </Badge>
    </div>
  );
};

// Vehicle Type Badge Component
const VehicleTypeBadge = ({ type }: { type: 'car' | 'motor' | 'truck' }) => {
  const config = vehicleTypeConfig[type] || { label: type, color: 'bg-gray-100 text-gray-700 border-gray-200' };

  return (
    <Badge variant="outline" className={`capitalize ${config.color}`}>
      {config.label}
    </Badge>
  );
};

// ============================================
// SUCCESS ANIMATION COMPONENT
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
  actionType?: 'add' | 'edit' | 'delete' | 'export' | 'adjust';
  onConfirm: () => void;
}) => {
  if (!isVisible) return null;

  const getActionConfig = () => {
    switch (actionType) {
      case 'add': return { gradient: 'from-green-500 to-emerald-600', icon: PlusCircle };
      case 'edit': return { gradient: 'from-blue-500 to-cyan-600', icon: Save };
      case 'delete': return { gradient: 'from-red-500 to-orange-600', icon: Archive };
      case 'export': return { gradient: 'from-purple-500 to-indigo-600', icon: Download };
      case 'adjust': return { gradient: 'from-amber-500 to-yellow-600', icon: ArrowUpDown };
      default: return { gradient: 'from-purple-500 to-indigo-600', icon: CheckCircle };
    }
  };

  const { gradient, icon: ActionIcon } = getActionConfig();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in duration-300 font-poppins">
        <div className={`w-20 h-20 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500`}>
          <ActionIcon className="h-12 w-12 text-white animate-in scale-in duration-700 delay-300" />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2 font-poppins">{title}</h3>
        <p className="text-slate-600 mb-6 font-poppins">{message}</p>
        <div className="flex gap-3 justify-center">
          <Button
            className={`bg-gradient-to-r ${gradient} hover:scale-105 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins`}
            onClick={onConfirm}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

// Success Confirmation Component (Simple)
const SuccessConfirmation = ({
  item,
  isOpen,
  onClose,
  onAddAnother
}: {
  item?: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddAnother: () => void;
}) => {
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w bg-white border border-green-200 shadow-2xl font-poppins">
        <div className="flex flex-col items-center text-center p-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-green-800 mb-2">Item Added Successfully!</DialogTitle>
          <DialogDescription className="text-slate-600 mb-6">Your new inventory item has been added.</DialogDescription>

          {/* Simple Item Details for Context */}
          <div className="w-full bg-slate-50 p-4 rounded-lg mb-6 text-left border border-slate-200">
            <p className="text-sm font-semibold text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500 mt-1 capitalize">{item.category} • {item.vehicle_type}</p>
          </div>

          <div className="flex gap-3 w-full">
            <Button onClick={onClose} className="flex-1 bg-green-600 hover:bg-green-700 text-white">Continue</Button>
            <Button onClick={() => { onClose(); onAddAnother(); }} variant="outline" className="flex-1">Add Another</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Filter Component
const AdvancedFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  rowsPerPage,
  onRowsPerPageChange
}: {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  rowsPerPage: number;
  onRowsPerPageChange: (val: number) => void;
}) => {

  const handleFilterToggle = (category: 'stockStatus' | 'category' | 'vehicleType', value: string) => {
    if (filters[category] === value) {
      onFiltersChange({ ...filters, [category]: 'all' });
    } else {
      onFiltersChange({ ...filters, [category]: value });
    }
  };

  const filterGroups = [
    {
      id: 'category' as const,
      label: 'Category',
      icon: PackageSearch,
      options: [
        { label: 'Tires', value: 'tire' },
        { label: 'Tools', value: 'tool' },
        { label: 'Accessory', value: 'accessory' }
      ]
    },
    {
      id: 'vehicleType' as const,
      label: 'Vehicle Type',
      icon: TrendingUp,
      options: [
        { label: 'Car', value: 'car' },
        { label: 'Motorcycle', value: 'motor' },
        { label: 'Truck', value: 'truck' }
      ]
    },
    {
      id: 'stockStatus' as const,
      label: 'Stock Status',
      icon: AlertTriangle,
      options: [
        { label: 'Low Stock', value: 'lowStock' },
        { label: 'Critical', value: 'critical' },
        { label: 'Out of Stock', value: 'outOfStock' }
      ]
    }
  ];

  const hasActiveFilters = filters.search ||
    filters.category !== 'all' ||
    filters.stockStatus !== 'all' ||
    filters.vehicleType !== 'all';

  return (
    <div className="bg-white p-5 border-b border-slate-200">

      {/* Top Section: Search, Sort, Order, and Rows */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-5">
        <div className="flex-1 relative">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Search</Label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 transition-all rounded-md"
            />
            {filters.search && (
              <button
                onClick={() => onFiltersChange({ ...filters, search: '' })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full lg:w-auto items-end">
          <div className="w-1/2 lg:w-32">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Sort By</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value as any })}
            >
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md">
                <SelectValue placeholder="Sort..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="stock">Stock Level</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="vehicleType">Vehicle Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-1/2 lg:w-28">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Order</Label>
            <Select
              value={filters.sortOrder}
              onValueChange={(value) => onFiltersChange({ ...filters, sortOrder: value as any })}
            >
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Moved Rows Per Page Here */}
          <div className="w-1/2 lg:w-20">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Rows</Label>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(v) => onRowsPerPageChange(Number(v))}
            >
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50].map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="hidden lg:flex items-end">
              <Button
                variant="outline"
                onClick={onClearFilters}
                className="h-10 px-3 text-slate-500 border-slate-200 hover:bg-slate-50 rounded-md"
                title="Clear all filters"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* FILTER BOX CONTAINER */}
      <div className="flex flex-col lg:flex-row border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {filterGroups.map((group, index) => (
          <div
            key={group.id}
            className={`
              flex-1 p-4 
              ${index !== filterGroups.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-slate-200' : ''}
              hover:bg-slate-50/50 transition-colors
            `}
          >
            <div className="flex items-center gap-2 mb-3">
              <group.icon className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {group.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 w-full">
              {group.options.map((option) => {
                const isActive = filters[group.id] === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => handleFilterToggle(group.id, option.value)}
                    className={`
                      flex-1 min-w-[80px]
                      px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-300
                      flex items-center justify-center whitespace-nowrap
                      ${isActive
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md transform scale-[1.02]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {hasActiveFilters && (
        <div className="mt-4 lg:hidden">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="w-full h-9 text-slate-500 border-slate-200"
          >
            Clear All Filters
          </Button>
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
  const hasActiveFilters = filters.search || filters.category !== 'all' || filters.stockStatus !== 'all' || filters.vehicleType !== 'all';

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
            className="flex items-center gap-2 transition-all duration-300 hover:scale-105"
          >
            <X className="h-4 w-4" />
            Clear Filters
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
        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 hover:scale-105"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add First Item
      </Button>
    </div>
  );
};

// Stock Alerts Component
const StockAlertsBar = ({
  criticalCount,
  warningCount,
  outOfStockCount,
  onShowDetails
}: {
  criticalCount: number;
  warningCount: number;
  outOfStockCount: number;
  onShowDetails: () => void;
}) => {
  const totalAlerts = criticalCount + warningCount + outOfStockCount;

  if (totalAlerts === 0) return null;

  // Determine the primary severity color for the card accent
  const severityColor = outOfStockCount > 0 ? 'red' : criticalCount > 0 ? 'orange' : 'yellow';

  // Dynamic styles based on severity
  const colors = {
    red: { icon: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
    orange: { icon: 'text-orange-600', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
    yellow: { icon: 'text-yellow-600', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700' }
  }[severityColor];

  // Calculate percentages
  const outOfStockPercent = (outOfStockCount / totalAlerts) * 100;
  const criticalPercent = (criticalCount / totalAlerts) * 100;
  const warningPercent = (warningCount / totalAlerts) * 100;

  return (
    <div
      className={`mb-8 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">

          {/* Section 1: Icon & Main Message */}
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-3 rounded-full shrink-0 ${colors.bg}`}>
              <AlertTriangle className={`h-6 w-6 ${colors.icon}`} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                Inventory Attention Needed
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                  {totalAlerts} Issues
                </span>
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                There are items with low or depleted stock levels that require reordering.
              </p>
            </div>
          </div>

          {/* Section 2: Visual Breakdown (The Bar) */}
          <div className="w-full lg:w-1/3 flex flex-col justify-center px-4 border-l border-r border-slate-100 mx-4">
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100">
              {outOfStockCount > 0 && (
                <div style={{ width: `${outOfStockPercent}%` }} className="bg-slate-700" title="Out of Stock" />
              )}
              {criticalCount > 0 && (
                <div style={{ width: `${criticalPercent}%` }} className="bg-red-500" title="Critical" />
              )}
              {warningCount > 0 && (
                <div style={{ width: `${warningPercent}%` }} className="bg-amber-400" title="Low Stock" />
              )}
            </div>

            <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
              <div className="flex gap-3">
                {outOfStockCount > 0 && (
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-700"></span>Empty ({outOfStockCount})</div>
                )}
                {criticalCount > 0 && (
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span>Critical ({criticalCount})</div>
                )}
                {warningCount > 0 && (
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Low ({warningCount})</div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Action Button */}
          <div className="w-full lg:w-auto flex justify-end">
            <Button
              onClick={onShowDetails}
              variant="outline"
              className="group border-slate-300 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300 w-full sm:w-auto"
            >
              Review Details
              <ArrowUpDown className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 rotate-90" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stock Adjustment Form Component
const StockAdjustmentForm = ({
  item,
  onSave,
  onCancel
}: {
  item: InventoryItem;
  onSave: (adjustment: number, reason: string) => void;
  onCancel: () => void;
}) => {
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!adjustment || !reason) {
      alert('Please enter both adjustment amount and reason');
      return;
    }

    setIsLoading(true);
    await onSave(parseInt(adjustment), reason);
    setIsLoading(false);
  };

  const newQuantity = item.stock_quantity + parseInt(adjustment || '0');

  // Handle increment/decrement for adjustment amount
  const handleIncrement = () => {
    const currentValue = parseInt(adjustment || '0');
    setAdjustment((currentValue + 1).toString());
  };

  const handleDecrement = () => {
    const currentValue = parseInt(adjustment || '0');
    setAdjustment((currentValue - 1).toString());
  };

  return (
    <div className="space-y-6">
      {/* Current and New Stock Display */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-2 block">Current Stock</Label>
          <div className="text-2xl font-bold text-slate-900">{item.stock_quantity}</div>
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-2 block">New Stock</Label>
          <div className={`text-2xl font-bold ${newQuantity < 0 ? 'text-red-600' :
            newQuantity === 0 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
            {newQuantity}
          </div>
        </div>
      </div>

      {/* Adjustment Amount - REMODELED to match Add New Item design */}
      <div>
        <Label className="text-sm font-medium text-slate-700 mb-2 block">Adjustment Amount</Label>
        <p className="text-xs text-slate-500 mb-3">
          Use negative numbers to decrease stock, positive to increase
        </p>

        {/* New full-width input with +/- buttons - matching Add New Item design */}
        <div className="flex items-center border border-slate-300 rounded-md bg-white focus-within:border-indigo-400 overflow-hidden h-9 w-full">
          <button
            type="button"
            onClick={handleDecrement}
            className="px-4 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors border-r border-gray-200 flex items-center justify-center w-16 h-full text-lg font-bold"
          >
            -
          </button>
          <Input
            type="number"
            value={adjustment}
            placeholder="0"
            onChange={(e) => setAdjustment(e.target.value)}
            className="border-0 text-center focus:ring-0 shadow-none flex-1 h-full text-base px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={handleIncrement}
            className="px-4 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors border-l border-gray-200 flex items-center justify-center w-16 h-full text-lg font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* Reason for Adjustment */}
      <div>
        <Label htmlFor="reason" className="text-sm font-medium text-slate-700 mb-2 block">
          Reason for Adjustment
        </Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="border-slate-300 focus:border-indigo-400 bg-white w-full">
            <SelectValue placeholder="Select reason..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sale">Sale/Delivery</SelectItem>
            <SelectItem value="return">Customer Return</SelectItem>
            <SelectItem value="damaged">Damaged/Expired</SelectItem>
            <SelectItem value="received">New Stock Received</SelectItem>
            <SelectItem value="adjustment">Inventory Adjustment</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reason === 'other' && (
        <div>
          <Label htmlFor="customReason" className="text-sm font-medium text-slate-700 mb-2 block">
            Custom Reason
          </Label>
          <Input
            id="customReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter specific reason..."
            className="border-slate-300 focus:border-indigo-400 bg-white w-full"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !adjustment || !reason || newQuantity < 0}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Apply Adjustment
        </Button>
      </div>

      {/* Warning for negative stock */}
      {newQuantity < 0 && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Stock cannot be negative. Please adjust the amount.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Enhanced Critical Stock Details
const CriticalStockDetails = ({
  items,
  isOpen,
  onClose
}: {
  items: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [filterType, setFilterType] = useState<'all' | 'out' | 'critical' | 'low'>('all');
  const [sortType, setSortType] = useState<'severity' | 'name' | 'vehicle'>('severity');

  // Added pagination state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterType, sortType, rowsPerPage]);

  // 1. Get all relevant alert items first
  const allAlertItems = useMemo(() => {
    return items.filter(item => item.stock_quantity <= 5);
  }, [items]);

  // 2. Apply Filters and Sorting
  const filteredAndSortedItems = useMemo(() => {
    let result = [...allAlertItems];

    // Filter
    if (filterType === 'out') result = result.filter(i => i.stock_quantity === 0);
    if (filterType === 'critical') result = result.filter(i => i.stock_quantity > 0 && i.stock_quantity <= 2);
    if (filterType === 'low') result = result.filter(i => i.stock_quantity > 2 && i.stock_quantity <= 5);

    // Sort
    result.sort((a, b) => {
      if (sortType === 'name') return a.name.localeCompare(b.name);

      if (sortType === 'vehicle') {
        const vA = a.vehicle_type || '';
        const vB = b.vehicle_type || '';
        return vA.localeCompare(vB);
      }

      // Default: Severity (Out -> Critical -> Low)
      return a.stock_quantity - b.stock_quantity;
    });

    return result;
  }, [allAlertItems, filterType, sortType]);

  // 3. Apply Pagination
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredAndSortedItems.slice(start, start + rowsPerPage);
  }, [filteredAndSortedItems, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / rowsPerPage);

  const getVariant = (qty: number): 'out' | 'critical' | 'low' => {
    if (qty === 0) return 'out';
    if (qty <= 2) return 'critical';
    return 'low';
  };

  // Row Component
  const StockItemRow = ({ item }: { item: InventoryItem }) => {
    const variant = getVariant(item.stock_quantity);

    const styles = {
      out: {
        border: 'border-l-slate-600',
        bg: 'bg-slate-50 hover:bg-slate-100',
        text: 'text-slate-700',
        badge: 'bg-slate-200 text-slate-700 border-slate-300',
        message: 'Completely out of stock'
      },
      critical: {
        border: 'border-l-red-600',
        bg: 'bg-red-50/50 hover:bg-red-50',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700 border-red-200',
        message: `Only ${item.stock_quantity} units remaining`
      },
      low: {
        border: 'border-l-orange-500',
        bg: 'bg-orange-50/50 hover:bg-orange-50',
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-800 border-orange-200',
        message: `Running low: ${item.stock_quantity} units left`
      }
    }[variant];

    const vehicleLabel = item.vehicle_type
      ? (item.vehicle_type === 'motor' ? 'Motorcycle' : item.vehicle_type.charAt(0).toUpperCase() + item.vehicle_type.slice(1))
      : 'Unknown';

    return (
      <div className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-r-lg border border-gray-200 border-l-[6px] shadow-sm transition-all ${styles.border} ${styles.bg}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-slate-800">{item.name}</span>
            <Badge variant="outline" className="text-xs font-normal text-slate-500 bg-white border-slate-200">
              {vehicleLabel}
            </Badge>
          </div>
          <div className={`font-medium flex items-center gap-2 ${styles.text}`}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {styles.message}
          </div>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Cost</div>
            <div className="text-sm font-medium">₱{item.cost_price?.toFixed(2) || '0.00'}</div>
          </div>
          <Badge variant="outline" className={`px-3 py-1 font-semibold ${styles.badge}`}>
            {variant === 'out' ? 'Out of Stock' : variant === 'critical' ? 'Critical Stock' : 'Low Stock'}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl p-0 gap-0 font-poppins">

        {/* Gradient Header with X Close Button */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 sticky top-0 z-20 text-white relative">

          {/* X Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm border border-white/10">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              Stock Attention Required
            </DialogTitle>
            <DialogDescription className="text-white/90 font-medium ml-0 sm:ml-14 text-base">
              Review {allAlertItems.length} items below safety stock levels.
            </DialogDescription>
          </DialogHeader>

          {/* Filter & Sort Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-end bg-white p-4 rounded-xl border border-slate-200 shadow-lg mt-2 text-slate-800">

            {/* Flexed Filter Tabs */}
            <div className="flex flex-col w-full sm:w-auto flex-1 gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Alerts</Label>
              <div className="flex w-full gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                {[
                  { id: 'all', label: 'All Alerts' },
                  { id: 'out', label: 'Out of Stock' },
                  { id: 'critical', label: 'Critical' },
                  { id: 'low', label: 'Low Stock' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id as any)}
                    className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-md transition-all text-center whitespace-nowrap ${filterType === tab.id
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Side Controls: Sort & Rows */}
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="flex flex-col gap-1.5 flex-1 sm:flex-none">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort By</Label>
                <Select value={sortType} onValueChange={(v: any) => setSortType(v)}>
                  <SelectTrigger className="h-9 min-w-[140px] text-xs font-medium bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="severity">Severity (Default)</SelectItem>
                    <SelectItem value="vehicle">Vehicle Type</SelectItem>
                    <SelectItem value="name">Product Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 w-20">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rows</Label>
                <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
                  <SelectTrigger className="h-9 text-xs font-medium bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20].map(opt => (
                      <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 space-y-8 bg-slate-50/30 min-h-[400px]">
          <div className="space-y-3">
            {paginatedItems.length > 0 ? (
              paginatedItems.map(item => (
                <StockItemRow key={item.item_id} item={item} />
              ))
            ) : (
              <div className="text-center py-16 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
                <div className="p-4 bg-slate-50 rounded-full mb-3">
                  <CheckCircle className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-medium">No items match this filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Pagination on the Right */}
        <div className="p-4 border-t border-slate-200 bg-white sticky bottom-0 z-20 flex flex-row justify-between items-center">
          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredAndSortedItems.length === 0 ? 0 : ((page - 1) * rowsPerPage + 1)} to {Math.min(page * rowsPerPage, filteredAndSortedItems.length)} of {filteredAndSortedItems.length} issues
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-slate-700 px-2">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ViewMoreDialog = ({
  items,
  isOpen,
  onClose
}: {
  items: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
}) => {
  const calculateMargin = (item: InventoryItem) => {
    if (!item.cost_price || item.cost_price === 0) return 0;
    return ((item.sale_price - item.cost_price) / item.cost_price) * 100;
  };

  // Function to get stock status badge
  const getStockStatusBadge = (quantity: number) => {
    if (quantity === 0) return {
      text: 'Out of Stock',
      color: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    if (quantity <= 2) return {
      text: 'Critical',
      color: 'bg-red-100 text-red-700 border-red-200'
    };
    if (quantity <= 5) return {
      text: 'Low Stock',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    return {
      text: 'In Stock',
      color: 'bg-green-100 text-green-700 border-green-200'
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl font-poppins p-0">
        
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-400 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-white">
                Complete Inventory List
              </DialogTitle>
              <DialogDescription className="text-white/90 mt-1">
                Detailed view of all {items.length} inventory items
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                <PackageSearch className="h-3 w-3 mr-1" />
                {items.length} Items
              </Badge>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="p-6">
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left p-4 font-semibold text-slate-700 text-sm">Product Name</th>
                    <th className="text-left p-4 font-semibold text-slate-700 text-sm">Category</th>
                    <th className="text-left p-4 font-semibold text-slate-700 text-sm">Vehicle Type</th>
                    <th className="text-left p-4 font-semibold text-slate-700 text-sm">Stock</th>
                    <th className="text-left p-4 font-semibold text-slate-700 text-sm">Cost</th>
                    <th className="text-left p-4 font-semibold text-slate-700 text-sm">Price</th>
                    <th className="text-left p-4 font-semibold text-slate-700 text-sm">Margin</th>
                    <th className="text-left p-4 font-semibold text-slate-700 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const margin = calculateMargin(item);
                    const stockStatus = getStockStatusBadge(item.stock_quantity);
                    
                    return (
                      <tr 
                        key={item.item_id} 
                        className="hover:bg-slate-50/50 border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-medium text-slate-800">{item.name}</div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline" 
                            className="capitalize bg-slate-100 text-slate-700 border-slate-200"
                          >
                            {item.category}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <VehicleTypeBadge type={item.vehicle_type} />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-slate-900">{item.stock_quantity}</div>
                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-900">₱{item.cost_price.toFixed(2)}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-900">₱{item.sale_price.toFixed(2)}</div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="outline"
                            className={
                              margin >= 30 ? 'bg-green-100 text-green-700 border-green-200' :
                              margin >= 15 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                              'bg-red-100 text-red-700 border-red-200'
                            }
                          >
                            {margin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={stockStatus.color}>
                            {stockStatus.text}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Footer */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Total Value:</span> 
                  <span className="ml-2 font-bold text-slate-800">
                    ₱{items.reduce((acc, item) => acc + (item.sale_price * item.stock_quantity), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-4 w-px bg-slate-300"></div>
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Average Margin:</span> 
                  <span className="ml-2 font-bold text-slate-800">
                    {items.length > 0 
                      ? (items.reduce((acc, item) => acc + calculateMargin(item), 0) / items.length).toFixed(1) 
                      : '0.0'}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                  In Stock: {items.filter(i => i.stock_quantity > 5).length}
                </Badge>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                  Low: {items.filter(i => i.stock_quantity > 2 && i.stock_quantity <= 5).length}
                </Badge>
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                  Critical: {items.filter(i => i.stock_quantity > 0 && i.stock_quantity <= 2).length}
                </Badge>
                <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                  Out: {items.filter(i => i.stock_quantity === 0).length}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex items-center gap-2 border-slate-300 hover:border-slate-400"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
          <Button
            onClick={() => {
              handleExportExcel();
              onClose();
            }}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export This List
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default function EnhancedInventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [successAnimation, setSuccessAnimation] = useState<{
    isVisible: boolean;
    title: string;
    message: string;
    actionType: 'add' | 'edit' | 'delete' | 'export' | 'adjust';
  }>({
    isVisible: false,
    title: '',
    message: '',
    actionType: 'add'
  });

  // Pagination / rows-per-page state
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const rowsPerPageOptions = [5, 10, 25, 50];
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [isStockAdjustmentOpen, setIsStockAdjustmentOpen] = useState(false);
  const [isCriticalDetailsOpen, setIsCriticalDetailsOpen] = useState(false);
  const [isViewMoreOpen, setIsViewMoreOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);

  // Enhanced Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'all',
    vehicleType: 'all',
    stockStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Form state for Add/Edit dialog
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<InventoryItem['category'] | ''>('');
  const [itemVehicleType, setItemVehicleType] = useState<InventoryItem['vehicle_type'] | ''>('');
  const [itemCostPrice, setItemCostPrice] = useState('');
  const [itemSalePrice, setItemSalePrice] = useState('');
  const [itemStockQuantity, setItemStockQuantity] = useState('');
  const [formErrors, setFormErrors] = useState({
    name: false,
    category: false,
    vehicleType: false,
    costPrice: false,
    salePrice: false,
    stock: false
  });

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

    try {
      const { data, error } = await supabase
        .rpc('get_inventory_complete');

      if (error) {
        console.error('Error fetching inventory:', error.message);
        setFetchError(`Could not fetch inventory: ${error.message}`);
        setItems([]);
      } else {
        setItems((data || []) as InventoryItem[]);
        setFetchError(null);
        setLastUpdated(new Date());
      }
    } catch (error: any) {
      console.error('Network error:', error);
      setFetchError('Network error while fetching inventory');
      setItems([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Enhanced data processing with filtering and sorting
  const processedItems = useMemo(() => {
    let filtered = [...items];

    if (filters.search) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    if (filters.vehicleType !== 'all') {
      filtered = filtered.filter(item => item.vehicle_type === filters.vehicleType);
    }

    if (filters.stockStatus !== 'all') {
      switch (filters.stockStatus) {
        case 'inStock':
          filtered = filtered.filter(item => item.stock_quantity > 5);
          break;
        case 'lowStock':
          filtered = filtered.filter(item => item.stock_quantity > 2 && item.stock_quantity <= 5);
          break;
        case 'critical':
          filtered = filtered.filter(item => item.stock_quantity > 0 && item.stock_quantity <= 2);
          break;
        case 'outOfStock':
          filtered = filtered.filter(item => item.stock_quantity === 0);
          break;
      }
    }

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
        case 'vehicleType':
          aValue = a.vehicle_type;
          bValue = b.vehicle_type;
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

  const displayedItems = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedItems.slice(start, start + rowsPerPage);
  }, [processedItems, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.category, filters.vehicleType, filters.stockStatus, rowsPerPage, processedItems.length]);

  function calculateMargin(item: InventoryItem) {
    if (!item.cost_price || item.cost_price === 0) return 0;
    return ((item.sale_price - item.cost_price) / item.cost_price) * 100;
  }

  // Enhanced columns for DataTableWrapper
  const enhancedColumns = [
    { key: 'name', header: 'Product Name', sortable: true },
    {
      key: 'category',
      header: 'Category',
      render: (value: any, item: any) => (
        <Badge variant="outline" className="capitalize bg-slate-100 text-slate-700 border-slate-300">
          {String(value)}
        </Badge>
      )
    },
    {
      key: 'vehicle_type',
      header: 'Vehicle Type',
      render: (value: any, item: any) => <VehicleTypeBadge type={item.vehicle_type} />
    },
    {
      key: 'stock_quantity',
      header: 'Stock Level',
      sortable: true,
      render: (value: any, item: any) => <StockLevelIndicator quantity={Number(value)} reorderLevel={item.reorder_level} />
    },
    {
      key: 'adjust_stock',
      header: 'Adjust Stock',
      render: (value: any, item: any) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenStockAdjustment(item)}
          className="flex items-center gap-1"
        >
          <ArrowUpDown className="h-3 w-3" />
          Adjust Stock
        </Button>
      )
    },
    {
      key: 'cost_price',
      header: 'Cost (₱)',
      sortable: true,
      render: (value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      key: 'sale_price',
      header: 'Price (₱)',
      sortable: true,
      render: (value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      key: 'profit_margin',
      header: 'Margin %',
      render: (value: any, item: any) => {
        const margin = calculateMargin(item);
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
      }
    },
    // NEW ACTIONS COLUMN (Replaces 3-dot menu)
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, item: any) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEditDialog(item)}
            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Edit Item"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDeleteDialog(item)}
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Delete Item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const totalStockValue = processedItems.reduce((acc, p) => acc + (p.sale_price * p.stock_quantity), 0);
  const lowStockCount = items.filter(p => p.stock_quantity > 2 && p.stock_quantity <= 5).length;
  const outOfStockCount = items.filter(p => p.stock_quantity === 0).length;
  const criticalStockCount = items.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 2).length;

  const resetForm = () => {
    setItemName('');
    setItemCategory('');
    setItemVehicleType('');
    setItemCostPrice('');
    setItemSalePrice('');
    setItemStockQuantity('0');
    setFormErrors({
      name: false,
      category: false,
      vehicleType: false,
      costPrice: false,
      salePrice: false,
      stock: false
    });
  };

  const populateForm = (product: InventoryItem) => {
    setItemName(product.name);
    setItemCategory(product.category);
    setItemVehicleType(product.vehicle_type);
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
    populateForm(item);
    setEditingItem(item);
    setIsEditItemDialogOpen(true);
  };

  const handleOpenStockAdjustment = (item: InventoryItem) => {
    setAdjustingItem(item);
    setIsStockAdjustmentOpen(true);
  };

  const handleOpenDeleteDialog = (item: InventoryItem) => {
    setDeletingItem(item);
    setIsDeleteConfirmationOpen(true);
  };

  const handleSubmit = async () => {
    if (!supabase) return;

    const stockQuantity = parseInt(itemStockQuantity || '0');
    const costPrice = parseFloat(itemCostPrice || '0');
    const salePrice = parseFloat(itemSalePrice || '0');

    const errors = {
      name: !itemName.trim(),
      category: !itemCategory,
      vehicleType: !itemVehicleType,
      costPrice: costPrice < 0,
      salePrice: salePrice < 0,
      stock: stockQuantity < 0
    };

    setFormErrors(errors);

    if (Object.values(errors).some(error => error)) {
      toast({
        title: "Validation Error",
        description: "Please fix all errors before saving.",
        variant: "destructive"
      });
      return;
    }

    const itemData = {
      name: itemName.trim(),
      category: itemCategory as InventoryItem['category'],
      vehicle_type: itemVehicleType as InventoryItem['vehicle_type'],
      cost_price: costPrice,
      sale_price: salePrice,
      stock_quantity: stockQuantity,
    };

    setIsLoading(true);

    let error;
    let result;

    if (editingItem) {
      const { data, error: updateError } = await supabase
        .from('inventory_item')
        // @ts-ignore
        .update(itemData as any)
        .eq('item_id', editingItem.item_id)
        .select();
      error = updateError;
      result = data;
    } else {
      const { data, error: insertError } = await supabase
        .from('inventory_item')
        // @ts-ignore
        .insert([itemData] as any)
        .select();
      error = insertError;
      result = data;
    }

    setIsLoading(false);

    if (error) {
      console.error('Error saving item:', error);
      toast({ title: "Save Error", description: `Could not save item: ${error.message}`, variant: "destructive" });
    } else {
      if (editingItem) {
        setSuccessAnimation({
          isVisible: true,
          title: "Item Updated Successfully!",
          message: "The inventory item has been updated in the system.",
          actionType: 'edit'
        });
      } else {
        setSuccessAnimation({
          isVisible: true,
          title: "Item Added Successfully!",
          message: "Your new inventory item has been added to the system.",
          actionType: 'add'
        });
      }

      setIsAddItemDialogOpen(false);
      setIsEditItemDialogOpen(false);
      setEditingItem(null);
      resetForm();
      fetchProducts();
    }
  };

  const handleStockAdjustment = async (adjustment: number, reason: string) => {
    if (!adjustingItem || !supabase) return;

    const newQuantity = adjustingItem.stock_quantity + adjustment;
    if (newQuantity < 0) {
      toast({ title: "Error", description: "Stock cannot be negative.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase
      .from('inventory_item')
      // @ts-ignore
      .update({
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('item_id', adjustingItem.item_id);

    setIsLoading(false);

    if (error) {
      console.error('Error adjusting stock:', error);
      toast({ title: "Adjustment Error", description: `Could not adjust stock: ${error.message}`, variant: "destructive" });
    } else {
      setSuccessAnimation({
        isVisible: true,
        title: "Stock Adjusted Successfully!",
        message: `Stock has been updated by ${adjustment}. New quantity: ${newQuantity}`,
        actionType: 'adjust'
      });

      setIsStockAdjustmentOpen(false);
      setAdjustingItem(null);
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

      // Handle foreign key constraint violation (item is referenced in sale_item table)
      if (error.code === '23503') {
        toast({
          title: "Cannot Delete Item",
          description: "This item cannot be deleted because it has been used in one or more sales. Consider setting stock to 0 instead if you want to hide it from active inventory.",
          variant: "destructive"
        });
      } else {
        toast({ title: "Delete Error", description: `Could not delete item: ${error.message}`, variant: "destructive" });
      }
    } else {
      setSuccessAnimation({
        isVisible: true,
        title: "Item Deleted Successfully!",
        message: "The inventory item has been removed from the system.",
        actionType: 'delete'
      });

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
      vehicleType: 'all',
      stockStatus: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  const handleExportExcel = () => {
    const headers = ['Product Name', 'Category', 'Vehicle Type', 'Stock Level', 'Cost Price (₱)', 'Sale Price (₱)', 'Margin %', 'Status'];

    const csvContent = [
      headers.join(','),
      ...processedItems.map(item => {
        const margin = calculateMargin(item);
        const status = item.stock_quantity === 0 ? 'Out of Stock' :
          item.stock_quantity <= 2 ? 'Critical' :
            item.stock_quantity <= 5 ? 'Low Stock' : 'In Stock';

        return [
          `"${item.name}"`,
          item.category,
          item.vehicle_type,
          item.stock_quantity,
          item.cost_price.toFixed(2),
          item.sale_price.toFixed(2),
          margin.toFixed(1),
          status
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessAnimation({
      isVisible: true,
      title: "Export Successful!",
      message: `Exported ${processedItems.length} items to CSV file.`,
      actionType: 'export'
    });
  };

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
        <div className="absolute top-0 left-0 w-32 h-32 bg-purple-300/20 rounded-br-full"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-300/20 rounded-bl-full"></div>
      </div>

      <div className="absolute top-64 left-0 w-full h-full bg-indigo-50/10">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-100/15 to-indigo-50/10"></div>
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
          criticalCount={criticalStockCount}
          warningCount={lowStockCount}
          outOfStockCount={outOfStockCount}
          onShowDetails={() => setIsCriticalDetailsOpen(true)}
        />

<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
  {/* Add New Item */}
  <button
    type="button"
    onClick={handleOpenAddDialog}
    className="flex items-center justify-between gap-4 p-4 rounded-xl shadow-lg text-white transition-transform hover:-translate-y-1 min-h-[100px] w-full"
    style={{ background: 'linear-gradient(90deg,#7c3aed 0%,#4f46e5 100%)' }}
  >
    <div className="text-left">
      <div className="text-lg font-semibold">Add New Item</div>
      <div className="text-sm opacity-90">Create a new inventory item</div>
    </div>
    <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-lg">
      <Plus className="h-5 w-5 text-white" />
    </div>
  </button>

  {/* Export Excel */}
  <button
    type="button"
    onClick={handleExportExcel}
    className="flex items-center justify-between gap-4 p-4 rounded-xl shadow-lg text-white transition-transform hover:-translate-y-1 min-h-[100px] w-full"
    style={{ background: 'linear-gradient(90deg,#0ea5e9 0%,#0284c7 100%)' }}
  >
    <div className="text-left">
      <div className="text-lg font-semibold">Export Excel</div>
      <div className="text-sm opacity-90">Download filtered items</div>
    </div>
    <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-lg">
      <Download className="h-5 w-5 text-white" />
    </div>
  </button>

  {/* View More */}
  <button
    type="button"
    onClick={() => setIsViewMoreOpen(true)}
    className="flex items-center justify-between gap-4 p-4 rounded-xl shadow-lg text-white transition-transform hover:-translate-y-1 min-h-[100px] w-full"
    style={{ background: 'linear-gradient(90deg,#10b981 0%,#06b6d4 100%)' }}
  >
    <div className="text-left">
      <div className="text-lg font-semibold">View More</div>
      <div className="text-sm opacity-90">Open detailed list</div>
    </div>
    <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-lg">
      <Eye className="h-5 w-5 text-white" />
    </div>
  </button>
</div>

        {/* Enhanced Inventory Table using DataTableWrapper */}
        <section aria-labelledby="inventory-list-heading">
  {isLoading && items.length === 0 && !fetchError ? (
    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-slate-200 p-8">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
      <p className="text-slate-600">Loading inventory items...</p>
    </div>
  ) : (
    <>
      {/* Single rounded card: gradient header + table */}
      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
        <div className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-400 text-white p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <PackageSearch className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold font-poppins">Inventory Items</div>
              <div className="text-sm opacity-90">Track products, stock levels and pricing</div>
              <div className="text-sm text-white/90 mt-1">
                {filters.search || filters.category !== 'all' || filters.stockStatus !== 'all' || filters.vehicleType !== 'all' ? (
                  <>Filtered: <strong>{processedItems.length}</strong> of <strong>{items.length}</strong> items</>
                ) : (
                  <>Total: <strong>{items.length}</strong> items</>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters - ALWAYS VISIBLE */}
        <AdvancedFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={setRowsPerPage}
        />

        {/* Show empty state ONLY when there are no items, but keep it inside the table card */}
        {processedItems.length === 0 ? (
          <div className="p-8">
            <EnhancedEmptyState
              filters={filters}
              onClearFilters={handleClearFilters}
              onAddItem={handleOpenAddDialog}
              variant="table"
              />
          </div>
        ) : (
          <>
            <DataTableWrapper
              className="w-full"
              columns={enhancedColumns}
              data={displayedItems.map(i => ({ ...i, id: i.item_id }))}
            />

            {/* Footer: Showing X of Y + Pager - UPDATED PAGINATION */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-500">
                Showing <span className="text-slate-500 font-xs">{processedItems.length === 0 ? 0 : ((currentPage - 1) * rowsPerPage + 1)}</span> to <span className="text-slate-500 font-xs">{Math.min(currentPage * rowsPerPage, processedItems.length)}</span> of <span className="text-slate-500 font-xs">{processedItems.length}</span> entries
              </div>

              <div className="flex items-center gap-2">
                {/* First Page Button */}
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md"
                  title="First Page"
                >
                  <span className="text-lg">«</span>
                </Button>

                {/* Previous Page Button */}
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md"
                  title="Previous Page"
                >
                  <span className="text-lg">‹</span>
                </Button>

                {/* Page Indicator Text */}
                <div className="text-sm font-xs text-slate-500 px-2 min-w-[80px] text-center select-none">
                  Page {currentPage} of {Math.max(1, Math.ceil(processedItems.length / rowsPerPage))}
                </div>

                {/* Next Page Button */}
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(processedItems.length / rowsPerPage) || 1, p + 1))}
                  disabled={currentPage >= Math.ceil(processedItems.length / rowsPerPage)}
                  className="h-9 w-9 p-0 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md"
                  title="Next Page"
                >
                  <span className="text-lg">›</span>
                </Button>

                {/* Last Page Button */}
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, Math.ceil(processedItems.length / rowsPerPage)))}
                  disabled={currentPage >= Math.ceil(processedItems.length / rowsPerPage)}
                  className="h-9 w-9 p-0 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md"
                  title="Last Page"
                >
                  <span className="text-lg">»</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )}
</section>
      </div>

      {/* === DIALOGS / MODALS === */}
      {/* Add / Edit Item Dialog */}
      <Dialog
        open={isAddItemDialogOpen || isEditItemDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddItemDialogOpen(false);
            setIsEditItemDialogOpen(false);
            setEditingItem(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl bg-white border border-slate-200 shadow-2xl font-poppins">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isEditItemDialogOpen ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
            <DialogDescription>
              {isEditItemDialogOpen ? 'Update inventory item details' : 'Create a new inventory item'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {/* Compact form in list style */}
            <div className="space-y-3">
              {/* Row 1: Product Name and Stock */}
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Product Name *</Label>
                  <Input
                    placeholder="[SIZE] [BRAND]"
                    value={itemName}
                    onChange={(e) => {
                      setItemName(e.target.value);
                      if (formErrors.name) {
                        setFormErrors(prev => ({ ...prev, name: false }));
                      }
                    }}
                    className={
                      formErrors.name
                        ? "border-red-500 focus:border-red-500 bg-white h-9"
                        : "border-slate-300 focus:border-indigo-400 bg-white h-9"
                    }
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Product Name is required
                    </p>
                  )}
                </div>

                <div className="w-32">
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Stock</Label>
                  <div className="flex items-center border border-slate-300 rounded-md bg-white focus-within:border-indigo-400 overflow-hidden h-9">
                    <button
                      type="button"
                      onClick={() => setItemStockQuantity(prev => Math.max(0, parseInt(prev || '0') - 1).toString())}
                      className="px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors border-r border-gray-200 flex items-center justify-center w-8 h-full text-sm"
                    >
                      -
                    </button>
                    <Input
                      placeholder="0"
                      value={itemStockQuantity}
                      onChange={(e) => {
                        setItemStockQuantity(e.target.value);
                        // Clear stock error when user starts typing
                        if (formErrors.stock) {
                          setFormErrors(prev => ({ ...prev, stock: false }));
                        }
                      }}
                      className={
                        formErrors.stock
                          ? "border-0 text-center focus:ring-0 shadow-none flex-1 h-full text-sm px-1 border-red-500"
                          : "border-0 text-center focus:ring-0 shadow-none flex-1 h-full text-sm px-1"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setItemStockQuantity(prev => (parseInt(prev || '0') + 1).toString())}
                      className="px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors border-l border-gray-200 flex items-center justify-center w-8 h-full text-sm"
                    >
                      +
                    </button>
                  </div>
                  {formErrors.stock && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Stock cannot be negative
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Category and Vehicle Type */}
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Category *</Label>
                  <Select
                    value={itemCategory}
                    onValueChange={(v) => {
                      setItemCategory(v as any);
                      if (formErrors.category) {
                        setFormErrors(prev => ({ ...prev, category: false }));
                      }
                    }}
                  >
                    <SelectTrigger className={
                      formErrors.category
                        ? "border-red-500 focus:border-red-500 bg-white h-9"
                        : "border-slate-300 focus:border-indigo-400 bg-white h-9"
                    }>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tire">Tire</SelectItem>
                      <SelectItem value="tool">Tool</SelectItem>
                      <SelectItem value="accessory">Accessory</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.category && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Category is required
                    </p>
                  )}
                </div>

                <div className="flex-1">
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Vehicle Type *</Label>
                  <Select
                    value={itemVehicleType}
                    onValueChange={(v) => {
                      setItemVehicleType(v as any);
                      if (formErrors.vehicleType) {
                        setFormErrors(prev => ({ ...prev, vehicleType: false }));
                      }
                    }}
                  >
                    <SelectTrigger className={
                      formErrors.vehicleType
                        ? "border-red-500 focus:border-red-500 bg-white h-9"
                        : "border-slate-300 focus:border-indigo-400 bg-white h-9"
                    }>
                      <SelectValue placeholder="Select Vehicle Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="motor">Motorcycle</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.vehicleType && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Vehicle Type is required
                    </p>
                  )}
                </div>
              </div>

              {/* Row 3: Prices */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Cost Price (₱)</Label>
                  <Input
                    placeholder="0.00"
                    value={itemCostPrice}
                    onChange={(e) => {
                      setItemCostPrice(e.target.value);
                      // Clear cost price error when user starts typing
                      if (formErrors.costPrice) {
                        setFormErrors(prev => ({ ...prev, costPrice: false }));
                      }
                    }}
                    className={
                      formErrors.costPrice
                        ? "border-red-500 focus:border-red-500 bg-white h-9"
                        : "border-slate-300 focus:border-indigo-400 bg-white h-9"
                    }
                  />
                  {formErrors.costPrice && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Cost price cannot be negative
                    </p>
                  )}
                </div>

                <div className="flex-1">
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Sale Price (₱)</Label>
                  <Input
                    placeholder="0.00"
                    value={itemSalePrice}
                    onChange={(e) => {
                      setItemSalePrice(e.target.value);
                      // Clear sale price error when user starts typing
                      if (formErrors.salePrice) {
                        setFormErrors(prev => ({ ...prev, salePrice: false }));
                      }
                    }}
                    className={
                      formErrors.salePrice
                        ? "border-red-500 focus:border-red-500 bg-white h-9"
                        : "border-slate-300 focus:border-indigo-400 bg-white h-9"
                    }
                  />
                  {formErrors.salePrice && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Sale price cannot be negative
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddItemDialogOpen(false);
                setIsEditItemDialogOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault(); // Prevent standard form submission issues
                handleSubmit();
              }}
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditItemDialogOpen ? 'Saving...' : 'Adding...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditItemDialogOpen ? 'Save Changes' : 'Save Item'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStockAdjustmentOpen} onOpenChange={(open) => { if (!open) { setIsStockAdjustmentOpen(false); setAdjustingItem(null); } }}>
      <DialogContent className="sm:max-w-xl bg-white border border-slate-200 shadow-2xl font-poppins">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Adjust Stock</DialogTitle>
            <DialogDescription>Modify stock quantity for the selected item</DialogDescription>
          </DialogHeader>
          {adjustingItem && (
            <div className="p-4">
              <StockAdjustmentForm
                item={adjustingItem}
                onSave={async (adj, reason) => { await handleStockAdjustment(adj, reason); }}
                onCancel={() => { setIsStockAdjustmentOpen(false); setAdjustingItem(null); }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === ADDED MISSING DELETE CONFIRMATION DIALOG === */}
      <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
      <AlertDialogContent className="bg-white border border-slate-200 shadow-xl rounded-xl font-poppins">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold text-slate-800">
              Delete Item?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{deletingItem?.name}"</span>?
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
            <AlertDialogCancel className="mt-0 w-full sm:w-auto border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // Prevent auto-close to handle async loading
                handleDeleteItem();
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-0"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                'Delete Item'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Critical Stock Details (Review Alerts) */}
      <CriticalStockDetails
        items={items}
        isOpen={isCriticalDetailsOpen}
        onClose={() => setIsCriticalDetailsOpen(false)}
      />

      {/* View More Dialog */}
      <ViewMoreDialog
        items={items}
        isOpen={isViewMoreOpen}
        onClose={() => setIsViewMoreOpen(false)}
      />

      {/* Success Animation for All Actions */}
      <SuccessAnimation
        isVisible={successAnimation.isVisible}
        title={successAnimation.title}
        message={successAnimation.message}
        actionType={successAnimation.actionType}
        onConfirm={() => setSuccessAnimation(prev => ({ ...prev, isVisible: false }))}
      />

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
                className="text-red-600 hover:text-red-800 transition-all duration-300"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

<style jsx global>{`
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
  
  /* Apply Poppins globally for form elements */
  body, input, textarea, select, button {
    font-family: 'Poppins', sans-serif;
  }

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