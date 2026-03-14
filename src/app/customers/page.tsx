/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { validateShortText, validatePhone, validateLongText, type FieldError } from '@/lib/validation';
import {
  Loader2, PlusCircle, AlertTriangle, Users, Car, History,
  RefreshCw, Clock, Edit, Trash2, Search, X, ArrowLeft, Download, FileText,
  Eye, TrendingUp, CheckCircle, UserPlus, Calendar, Wrench,
  Save, ArrowUpDown, Archive, PackageSearch,
  Star, Bell, MessageSquare, Award, TrendingDown, PhoneCall,
  Mail, AlertCircle, Heart, Activity, UserCheck, Target, Gift,
  ChevronUp, ChevronDown, Check, DollarSign, Zap, RotateCcw
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
        <Badge
          variant="outline"
          className="flex items-center gap-1 bg-slate-100 text-slate-700 border-slate-300 capitalize font-poppins w-20 px-2 py-0.5 overflow-hidden"
          title={vehicleName}
        >
          <VehicleIcon className="h-3 w-3 flex-shrink-0" />
          <span className="min-w-0 overflow-hidden whitespace-nowrap truncate text-xs">
            {vehicleName}
          </span>
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
  const now = new Date();
  const isCurrentMonth = (serviceDate?: string | null) => {
    if (!serviceDate) return false;
    const parsed = new Date(serviceDate);
    return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
  };
  const recentServices = tireHistory.filter(history => isCurrentMonth(history.service_date)).length;
  const vehiclesWithRecentService = [...new Set(tireHistory
    .filter(history => isCurrentMonth(history.service_date))
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
const QuickActions = ({ onAddCustomer, onAddVehicle, onExportData, onExportPDF }: {
  onAddCustomer: () => void,
  onAddVehicle: () => void,
  onExportData: () => void,
  onExportPDF: () => void
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
        CSV
      </Button>
      <Button onClick={onExportPDF} size="sm" className="gap-2 bg-[#714B67] hover:bg-[#5a3c53] text-white">
        <FileText className="h-4 w-4" />
        PDF
      </Button>
    </div>
  );
};

const EnhancedTabs = ({ value, onValueChange, children }: any) => {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full font-poppins">
      <TabsList className="grid w-full grid-cols-4 p-1 bg-slate-100 rounded-2xl">
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
        <TabsTrigger
          value="crm"
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300 font-poppins"
        >
          <Heart className="h-4 w-4 mr-2" />
          CRM
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};

// ===== CRM TYPES & HELPERS =====
interface CRMSalesSummary {
  customer_id: string;
  totalSpend: number;
  purchaseCount: number;
  lastPurchaseDate: string | null;
}
interface CRMServiceSummary {
  customer_id: string;
  totalServices: number;
  lastServiceDate: string | null;
}
type CustomerSegmentType = 'vip' | 'regular' | 'new' | 'at_risk' | 'churned';

const SEGMENT_CONFIG: Record<CustomerSegmentType, { label: string; color: string; icon: any; bg: string }> = {
  vip:     { label: 'VIP',      color: 'text-yellow-800 border-yellow-400', bg: 'bg-yellow-50',  icon: Star },
  regular: { label: 'Regular',  color: 'text-green-800  border-green-400',  bg: 'bg-green-50',   icon: UserCheck },
  new:     { label: 'New',      color: 'text-blue-800   border-blue-400',   bg: 'bg-blue-50',    icon: UserPlus },
  at_risk: { label: 'At-Risk',  color: 'text-orange-800 border-orange-400', bg: 'bg-orange-50',  icon: AlertCircle },
  churned: { label: 'Churned',  color: 'text-red-800    border-red-400',    bg: 'bg-red-50',     icon: TrendingDown },
};

function getCustomerSegment(
  customer: Customer,
  sales: CRMSalesSummary | undefined,
  services: CRMServiceSummary | undefined,
): CustomerSegmentType {
  const totalSpend    = sales?.totalSpend ?? 0;
  const visitCount    = (sales?.purchaseCount ?? 0) + (services?.totalServices ?? 0);
  const lastVisitStr  = sales?.lastPurchaseDate && services?.lastServiceDate
    ? (sales.lastPurchaseDate > services.lastServiceDate ? sales.lastPurchaseDate : services.lastServiceDate)
    : (sales?.lastPurchaseDate ?? services?.lastServiceDate ?? null);
  const daysSinceLast = lastVisitStr
    ? Math.floor((Date.now() - new Date(lastVisitStr).getTime()) / 86_400_000)
    : null;
  const daysSinceCreated = customer.created_at
    ? Math.floor((Date.now() - new Date(customer.created_at).getTime()) / 86_400_000)
    : 9999;

  if (totalSpend >= 10000 || visitCount >= 10)                          return 'vip';
  if (daysSinceLast !== null && daysSinceLast > 90)                     return 'churned';
  if (daysSinceLast !== null && daysSinceLast > 30)                     return 'at_risk';
  if (daysSinceLast !== null && daysSinceLast <= 30 && visitCount >= 2) return 'regular';
  if (daysSinceCreated <= 30 || visitCount === 0)                       return 'new';
  return 'regular';
}

function computeLoyaltyPoints(totalSpend: number): number {
  return Math.floor(totalSpend / 100); // 1 point per ₱100
}

function getLoyaltyTier(points: number): { tier: string; color: string; next: number | null } {
  if (points >= 1000) return { tier: 'Platinum', color: 'text-purple-700', next: null };
  if (points >= 500)  return { tier: 'Gold',     color: 'text-yellow-600', next: 1000 };
  if (points >= 200)  return { tier: 'Silver',   color: 'text-slate-500',  next: 500 };
  return                     { tier: 'Bronze',   color: 'text-amber-700',  next: 200 };
}

const ACTIVITY_TYPES = [
  { value: 'todo',     label: 'To-Do',    Icon: CheckCircle },
  { value: 'call',     label: 'Call',     Icon: PhoneCall   },
  { value: 'email',    label: 'Email',    Icon: Mail        },
  { value: 'meeting',  label: 'Meeting',  Icon: Calendar    },
];

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

    // Plate helpers — improved for deletion handling and numeric length cap
  const formatPlateOnType = (input: string) => {
    if (!input) return '';
    const up = input.toUpperCase();
    let s = up.replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-');

    if (s.includes('-')) {
      const [L = '', R = ''] = s.split('-', 2);
      const left = L.replace(/[^A-Z]/g, '').slice(0, 4);
      const right = R.replace(/[^0-9]/g, '').slice(0, 4);
      return right ? `${left}-${right}` : left;
    }

    // If user pasted/typed contiguous letters+digits like ABC1234 => split
    const m = s.match(/^([A-Z]{1,4})(\d{1,4})$/);
    if (m) return `${m[1]}-${m[2]}`;

    if (/^[A-Z]{4,}$/.test(s)) return s.slice(0, 4) + '-';

    const letters = s.replace(/[^A-Z]/g, '').slice(0, 4);
    const numbers = s.replace(/[^0-9]/g, '').slice(0, 4);
    return numbers ? `${letters}-${numbers}` : letters;
  };
    
  const normalizePlateForStorage = (val: string) => {
    if (!val) return '';
    let s = val.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');
    s = s.replace(/-+/g, '-').replace(/(^-|-$)/g, '');
    if (!s.includes('-')) {
      const m = s.match(/^([A-Z]{1,4})(\d{1,4})$/);
      if (m) return `${m[1]}-${m[2]}`;
    }
    const [L = '', R = ''] = s.split('-', 2);
    const left = L.replace(/[^A-Z]/g, '').slice(0, 4);
    const right = R.replace(/[^0-9]/g, '').slice(0, 4);
    return right ? `${left}-${right}` : left;
  };
  
  const isPlateValidForSave = (val: string) => {
    const s = normalizePlateForStorage(val);
    return /^[A-Z]{1,4}-\d{1,4}$/.test(s);
  };

  // Form validation errors
  const [customerFormErrors, setCustomerFormErrors] = useState<{ name?: FieldError; phone?: FieldError }>({});
  const [vehicleFormErrors,  setVehicleFormErrors]  = useState<{ plateNumber?: FieldError; make?: FieldError; model?: FieldError; color?: FieldError }>({});
  const [activityFormErrors, setActivityFormErrors] = useState<{ summary?: FieldError; note?: FieldError }>({}); 

  // ===== CRM States =====
  const [crmSalesData, setCrmSalesData] = useState<CRMSalesSummary[]>([]);
  const [crmServicesData, setCrmServicesData] = useState<CRMServiceSummary[]>([]);
  const [isCrmLoading, setIsCrmLoading] = useState(false);
  const [crmActivities, setCrmActivities] = useState<any[]>([]);
  const [selectedCrmCustomer, setSelectedCrmCustomer] = useState<Customer | null>(null);
  const [isCustomer360Open, setIsCustomer360Open] = useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({ activityType: 'todo', summary: '', note: '', dueDate: '', assignedTo: '' });
  const [customerChatter, setCustomerChatter] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [winBackDays, setWinBackDays] = useState(60);
  const [crmSearch, setCrmSearch] = useState('');
  const [crmSegmentFilter, setCrmSegmentFilter] = useState<CustomerSegmentType | 'all'>('all');
  const [customer360Sales, setCustomer360Sales] = useState<any[]>([]);
  const [customer360Services, setCustomer360Services] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [activeBranchId]);

  // Handler to attach to the plate input
  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value || '';
    const prev = plateNumber || '';
    const isDeleting = raw.length < prev.length;
    const lastChar = raw.slice(-1);

    let formatted = '';

    if (!isDeleting && (lastChar === ' ' || lastChar === '-')) {
      // User explicitly pressed space or dash -> force separator if letters exist
      const letters = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      formatted = letters ? `${letters}-` : '';
    } else if (isDeleting) {
      // On delete, be permissive and avoid auto-inserting a dash
      formatted = raw.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-');
      const [L = '', R = ''] = formatted.split('-', 2);
      const left = L.replace(/[^A-Z]/g, '').slice(0, 4);
      const right = R.replace(/[^0-9]/g, '').slice(0, 4);
      formatted = right ? `${left}-${right}` : left;
    } else {
      // Normal typing: apply smart formatting (auto-insert after 4 letters, split letters+digits, cap nums)
      formatted = formatPlateOnType(raw);
    }

    setPlateNumber(formatted);
    setVehicleFormErrors((p) => ({
      ...p,
      plateNumber: validateShortText(formatted, { label: 'Plate number', required: true, minLength: 3, maxLength: 20, blockDangerousChars: false })
    }));
  };


  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Reset pagination and filters when changing tabs
    setCustomerCurrentPage(1);
    setVehicleCurrentPage(1);
    setHistoryCurrentPage(1);
    setCustomerFilters({ search: '', sortBy: 'name', sortOrder: 'asc' });
    setVehicleFilters({ search: '', customer: 'all', vehicleType: 'all', sortBy: 'plate_number', sortOrder: 'asc' });
    setHistoryFilters({ search: '', serviceType: 'all', sortBy: 'service_date', sortOrder: 'desc' });
    if (tab === 'crm') fetchCRMData();
  };

  const fetchCRMData = useCallback(async () => {
    if (!supabase) return;
    setIsCrmLoading(true);
    try {
      const [salesRes, servicesRes, activitiesRes] = await Promise.all([
        supabase.from('sale').select('customer_id, total_amount, sale_date').not('customer_id', 'is', null),
        supabase.from('service_job').select('customer_id, job_date, status').not('customer_id', 'is', null).eq('status', 'completed'),
        supabase.from('record_activity').select('*, assigned_to_user:assigned_to(name)').eq('record_table', 'customer').eq('is_done', false).order('date_deadline', { ascending: true }),
      ]);

      // Build per-customer sales map
      const salesMap: Record<string, CRMSalesSummary> = {};
      (salesRes.data || []).forEach((sale: any) => {
        if (!sale.customer_id) return;
        const m = salesMap[sale.customer_id] ??= { customer_id: sale.customer_id, totalSpend: 0, purchaseCount: 0, lastPurchaseDate: null };
        m.totalSpend += sale.total_amount ?? 0;
        m.purchaseCount += 1;
        if (!m.lastPurchaseDate || sale.sale_date > m.lastPurchaseDate) m.lastPurchaseDate = sale.sale_date;
      });
      setCrmSalesData(Object.values(salesMap));

      // Build per-customer services map
      const svcMap: Record<string, CRMServiceSummary> = {};
      (servicesRes.data || []).forEach((svc: any) => {
        if (!svc.customer_id) return;
        const m = svcMap[svc.customer_id] ??= { customer_id: svc.customer_id, totalServices: 0, lastServiceDate: null };
        m.totalServices += 1;
        if (!m.lastServiceDate || svc.job_date > m.lastServiceDate) m.lastServiceDate = svc.job_date;
      });
      setCrmServicesData(Object.values(svcMap));

      setCrmActivities(activitiesRes.data || []);
    } catch (e: any) {
      toast({ title: 'CRM Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsCrmLoading(false);
    }
  }, [supabase, toast]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const inferServiceType = (description: string): string => {
      const text = description.toLowerCase();
      if (text.includes('rotat')) return 'rotation';
      if (text.includes('balanc')) return 'balancing';
      if (text.includes('replace')) return 'replacement';
      return 'repair';
    };

    let query = supabase
      .from('service_job')
      .select(`
        job_id,
        job_number,
        job_description,
        job_date,
        state,
        status,
        notes,
        created_at,
        user_id,
        user:user_id ( user_id, name ),
        vehicle:vehicle_id (
          vehicle_id,
          customer_id,
          vehicle_type_id,
          plate_number,
          make,
          model,
          year,
          color,
          customer:customer_id ( customer_id, name, phone, branch_id )
        ),
        service_job_item (
          item_id,
          quantity,
          catalog_item:item_id ( item_id, name, category )
        )
      `)
      .is('deleted_at', null)
      .order('job_date', { ascending: false });

    if (activeBranchId) {
      query = query.eq('branch_id', activeBranchId);
    }

    const { data, error } = await query;

    if (error) {
      setHistoryError(`Could not fetch tire history: ${error.message}`);
      setTireHistory([]);
    } else {
      const mappedHistory = ((data || []) as any[])
        .map((job) => {
          const rawState = String(job.state ?? job.status ?? '').toLowerCase();
          if (!['completed', 'invoiced', 'paid'].includes(rawState)) {
            return null;
          }

          const tireItems = ((job.service_job_item || []) as any[])
            .filter((line) => String(line?.catalog_item?.category ?? '').toLowerCase() === 'tire')
            .map((line) => ({
              item_id: line?.catalog_item?.item_id ?? line?.item_id,
              name: line?.catalog_item?.name ?? 'Unknown item',
              quantity: Number(line?.quantity ?? 1),
            }))
            .filter((line) => Boolean(line.item_id));

          return {
            history_id: `svc-${job.job_id}`,
            vehicle_id: job.vehicle?.vehicle_id ?? undefined,
            item_id: tireItems[0]?.item_id,
            service_type: inferServiceType(String(job.job_description ?? '')),
            service_date: job.job_date ?? job.created_at,
            notes: job.notes ?? job.job_description ?? null,
            created_by: job.user_id,
            created_at: job.created_at,
            vehicle: job.vehicle ?? undefined,
            items: tireItems.length > 0 ? tireItems : undefined,
            user: job.user ?? undefined,
          } as TireHistory;
        })
        .filter(Boolean) as TireHistory[];

      setTireHistory(mappedHistory);
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
    setCustomerFormErrors({});
  };

  const resetVehicleForm = () => {
    setSelectedCustomer('');
    setPlateNumber('');
    setMake('');
    setModel('');
    setColor('');
    setSelectedVehicleType('');
    setEditingVehicle(null);
    setVehicleFormErrors({});
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

  // ===== CRM Handlers =====
  const handleOpenCustomer360 = useCallback(async (customer: Customer) => {
    setSelectedCrmCustomer(customer);
    setIsCustomer360Open(true);
    if (!supabase) return;
    // Load sales history
    const { data: salData } = await supabase
      .from('sale')
      .select('sale_id, total_amount, sale_date, payment_method, sale_item(quantity, price_at_sale, inventory_item(name))')
      .eq('customer_id', customer.customer_id)
      .order('sale_date', { ascending: false })
      .limit(20);
    setCustomer360Sales(salData || []);
    // Load service history
    const { data: svcData } = await supabase
      .from('service_job')
      .select('job_id, job_description, job_date, status, service_fee')
      .eq('customer_id', customer.customer_id)
      .order('job_date', { ascending: false })
      .limit(20);
    setCustomer360Services(svcData || []);
    // Load chatter notes
    const { data: chatData } = await supabase
      .from('chatter_messages')
      .select('*, user:user_id(name)')
      .eq('related_table', 'customer')
      .eq('related_record_id', customer.customer_id)
      .order('created_at', { ascending: false })
      .limit(50);
    setCustomerChatter(chatData || []);
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveNote = async () => {
    if (!supabase || !selectedCrmCustomer || !newNoteText.trim() || !authUser) return;
    setIsSavingNote(true);
    try {
      const { error } = await supabase.from('chatter_messages').insert([{
        related_table: 'customer',
        related_record_id: selectedCrmCustomer.customer_id,
        user_id: authUser.user_id,
        type: 'note',
        message: newNoteText.trim(),
        is_internal: false,
      }]);
      if (error) throw error;
      // Audit log
      await supabase.from('audit_log').insert({
        user_id: authUser.user_id,
        action: 'INSERT',
        table_name: 'chatter_messages',
        record_id: null,
        old_values: null,
        new_values: { related_table: 'customer', related_record_id: selectedCrmCustomer.customer_id, type: 'note', message: newNoteText.trim() },
        record_number: selectedCrmCustomer.name,
      });
      setNewNoteText('');
      // Refresh chatter
      const { data: chatData } = await supabase
        .from('chatter_messages')
        .select('*, user:user_id(name)')
        .eq('related_table', 'customer')
        .eq('related_record_id', selectedCrmCustomer.customer_id)
        .order('created_at', { ascending: false })
        .limit(50);
      setCustomerChatter(chatData || []);
      toast({ title: 'Note saved' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSaveActivity = async () => {
    if (!supabase || !selectedCrmCustomer || !authUser) return;

    // Inline validation
    const errs: typeof activityFormErrors = {
      summary: validateShortText(activityForm.summary, { label: 'Summary', required: true, minLength: 2, maxLength: 200 }),
      note:    validateLongText(activityForm.note,     { label: 'Notes',   maxLength: 500 }),
    };
    setActivityFormErrors(errs);
    if (errs.summary || errs.note) return;
    if (!activityForm.dueDate) {
      toast({ title: 'Due date is required', variant: 'destructive' });
      return;
    }
    setIsSavingActivity(true);
    try {
      const { error } = await supabase.from('record_activity').insert([{
        record_table: 'customer',
        record_id: selectedCrmCustomer.customer_id,
        activity_type: activityForm.activityType,
        summary: activityForm.summary,
        note: activityForm.note || null,
        date_deadline: activityForm.dueDate,
        assigned_to: activityForm.assignedTo || authUser.user_id,
        created_by: authUser.user_id,
        is_done: false,
      }]);
      if (error) throw error;
      // Audit log
      await supabase.from('audit_log').insert({
        user_id: authUser.user_id,
        action: 'INSERT',
        table_name: 'record_activity',
        record_id: null,
        old_values: null,
        new_values: { record_table: 'customer', record_id: selectedCrmCustomer.customer_id, activity_type: activityForm.activityType, summary: activityForm.summary, date_deadline: activityForm.dueDate },
        record_number: selectedCrmCustomer.name,
      });
      setIsAddActivityOpen(false);
      setActivityForm({ activityType: 'todo', summary: '', note: '', dueDate: '', assignedTo: '' });
      toast({ title: 'Follow-up scheduled' });
      fetchCRMData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleMarkActivityDone = async (activityId: string) => {
    if (!supabase) return;
    await supabase.from('record_activity').update({ is_done: true, done_at: new Date().toISOString() }).eq('id', activityId);
    await supabase.from('audit_log').insert({
      user_id: authUser?.user_id,
      action: 'UPDATE',
      table_name: 'record_activity',
      record_id: activityId,
      old_values: { is_done: false },
      new_values: { is_done: true, done_at: new Date().toISOString() },
      record_number: null,
    });
    fetchCRMData();
    toast({ title: 'Activity marked as done' });
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

  const BRAND_COLOR_C: [number, number, number] = [113, 75, 103];

  const handleExportPDF = () => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    const pdfHeader = (title: string, subtitle: string) => {
      doc.setFillColor(...BRAND_COLOR_C);
      doc.rect(0, 0, pageW, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('eTire MIS', 14, 10);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, 14, 16);
      doc.text(today, pageW - 14, 16, { align: 'right' });
      doc.setDrawColor(...BRAND_COLOR_C);
      doc.setLineWidth(0.5);
      doc.line(0, 22, pageW, 22);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_COLOR_C);
      doc.text(title, 14, 30);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
    };

    if (activeTab === 'customers') {
      if (filteredCustomers.length === 0) {
        toast({ title: 'No Data', description: 'No customer data to export.', variant: 'destructive' });
        return;
      }
      pdfHeader('Customers List', 'Customers Report');
      doc.setFontSize(9);
      doc.text(`Total: ${filteredCustomers.length} customer(s)`, 14, 37);

      autoTable(doc, {
        startY: 41,
        head: [['Customer Name', 'Phone', 'Vehicles']],
        body: filteredCustomers.map(c => [c.name ?? '', c.phone ?? '', String(c.vehicle_count ?? 0)]),
        foot: [[{ content: `Total: ${filteredCustomers.length} customer(s)`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }]],
        headStyles: { fillColor: BRAND_COLOR_C, textColor: 255, fontStyle: 'bold', fontSize: 10 },
        alternateRowStyles: { fillColor: [251, 248, 252] },
        footStyles: { fillColor: [240, 235, 245], textColor: [60, 40, 55], fontStyle: 'bold' },
        columnStyles: { 2: { halign: 'right' } },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
    } else if (activeTab === 'vehicles') {
      if (filteredVehicles.length === 0) {
        toast({ title: 'No Data', description: 'No vehicle data to export.', variant: 'destructive' });
        return;
      }
      pdfHeader('Vehicles List', 'Vehicles Report');
      doc.setFontSize(9);
      doc.text(`Total: ${filteredVehicles.length} vehicle(s)`, 14, 37);

      autoTable(doc, {
        startY: 41,
        head: [['Plate Number', 'Customer', 'Vehicle Type', 'Make', 'Model', 'Color']],
        body: filteredVehicles.map(v => [
          v.plate_number ?? '',
          (v as any).customer?.name ?? '',
          (v as any).vehicle_type?.name ?? '',
          (v as any).make ?? '',
          (v as any).model ?? '',
          (v as any).color ?? '',
        ]),
        foot: [[{ content: `Total: ${filteredVehicles.length} vehicle(s)`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }]],
        headStyles: { fillColor: BRAND_COLOR_C, textColor: 255, fontStyle: 'bold', fontSize: 10 },
        alternateRowStyles: { fillColor: [251, 248, 252] },
        footStyles: { fillColor: [240, 235, 245], textColor: [60, 40, 55], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
    } else {
      if (filteredHistory.length === 0) {
        toast({ title: 'No Data', description: 'No tire history to export.', variant: 'destructive' });
        return;
      }
      pdfHeader('Tire Service History', 'Tire History Report');
      doc.setFontSize(9);
      doc.text(`Total: ${filteredHistory.length} service record(s)`, 14, 37);

      const toTitle = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

      autoTable(doc, {
        startY: 41,
        head: [['Vehicle', 'Item(s)', 'Service Type', 'Date', 'Notes', 'Service By']],
        body: filteredHistory.map(h => {
          const itemsList = Array.isArray((h as any).items) && (h as any).items.length
            ? (h as any).items.map((it: any) => {
                const name = it?.name ?? '';
                const qty = it?.quantity && it.quantity > 1 ? ` (x${it.quantity})` : '';
                return `${name}${qty}`;
              }).join('; ')
            : '';
          return [
            (h as any).vehicle?.plate_number ?? '',
            itemsList,
            toTitle((h as any).service_type ?? ''),
            (h as any).service_date ? (h as any).service_date.slice(0, 10) : '',
            (h as any).notes ?? '',
            (h as any).user?.name ?? '',
          ];
        }),
        foot: [[{ content: `Total: ${filteredHistory.length} record(s)`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }]],
        headStyles: { fillColor: BRAND_COLOR_C, textColor: 255, fontStyle: 'bold', fontSize: 10 },
        alternateRowStyles: { fillColor: [251, 248, 252] },
        footStyles: { fillColor: [240, 235, 245], textColor: [60, 40, 55], fontStyle: 'bold' },
        columnStyles: { 1: { cellWidth: 55 }, 4: { cellWidth: 50 } },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
    }

    const tabLabel = activeTab === 'tire_history' ? 'tire-history' : activeTab;
    doc.save(`customers-${tabLabel}-report-${new Date().toISOString().split('T')[0]}.pdf`);

    setSuccessAnimation({
      isVisible: true,
      title: "PDF Exported!",
      message: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} report saved as PDF.`,
      actionType: 'export'
    });
  };

  const handleSubmitCustomer = async () => {
    if (!supabase || !authUser) return;

    // Inline validation
    const errs = {
      name:  validateShortText(customerName,  { label: 'Customer name', required: true,  minLength: 2, maxLength: 100 }),
      phone: validatePhone(customerPhone,     { label: 'Phone' }),
    };
    setCustomerFormErrors(errs);
    if (errs.name || errs.phone) return;

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
      if (!updateError && authUser) {
        await supabase.from('audit_log').insert({
          user_id: authUser.user_id,
          action: 'UPDATE',
          table_name: 'customer',
          record_id: editingCustomer.customer_id,
          old_values: { name: editingCustomer.name, phone: editingCustomer.phone },
          new_values: customerData,
          record_number: customerData.name,
        });
      }
    } else {
      const { data: insertedCustomer, error: insertError } = await (supabase
        .from('customer') as any)
        .insert([customerData])
        .select()
        .single();
      error = insertError;
      if (!insertError && insertedCustomer && authUser) {
        await supabase.from('audit_log').insert({
          user_id: authUser.user_id,
          action: 'INSERT',
          table_name: 'customer',
          record_id: insertedCustomer.customer_id,
          old_values: null,
          new_values: customerData,
          record_number: customerData.name,
        });
      }
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

    // Inline validation
    const errs: typeof vehicleFormErrors = {
      plateNumber: validateShortText(plateNumber, { label: 'Plate number', required: true,  minLength: 3, maxLength: 20,  blockDangerousChars: false }),
      make:        validateShortText(make,        { label: 'Make',         required: false, minLength: 2, maxLength: 50  }),
      model:       validateShortText(model,       { label: 'Model',        required: false, minLength: 1, maxLength: 50  }),
      color:       validateShortText(color,       { label: 'Color',        required: false, minLength: 2, maxLength: 30  }),
    };
    setVehicleFormErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    if (!selectedCustomer) {
      toast({ title: "Validation Error", description: "Customer is required.", variant: "destructive" });
      return;
    }

    setIsVehicleLoading(true);

    // Normalize and validate plate before saving
    const normalizedPlate = normalizePlateForStorage(plateNumber);
    if (!isPlateValidForSave(normalizedPlate)) {
      toast({ title: 'Invalid plate', description: 'Plate must be in the format LETTERS-NUMBERS (e.g. ABC-1234).', variant: 'destructive' });
      setIsVehicleLoading(false);
      return;
    }

    const vehicleData = {
      customer_id: selectedCustomer,
      plate_number: normalizedPlate,
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
      if (!updateError && authUser) {
        await supabase.from('audit_log').insert({
          user_id: authUser.user_id,
          action: 'UPDATE',
          table_name: 'vehicle',
          record_id: editingVehicle.vehicle_id,
          old_values: { customer_id: editingVehicle.customer_id, plate_number: editingVehicle.plate_number, make: editingVehicle.make, model: editingVehicle.model, color: editingVehicle.color, vehicle_type_id: editingVehicle.vehicle_type_id },
          new_values: vehicleData,
          record_number: vehicleData.plate_number,
        });
      }
    } else {
      const { data: insertedVehicle, error: insertError } = await (supabase
        .from('vehicle') as any)
        .insert([vehicleData])
        .select()
        .single();
      error = insertError;
      if (!insertError && insertedVehicle && authUser) {
        await supabase.from('audit_log').insert({
          user_id: authUser.user_id,
          action: 'INSERT',
          table_name: 'vehicle',
          record_id: insertedVehicle.vehicle_id,
          old_values: null,
          new_values: vehicleData,
          record_number: vehicleData.plate_number,
        });
      }
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
      // Audit log for soft-delete
      if (authUser && supabase) {
        await supabase.from('audit_log').insert({
          user_id: authUser.user_id,
          action: 'DELETE',
          table_name: tableName,
          record_id: deletingItem[idField] as string,
          old_values: { name: deletingItem.name ?? deletingItem.plate_number ?? null, ...deletingItem },
          new_values: { deleted_at: new Date().toISOString() },
          record_number: deletingItem.name ?? deletingItem.plate_number ?? null,
        });
      }
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

  // ===== CRM Computed Data =====
  const salesByCust = useMemo(() => Object.fromEntries(crmSalesData.map(s => [s.customer_id, s])), [crmSalesData]);
  const svcByCust   = useMemo(() => Object.fromEntries(crmServicesData.map(s => [s.customer_id, s])), [crmServicesData]);

  const crmCustomers = useMemo(() => {
    return customers
      .filter(c => {
        const seg = getCustomerSegment(c, salesByCust[c.customer_id], svcByCust[c.customer_id]);
        const matchSearch = !crmSearch ||
          c.name.toLowerCase().includes(crmSearch.toLowerCase()) ||
          (c.phone ?? '').includes(crmSearch);
        const matchSeg = crmSegmentFilter === 'all' || seg === crmSegmentFilter;
        return matchSearch && matchSeg;
      })
      .map(c => {
        const s = salesByCust[c.customer_id];
        const sv = svcByCust[c.customer_id];
        const seg = getCustomerSegment(c, s, sv);
        const lastVisit = s?.lastPurchaseDate && sv?.lastServiceDate
          ? (s.lastPurchaseDate > sv.lastServiceDate ? s.lastPurchaseDate : sv.lastServiceDate)
          : (s?.lastPurchaseDate ?? sv?.lastServiceDate ?? null);
        const daysSinceVisit = lastVisit ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86_400_000) : null;
        return { ...c, seg, lastVisit, daysSinceVisit, totalSpend: s?.totalSpend ?? 0, visitCount: (s?.purchaseCount ?? 0) + (sv?.totalServices ?? 0) };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [customers, salesByCust, svcByCust, crmSearch, crmSegmentFilter]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: customers.length, vip: 0, regular: 0, new: 0, at_risk: 0, churned: 0 };
    customers.forEach(c => { const seg = getCustomerSegment(c, salesByCust[c.customer_id], svcByCust[c.customer_id]); counts[seg]++; });
    return counts;
  }, [customers, salesByCust, svcByCust]);

  const winBackCustomers = useMemo(() => {
    return customers
      .map(c => {
        const s = salesByCust[c.customer_id];
        const sv = svcByCust[c.customer_id];
        const lastVisit = s?.lastPurchaseDate && sv?.lastServiceDate
          ? (s.lastPurchaseDate > sv.lastServiceDate ? s.lastPurchaseDate : sv.lastServiceDate)
          : (s?.lastPurchaseDate ?? sv?.lastServiceDate ?? null);
        const daysSinceVisit = lastVisit ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86_400_000) : null;
        const totalSpend = s?.totalSpend ?? 0;
        return { ...c, lastVisit, daysSinceVisit, totalSpend };
      })
      .filter(c => c.daysSinceVisit !== null && c.daysSinceVisit >= winBackDays)
      .sort((a, b) => (b.daysSinceVisit ?? 0) - (a.daysSinceVisit ?? 0));
  }, [customers, salesByCust, svcByCust, winBackDays]);

  const topCustomers = useMemo(() => {
    return customers
      .map(c => ({ ...c, totalSpend: (salesByCust[c.customer_id]?.totalSpend ?? 0) + 0 }))  
      .filter(c => c.totalSpend > 0)
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10);
  }, [customers, salesByCust]);

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
          onExportPDF={handleExportPDF}
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
                        onAddNew={() => handleTabChange('vehicles')}
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

            {/* ===== CRM TAB ===== */}
            <TabsContent value="crm" className="space-y-6 animate-in fade-in duration-500">
              {isCrmLoading ? (
                <div className="flex flex-col justify-center items-center h-64 space-y-4">
                  <IndeterminateProgressBar className="w-1/3 max-w-xs" />
                  <p className="text-slate-500 font-poppins animate-pulse text-sm">Loading CRM data...</p>
                </div>
              ) : (
                <div className="space-y-6">

                  {/* ── Segment Overview ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {(Object.keys(SEGMENT_CONFIG) as CustomerSegmentType[]).map(seg => {
                      const cfg = SEGMENT_CONFIG[seg];
                      const SegIcon = cfg.icon;
                      return (
                        <button
                          key={seg}
                          onClick={() => setCrmSegmentFilter(crmSegmentFilter === seg ? 'all' : seg)}
                          className={`rounded-xl p-3 border-2 text-left transition-all duration-200 hover:shadow-md ${
                            crmSegmentFilter === seg
                              ? `${cfg.bg} ${cfg.color} shadow-inner`
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <SegIcon className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-semibold uppercase tracking-wide font-poppins">{cfg.label}</span>
                          </div>
                          <p className="text-2xl font-bold font-poppins">{segmentCounts[seg] ?? 0}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Search + Segment filter row ── */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search customers by name or phone..."
                        value={crmSearch}
                        onChange={e => setCrmSearch(e.target.value)}
                        className="pl-9 bg-white border-slate-200 font-poppins"
                      />
                    </div>
                    {crmSegmentFilter !== 'all' && (
                      <Button variant="outline" size="sm" onClick={() => setCrmSegmentFilter('all')} className="gap-2 font-poppins">
                        <X className="h-3.5 w-3.5" />
                        Clear filter
                      </Button>
                    )}
                  </div>

                  {/* ── Customer CRM List ── */}
                  <Card>
                    <CardHeader className="py-2 px-4">
                      <CardTitle className="text-sm font-medium font-poppins">
                        Customer Overview
                        <span className="ml-2 text-muted-foreground font-normal">({crmCustomers.length} customers)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm font-poppins">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Segment</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lifetime Value</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Visits</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Visit</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Points</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {crmCustomers.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center py-10 text-slate-400 font-poppins">
                                  No customers match your filters.
                                </td>
                              </tr>
                            ) : crmCustomers.map(c => {
                              const cfg = SEGMENT_CONFIG[c.seg];
                              const pts = computeLoyaltyPoints(c.totalSpend);
                              const loyalty = getLoyaltyTier(pts);
                              return (
                                <tr key={c.customer_id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3">
                                    <div>
                                      <p className="font-semibold text-slate-800">{c.name}</p>
                                      {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge variant="outline" className={`text-xs ${cfg.bg} ${cfg.color} border font-poppins`}>
                                      {cfg.label}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-green-700">
                                    ₱{c.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-700">{c.visitCount}</td>
                                  <td className="px-4 py-3 text-slate-600 text-xs">
                                    {c.lastVisit
                                      ? <>{new Date(c.lastVisit).toLocaleDateString()}<br /><span className="text-slate-400">{c.daysSinceVisit} days ago</span></>
                                      : <span className="text-slate-400">Never</span>}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`text-xs font-semibold ${loyalty.color}`}>{pts} pts</span>
                                    <br /><span className="text-xs text-slate-400">{loyalty.tier}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenCustomer360(c)}
                                      className="text-xs h-7 gap-1 font-poppins"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      360°
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Win-Back List ── */}
                  <Card>
                    <CardHeader className="py-2 px-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-sm font-medium font-poppins flex items-center gap-2">
                          <RotateCcw className="h-4 w-4 text-orange-500" />
                          Win-Back List
                          <span className="text-muted-foreground font-normal">({winBackCustomers.length} customers)</span>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-poppins">Inactive for ≥</span>
                          <Select value={String(winBackDays)} onValueChange={v => setWinBackDays(Number(v))}>
                            <SelectTrigger className="h-7 w-20 text-xs font-poppins">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[30, 45, 60, 90, 120, 180].map(d => (
                                <SelectItem key={d} value={String(d)} className="text-xs font-poppins">{d} days</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm font-poppins">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Days Inactive</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Visit</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">LTV</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {winBackCustomers.length === 0 ? (
                              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No inactive customers in this range.</td></tr>
                            ) : winBackCustomers.slice(0, 20).map(c => (
                              <tr key={c.customer_id} className="hover:bg-orange-50 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-800">{c.name}</p>
                                  {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs font-poppins">
                                    {c.daysSinceVisit}d
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500">
                                  {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-4 py-3 text-right text-green-700 font-semibold text-xs">
                                  ₱{c.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-4 py-3">
                                  <Button
                                    variant="outline" size="sm"
                                    onClick={() => {
                                      setSelectedCrmCustomer(c);
                                      setIsAddActivityOpen(true);
                                    }}
                                    className="text-xs h-7 gap-1 font-poppins"
                                  >
                                    <Bell className="h-3.5 w-3.5" />
                                    Follow-up
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Follow-up Activities ── */}
                  <Card>
                    <CardHeader className="py-2 px-4">
                      <CardTitle className="text-sm font-medium font-poppins flex items-center gap-2">
                        <Bell className="h-4 w-4 text-purple-500" />
                        Upcoming Follow-ups
                        <span className="text-muted-foreground font-normal">({crmActivities.length} pending)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {crmActivities.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 font-poppins text-sm">No pending follow-ups.</div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {crmActivities.map(act => {
                            const actCfg = ACTIVITY_TYPES.find(a => a.value === act.activity_type) ?? ACTIVITY_TYPES[0];
                            const ActIcon = actCfg.Icon;
                            const overdue = new Date(act.date_deadline) < new Date();
                            const linkedCustomer = customers.find(c => c.customer_id === act.record_id);
                            return (
                              <div key={act.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                                <div className={`p-2 rounded-lg ${overdue ? 'bg-red-100' : 'bg-purple-50'}`}>
                                  <ActIcon className={`h-4 w-4 ${overdue ? 'text-red-600' : 'text-purple-600'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm font-poppins truncate">{act.summary}</p>
                                  <p className="text-xs text-slate-500 font-poppins">
                                    {linkedCustomer?.name ?? 'Unknown Customer'} · Due: {new Date(act.date_deadline).toLocaleDateString()}
                                    {overdue && <span className="ml-1 text-red-500 font-semibold">Overdue</span>}
                                  </p>
                                  {act.note && <p className="text-xs text-slate-400 truncate mt-0.5">{act.note}</p>}
                                </div>
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => handleMarkActivityDone(act.id)}
                                  className="text-xs h-7 gap-1 shrink-0 font-poppins"
                                >
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                  Done
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ── Top 10 Customers by LTV ── */}
                  <Card>
                    <CardHeader className="py-2 px-4">
                      <CardTitle className="text-sm font-medium font-poppins flex items-center gap-2">
                        <Award className="h-4 w-4 text-yellow-500" />
                        Top Customers (by Lifetime Value)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                        {topCustomers.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 font-poppins text-sm">No sales data yet.</div>
                        ) : topCustomers.map((c, idx) => {
                          const pts = computeLoyaltyPoints(c.totalSpend);
                          const loyalty = getLoyaltyTier(pts);
                          return (
                            <div key={c.customer_id} className="flex items-center gap-3 px-4 py-3 hover:bg-yellow-50 transition-colors">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-poppins ${
                                idx === 0 ? 'bg-yellow-400 text-white' :
                                idx === 1 ? 'bg-slate-300 text-white' :
                                idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800 text-sm font-poppins">{c.name}</p>
                                <p className="text-xs text-slate-500 font-poppins">{c.phone ?? ''}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-700 font-poppins">₱{c.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                <p className={`text-xs font-semibold ${loyalty.color} font-poppins`}>
                                  <Gift className="inline h-3 w-3 mr-0.5" />{pts} pts · {loyalty.tier}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                </div>
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

        {/* ===== CUSTOMER 360 MODAL ===== */}
        <Dialog open={isCustomer360Open} onOpenChange={open => { if (!open) setIsCustomer360Open(false); }}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white font-poppins">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 font-poppins flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-600" />
                Customer 360° — {selectedCrmCustomer?.name}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-poppins">
                Complete profile: lifetime value, purchase history, notes & follow-ups.
              </DialogDescription>
            </DialogHeader>

            {selectedCrmCustomer && (() => {
              const s = salesByCust[selectedCrmCustomer.customer_id];
              const sv = svcByCust[selectedCrmCustomer.customer_id];
              const seg = getCustomerSegment(selectedCrmCustomer, s, sv);
              const cfg = SEGMENT_CONFIG[seg];
              const totalSpend = s?.totalSpend ?? 0;
              const pts = computeLoyaltyPoints(totalSpend);
              const loyalty = getLoyaltyTier(pts);
              const lastVisit = s?.lastPurchaseDate && sv?.lastServiceDate
                ? (s.lastPurchaseDate > sv.lastServiceDate ? s.lastPurchaseDate : sv.lastServiceDate)
                : (s?.lastPurchaseDate ?? sv?.lastServiceDate ?? null);

              return (
                <div className="space-y-5">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Lifetime Value', value: `₱${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-green-700', icon: DollarSign },
                      { label: 'Purchases',      value: s?.purchaseCount ?? 0,     color: 'text-blue-700',   icon: TrendingUp  },
                      { label: 'Services',        value: sv?.totalServices ?? 0,    color: 'text-purple-700', icon: Wrench      },
                      { label: 'Loyalty Points',  value: `${pts} pts`,             color: loyalty.color,     icon: Award       },
                    ].map(kpi => {
                      const KIcon = kpi.icon;
                      return (
                        <div key={kpi.label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                          <div className="flex items-center gap-1 mb-1">
                            <KIcon className={`h-3.5 w-3.5 ${kpi.color}`} />
                            <span className="text-xs text-slate-500 font-poppins">{kpi.label}</span>
                          </div>
                          <p className={`text-lg font-bold font-poppins ${kpi.color}`}>{kpi.value}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Segment + loyalty tier */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border text-sm px-3 py-1 font-poppins`}>{cfg.label}</Badge>
                    <Badge variant="outline" className={`${loyalty.color} bg-white border text-sm px-3 py-1 font-poppins`}>{loyalty.tier} Member</Badge>
                    {lastVisit && <span className="text-xs text-slate-500 font-poppins">Last visit: {new Date(lastVisit).toLocaleDateString()}</span>}
                    {loyalty.next && <span className="text-xs text-slate-400 font-poppins">{loyalty.next - pts} pts to {loyalty.tier === 'Bronze' ? 'Silver' : loyalty.tier === 'Silver' ? 'Gold' : 'Platinum'}</span>}
                  </div>

                  {/* Purchase history */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 font-poppins flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      Recent Purchases
                    </h4>
                    {customer360Sales.length === 0 ? (
                      <p className="text-xs text-slate-400 font-poppins">No purchase history.</p>
                    ) : (
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {customer360Sales.slice(0, 10).map((sale: any) => (
                          <div key={sale.sale_id} className="flex justify-between text-xs p-2 bg-blue-50 rounded-lg">
                            <span className="text-slate-600 font-poppins">{new Date(sale.sale_date).toLocaleDateString()}</span>
                            <span className="font-semibold text-green-700 font-poppins">₱{(sale.total_amount ?? 0).toLocaleString()}</span>
                            <span className="text-slate-500 capitalize font-poppins">{sale.payment_method}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Service history */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 font-poppins flex items-center gap-1">
                      <Wrench className="h-4 w-4 text-purple-500" />
                      Recent Services
                    </h4>
                    {customer360Services.length === 0 ? (
                      <p className="text-xs text-slate-400 font-poppins">No service history.</p>
                    ) : (
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {customer360Services.slice(0, 10).map((svc: any) => (
                          <div key={svc.job_id} className="flex justify-between items-center text-xs p-2 bg-purple-50 rounded-lg gap-2">
                            <span className="text-slate-700 font-poppins truncate flex-1">{svc.job_description}</span>
                            <span className="text-slate-500 font-poppins shrink-0">{new Date(svc.job_date).toLocaleDateString()}</span>
                            <Badge variant="outline" className="text-xs capitalize font-poppins shrink-0">{svc.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes/Interaction log */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 font-poppins flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      Interaction Log
                    </h4>
                    <div className="space-y-2 max-h-36 overflow-y-auto mb-2">
                      {customerChatter.length === 0 ? (
                        <p className="text-xs text-slate-400 font-poppins">No notes yet.</p>
                      ) : customerChatter.map((note: any) => (
                        <div key={note.message_id} className="bg-green-50 rounded-lg p-2 border border-green-100">
                          <p className="text-xs text-slate-700 font-poppins">{note.message}</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-poppins">
                            {note.user?.name ?? 'Unknown'} · {new Date(note.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a note..."
                        value={newNoteText}
                        onChange={e => setNewNoteText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveNote(); } }}
                        className="flex-1 text-sm font-poppins"
                      />
                      <Button size="sm" onClick={handleSaveNote} disabled={isSavingNote || !newNoteText.trim()} className="gap-1 font-poppins">
                        {isSavingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                    </div>
                  </div>

                  {/* Schedule follow-up */}
                  <div className="flex justify-end pt-2 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={() => { setIsCustomer360Open(false); setIsAddActivityOpen(true); }}
                      className="gap-2 font-poppins"
                    >
                      <Bell className="h-4 w-4" />
                      Schedule Follow-up
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ===== ADD ACTIVITY / FOLLOW-UP MODAL ===== */}
        <Dialog open={isAddActivityOpen} onOpenChange={open => { if (!open) setIsAddActivityOpen(false); }}>
          <DialogContent className="sm:max-w-md bg-white font-poppins">
            <DialogHeader>
              <DialogTitle className="font-poppins font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-600" />
                Schedule Follow-up
                {selectedCrmCustomer && <span className="text-slate-500 font-normal text-sm">— {selectedCrmCustomer.name}</span>}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-poppins text-sm">Activity Type</Label>
                <div className="grid grid-cols-4 gap-2">
                  {ACTIVITY_TYPES.map(at => {
                    const AtIcon = at.Icon;
                    return (
                      <button
                        key={at.value}
                        onClick={() => setActivityForm(p => ({ ...p, activityType: at.value }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-xs font-poppins transition-all ${
                          activityForm.activityType === at.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <AtIcon className="h-4 w-4" />
                        {at.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="font-poppins text-sm">Summary *</Label>
                <Input
                  placeholder="e.g. Call to schedule tire rotation"
                  value={activityForm.summary}
                  onChange={e => {
                    setActivityForm(p => ({ ...p, summary: e.target.value }));
                    setActivityFormErrors(p => ({ ...p, summary: validateShortText(e.target.value, { label: 'Summary', required: true, minLength: 2, maxLength: 200 }) }));
                  }}
                  maxLength={200}
                  aria-invalid={!!activityFormErrors.summary}
                  className={`font-poppins${activityFormErrors.summary ? ' border-red-400 focus-visible:ring-red-300' : ''}`}
                />
                {activityFormErrors.summary && <p className="text-xs text-red-500">⚠ {activityFormErrors.summary}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="font-poppins text-sm">Due Date *</Label>
                <Input
                  type="date"
                  value={activityForm.dueDate}
                  onChange={e => setActivityForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="font-poppins"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-poppins text-sm">Notes (optional)</Label>
                <Textarea
                  placeholder="Additional details..."
                  value={activityForm.note}
                  onChange={e => {
                    setActivityForm(p => ({ ...p, note: e.target.value }));
                    setActivityFormErrors(p => ({ ...p, note: validateLongText(e.target.value, { label: 'Notes', maxLength: 500 }) }));
                  }}
                  className={`font-poppins text-sm${activityFormErrors.note ? ' border-red-400 focus-visible:ring-red-300' : ''}`}
                  rows={2}
                  maxLength={510}
                />
                <div className="flex items-center justify-between">
                  {activityFormErrors.note
                    ? <p className="text-xs text-red-500">⚠ {activityFormErrors.note}</p>
                    : <span />}
                  <p className={`text-xs ${
                    activityForm.note.length > 500 ? 'text-red-500 font-medium' :
                    activityForm.note.length > 425 ? 'text-amber-500' : 'text-muted-foreground'
                  }`}>{activityForm.note.length}/500</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="font-poppins">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleSaveActivity}
                disabled={isSavingActivity || !activityForm.summary || !activityForm.dueDate}
                className="font-poppins gap-2"
              >
                {isSavingActivity && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle className="h-4 w-4" />
                Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerFormErrors((p) => ({ ...p, name: validateShortText(e.target.value, { label: 'Customer name', required: true, minLength: 2, maxLength: 100 }) }));
                  }}
                  placeholder="John Doe"
                  maxLength={100}
                  aria-invalid={!!customerFormErrors.name}
                  className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins${
                    customerFormErrors.name ? ' border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                  }`}
                />
                {customerFormErrors.name && (
                  <p className="text-xs text-red-500 flex items-center gap-1">⚠ {customerFormErrors.name}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-phone" className="text-slate-700 font-medium font-poppins">Phone</Label>
                  <Input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(e) => {
                      // Strip any non-digit characters and cap at 15 digits
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 15);
                      setCustomerPhone(digitsOnly);
                      setCustomerFormErrors((p) => ({ ...p, phone: validatePhone(digitsOnly, { label: 'Phone' }) }));
                    }}
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="09XXXXXXXXX"
                    aria-invalid={!!customerFormErrors.phone}
                    className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins${
                      customerFormErrors.phone ? ' border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                    }`}
                  />
                  {customerFormErrors.phone && (
                    <p className="text-xs text-red-500 flex items-center gap-1">⚠ {customerFormErrors.phone}</p>
                  )}
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
                <Input
                  id="plate-number"
                  value={plateNumber}
                  onChange={handlePlateChange}
                  placeholder="ABC-1234"
                  maxLength={20}
                  aria-invalid={!!vehicleFormErrors.plateNumber}
                  className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins${
                    vehicleFormErrors.plateNumber ? ' border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                  }`}
                />
                {vehicleFormErrors.plateNumber && (
                  <p className="text-xs text-red-500 flex items-center gap-1">⚠ {vehicleFormErrors.plateNumber}</p>
                )}
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
                  <Input
                    id="make"
                    value={make}
                    onChange={(e) => {
                      setMake(e.target.value);
                      setVehicleFormErrors((p) => ({ ...p, make: validateShortText(e.target.value, { label: 'Make', required: false, minLength: 2, maxLength: 50 }) }));
                    }}
                    placeholder="Toyota"
                    maxLength={50}
                    aria-invalid={!!vehicleFormErrors.make}
                    className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins${
                      vehicleFormErrors.make ? ' border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                    }`}
                  />
                  {vehicleFormErrors.make && <p className="text-xs text-red-500">⚠ {vehicleFormErrors.make}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-slate-700 font-medium font-poppins">Model</Label>
                  <Input
                    id="model"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setVehicleFormErrors((p) => ({ ...p, model: validateShortText(e.target.value, { label: 'Model', required: false, minLength: 1, maxLength: 50 }) }));
                    }}
                    placeholder="Camry"
                    maxLength={50}
                    aria-invalid={!!vehicleFormErrors.model}
                    className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins${
                      vehicleFormErrors.model ? ' border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                    }`}
                  />
                  {vehicleFormErrors.model && <p className="text-xs text-red-500">⚠ {vehicleFormErrors.model}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color" className="text-slate-700 font-medium font-poppins">Color</Label>
                  <Input
                    id="color"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      setVehicleFormErrors((p) => ({ ...p, color: validateShortText(e.target.value, { label: 'Color', required: false, minLength: 2, maxLength: 30 }) }));
                    }}
                    placeholder="White"
                    maxLength={30}
                    aria-invalid={!!vehicleFormErrors.color}
                    className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins${
                      vehicleFormErrors.color ? ' border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                    }`}
                  />
                  {vehicleFormErrors.color && <p className="text-xs text-red-500">⚠ {vehicleFormErrors.color}</p>}
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