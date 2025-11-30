"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { 
  Archive, Coins, AlertTriangle, PlusCircle, PackageSearch, Loader2, Filter,
  TrendingUp, Clock, RefreshCw, Plus, Search, X, Download, SlidersHorizontal,
  ArrowUpDown, Eye, Save, CheckCircle
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
  // ✅ UPDATED: InventoryItem interface with calculated fields (around line 51)
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
    
    // ✅ ADD: Calculated fields from RPC function
    profit_margin?: number;          // Calculated: ((sale_price - cost_price) / cost_price) * 100
    total_value?: number;            // Calculated: stock_quantity * cost_price
    potential_profit?: number;       // Calculated: stock_quantity * (sale_price - cost_price)
    stock_status?: 'in_stock' | 'low_stock' | 'critical' | 'out_of_stock';
    days_since_update?: number;      // Days since last update
    
    // ✅ ADD: Joined data
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

// Vehicle type configuration - FIXED: Ensure all vehicle types are properly defined
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
        <span className={`text-sm font-medium ${
          stock.level === 'out' ? 'text-gray-600' :
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

// Vehicle Type Badge Component - FIXED: Added proper type checking and fallback
const VehicleTypeBadge = ({ type }: { type: 'car' | 'motor' | 'truck' }) => {
  // Use the config if it exists, otherwise use a default fallback
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

  // Different icons and colors based on action type
  const getActionConfig = () => {
    switch (actionType) {
      case 'add':
        return { 
          gradient: 'from-green-500 to-emerald-600',
          icon: PlusCircle 
        };
      case 'edit':
        return { 
          gradient: 'from-blue-500 to-cyan-600',
          icon: Save 
        };
      case 'delete':
        return { 
          gradient: 'from-red-500 to-orange-600',
          icon: Archive 
        };
      case 'export':
        return { 
          gradient: 'from-purple-500 to-indigo-600',
          icon: Download 
        };
      case 'adjust':
        return { 
          gradient: 'from-amber-500 to-yellow-600',
          icon: ArrowUpDown 
        };
      default:
        return { 
          gradient: 'from-purple-500 to-indigo-600',
          icon: CheckCircle 
        };
    }
  };

  const { gradient, icon: ActionIcon } = getActionConfig();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in duration-300">
        <div className={`w-20 h-20 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500`}>
          <ActionIcon className="h-12 w-12 text-white animate-in scale-in duration-700 delay-300" />
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-2 font-poppins">
          {title}
        </h3>

        <p className="text-slate-600 mb-6 font-poppins">
          {message}
        </p>

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

// Success Confirmation Component
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
  // Guard against undefined/null item (prevents errors like accessing item.name)
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w bg-white border border-green-200 shadow-2xl">
        <div className="flex flex-col items-center text-center p-6">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          {/* Success Message */}
          <DialogTitle className="text-xl font-bold text-green-800 mb-2">
            Item Added Successfully!
          </DialogTitle>
          
          <DialogDescription className="text-slate-600 mb-6">
            Your new inventory item has been added to the system.
          </DialogDescription>

          {/* Item Details */}
          <div className="w-full flex justify-center mb-6">
            <div className="w-full sm:max-w-md bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-left space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Product Name:</span>
                  <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Category:</span>
                  <Badge variant="outline" className="capitalize bg-slate-100 text-slate-700 border-slate-300">
                    {item.category}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Vehicle Type:</span>
                  <VehicleTypeBadge type={item.vehicle_type} />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Stock Quantity:</span>
                  <span className="text-sm font-semibold text-slate-900">{item.stock_quantity}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Cost Price:</span>
                  <span className="text-sm font-semibold text-slate-900">₱{item.cost_price.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Sale Price:</span>
                  <span className="text-sm font-semibold text-slate-900">₱{item.sale_price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <Button
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0"
            >
              Continue Managing Inventory
            </Button>
            <Button
              onClick={() => {
                onClose();
                onAddAnother();
              }}
              variant="outline"
              className="flex-1 border-slate-300"
            >
              Add Another Item
            </Button>
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
  onClearFilters 
}: { 
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
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
      
      {/* Top Section: Search and Sort */}
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

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="w-1/2 lg:w-40">
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

          <div className="w-1/2 lg:w-32">
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
          
          {hasActiveFilters && (
            <div className="hidden lg:flex items-end pb-0.5">
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

            {/* Added w-full to container to ensure buttons stretch */}
            <div className="flex flex-wrap gap-2 w-full">
              {group.options.map((option) => {
                const isActive = filters[group.id] === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => handleFilterToggle(group.id, option.value)}
                    className={`
                      /* Added flex-1 to make buttons grow to fill space */
                      flex-1 
                      min-w-[80px] /* Prevents them from getting too squished on mobile */
                      px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200
                      flex items-center justify-center whitespace-nowrap
                      ${isActive 
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-sm'
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
// Redesigned Stock Alerts Component
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
    red: { border: 'border-l-red-500', icon: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
    orange: { border: 'border-l-orange-500', icon: 'text-orange-600', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
    yellow: { border: 'border-l-yellow-500', icon: 'text-yellow-600', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700' }
  }[severityColor];

  // Calculate percentages
  const outOfStockPercent = (outOfStockCount / totalAlerts) * 100;
  const criticalPercent = (criticalCount / totalAlerts) * 100;
  const warningPercent = (warningCount / totalAlerts) * 100;

  return (
    <div 
      className={`mb-8 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 ${colors.border}`}
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
          <div className={`text-2xl font-bold ${
            newQuantity < 0 ? 'text-red-600' : 
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

//Critical Stock Details
// Enhanced Critical Stock Details - Updated Labels
const CriticalStockDetails = ({ 
  items, 
  isOpen, 
  onClose 
}: { 
  items: InventoryItem[]; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('high');
  const [actionPlan, setActionPlan] = useState('');
  
  const [filterType, setFilterType] = useState<'all' | 'out' | 'critical' | 'low'>('all');
  const [sortType, setSortType] = useState<'severity' | 'name' | 'vehicle'>('severity');

  // 1. Get all relevant alert items first
  const allAlertItems = useMemo(() => {
    return items.filter(item => item.stock_quantity <= 5);
  }, [items]);

  // 2. Apply Filters and Sorting
  const displayedItems = useMemo(() => {
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
          {/* ✅ UPDATED BADGE LABELS HERE */}
          <Badge variant="outline" className={`px-3 py-1 font-semibold ${styles.badge}`}>
            {variant === 'out' ? 'Out of Stock' : variant === 'critical' ? 'Critical Stock' : 'Low Stock'}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl p-0 gap-0">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-20">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              Stock Attention Required
            </DialogTitle>
            <DialogDescription className="text-slate-500 ml-12">
              Review {allAlertItems.length} items below safety stock levels.
            </DialogDescription>
          </DialogHeader>

          {/* Filter & Sort Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 ml-12">
            
            {/* ✅ UPDATED FILTER TABS HERE */}
            <div className="flex gap-1 p-1 bg-white rounded-md border border-slate-200 shadow-sm">
              {[
                { id: 'all', label: 'All Alerts' },
                { id: 'out', label: 'Out of Stock' },     // Changed from 'Empty'
                { id: 'critical', label: 'Critical Stock' }, // Changed from 'Critical'
                { id: 'low', label: 'Low Stock' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterType === tab.id 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Sort by:</span>
              <Select value={sortType} onValueChange={(v: any) => setSortType(v)}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="severity">Severity (Default)</SelectItem>
                  <SelectItem value="vehicle">Vehicle Type</SelectItem>
                  <SelectItem value="name">Product Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 space-y-8">
          <div className="space-y-3 min-h-[200px]">
            {displayedItems.length > 0 ? (
              displayedItems.map(item => (
                <StockItemRow key={item.item_id} item={item} />
              ))
            ) : (
              <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                No items match this filter.
              </div>
            )}
          </div>

          {/* Action Plan Section */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-8">
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Restocking Action Plan
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Priority Level</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="Select priority..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high" className="text-red-600 font-medium">High - Immediate Order</SelectItem>
                      <SelectItem value="medium" className="text-orange-600 font-medium">Medium - Within 3 Days</SelectItem>
                      <SelectItem value="low" className="text-blue-600 font-medium">Low - Add to next scheduled order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Supplier Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g., Contact Supplier X for bulk discount..."
                    className="min-h-[80px] bg-white border-slate-300 resize-none"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Action Description</Label>
                <Textarea
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                  placeholder="Describe the plan to address these stock issues..."
                  className="min-h-[155px] bg-white border-slate-300 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 border-t border-slate-100 bg-slate-50/50 sticky bottom-0 z-20">
          <Button onClick={onClose} variant="outline" className="h-11 px-6 border-slate-300 hover:bg-slate-100">
            Cancel
          </Button>
          <Button 
            onClick={() => { alert('Action plan saved!'); onClose(); }}
            className="h-11 px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-md"
          >
            Save Action Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// View More Dialog Component with Table View
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Complete Inventory List
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Detailed view of all inventory items with comprehensive information
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Product Name</th>
                  <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Category</th>
                  <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Vehicle Type</th>
                  <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Stock</th>
                  <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Cost (₱)</th>
                  <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Price (₱)</th>
                  <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const margin = calculateMargin(item);
                  return (
                    <tr key={item.item_id} className="hover:bg-slate-50">
                      <td className="border border-slate-200 p-3">{item.name}</td>
                      <td className="border border-slate-200 p-3 capitalize">{item.category}</td>
                      <td className="border border-slate-200 p-3">
                        <VehicleTypeBadge type={item.vehicle_type} />
                      </td>
                      <td className="border border-slate-200 p-3">
                        <StockLevelIndicator quantity={item.stock_quantity} />
                      </td>
                      <td className="border border-slate-200 p-3">₱{item.cost_price.toFixed(2)}</td>
                      <td className="border border-slate-200 p-3">₱{item.sale_price.toFixed(2)}</td>
                      <td className="border border-slate-200 p-3">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
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

  // Add this state near your other useState declarations
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
  const [itemCategory, setItemCategory] = useState<InventoryItem['category']>('');
  const [itemVehicleType, setItemVehicleType] = useState<InventoryItem['vehicle_type']>('');
  const [itemCostPrice, setItemCostPrice] = useState('');
  const [itemSalePrice, setItemSalePrice] = useState('');
  const [itemStockQuantity, setItemStockQuantity] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ OPTIMIZED: Replace fetchProducts function (around line 765)
  const fetchProducts = useCallback(async () => {
    if (!supabase) {
      setFetchError("Supabase client is not available. Please check your environment variables.");
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 🔥 Single optimized RPC call with all calculations and joins!
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

    // Apply vehicle type filter
    if (filters.vehicleType !== 'all') {
      filtered = filtered.filter(item => item.vehicle_type === filters.vehicleType);
    }

    // Apply stock status filter
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

  // derive the currently visible slice for the table
  const displayedItems = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedItems.slice(start, start + rowsPerPage);
  }, [processedItems, currentPage, rowsPerPage]);

  // reset page when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.category, filters.vehicleType, filters.stockStatus, rowsPerPage, processedItems.length]);

  function calculateMargin(item: InventoryItem) {
    if (!item.cost_price || item.cost_price === 0) return 0;
    return ((item.sale_price - item.cost_price) / item.cost_price) * 100;
  }

  // Enhanced columns for DataTableWrapper with search functionality
  const enhancedColumns = [
    { 
      key: 'name', 
      header: 'Product Name',
      sortable: true
    },
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
  ];

  // Calculate stats
  const totalStockValue = processedItems.reduce((acc, p) => acc + (p.sale_price * p.stock_quantity), 0);
  const lowStockCount = items.filter(p => p.stock_quantity > 2 && p.stock_quantity <= 5).length;
  const outOfStockCount = items.filter(p => p.stock_quantity === 0).length;
  const criticalStockCount = items.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 2).length;

  // Add this state for tracking validation errors
  const [formErrors, setFormErrors] = useState({
    name: false,
    category: false,
    vehicleType: false,
    costPrice: false,
    salePrice: false,
    stock: false
  });

  // Update the resetForm function to clear errors
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
    
    // Validate required fields and negative values
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
    
    // Check if any errors exist
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
      category: itemCategory,
      vehicle_type: itemVehicleType,
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
          .update(itemData)
          .eq('item_id', editingItem.item_id)
          .select();
        error = updateError;
        result = data;
    } else {
        const { data, error: insertError } = await supabase
          .from('inventory_item')
          .insert([itemData])
          .select();
        error = insertError;
        result = data;
    }
  
    setIsLoading(false);
  
    if (error) {
      console.error('Error saving item:', error);
      toast({ title: "Save Error", description: `Could not save item: ${error.message}`, variant: "destructive" });
    } else {
      // Show success animation based on action type
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
      .update({ 
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('item_id', adjustingItem.item_id);
  
    setIsLoading(false);
  
    // In handleStockAdjustment function, replace the success handling with:
if (error) {
  console.error('Error adjusting stock:', error);
  toast({ title: "Adjustment Error", description: `Could not adjust stock: ${error.message}`, variant: "destructive" });
} else {
  // Show success animation for stock adjustment
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
  
    // In handleDeleteItem function, replace the success handling with:
if (error) {
  console.error('Error deleting item:', error);
  toast({ title: "Delete Error", description: `Could not delete item: ${error.message}`, variant: "destructive" });
} else {
  // Show success animation for deletion
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

  // Enhanced Excel Export with better formatting
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

  // Show success animation for export
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
          outOfStockCount={outOfStockCount} // NEW: Add out of stock count
          onShowDetails={() => setIsCriticalDetailsOpen(true)}
        />

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Add New Item - large gradient card */}
              <button
                type="button"
                onClick={handleOpenAddDialog}
                className="min-w-[220px] flex-1 sm:flex-auto flex items-center justify-between gap-4 p-4 rounded-xl shadow-lg text-white transition-transform hover:-translate-y-1"
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

              {/* Export Excel - blue gradient card */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="min-w-[220px] flex-1 sm:flex-auto flex items-center justify-between gap-4 p-4 rounded-xl shadow-lg text-white transition-transform hover:-translate-y-1"
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

              {/* View More - green gradient card */}
              <button
                type="button"
                onClick={() => setIsViewMoreOpen(true)}
                className="min-w-[220px] flex-1 sm:flex-auto flex items-center justify-between gap-4 p-4 rounded-xl shadow-lg text-white transition-transform hover:-translate-y-1"
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
          {/* Using DataTableWrapper instead of custom table card */}
          {isLoading && items.length === 0 && !fetchError ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-slate-200 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
              <p className="text-slate-600">Loading inventory items...</p>
            </div>
          ) : processedItems.length === 0 ? (
            <EnhancedEmptyState 
              filters={filters}
              onClearFilters={handleClearFilters}
              onAddItem={handleOpenAddDialog}
            />
          ) : (
            <>
              {/* Single rounded card: gradient header + table (header spans full card width) */}
              <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                <div className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-400 text-white p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <PackageSearch className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-xl font-bold font-poppins">Inventory Items</div>
                      <div className="text-sm opacity-90">Track products, stock levels and pricing</div>
                      {/* Total / Filtered count moved here (left, below title/subtitle) */}
                      <div className="text-sm text-white/90 mt-1">
                        {filters.search || filters.category !== 'all' || filters.stockStatus !== 'all' || filters.vehicleType !== 'all' ? (
                          <>Filtered: <strong>{processedItems.length}</strong> of <strong>{items.length}</strong> items</>
                        ) : (
                          <>Total: <strong>{items.length}</strong> items</>
                        )}
                      </div>
                    </div>
                  </div>
 
                  {/* Rows per page relocated to the header (right side) */}
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-white/90 mr-2">Rows per page:</div>
                    <div className="w-28">
                      <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
                        <SelectTrigger className="w-full border-transparent bg-white text-black">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rowsPerPageOptions.map(option => (

                            <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
 
                {/* Advanced Filters now live directly under the gradient header so they appear as part of the table header */}
                <div>
                  <AdvancedFilters 
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClearFilters={handleClearFilters}
                  />
                </div>

                   {/* DataTableWrapper without its own title so the gradient header remains part of the same card */}
                   <DataTableWrapper
                     className="w-full"
                     columns={enhancedColumns}
                     data={displayedItems.map(i => ({ ...i, id: i.item_id }))}
                     onEdit={handleOpenEditDialog}
                     onDelete={handleOpenDeleteDialog}
                   />
                 {/* footer: rows-per-page + showing X of Y + simple pager */}
                <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Showing {processedItems.length === 0 ? 0 : ((currentPage - 1) * rowsPerPage + 1)} to {Math.min(currentPage * rowsPerPage, processedItems.length)} of {processedItems.length} entries
                  </div>
                  {/* Pager only (rows-per-page moved to header) */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="min-w-[36px] h-8 px-2 py-1"
                    >
                      «
                    </Button>
                    <div className="text-sm text-slate-700 px-3">Page {currentPage} of {Math.max(1, Math.ceil(processedItems.length / rowsPerPage))}</div>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(processedItems.length / rowsPerPage) || 1, p + 1))}
                      disabled={currentPage >= Math.ceil(processedItems.length / rowsPerPage)}
                      className="min-w-[36px] h-8 px-2 py-1"
                    >
                      »
                    </Button>
                  </div>
                </div>
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
        <DialogContent className="sm:max-w-2xl bg-white border border-slate-200 shadow-2xl">
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
 
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddItemDialogOpen(false); setIsEditItemDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockAdjustmentOpen} onOpenChange={(open) => { if (!open) { setIsStockAdjustmentOpen(false); setAdjustingItem(null); } }}>
        <DialogContent className="sm:max-w-xl bg-white border border-slate-200 shadow-2xl">
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