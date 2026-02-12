"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Loader2, PlusCircle, AlertTriangle, Users, Car, History,
  RefreshCw, Clock, Edit, Trash2, Search, X, ArrowLeft, Download,
  Eye, TrendingUp, CheckCircle, UserPlus, Calendar, Wrench,
  Save, ArrowUpDown, Archive, PackageSearch
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Customer, Vehicle, TireHistory, InventoryItem, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { IndeterminateProgressBar } from '@/components/ui/indeterminate-progress';

// ===== SIMPLIFIED DESIGN SYSTEM =====
// Note: Using Tailwind classes directly instead of gradient definitions


// ===== REUSABLE PAGINATION COMPONENT =====
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  rowsPerPage
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  rowsPerPage: number;
}) => {
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-white">
      {/* Left Side: Showing text */}
      <div className="text-sm text-slate-600 font-poppins">
        Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
      </div>

      {/* Right Side: Simple Pager Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="h-8 px-2 min-w-[36px] bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          «
        </Button>
        <Button
          variant="outline"
          className="h-8 px-2 min-w-[36px] bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          ‹
        </Button>

        <span className="text-sm text-slate-600 px-2 font-medium font-poppins min-w-[80px] text-center">
          Page {currentPage} of {totalPages || 1}
        </span>

        <Button
          variant="outline"
          className="h-8 px-2 min-w-[36px] bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          ›
        </Button>
        <Button
          variant="outline"
          className="h-8 px-2 min-w-[36px] bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          »
        </Button>
      </div>
    </div>
  );
};

// ===== SUCCESS ANIMATION COMPONENT =====
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
  actionType?: 'add' | 'edit' | 'delete' | 'export' | 'create';
  onConfirm: () => void;
}) => {
  if (!isVisible) return null;

  const getActionIcon = () => {
    switch (actionType) {
      case 'add': return PlusCircle;
      case 'edit': return Save;
      case 'delete': return Archive;
      case 'export': return Download;
      case 'create': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const ActionIcon = getActionIcon();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <ActionIcon className="h-7 w-7 text-primary-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <Button onClick={onConfirm} className="w-full">
          <CheckCircle className="h-4 w-4 mr-2" />
          Continue
        </Button>
      </div>
    </div>
  );
};


// Vehicle Type Icons Mapping
const VehicleIcons = {
  car: Car,
  motorcycle: Car,
  truck: Car,
  bus: Car,
  suv: Car,
  default: Car
};

const getVehicleIcon = (vehicleType: string) => {
  const type = vehicleType?.toLowerCase();
  return VehicleIcons[type as keyof typeof VehicleIcons] || VehicleIcons.default;
};

// Service Type Colors
const serviceTypeColors = {
  repair: "bg-orange-100 text-orange-700 border-orange-200",
  replacement: "bg-blue-100 text-blue-700 border-blue-200",
  rotation: "bg-green-100 text-green-700 border-green-200",
  balancing: "bg-purple-100 text-purple-700 border-purple-200",
  service: "bg-indigo-100 text-indigo-700 border-indigo-200"
};

interface VehicleType {
  vehicle_type_id: string;
  name: string;
}

// ===== ENHANCED FILTERING SYSTEM (Similar to Inventory) =====
interface CustomerFilterState {
  search: string;
  sortBy: 'name' | 'phone' | 'vehicle_count';
  sortOrder: 'asc' | 'desc';
}

interface VehicleFilterState {
  search: string;
  customer: string;
  vehicleType: string;
  sortBy: 'plate_number' | 'customer' | 'vehicle_type' | 'make' | 'model';
  sortOrder: 'asc' | 'desc';
}

interface HistoryFilterState {
  search: string;
  serviceType: string;
  sortBy: 'plate_number' | 'service_date' | 'service_type';
  sortOrder: 'asc' | 'desc';
}

// ===== ADVANCED FILTERS COMPONENT (Similar to Inventory) =====
const CustomerAdvancedFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  rowsPerPage,
  onRowsPerPageChange
}: {
  filters: CustomerFilterState;
  onFiltersChange: (filters: CustomerFilterState) => void;
  onClearFilters: () => void;
  rowsPerPage: number;
  onRowsPerPageChange: (val: number) => void;
}) => {
  const hasActiveFilters = filters.search;

  return (
    <div className="bg-white p-5 border-b border-slate-200">
      {/* Removed mb-5 to reduce spacing */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1 relative">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Search Customers</Label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Search by name or phone..."
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
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="vehicle_count">Vehicle Count</SelectItem>
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

const VehicleAdvancedFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  customers,
  vehicleTypes,
  rowsPerPage,
  onRowsPerPageChange
}: {
  filters: VehicleFilterState;
  onFiltersChange: (filters: VehicleFilterState) => void;
  onClearFilters: () => void;
  customers: any[];
  vehicleTypes: any[];
  rowsPerPage: number;
  onRowsPerPageChange: (val: number) => void;
}) => {
  const hasActiveFilters = filters.search || filters.customer !== 'all' || filters.vehicleType !== 'all';

  return (
    <div className="bg-white p-5 border-b border-slate-200">
      {/* Removed mb-5 to reduce spacing */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1 relative">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Search Vehicles</Label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Search by plate, make, model, or customer..."
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
          <div className="w-1/2 lg:w-48">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Customer</Label>
            <Select
              value={filters.customer}
              onValueChange={(value) => onFiltersChange({ ...filters, customer: value })}
            >
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md">
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map(customer => (
                  <SelectItem key={customer.customer_id} value={customer.customer_id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-1/2 lg:w-48">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Vehicle Type</Label>
            <Select
              value={filters.vehicleType}
              onValueChange={(value) => onFiltersChange({ ...filters, vehicleType: value })}
            >
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {vehicleTypes.map(type => (
                  <SelectItem key={type.vehicle_type_id} value={type.vehicle_type_id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                <SelectItem value="plate_number">Plate Number</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="vehicle_type">Vehicle Type</SelectItem>
                <SelectItem value="make">Make</SelectItem>
                <SelectItem value="model">Model</SelectItem>
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

const HistoryAdvancedFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  rowsPerPage,
  onRowsPerPageChange
}: {
  filters: HistoryFilterState;
  onFiltersChange: (filters: HistoryFilterState) => void;
  onClearFilters: () => void;
  rowsPerPage: number;
  onRowsPerPageChange: (val: number) => void;
}) => {
  const hasActiveFilters = filters.search || filters.serviceType !== 'all';

  return (
    <div className="bg-white p-5 border-b border-slate-200">
      {/* Removed mb-5 to reduce spacing */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1 relative">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Search History</Label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Search by plate number, item, or customer..."
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
          <div className="w-1/2 lg:w-48">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Service Type</Label>
            <Select
              value={filters.serviceType}
              onValueChange={(value) => onFiltersChange({ ...filters, serviceType: value })}
            >
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md">
                <SelectValue placeholder="All services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="replacement">Replacement</SelectItem>
                <SelectItem value="rotation">Rotation</SelectItem>
                <SelectItem value="balancing">Balancing</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                <SelectItem value="plate_number">Vehicle</SelectItem>
                <SelectItem value="service_date">Date</SelectItem>
                <SelectItem value="service_type">Service Type</SelectItem>
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

// ===== CUSTOM TABLE COMPONENTS =====
interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, item: any) => React.ReactNode;
}

// ===== CUSTOM TABLE COMPONENTS REMOVED (Replaced with DataTableWrapper) =====

// Column definitions
const customerColumns: Column[] = [
  {
    key: 'name',
    header: 'Customer Name',
    sortable: true,
    render: (value, item) => value || <span className="text-slate-400">-</span>
  },
  {
    key: 'phone',
    header: 'Phone',
    sortable: true,
    render: (value) => value || <span className="text-slate-400">-</span>
  },
  {
    key: 'vehicle_count',
    header: 'Vehicles',
    sortable: true,
    render: (value) => (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        {value || 0} vehicles
      </Badge>
    ),
  },
];

const vehicleColumns: Column[] = [
  {
    key: 'plate_number',
    header: 'Plate Number',
    sortable: true,
    render: (value) => value || <span className="text-slate-400">-</span>
  },
  {
    key: 'customer',
    header: 'Customer',
    sortable: true,
    render: (value) => <span className="capitalize">{value?.name || '—'}</span>,
  },
  {
    key: 'vehicle_type',
    header: 'Type',
    sortable: true,
    render: (value) => {
      if (!value) return <Badge variant="outline">N/A</Badge>;
      const vehicleName = value.name;
      const VehicleIcon = getVehicleIcon(vehicleName);
      return (
        <Badge variant="outline" className="flex items-center gap-1 bg-slate-100 text-slate-700 border-slate-300 capitalize font-poppins">
          <VehicleIcon className="h-3 w-3" />
          {vehicleName}
        </Badge>
      );
    },
  },
  {
    key: 'make',
    header: 'Make',
    sortable: true,
    render: (value) => value || <span className="text-slate-400">-</span>
  },
  {
    key: 'model',
    header: 'Model',
    sortable: true,
    render: (value) => value || <span className="text-slate-400">-</span>
  },
  {
    key: 'color',
    header: 'Color',
    sortable: true,
    render: (value) => value || <span className="text-slate-400">-</span>
  },
];

const historyColumns: Column[] = [
  {
    key: 'plate_number',
    header: 'Vehicle',
    render: (_value: any, item: any) => item.vehicle?.plate_number || '—',
  },
  {
    key: 'items',
    header: 'Item(s)',
    render: (_value: any, item: any) => {
      if (Array.isArray(item.items) && item.items.length > 0) {
        return (
          <div className="space-y-1">
            {item.items.map((it: any, idx: number) => (
              <div key={idx} className="text-xs">
                {it.name} {it.quantity > 1 ? `(×${it.quantity})` : ''}
              </div>
            ))}
          </div>
        );
      }
      return '—';
    },
  },
  {
    key: 'service_type',
    header: 'Type',
    render: (_value: any, item: any) => (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
        {item.service_type || '—'}
      </span>
    ),
  },
  {
    key: 'service_date',
    header: 'Date',
    render: (value: any) => (value ? new Date(value).toLocaleDateString('en-US') : '—'),
  },
  {
    key: 'notes',
    header: 'Notes/Descriptions',
    render: (value: any) => value || <span className="text-slate-400">-</span>,
  },
  {
    key: 'created_by_name',
    header: 'Service By',
    render: (_value: any, item: any) => item.user?.name || '—',
  },
];

// Enhanced Empty State Component
const EnhancedEmptyState = ({
  type,
  onAddNew,
  onClearFilters
}: {
  type: 'customers' | 'vehicles' | 'history';
  onAddNew: () => void;
  onClearFilters?: () => void;
}) => {
  const config = {
    customers: {
      title: "No Customers Found",
      description: "Get started by adding your first customer to manage their vehicles and services.",
      icon: Users,
      buttonText: "Add First Customer"
    },
    vehicles: {
      title: "No Vehicles Found",
      description: "Add vehicles to track service history and manage customer records.",
      icon: Car,
      buttonText: "Add First Vehicle"
    },
    history: {
      title: "No Service History",
      description: "Record tire services to build a complete history for each vehicle.",
      icon: History,
      buttonText: "Add First Service Record"
    }
  };

  const { title, description, icon: Icon, buttonText } = config[type];

  return (
    <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 animate-in fade-in duration-500">
      <div className="relative inline-flex mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-cyan-200 blur-lg rounded-full opacity-70"></div>
        <div className="relative p-4 bg-white rounded-full shadow-lg border border-slate-100">
          <Icon className="h-16 w-16 text-purple-600" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-3 font-poppins">{title}</h3>
      <p className="text-slate-600 mb-6 max-w-md mx-auto font-poppins">
        {description}
      </p>
      <div className="flex gap-3 justify-center">
        <Button
          onClick={onAddNew}
          className=""
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
        {onClearFilters && (
          <Button
            onClick={onClearFilters}
            variant="outline"
            className="flex items-center gap-2 transition-all duration-300 hover:scale-105 border-slate-300 font-poppins"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
};

// ===== StatsOverview Component =====
const StatsOverview = ({ customers, vehicles, tireHistory }: { customers: any[], vehicles: any[], tireHistory: any[] }) => {
  const totalCustomers = customers.length;
  const totalVehicles = vehicles.length;
  const recentServices = tireHistory.filter(history =>
    new Date(history.service_date).getMonth() === new Date().getMonth()
  ).length;
  const vehiclesWithRecentService = [...new Set(tireHistory
    .filter(history => new Date(history.service_date).getMonth() === new Date().getMonth())
    .map(history => history.vehicle_id)
  )].length;

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-md">
        <Users className="h-4 w-4" />
        <span className="font-medium">{totalCustomers}</span>
        <span>Customers</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md">
        <Car className="h-4 w-4" />
        <span className="font-medium">{totalVehicles}</span>
        <span>Vehicles</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md">
        <Wrench className="h-4 w-4" />
        <span className="font-medium">{recentServices}</span>
        <span>Monthly Services</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-md">
        <CheckCircle className="h-4 w-4" />
        <span className="font-medium">{vehiclesWithRecentService}</span>
        <span>Serviced This Month</span>
      </div>
    </div>
  );
};

// ===== UPDATED QuickActions Component - Matching Inventory Page Design =====
const QuickActions = ({ onAddCustomer, onAddVehicle, onExportData }: {
  onAddCustomer: () => void,
  onAddVehicle: () => void,
  onExportData: () => void
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button onClick={onAddCustomer} size="sm" className="gap-2">
        <UserPlus className="h-4 w-4" />
        Add Customer
      </Button>
      <Button onClick={onAddVehicle} variant="outline" size="sm" className="gap-2">
        <Car className="h-4 w-4" />
        Add Vehicle
      </Button>
      <Button onClick={onExportData} variant="outline" size="sm" className="gap-2">
        <Download className="h-4 w-4" />
        Export
      </Button>
    </div>
  );
};

const EnhancedTabs = ({ value, onValueChange, children }: any) => {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full font-poppins">
      <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 rounded-2xl">
        <TabsTrigger
          value="customers"
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300 font-poppins"
        >
          <Users className="h-4 w-4 mr-2" />
          Customers
        </TabsTrigger>
        <TabsTrigger
          value="vehicles"
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300 font-poppins"
        >
          <Car className="h-4 w-4 mr-2" />
          Vehicles
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300 font-poppins"
        >
          <History className="h-4 w-4 mr-2" />
          Tire History
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};

export default function EnhancedCustomersPage() {
  const { toast } = useToast();
  const { user: authUser, activeBranchId } = useAuth();
  const [activeTab, setActiveTab] = useState('customers');
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tireHistory, setTireHistory] = useState<TireHistory[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Loading states
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);
  const [isVehicleLoading, setIsVehicleLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Error states
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Success animation state
  const [successAnimation, setSuccessAnimation] = useState<{
    isVisible: boolean;
    title: string;
    message: string;
    actionType: 'add' | 'edit' | 'delete' | 'export' | 'create';
  }>({
    isVisible: false,
    title: '',
    message: '',
    actionType: 'add'
  });

  // Dialog states
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Editing states
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);

  // ===== NEW: PAGINATION STATES =====
  const [customerRowsPerPage, setCustomerRowsPerPage] = useState(5);
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);

  const [vehicleRowsPerPage, setVehicleRowsPerPage] = useState(5);
  const [vehicleCurrentPage, setVehicleCurrentPage] = useState(1);

  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(5);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);

  const rowsPerPageOptions = [5, 10, 25, 50];

  // ===== NEW: FILTER STATES =====
  const [customerFilters, setCustomerFilters] = useState<CustomerFilterState>({
    search: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const [vehicleFilters, setVehicleFilters] = useState<VehicleFilterState>({
    search: '',
    customer: 'all',
    vehicleType: 'all',
    sortBy: 'plate_number',
    sortOrder: 'asc'
  });

  const [historyFilters, setHistoryFilters] = useState<HistoryFilterState>({
    search: '',
    serviceType: 'all',
    sortBy: 'service_date',
    sortOrder: 'desc'
  });

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [activeBranchId]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Reset pagination and filters when changing tabs
    setCustomerCurrentPage(1);
    setVehicleCurrentPage(1);
    setHistoryCurrentPage(1);
    setCustomerFilters({ search: '', sortBy: 'name', sortOrder: 'asc' });
    setVehicleFilters({ search: '', customer: 'all', vehicleType: 'all', sortBy: 'plate_number', sortOrder: 'asc' });
    setHistoryFilters({ search: '', serviceType: 'all', sortBy: 'service_date', sortOrder: 'desc' });
  };

  const fetchData = async () => {
    await Promise.all([
      fetchCustomers(),
      fetchVehicles(),
      fetchTireHistory(),
      fetchSupportingData(),
      fetchVehicleTypes()
    ]);
  };

  const fetchCustomers = async () => {
    if (!supabase) return;
    setIsCustomerLoading(true);

    try {
      let query = supabase
        .from('customer')
        .select(`
          *,
          vehicles:vehicle(count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (activeBranchId) {
        query = query.eq('branch_id', activeBranchId);
      }

      const { data, error } = await query;

      if (error) {
        setCustomerError(`Could not fetch customers: ${error.message}`);
        setCustomers([]);
      } else {
        const mappedData = (data || []).map((item: any) => ({
          ...item,
          vehicle_count: item.vehicles?.[0]?.count || 0
        }));
        setCustomers(mappedData as Customer[]);
        setCustomerError(null);
      }
    } catch (err: any) {
      setCustomerError(err.message);
    }

    setIsCustomerLoading(false);
    setLastUpdated(new Date());
  };

  const fetchVehicles = async () => {
    if (!supabase) return;
    setIsVehicleLoading(true);

    try {
      let query = supabase
        .from('vehicle')
        .select(`
          *,
          customer!inner(*),
          vehicle_type(*)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (activeBranchId) {
        query = query.eq('customer.branch_id', activeBranchId);
      }

      const { data, error } = await query;

      if (error) {
        setVehicleError(`Could not fetch vehicles: ${error.message}`);
        setVehicles([]);
      } else {
        setVehicles((data || []) as Vehicle[]);
        setVehicleError(null);
      }
    } catch (err: any) {
      setVehicleError(err.message);
    }
    setIsVehicleLoading(false);
  };

  const fetchVehicleTypes = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('vehicle_type')
      .select('*')
      .order('name');

    if (data) setVehicleTypes(data as VehicleType[]);
  };

  const fetchTireHistory = async () => {
    if (!supabase) return;
    setIsHistoryLoading(true);

    const { data, error } = await supabase
      .rpc('get_tire_history_complete');

    if (error) {
      setHistoryError(`Could not fetch tire history: ${error.message}`);
      setTireHistory([]);
    } else {
      setTireHistory((data || []) as TireHistory[]);
      setHistoryError(null);
    }
    setIsHistoryLoading(false);
  };

  const fetchSupportingData = async () => {
    if (!supabase) return;

    let inventoryQuery = supabase
      .from('view_branch_inventory')
      .select('item_id, name, category')
      .eq('category', 'tire')
      .is('deleted_at', null);

    if (activeBranchId) {
      inventoryQuery = inventoryQuery.eq('branch_id', activeBranchId);
    }

    let usersQuery = supabase
      .from('user')
      .select('user_id, name')
      .in('role', ['staff', 'branch_manager'])
      .is('deleted_at', null);

    if (activeBranchId) {
      usersQuery = usersQuery.eq('branch_id', activeBranchId);
    }

    const [inventoryRes, usersRes] = await Promise.all([
      inventoryQuery,
      usersQuery
    ]);

    if (inventoryRes.data) setInventory(inventoryRes.data as InventoryItem[]);
    if (usersRes.data) setUsers(usersRes.data as User[]);
  };

  // ===== ENHANCED FILTERING LOGIC =====
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Apply search filter
    if (customerFilters.search) {
      const searchLower = customerFilters.search.toLowerCase();
      result = result.filter(customer =>
        customer.name.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (customerFilters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'vehicle_count':
          aValue = a.vehicle_count || 0;
          bValue = b.vehicle_count || 0;
          break;
        default:
          return 0;
      }

      if (customerFilters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return result;
  }, [customers, customerFilters]);

  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];

    // Apply search filter
    if (vehicleFilters.search) {
      const searchLower = vehicleFilters.search.toLowerCase();
      result = result.filter(v =>
        v.plate_number?.toLowerCase().includes(searchLower) ||
        v.customer?.name?.toLowerCase().includes(searchLower) ||
        v.vehicle_type?.name?.toLowerCase().includes(searchLower) ||
        v.make?.toLowerCase().includes(searchLower) ||
        v.model?.toLowerCase().includes(searchLower) ||
        v.color?.toLowerCase().includes(searchLower)
      );
    }

    // Apply customer filter
    if (vehicleFilters.customer !== 'all') {
      result = result.filter(v => v.customer_id === vehicleFilters.customer);
    }

    // Apply vehicle type filter
    if (vehicleFilters.vehicleType !== 'all') {
      result = result.filter(v => v.vehicle_type_id === vehicleFilters.vehicleType);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (vehicleFilters.sortBy) {
        case 'plate_number':
          aValue = a.plate_number?.toLowerCase() || '';
          bValue = b.plate_number?.toLowerCase() || '';
          break;
        case 'customer':
          aValue = a.customer?.name?.toLowerCase() || '';
          bValue = b.customer?.name?.toLowerCase() || '';
          break;
        case 'vehicle_type':
          aValue = a.vehicle_type?.name?.toLowerCase() || '';
          bValue = b.vehicle_type?.name?.toLowerCase() || '';
          break;
        case 'make':
          aValue = a.make?.toLowerCase() || '';
          bValue = b.make?.toLowerCase() || '';
          break;
        case 'model':
          aValue = a.model?.toLowerCase() || '';
          bValue = b.model?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (vehicleFilters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return result;
  }, [vehicles, vehicleFilters]);

  const filteredHistory = useMemo(() => {
    let result = [...tireHistory];

    // Apply search filter
    if (historyFilters.search) {
      const searchLower = historyFilters.search.toLowerCase();
      result = result.filter(history => {
        const itemNames = Array.isArray(history.items)
          ? history.items.map((it: any) => it.name?.toLowerCase()).filter(Boolean)
          : [];

        return (
          history.vehicle?.plate_number?.toLowerCase().includes(searchLower) ||
          itemNames.some((n: string) => n.includes(searchLower)) ||
          history.vehicle?.customer?.name?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply service type filter
    if (historyFilters.serviceType !== 'all') {
      result = result.filter(history => history.service_type === historyFilters.serviceType);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (historyFilters.sortBy) {
        case 'plate_number':
          aValue = a.vehicle?.plate_number?.toLowerCase() || '';
          bValue = b.vehicle?.plate_number?.toLowerCase() || '';
          break;
        case 'service_date':
          aValue = new Date(a.service_date || '');
          bValue = new Date(b.service_date || '');
          break;
        case 'service_type':
          aValue = a.service_type?.toLowerCase() || '';
          bValue = b.service_type?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (historyFilters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return result;
  }, [tireHistory, historyFilters]);

  // ===== PAGINATED DATA =====
  const displayedCustomers = useMemo(() => {
    const start = (customerCurrentPage - 1) * customerRowsPerPage;
    return filteredCustomers.slice(start, start + customerRowsPerPage);
  }, [filteredCustomers, customerCurrentPage, customerRowsPerPage]);

  const displayedVehicles = useMemo(() => {
    const start = (vehicleCurrentPage - 1) * vehicleRowsPerPage;
    return filteredVehicles.slice(start, start + vehicleRowsPerPage);
  }, [filteredVehicles, vehicleCurrentPage, vehicleRowsPerPage]);

  const displayedHistory = useMemo(() => {
    const start = (historyCurrentPage - 1) * historyRowsPerPage;
    return filteredHistory.slice(start, start + historyRowsPerPage);
  }, [filteredHistory, historyCurrentPage, historyRowsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCustomerCurrentPage(1);
  }, [customerFilters.search]);

  useEffect(() => {
    setVehicleCurrentPage(1);
  }, [vehicleFilters.search, vehicleFilters.customer, vehicleFilters.vehicleType]);

  useEffect(() => {
    setHistoryCurrentPage(1);
  }, [historyFilters.search, historyFilters.serviceType]);

  const clearCustomerFilters = () => {
    setCustomerFilters({ search: '', sortBy: 'name', sortOrder: 'asc' });
  };

  const clearVehicleFilters = () => {
    setVehicleFilters({
      search: '',
      customer: 'all',
      vehicleType: 'all',
      sortBy: 'plate_number',
      sortOrder: 'asc'
    });
  };

  const clearHistoryFilters = () => {
    setHistoryFilters({
      search: '',
      serviceType: 'all',
      sortBy: 'service_date',
      sortOrder: 'desc'
    });
  };

  const resetCustomerForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setEditingCustomer(null);
  };

  const resetVehicleForm = () => {
    setSelectedCustomer('');
    setPlateNumber('');
    setMake('');
    setModel('');
    setColor('');
    setSelectedVehicleType('');
    setEditingVehicle(null);
  };

  const handleOpenCustomerDialog = () => {
    resetCustomerForm();
    setIsCustomerDialogOpen(true);
  };

  const handleOpenVehicleDialog = () => {
    resetVehicleForm();
    setIsVehicleDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || '');
    setIsCustomerDialogOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setSelectedCustomer(vehicle.customer_id);
    setPlateNumber(vehicle.plate_number);
    setMake(vehicle.make || '');
    setModel(vehicle.model || '');
    setColor(vehicle.color || '');
    setSelectedVehicleType(vehicle.vehicle_type_id || '');
    setIsVehicleDialogOpen(true);
  };

  const handleDeleteItem = (item: any, type: 'customer' | 'vehicle' | 'history') => {
    setDeletingItem({ ...item, type });
    setIsDeleteDialogOpen(true);
  };

  const handleRefresh = () => {
    fetchData();
  };

  // Export Data Functionality
  const handleExportData = () => {
    let dataToExport: any[] = [];
    let filename = '';
    let headers: string[] = [];

    if (activeTab === 'customers') {
      dataToExport = filteredCustomers;
      filename = 'customers_export.csv';
      headers = ['Customer Name', 'Phone', 'Vehicles Count'];
    } else if (activeTab === 'vehicles') {
      dataToExport = filteredVehicles;
      filename = 'vehicles_export.csv';
      headers = ['Plate Number', 'Customer', 'Vehicle Type', 'Make', 'Model', 'Color'];
    } else {
      dataToExport = filteredHistory;
      filename = 'tire_history_export.csv';
      headers = ['Vehicle', 'Item(s)', 'Service Type', 'Date', 'Notes/Descriptions', 'Service By'];
    }

    if (dataToExport.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There is no data available for export.",
        variant: "destructive"
      });
      return;
    }

    const convertToCSV = (data: any[], headers: string[], type: 'customers' | 'vehicles' | 'history') => {
      const headerRow = headers.join(',') + '\n';

      const toTitle = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

      const rows = data.map((item) => {
        if (type === 'customers') {
          return [
            `"${item.name ?? ''}"`,
            `"${item.phone ?? ''}"`,
            `"${item.vehicle_count ?? 0}"`
          ].join(',');
        }

        if (type === 'vehicles') {
          return [
            `"${item.plate_number ?? ''}"`,
            `"${item.customer?.name ?? ''}"`,
            `"${item.vehicle_type?.name ?? ''}"`,
            `"${item.make ?? ''}"`,
            `"${item.model ?? ''}"`,
            `"${item.color ?? ''}"`
          ].join(',');
        }

        // history (aggregated items array)
        const itemsList = Array.isArray(item.items) && item.items.length
          ? item.items.map((it: any) => {
            const name = it?.name ?? '';
            const qty = it?.quantity && it.quantity > 1 ? ` (×${it.quantity})` : '';
            return `${name}${qty}`;
          }).join('; ')
          : '';

        return [
          `"${item.vehicle?.plate_number ?? ''}"`,
          `"${itemsList}"`,
          `"${toTitle(item.service_type ?? '')}"`,
          `"${item.service_date ? new Date(item.service_date).toLocaleDateString('en-US') : ''}"`,
          `"${item.notes ?? ''}"`,
          `"${item.user?.name ?? ''}"`
        ].join(',');
      }).join('\n');

      return headerRow + rows;
    };

    // Convert data to CSV format
    const csvContent = convertToCSV(dataToExport, headers, activeTab as any);

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success animation for export
    setSuccessAnimation({
      isVisible: true,
      title: "Export Successful!",
      message: `Exported ${dataToExport.length} ${activeTab} to CSV file.`,
      actionType: 'export'
    });
  };

  const handleSubmitCustomer = async () => {
    if (!supabase || !authUser) return;
    if (!customerName) {
      toast({ title: "Validation Error", description: "Customer name is required.", variant: "destructive" });
      return;
    }

    const targetBranchId = editingCustomer?.branch_id ?? activeBranchId ?? authUser.branch_id ?? null;

    if (!targetBranchId) {
      toast({ title: "Branch Required", description: "Select a branch before saving customers.", variant: "destructive" });
      return;
    }

    setIsCustomerLoading(true);

    const customerData = {
      branch_id: targetBranchId,
      name: customerName,
      phone: customerPhone || null,
    };

    let error;
    if (editingCustomer) {
      const { error: updateError } = await (supabase
        .from('customer') as any)
        .update(customerData)
        .eq('customer_id', editingCustomer.customer_id);
      error = updateError;
    } else {
      const { error: insertError } = await (supabase
        .from('customer') as any)
        .insert([customerData]);
      error = insertError;
    }

    setIsCustomerLoading(false);

    if (error) {
      toast({ title: "Save Error", description: `Could not save customer: ${error.message}`, variant: "destructive" });
    } else {
      // Show success animation
      setSuccessAnimation({
        isVisible: true,
        title: editingCustomer ? "Customer Updated Successfully!" : "Customer Added Successfully!",
        message: editingCustomer
          ? `Customer "${customerName}" has been updated in the system.`
          : `Customer "${customerName}" has been added to the system.`,
        actionType: editingCustomer ? 'edit' : 'add'
      });

      setIsCustomerDialogOpen(false);
      fetchCustomers();
    }
  };

  const handleSubmitVehicle = async () => {
    if (!supabase || !authUser) return;
    if (!selectedCustomer || !plateNumber) {
      toast({ title: "Validation Error", description: "Customer and plate number are required.", variant: "destructive" });
      return;
    }

    setIsVehicleLoading(true);

    const vehicleData = {
      customer_id: selectedCustomer,
      plate_number: plateNumber,
      make: make || null,
      model: model || null,
      color: color || null,
      vehicle_type_id: selectedVehicleType || null,
    };

    let error;
    if (editingVehicle) {
      const { error: updateError } = await (supabase
        .from('vehicle') as any)
        .update(vehicleData)
        .eq('vehicle_id', editingVehicle.vehicle_id);
      error = updateError;
    } else {
      const { error: insertError } = await (supabase
        .from('vehicle') as any)
        .insert([vehicleData]);
      error = insertError;
    }

    setIsVehicleLoading(false);

    if (error) {
      toast({ title: "Save Error", description: `Could not save vehicle: ${error.message}`, variant: "destructive" });
    } else {
      // Show success animation
      setSuccessAnimation({
        isVisible: true,
        title: editingVehicle ? "Vehicle Updated Successfully!" : "Vehicle Added Successfully!",
        message: editingVehicle
          ? `Vehicle "${plateNumber}" has been updated in the system.`
          : `Vehicle "${plateNumber}" has been added to the system.`,
        actionType: editingVehicle ? 'edit' : 'add'
      });

      setIsVehicleDialogOpen(false);
      fetchVehicles();
      fetchCustomers();
    }
  };

  const handleDelete = async () => {
    if (!deletingItem || !supabase) return;

    const tableName = deletingItem.type === 'customer' ? 'customer' :
      deletingItem.type === 'vehicle' ? 'vehicle' : 'tire_history';
    const idField = deletingItem.type === 'customer' ? 'customer_id' :
      deletingItem.type === 'vehicle' ? 'vehicle_id' : 'history_id';

    // Check for related records before deleting a customer
    if (deletingItem.type === 'customer') {
      const customerId = deletingItem.customer_id;
      const relatedRecords: string[] = [];

      // Check for vehicles
      const { count: vehicleCount } = await supabase
        .from('vehicle')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId);
      if (vehicleCount && vehicleCount > 0) {
        relatedRecords.push(`${vehicleCount} vehicle(s)`);
      }

      // Check for sales
      const { count: saleCount } = await supabase
        .from('sale')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId);
      if (saleCount && saleCount > 0) {
        relatedRecords.push(`${saleCount} sale(s)`);
      }

      // Check for service jobs
      const { count: serviceJobCount } = await supabase
        .from('service_job')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId);
      if (serviceJobCount && serviceJobCount > 0) {
        relatedRecords.push(`${serviceJobCount} service job(s)`);
      }

      // Check for receipts
      const { count: receiptCount } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId);
      if (receiptCount && receiptCount > 0) {
        relatedRecords.push(`${receiptCount} receipt(s)`);
      }

      if (relatedRecords.length > 0) {
        toast({
          title: "Cannot Delete Customer",
          description: `This customer has ${relatedRecords.join(', ')} linked to their account. Please remove or reassign these records first.`,
          variant: "destructive"
        });
        setIsDeleteDialogOpen(false);
        setDeletingItem(null);
        return;
      }
    }

    // Preserve related records before deleting a vehicle
    if (deletingItem.type === 'vehicle') {
      const vehicleId = deletingItem.vehicle_id;

      // Preserve tire history by setting vehicle_id to NULL (keeps records for business purposes)
      const { error: historyUpdateError } = await (supabase
        .from('tire_history') as any)
        .update({ vehicle_id: null })
        .eq('vehicle_id', vehicleId);

      if (historyUpdateError) {
        console.warn('Could not update tire history records:', historyUpdateError.message);
      }

      // Preserve service jobs by setting vehicle_id to NULL (keeps records for business purposes)
      const { error: serviceJobUpdateError } = await (supabase
        .from('service_job') as any)
        .update({ vehicle_id: null })
        .eq('vehicle_id', vehicleId);

      if (serviceJobUpdateError) {
        console.warn('Could not update service job records:', serviceJobUpdateError.message);
      }
    }

    // Soft delete: set deleted_at timestamp instead of removing the record
    const { error } = await supabase
      .from(tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq(idField, deletingItem[idField]);

    if (error) {
      // Provide more user-friendly error message for foreign key violations
      if (error.message.includes('foreign key') || error.message.includes('violates') || error.code === '23503') {
        toast({
          title: "Cannot Delete",
          description: `This ${deletingItem.type} has related records in the system. Please remove all related records first.`,
          variant: "destructive"
        });
      } else {
        toast({ title: "Delete Error", description: `Could not delete ${deletingItem.type}: ${error.message}`, variant: "destructive" });
      }
    } else {
      // Show success animation for deletion
      setSuccessAnimation({
        isVisible: true,
        title: `${deletingItem.type === 'customer' ? 'Customer' : deletingItem.type === 'vehicle' ? 'Vehicle' : 'Service Record'} Deleted!`,
        message: `${deletingItem.type === 'customer' ? 'Customer' : deletingItem.type === 'vehicle' ? 'Vehicle' : 'Service record'} has been removed from the system.`,
        actionType: 'delete'
      });

      setIsDeleteDialogOpen(false);
      setDeletingItem(null);

      if (deletingItem.type === 'customer') {
        fetchCustomers();
      } else if (deletingItem.type === 'vehicle') {
        fetchVehicles();
        fetchCustomers();
      } else {
        fetchTireHistory();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 py-4">

        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              Customer & Vehicle Management
            </h1>
            {lastUpdated && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            )}
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isCustomerLoading || isVehicleLoading || isHistoryLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isCustomerLoading || isVehicleLoading || isHistoryLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Stats Overview */}
        <StatsOverview customers={customers} vehicles={vehicles} tireHistory={tireHistory} />

        {/* QuickActions */}
        <QuickActions
          onAddCustomer={handleOpenCustomerDialog}
          onAddVehicle={handleOpenVehicleDialog}
          onExportData={handleExportData}
        />


        <div className="mb-4">
          <EnhancedTabs value={activeTab} onValueChange={handleTabChange}>

            {/* ===== CUSTOMERS TAB ===== */}
            <TabsContent value="customers" className="space-y-6 animate-in fade-in duration-500">
              {isCustomerLoading ? (
                <div className="flex flex-col justify-center items-center h-64 space-y-4">
                  <IndeterminateProgressBar className="w-1/3 max-w-xs" />
                  <p className="text-slate-500 font-poppins animate-pulse text-sm">Loading customers...</p>
                </div>
              ) : (
                <Card>
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Customer Management
                        <span className="ml-2 text-muted-foreground font-normal">
                          {customerFilters.search ? (
                            <>({filteredCustomers.length} of {customers.length})</>
                          ) : (
                            <>({customers.length} customers)</>
                          )}
                        </span>
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">

                    <CustomerAdvancedFilters
                      filters={customerFilters}
                      onFiltersChange={setCustomerFilters}
                      onClearFilters={clearCustomerFilters}
                      rowsPerPage={customerRowsPerPage}
                      onRowsPerPageChange={setCustomerRowsPerPage}
                    />

                    {filteredCustomers.length === 0 ? (
                      <EnhancedEmptyState
                        type="customers"
                        onAddNew={handleOpenCustomerDialog}
                        onClearFilters={clearCustomerFilters}
                      />
                    ) : (
                      <>
                        <DataTableWrapper
                          className="w-full"
                          columns={customerColumns}
                          data={displayedCustomers.map(customer => ({
                            ...customer,
                            id: customer.customer_id
                          }))}
                          onEdit={handleEditCustomer}
                          onDelete={(item) => handleDeleteItem(item, 'customer')}
                        />

                        {/* NEW PAGINATION CONTROLS */}
                        <PaginationControls
                          currentPage={customerCurrentPage}
                          totalPages={Math.ceil(filteredCustomers.length / customerRowsPerPage)}
                          onPageChange={setCustomerCurrentPage}
                          totalItems={filteredCustomers.length}
                          rowsPerPage={customerRowsPerPage}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ===== VEHICLES TAB ===== */}
            <TabsContent value="vehicles" className="space-y-6 animate-in fade-in duration-500">
              {isVehicleLoading ? (
                <div className="flex flex-col justify-center items-center h-64 space-y-4">
                  <IndeterminateProgressBar className="w-1/3 max-w-xs" />
                  <p className="text-slate-500 font-poppins animate-pulse text-sm">Loading vehicles...</p>
                </div>
              ) : (
                <Card>
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Vehicle Management
                        <span className="ml-2 text-muted-foreground font-normal">
                          {vehicleFilters.search || vehicleFilters.customer !== 'all' || vehicleFilters.vehicleType !== 'all' ? (
                            <>({filteredVehicles.length} of {vehicles.length})</>
                          ) : (
                            <>({vehicles.length} vehicles)</>
                          )}
                        </span>
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">

                    <VehicleAdvancedFilters
                      filters={vehicleFilters}
                      onFiltersChange={setVehicleFilters}
                      onClearFilters={clearVehicleFilters}
                      customers={customers}
                      vehicleTypes={vehicleTypes}
                      rowsPerPage={vehicleRowsPerPage}
                      onRowsPerPageChange={setVehicleRowsPerPage}
                    />

                    {filteredVehicles.length === 0 ? (
                      <EnhancedEmptyState
                        type="vehicles"
                        onAddNew={handleOpenVehicleDialog}
                        onClearFilters={clearVehicleFilters}
                      />
                    ) : (
                      <>
                        <DataTableWrapper
                          className="w-full"
                          columns={vehicleColumns}
                          data={displayedVehicles.map(vehicle => ({
                            ...vehicle,
                            id: vehicle.vehicle_id
                          }))}
                          onEdit={handleEditVehicle}
                          onDelete={(item) => handleDeleteItem(item, 'vehicle')}
                        />

                        {/* NEW PAGINATION CONTROLS */}
                        <PaginationControls
                          currentPage={vehicleCurrentPage}
                          totalPages={Math.ceil(filteredVehicles.length / vehicleRowsPerPage)}
                          onPageChange={setVehicleCurrentPage}
                          totalItems={filteredVehicles.length}
                          rowsPerPage={vehicleRowsPerPage}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ===== HISTORY TAB ===== */}
            <TabsContent value="history" className="space-y-6 animate-in fade-in duration-500">
              {isHistoryLoading ? (
                <div className="flex flex-col justify-center items-center h-64 space-y-4">
                  <IndeterminateProgressBar className="w-1/3 max-w-xs" />
                  <p className="text-slate-500 font-poppins animate-pulse text-sm">Loading service history...</p>
                </div>
              ) : (
                <Card>
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Tire Service History
                        <span className="ml-2 text-muted-foreground font-normal">
                          {historyFilters.search || historyFilters.serviceType !== 'all' ? (
                            <>({filteredHistory.length} of {tireHistory.length})</>
                          ) : (
                            <>({tireHistory.length} records)</>
                          )}
                        </span>
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">

                    <HistoryAdvancedFilters
                      filters={historyFilters}
                      onFiltersChange={setHistoryFilters}
                      onClearFilters={clearHistoryFilters}
                      rowsPerPage={historyRowsPerPage}
                      onRowsPerPageChange={setHistoryRowsPerPage}
                    />

                    {filteredHistory.length === 0 ? (
                      <EnhancedEmptyState
                        type="history"
                        onAddNew={() => { }}
                        onClearFilters={clearHistoryFilters}
                      />
                    ) : (
                      <>
                        <DataTableWrapper
                          className="w-full"
                          columns={historyColumns}
                          data={displayedHistory.map((h, idx) => ({
                            ...h,
                            id: `${h.history_id}-${idx}`,
                            plate_number: h.vehicle?.plate_number ?? '',
                            items: h.items ?? undefined,
                            created_by_name: h.user?.name ?? '',
                          }))}
                          onDelete={(item) => handleDeleteItem(item, 'history')}
                        />

                        {/* NEW PAGINATION CONTROLS */}
                        <PaginationControls
                          currentPage={historyCurrentPage}
                          totalPages={Math.ceil(filteredHistory.length / historyRowsPerPage)}
                          onPageChange={setHistoryCurrentPage}
                          totalItems={filteredHistory.length}
                          rowsPerPage={historyRowsPerPage}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </EnhancedTabs>
        </div>


        {/* Success Animation */}
        <SuccessAnimation
          isVisible={successAnimation.isVisible}
          title={successAnimation.title}
          message={successAnimation.message}
          actionType={successAnimation.actionType}
          onConfirm={() => setSuccessAnimation(prev => ({ ...prev, isVisible: false }))}
        />

        {/* Customer Dialog */}
        <Dialog open={isCustomerDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) { setIsCustomerDialogOpen(false); resetCustomerForm(); } }}>
          <DialogContent className="sm:max-w-lg bg-white border border-slate-200 shadow-xl font-poppins animate-in zoom-in duration-300">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
              <DialogDescription className="text-slate-600 font-poppins">
                {editingCustomer ? `Update details for ${editingCustomer.name}.` : 'Enter the details for the new customer.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name" className="text-slate-700 font-medium font-poppins">Customer Name *</Label>
                <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-phone" className="text-slate-700 font-medium font-poppins">Phone</Label>
                  <Input id="customer-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+1-555-0101" className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={handleSubmitCustomer} disabled={isCustomerLoading} className="">
                {isCustomerLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCustomer ? 'Save Changes' : 'Create Customer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vehicle Dialog */}
        <Dialog open={isVehicleDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) { setIsVehicleDialogOpen(false); resetVehicleForm(); } }}>
          <DialogContent className="sm:max-w-lg bg-white border border-slate-200 shadow-xl font-poppins animate-in zoom-in duration-300">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </DialogTitle>
              <DialogDescription className="text-slate-600 font-poppins">
                {editingVehicle ? `Update details for ${editingVehicle.plate_number}.` : 'Enter the details for the new vehicle.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customer" className="text-slate-700 font-medium font-poppins">Customer *</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.customer_id} value={customer.customer_id} className="font-poppins">
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate-number" className="text-slate-700 font-medium font-poppins">Plate Number *</Label>
                <Input id="plate-number" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="ABC-1234" className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-type" className="text-slate-700 font-medium font-poppins">Vehicle Type</Label>
                <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
                  <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map(vt => (
                      <SelectItem key={vt.vehicle_type_id} value={vt.vehicle_type_id} className="font-poppins">
                        {vt.name.charAt(0).toUpperCase() + vt.name.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make" className="text-slate-700 font-medium font-poppins">Make</Label>
                  <Input id="make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-slate-700 font-medium font-poppins">Model</Label>
                  <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Camry" className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color" className="text-slate-700 font-medium font-poppins">Color</Label>
                  <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="White" className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={handleSubmitVehicle} disabled={isVehicleLoading} className="">
                {isVehicleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingVehicle ? 'Save Changes' : 'Create Vehicle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-white border border-slate-200 shadow-xl mt-20 font-poppins animate-in zoom-in duration-300">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 font-poppins">Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 font-poppins">
                Are you sure you want to delete this {deletingItem?.type}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-red-600 active:scale-95 font-poppins shadow-md">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

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

        /* Custom date input styling */
        .custom-date-input::-webkit-calendar-picker-indicator {
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>');
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .custom-date-input::-webkit-calendar-picker-indicator:hover {
          background-color: #f3f4f6;
        }

        /* Improved focus styles for all inputs */
        input:focus, textarea:focus, select:focus {
          outline: none;
          ring: 2px;
        }

        /* Smooth transitions for all interactive elements */
        button, input, select, textarea {
          transition: all 0.3s ease;
        }

        /* Enhanced table row styling */
        .table-row-striped:nth-child(even) {
          background-color: rgba(241, 245, 249, 0.3);
        }

        /* Better hover effects */
        .btn-hover-effect:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .mobile-stack {
            flex-direction: column !important;
            gap: 1rem !important;
          }
          
          .mobile-full {
            width: 100% !important;
          }
          
          .mobile-text-center {
            text-align: center !important;
          }
          
          .mobile-p-4 {
            padding: 1rem !important;
          }
        }

        /* Loading animation */
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .animate-shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}