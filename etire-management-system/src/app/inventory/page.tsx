"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { 
  Archive, Coins, AlertTriangle, PlusCircle, PackageSearch, Loader2, Filter,
  TrendingUp, Clock, RefreshCw, Plus, Search, X, Download, SlidersHorizontal,
  ArrowUpDown, Eye, Save
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
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper function to check if a specific filter is active
  const isFilterActive = (category: string, value: string) => {
    if (category === 'stockStatus') {
      return filters.stockStatus === value;
    } else if (category === 'category') {
      return filters.category === value;
    } else if (category === 'vehicleType') {
      return filters.vehicleType === value;
    }
    return false;
  };

  // Toggle filter function - allows multiple categories to be selected
  const handleFilterToggle = (category: 'stockStatus' | 'category' | 'vehicleType', value: string) => {
    const currentValue = filters[category];
    
    if (currentValue === value) {
      // If clicking the same filter that's already active, deactivate it
      onFiltersChange({ 
        ...filters, 
        [category]: 'all' 
      });
    } else {
      // Otherwise, activate this filter in its category (don't reset other categories)
      onFiltersChange({ 
        ...filters, 
        [category]: value
      });
    }
  };

  // Check if any filters are active
  const hasActiveFilters = filters.search || 
                          filters.category !== 'all' || 
                          filters.stockStatus !== 'all' || 
                          filters.vehicleType !== 'all';

  // Get active filter count for badges
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.stockStatus !== 'all') count++;
    if (filters.vehicleType !== 'all') count++;
    if (filters.search) count++;
    return count;
  };

  // Categorized filter groups
  const filterCategories = [
    {
      title: "Stock Status",
      icon: AlertTriangle,
      category: 'stockStatus' as const,
      filters: [
        { label: "Low Stock", value: "lowStock", icon: AlertTriangle, description: "3-5 units left" },
        { label: "Critical Stock", value: "critical", icon: AlertTriangle, description: "1-2 units left" },
        { label: "Out of Stock", value: "outOfStock", icon: PackageSearch, description: "0 units" }
      ]
    },
    {
      title: "Product Categories",
      icon: PackageSearch,
      category: 'category' as const,
      filters: [
        { label: "Tires", value: "tire", icon: PackageSearch, description: "All tires" },
        { label: "Tools", value: "tool", icon: PackageSearch, description: "All tools" },
        { label: "Accessories", value: "accessory", icon: PackageSearch, description: "All accessories" }
      ]
    },
    {
      title: "Vehicle Types",
      icon: PackageSearch,
      category: 'vehicleType' as const,
      filters: [
        { label: "Car Items", value: "car", icon: PackageSearch, description: "For cars" },
        { label: "Motorcycle Items", value: "motor", icon: PackageSearch, description: "For motorcycles" },
        { label: "Truck Items", value: "truck", icon: PackageSearch, description: "For trucks" }
      ]
    }
  ];

  return (
    <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-200 shadow-sm">
      {/* Quick Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
        {/* Search Box */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 transition-all duration-300" />
          <Input
            placeholder="Search products by name..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10 border-slate-300 focus:border-indigo-400 transition-all duration-300"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all duration-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand/Collapse Filters */}
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 transition-all duration-300"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {isExpanded ? 'Hide Filters' : 'Show Filters'}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 bg-indigo-100 text-indigo-700">
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>

        {/* Clear Filters - Only show when filters are active */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="flex items-center gap-2 transition-all duration-300"
          >
            <X className="h-4 w-4" />
            Clear All Filters
          </Button>
        )}
      </div>

      {/* Categorized Filter Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
        {filterCategories.map((categoryGroup, categoryIndex) => {
          const CategoryIcon = categoryGroup.icon;
          const hasActiveFilterInCategory = filters[categoryGroup.category] !== 'all';
          
          return (
            <div 
              key={categoryGroup.title}
              className={`flex flex-col ${
                categoryIndex < filterCategories.length - 1 
                  ? 'lg:border-r lg:border-slate-200 lg:pr-6' 
                  : ''
              }`}
            >
              {/* Category Header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <div className={`p-1.5 rounded-lg ${
                  hasActiveFilterInCategory ? 'bg-green-100' : 'bg-indigo-100'
                }`}>
                  <CategoryIcon className={`h-3.5 w-3.5 ${
                    hasActiveFilterInCategory ? 'text-green-600' : 'text-indigo-600'
                  }`} />
                </div>
                <h3 className="text-sm font-semibold text-slate-700">{categoryGroup.title}</h3>
                {hasActiveFilterInCategory && (
                  <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700 text-xs">
                    Active
                  </Badge>
                )}
              </div>

              {/* Filter Items */}
              <div className="space-y-2">
                {categoryGroup.filters.map((filter) => {
                  const FilterIcon = filter.icon;
                  const isActive = isFilterActive(categoryGroup.category, filter.value);

                  return (
                    <button
                      key={filter.value}
                      className={`cursor-pointer transition-all w-full text-left p-3 rounded-lg border text-sm font-medium ${
                        isActive 
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md transform scale-[1.02]' 
                          : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 hover:border-indigo-300 hover:scale-[1.02]'
                      }`}
                      onClick={() => handleFilterToggle(categoryGroup.category, filter.value)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FilterIcon className="h-3.5 w-3.5" />
                          <span className="font-medium">{filter.label}</span>
                        </div>
                        {isActive && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs opacity-80">Active</span>
                            <div className="w-2 h-2 bg-white rounded-full ml-1"></div>
                          </div>
                        )}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isActive ? 'text-white/80' : 'text-slate-500'
                      }`}>
                        {filter.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 mb-4">
          <div className="flex items-center gap-3 mb-2 sm:mb-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Filter className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900">Active Filters</h4>
              <p className="text-xs text-blue-700">
                Showing items that match {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {filters.stockStatus !== 'all' && (
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {filterCategories[0].filters.find(f => f.value === filters.stockStatus)?.label}
                <button 
                  onClick={() => onFiltersChange({ ...filters, stockStatus: 'all' })}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.category !== 'all' && (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 flex items-center gap-1">
                <PackageSearch className="h-3 w-3" />
                {filterCategories[1].filters.find(f => f.value === filters.category)?.label}
                <button 
                  onClick={() => onFiltersChange({ ...filters, category: 'all' })}
                  className="ml-1 hover:text-green-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.vehicleType !== 'all' && (
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 flex items-center gap-1">
                <PackageSearch className="h-3 w-3" />
                {filterCategories[2].filters.find(f => f.value === filters.vehicleType)?.label}
                <button 
                  onClick={() => onFiltersChange({ ...filters, vehicleType: 'all' })}
                  className="ml-1 hover:text-orange-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.search && (
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 flex items-center gap-1">
                <Search className="h-3 w-3" />
                Search: "{filters.search}"
                <button 
                  onClick={() => onFiltersChange({ ...filters, search: '' })}
                  className="ml-1 hover:text-purple-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Advanced Filters (Collapsible) */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-6 border-t border-slate-200">
          {/* Category Filter */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">Category</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => onFiltersChange({ ...filters, category: value as any })}
            >
              <SelectTrigger className="border-slate-300 focus:border-indigo-400 transition-all duration-300">
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

          {/* Vehicle Type Filter */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">Vehicle Type</Label>
            <Select
              value={filters.vehicleType}
              onValueChange={(value) => onFiltersChange({ ...filters, vehicleType: value as any })}
            >
              <SelectTrigger className="border-slate-300 focus:border-indigo-400 transition-all duration-300">
                <SelectValue placeholder="All vehicle types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicle Types</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motor">Motorcycle</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
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
              <SelectTrigger className="border-slate-300 focus:border-indigo-400 transition-all duration-300">
                <SelectValue placeholder="All stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="inStock">In Stock (6+)</SelectItem>
                <SelectItem value="lowStock">Low Stock (3-5)</SelectItem>
                <SelectItem value="critical">Critical (1-2)</SelectItem>
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
              <SelectTrigger className="border-slate-300 focus:border-indigo-400 transition-all duration-300">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="stock">Stock Level</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="vehicleType">Vehicle Type</SelectItem>
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
              <SelectTrigger className="border-slate-300 focus:border-indigo-400 transition-all duration-300">
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

// Enhanced Stock Alerts Component with Updated Design
const StockAlertsBar = ({ 
  criticalCount, 
  warningCount,
  outOfStockCount, // NEW: Added out of stock count
  onShowDetails 
}: { 
  criticalCount: number; 
  warningCount: number;
  outOfStockCount: number; // NEW
  onShowDetails: () => void;
}) => {
  if (criticalCount === 0 && warningCount === 0 && outOfStockCount === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {/* Out of Stock Alert - NEW */}
      {outOfStockCount > 0 && (
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={onShowDetails}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <PackageSearch className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Out of Stock Alert</h4>
                <p className="text-white/90">
                  {outOfStockCount} item{outOfStockCount !== 1 ? 's are' : ' is'} completely out of stock and needs restocking.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              View Details
            </Button>
          </div>
        </div>
      )}

      {/* Critical Stock Alert */}
      {criticalCount > 0 && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={onShowDetails}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Critical Stock Alert</h4>
                <p className="text-white/90">
                  {criticalCount} item{criticalCount !== 1 ? 's are' : ' is'} at critical levels and needs immediate attention.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              View Details
            </Button>
          </div>
        </div>
      )}

      {/* Low Stock Warning */}
      {warningCount > 0 && (
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={onShowDetails}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Low Stock Warning</h4>
                <p className="text-white/90">
                  {warningCount} item{warningCount !== 1 ? 's are' : ' is'} running low and may need reordering soon.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              View Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Stock Adjustment Form Component - FIXED: White background and consistent UI
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-slate-700">Current Stock</Label>
          <div className="text-2xl font-bold text-slate-900">{item.stock_quantity}</div>
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">New Stock</Label>
          <div className={`text-2xl font-bold ${
            newQuantity < 0 ? 'text-red-600' : 
            newQuantity === 0 ? 'text-yellow-600' : 
            'text-green-600'
          }`}>
            {newQuantity}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="adjustment" className="text-sm font-medium text-slate-700 mb-2 block">
          Adjustment Amount
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdjustment('-1')}
            className="flex-1"
          >
            -1
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdjustment('-5')}
            className="flex-1"
          >
            -5
          </Button>
          <Input
            id="adjustment"
            type="number"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
            placeholder="0"
            className="text-center border-slate-300 focus:border-indigo-400 bg-white"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdjustment('1')}
            className="flex-1"
          >
            +1
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdjustment('5')}
            className="flex-1"
          >
            +5
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Use negative numbers to decrease stock, positive to increase
        </p>
      </div>

      <div>
        <Label htmlFor="reason" className="text-sm font-medium text-slate-700 mb-2 block">
          Reason for Adjustment
        </Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="border-slate-300 focus:border-indigo-400 bg-white">
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
            className="border-slate-300 focus:border-indigo-400 bg-white"
          />
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4">
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
          disabled={isLoading || !adjustment || !reason}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Apply Adjustment
        </Button>
      </div>
    </div>
  );
};

// Enhanced Critical Stock Details Form with Updated Design - FIXED: White background and icons
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

  const outOfStockItems = items.filter(item => item.stock_quantity === 0); // NEW
  const criticalItems = items.filter(item => item.stock_quantity <= 2 && item.stock_quantity > 0);
  const lowStockItems = items.filter(item => item.stock_quantity > 2 && item.stock_quantity <= 5);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Stock Alert Details
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Review and plan actions for stock alerts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Out of Stock Section - NEW */}
          {outOfStockItems.length > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-slate-100 rounded-xl p-4 border border-gray-300">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <PackageSearch className="h-4 w-4" />
                Out of Stock Items (0 units)
              </h4>
              <div className="space-y-2">
                {outOfStockItems.map(item => (
                  <div key={item.item_id} className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-gray-300 backdrop-blur-sm">
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-700 flex items-center gap-2">
                        <VehicleTypeBadge type={item.vehicle_type} />
                        <span>Completely out of stock</span>
                      </div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800 border-gray-300">Out of Stock</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical Items Section */}
          {criticalItems.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
              <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Critical Items (1-2 units left)
              </h4>
              <div className="space-y-2">
                {criticalItems.map(item => (
                  <div key={item.item_id} className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-red-200/50 backdrop-blur-sm">
                    <div>
                      <div className="font-medium text-red-900">{item.name}</div>
                      <div className="text-sm text-red-700 flex items-center gap-2">
                        <VehicleTypeBadge type={item.vehicle_type} />
                        <span>Only {item.stock_quantity} units remaining</span>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800 border-red-200">Critical</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock Items Section */}
          {lowStockItems.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
              <h4 className="font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Low Stock Items (3-5 units left)
              </h4>
              <div className="space-y-2">
                {lowStockItems.map(item => (
                  <div key={item.item_id} className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-yellow-200/50 backdrop-blur-sm">
                    <div>
                      <div className="font-medium text-yellow-900">{item.name}</div>
                      <div className="text-sm text-yellow-700 flex items-center gap-2">
                        <VehicleTypeBadge type={item.vehicle_type} />
                        <span>{item.stock_quantity} units remaining</span>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Low Stock</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Plan Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="priority" className="text-sm font-medium text-slate-700 mb-2 block">
                Priority Level
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="border-slate-300 focus:border-indigo-400 bg-white">
                  <SelectValue placeholder="Select priority..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High - Need immediate action</SelectItem>
                  <SelectItem value="medium">Medium - Address within week</SelectItem>
                  <SelectItem value="low">Low - Monitor and plan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="actionPlan" className="text-sm font-medium text-slate-700 mb-2 block">
                Action Plan
              </Label>
              <Textarea
                id="actionPlan"
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="Describe the plan to address stock issues..."
                className="min-h-[100px] border-slate-300 focus:border-indigo-400 bg-white"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium text-slate-700 mb-2 block">
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                className="min-h-[80px] border-slate-300 focus:border-indigo-400 bg-white"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
          <Button 
            onClick={() => {
              // Here you would typically save the action plan
              alert('Action plan saved!');
              onClose();
            }}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
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
  const [itemCategory, setItemCategory] = useState<InventoryItem['category']>('tire');
  const [itemVehicleType, setItemVehicleType] = useState<InventoryItem['vehicle_type']>('car');
  const [itemCostPrice, setItemCostPrice] = useState('');
  const [itemSalePrice, setItemSalePrice] = useState('');
  const [itemStockQuantity, setItemStockQuantity] = useState('0');

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

  // Helper functions
  const resetForm = () => {
    setItemName('');
    setItemCategory('tire');
    setItemVehicleType('car');
    setItemCostPrice('');
    setItemSalePrice('');
    setItemStockQuantity('0');
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
    if (!itemName || !itemCostPrice || !itemSalePrice) { 
      toast({ title: "Validation Error", description: "Name, Cost Price, and Sale Price are required.", variant: "destructive" });
      return;
    }
    
    const itemData = {
      name: itemName,
      category: itemCategory,
      vehicle_type: itemVehicleType,
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

    if (error) {
      console.error('Error adjusting stock:', error);
      toast({ title: "Adjustment Error", description: `Could not adjust stock: ${error.message}`, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Stock adjusted by ${adjustment}. New quantity: ${newQuantity}` });
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

        {/* Enhanced Filters */}
        <AdvancedFilters 
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
        />

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
            <DataTableWrapper
              title={
                <div className="space-y-1">
                  <div className="text-lg font-semibold">Inventory Items</div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-600">
                      {filters.search || filters.category !== 'all' || filters.stockStatus !== 'all' || filters.vehicleType !== 'all' ? (
                        <>Filtered: <strong>{processedItems.length}</strong> of <strong>{items.length}</strong> items</>
                      ) : (
                        <>Total: <strong>{items.length}</strong> items</>
                      )}
                    </div>
                  </div>
                </div>
              }
               columns={enhancedColumns}
               data={processedItems.map(i => ({...i, id: i.item_id}))}
               onEdit={handleOpenEditDialog}
               onDelete={handleOpenDeleteDialog}   
            />
          )}
        </section>

        {/* Enhanced Add/Edit Item Dialog - FIXED: White background and consistent UI */}
        <Dialog open={isAddItemDialogOpen || isEditItemDialogOpen} onOpenChange={(isOpen) => {
            if (isLoading) return;
            if (!isOpen) {
              setIsAddItemDialogOpen(false);
              setIsEditItemDialogOpen(false);
              setEditingItem(null);
            }
        }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
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
                  className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemCategory" className="text-slate-700 font-medium">Category</Label>
                <Select value={itemCategory} onValueChange={(v) => setItemCategory(v as InventoryItem['category'])}>
                  <SelectTrigger className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white">
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
                <Label htmlFor="itemVehicleType" className="text-slate-700 font-medium">Vehicle Type</Label>
                <Select value={itemVehicleType} onValueChange={(v) => setItemVehicleType(v as InventoryItem['vehicle_type'])}>
                  <SelectTrigger className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white">
                    <SelectValue placeholder="Select vehicle type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="motor">Motorcycle</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemStockQuantity" className="text-slate-700 font-medium">Initial Stock</Label>
                <Input 
                  id="itemStockQuantity" 
                  type="number" 
                  value={itemStockQuantity} 
                  onChange={(e) => setItemStockQuantity(e.target.value)} 
                  placeholder="10" 
                  className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemCostPrice" className="text-slate-700 font-medium">Cost Price (₱)</Label>
                <Input 
                  id="itemCostPrice" 
                  type="number" 
                  step="0.01"
                  value={itemCostPrice} 
                  onChange={(e) => setItemCostPrice(e.target.value)} 
                  placeholder="5000.00" 
                  className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemSalePrice" className="text-slate-700 font-medium">Sale Price (₱)</Label>
                <Input 
                  id="itemSalePrice" 
                  type="number" 
                  step="0.01"
                  value={itemSalePrice} 
                  onChange={(e) => setItemSalePrice(e.target.value)} 
                  placeholder="7500.00" 
                  className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white"
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
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingItem ? 'Save Changes' : 'Save Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stock Adjustment Dialog - FIXED: White background */}
        <Dialog open={isStockAdjustmentOpen} onOpenChange={setIsStockAdjustmentOpen}>
          <DialogContent className="sm:max-md bg-white border border-slate-200 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Adjust Stock - {adjustingItem?.name}
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Update the stock quantity for this item.
              </DialogDescription>
            </DialogHeader>
            {adjustingItem && (
              <StockAdjustmentForm
                item={adjustingItem}
                onSave={handleStockAdjustment}
                onCancel={() => setIsStockAdjustmentOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Critical Stock Details Dialog - FIXED: White background */}
        <CriticalStockDetails
          items={items}
          isOpen={isCriticalDetailsOpen}
          onClose={() => setIsCriticalDetailsOpen(false)}
        />

        {/* View More Dialog - FIXED: White background */}
        <ViewMoreDialog
          items={processedItems}
          isOpen={isViewMoreOpen}
          onClose={() => setIsViewMoreOpen(false)}
        />

        {/* Delete Confirmation Dialog - FIXED: White background */}
        <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
          <AlertDialogContent className="bg-white border border-slate-200 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900">Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600">
                Are you sure you want to delete <strong>{deletingItem?.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95">
                <X className="h-4 w-4" />
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteItem} 
                disabled={isLoading} 
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-red-600 active:scale-95 flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                Delete
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