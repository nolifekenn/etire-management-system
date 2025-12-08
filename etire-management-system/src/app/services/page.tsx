"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, PlusCircle, AlertTriangle, Wrench, Clock, CheckCircle, XCircle, 
  RefreshCw, Search, Filter, X, Edit, Trash2, Car, Bike, Truck, Users, Calendar,
  TrendingUp, DollarSign, Package, ArrowUpDown, Download, ArrowLeft, Eye, Plus, Minus,
  ChevronDown, ChevronUp, Check, ArrowUp, ArrowDown, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
  CheckSquare, Save, Archive, Eye as EyeIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ===== DESIGN SYSTEM =====
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
// SUCCESS ANIMATION COMPONENT FOR SERVICE MANAGEMENT
// ============================================
const ServiceSuccessAnimation = ({
  isVisible,
  title,
  message,
  actionType,
  jobDetails,
  onConfirm
}: {
  isVisible: boolean;
  title: string;
  message: string;
  actionType: 'add' | 'edit' | 'delete' | 'status_change' | 'export' | 'refresh';
  jobDetails?: {
    jobId?: string;
    description?: string;
    customer?: string;
    status?: string;
    total?: number;
    oldStatus?: string;
    newStatus?: string;
  };
  onConfirm: () => void;
}) => {
  if (!isVisible) return null;

  // Different icons and colors based on action type
  const getActionConfig = () => {
    switch (actionType) {
      case 'add':
        return { 
          gradient: 'from-green-500 to-emerald-600',
          icon: PlusCircle,
          bg: 'bg-green-50 border-green-200'
        };
      case 'edit':
        return { 
          gradient: 'from-blue-500 to-cyan-600',
          icon: Save,
          bg: 'bg-blue-50 border-blue-200'
        };
      case 'delete':
        return { 
          gradient: 'from-red-500 to-orange-600',
          icon: Trash2,
          bg: 'bg-red-50 border-red-200'
        };
      case 'status_change':
        return { 
          gradient: 'from-purple-500 to-indigo-600',
          icon: CheckSquare,
          bg: 'bg-purple-50 border-purple-200'
        };
      case 'export':
        return { 
          gradient: 'from-amber-500 to-yellow-600',
          icon: Download,
          bg: 'bg-amber-50 border-amber-200'
        };
      case 'refresh':
        return { 
          gradient: 'from-teal-500 to-green-600',
          icon: RefreshCw,
          bg: 'bg-teal-50 border-teal-200'
        };
      default:
        return { 
          gradient: 'from-purple-500 to-indigo-600',
          icon: CheckCircle,
          bg: 'bg-indigo-50 border-indigo-200'
        };
    }
  };

  const { gradient, icon: ActionIcon, bg } = getActionConfig();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] animate-in fade-in duration-300">
      <div className={`rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in duration-300 ${bg} border shadow-2xl`}>
        {/* Success Icon with Animation */}
        <div className={`w-20 h-20 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500`}>
          <ActionIcon className="h-12 w-12 text-white animate-in scale-in duration-700 delay-300" />
        </div>

        {/* Success Title */}
        <h3 className="text-2xl font-bold text-slate-800 mb-2 font-poppins">
          {title}
        </h3>

        {/* Success Message */}
        <p className="text-slate-600 mb-6 font-poppins">
          {message}
        </p>

        {/* Job Details (if provided) */}
        {jobDetails && (
          <div className="mb-6 p-4 bg-white/50 rounded-lg border border-slate-200">
            {jobDetails.description && (
              <div className="text-left mb-2">
                <span className="text-sm font-medium text-slate-700">Service: </span>
                <span className="text-sm font-semibold text-slate-900">{jobDetails.description}</span>
              </div>
            )}
            {jobDetails.customer && (
              <div className="text-left mb-2">
                <span className="text-sm font-medium text-slate-700">Customer: </span>
                <span className="text-sm font-semibold text-slate-900">{jobDetails.customer}</span>
              </div>
            )}
            {jobDetails.status && (
              <div className="text-left mb-2">
                <span className="text-sm font-medium text-slate-700">Status: </span>
                <Badge className={`ml-2 ${
                  jobDetails.status === 'completed' ? 'bg-green-100 text-green-700' :
                  jobDetails.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                  jobDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {jobDetails.status}
                </Badge>
              </div>
            )}
            {jobDetails.total && (
              <div className="text-left">
                <span className="text-sm font-medium text-slate-700">Total: </span>
                <span className="text-sm font-semibold text-green-600">₱{jobDetails.total.toFixed(2)}</span>
              </div>
            )}
            {jobDetails.oldStatus && jobDetails.newStatus && (
              <div className="text-left">
                <span className="text-sm font-medium text-slate-700">Status Change: </span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-slate-100 text-slate-700">{jobDetails.oldStatus}</Badge>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <Badge className={`${
                    jobDetails.newStatus === 'completed' ? 'bg-green-100 text-green-700' :
                    jobDetails.newStatus === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                    jobDetails.newStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {jobDetails.newStatus}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirm Button */}
        <div className="flex gap-3 justify-center">
          <Button
            className={`bg-gradient-to-r ${gradient} hover:scale-105 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins`}
            onClick={onConfirm}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper ArrowRight icon component
const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

// Vehicle Type Icons
const VehicleIcons = {
  car: Car,
  motorcycle: Bike,
  truck: Truck,
  default: Car
};

const getVehicleIcon = (vehicleType: string) => {
  const type = vehicleType?.toLowerCase();
  return VehicleIcons[type as keyof typeof VehicleIcons] || VehicleIcons.default;
};

// Status Colors
const statusColors = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200",
  'in-progress': "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
};

// Status Icons
const StatusIcons = {
  pending: Clock,
  'in-progress': Wrench,
  completed: CheckCircle,
  cancelled: XCircle
};

interface VehicleType {
    vehicle_type_id: string;
    name: string;
}

// Common service descriptions for tire and vulcanizing shop
const COMMON_SERVICES = [
  "Tire Rotation and Balancing",
  "Tire Replacement",
  "Tire Patch/Repair",
  "Tire Vulcanizing",
  "Wheel Alignment",
  "Brake Pad Replacement",
  "Oil Change",
  "Engine Tune-up",
  "Battery Replacement",
  "Suspension Repair",
  "Exhaust System Repair",
  "General Check-up/Maintenance",
  "Other (Please specify below)"
];

// ServiceJob interface
interface ServiceJob {
    job_id: string;
    user_id: string;
    customer_id?: string;
    vehicle_id?: string;
    job_description: string;
    job_date: string;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
    service_fee: number;
    remarks: string | null;
    vehicle_type_id: string | null;
    
    user?: { 
        user_id: string;
        name: string;
    } | null;
    customer?: {
        customer_id: string;
        name: string;
        phone?: string;
    } | null;
    vehicle?: {
        vehicle_id: string;
        plate_number: string;
        make?: string;
        model?: string;
    } | null;
    vehicle_type?: {
        vehicle_type_id: string;
        name: string;
    } | null;
    
    items?: ServiceJobItem[];
    
    days_ago?: number;
    is_recent?: boolean;
}

// Service Job Item interface
interface ServiceJobItem {
  service_job_item_id?: string;
  job_id?: string;
  item_id: string;
  quantity: number;
  name?: string;
  category?: string;
}

interface Vehicle {
  vehicle_id: string;
  plate_number: string;
  make?: string;
  model?: string;
  customer_id?: string;
  vehicle_type_id?: string;
}

// Inventory Item interface
interface InventoryItem {
  item_id: string;
  name: string;
  category: 'tire' | 'tool' | 'accessory';
  vehicle_type_id: string | null;
  vehicle_type?: string | null;
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  reorder_level: number;
  supplier_id?: string | null;
  branch_id: string;
  description?: string | null;
  sku?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Customer interface with service stats
interface Customer {
    customer_id: string;
    name: string;
    phone?: string;
    email?: string;
    service_count?: number;
    last_service_date?: string;
}

const ANONYMOUS_CUSTOMER_ID = "anonymous_customer";

// Custom Date Input Component
const CustomDateInput = ({ value, onChange, id, className = "" }: { value: string; onChange: (value: string) => void; id: string; className?: string }) => {
  return (
    <div className="relative">
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins custom-date-input`}
      />
    </div>
  );
};

// Optimized Search Input Component
const SearchInput = ({ 
  value, 
  onChange, 
  placeholder, 
  id 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string; 
  id: string;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 150);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
      <Input 
        id={id}
        placeholder={placeholder} 
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-10 pr-4 py-2 border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
      />
      {localValue && (
        <button 
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// Quick Status Popover Component
const StatusPopover = ({ 
  job, 
  onStatusUpdate 
}: { 
  job: ServiceJob;
  onStatusUpdate: (jobId: string, status: ServiceJob['status']) => Promise<void>;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusUpdate = async (status: ServiceJob['status']) => {
    if (job.status === status) {
      setIsOpen(false);
      return;
    }
    
    setIsUpdating(true);
    try {
      await onStatusUpdate(job.job_id, status);
      setIsOpen(false);
    } catch (error) {
      console.error('Status update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const StatusIcon = StatusIcons[job.status];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Badge className={`capitalize ${statusColors[job.status]} transition-colors duration-200 font-poppins cursor-pointer hover:scale-105 flex items-center gap-1`}>
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <StatusIcon className="h-3 w-3" />
          )}
          {job.status.replace('-', ' ')}
          <ChevronDown className="h-3 w-3" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2 font-poppins">
        <div className="space-y-1">
          <button
            onClick={() => handleStatusUpdate('pending')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
              job.status === 'pending' 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'hover:bg-slate-100'
            }`}
          >
            <Clock className="h-4 w-4 text-yellow-600" />
            Pending
            {job.status === 'pending' && <Check className="h-4 w-4 ml-auto" />}
          </button>
          
          <button
            onClick={() => handleStatusUpdate('in-progress')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
              job.status === 'in-progress' 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-slate-100'
            }`}
          >
            <Wrench className="h-4 w-4 text-blue-600" />
            In Progress
            {job.status === 'in-progress' && <Check className="h-4 w-4 ml-auto" />}
          </button>
          
          <button
            onClick={() => handleStatusUpdate('completed')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
              job.status === 'completed' 
                ? 'bg-green-100 text-green-700' 
                : 'hover:bg-slate-100'
            }`}
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
            Completed
            {job.status === 'completed' && <Check className="h-4 w-4 ml-auto" />}
          </button>
          
          <button
            onClick={() => handleStatusUpdate('cancelled')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
              job.status === 'cancelled' 
                ? 'bg-red-100 text-red-700' 
                : 'hover:bg-slate-100'
            }`}
          >
            <XCircle className="h-4 w-4 text-red-600" />
            Cancelled
            {job.status === 'cancelled' && <Check className="h-4 w-4 ml-auto" />}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Quick Filter Chips Component
const QuickFilterChips = ({ 
  serviceJobs, 
  activeFilters, 
  onFilterChange 
}: { 
  serviceJobs: ServiceJob[];
  activeFilters: { today: boolean; pending: boolean; inProgress: boolean; last7Days: boolean };
  onFilterChange: (filters: { today: boolean; pending: boolean; inProgress: boolean; last7Days: boolean }) => void;
}) => {
  const counts = useMemo(() => {
    const now = new Date();
    const todayLocal = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    
    const last7DaysStart = new Date(todayLocal);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);

    const todayJobs = serviceJobs.filter(job => {
      const jobDate = new Date(job.job_date);
      const jobLocalDate = new Date(
        jobDate.getFullYear(),
        jobDate.getMonth(),
        jobDate.getDate()
      );
      return jobLocalDate.getTime() === todayLocal.getTime();
    });
    
    const last7Jobs = serviceJobs.filter(job => {
      const jobDate = new Date(job.job_date);
      const jobLocalDate = new Date(
        jobDate.getFullYear(),
        jobDate.getMonth(),
        jobDate.getDate()
      );
      return jobLocalDate >= last7DaysStart;
    });
    
    return {
      today: todayJobs.length,
      pending: serviceJobs.filter(job => job.status === 'pending').length,
      inProgress: serviceJobs.filter(job => job.status === 'in-progress').length,
      last7Days: last7Jobs.length,
    };
  }, [serviceJobs]);

  const handleChipClick = (chip: keyof typeof activeFilters) => {
    onFilterChange({
      ...activeFilters,
      [chip]: !activeFilters[chip]
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      today: false,
      pending: false,
      inProgress: false,
      last7Days: false
    });
  };

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => handleChipClick('today')}
        className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 font-poppins ${
          activeFilters.today 
            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg' 
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        <Calendar className="h-4 w-4" />
        Today ({counts.today})
      </button>

      <button
        onClick={() => handleChipClick('pending')}
        className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 font-poppins ${
          activeFilters.pending 
            ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg' 
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        <Clock className="h-4 w-4" />
        Pending ({counts.pending})
      </button>

      <button
        onClick={() => handleChipClick('inProgress')}
        className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 font-poppins ${
          activeFilters.inProgress 
            ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg' 
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        <Wrench className="h-4 w-4" />
        In Progress ({counts.inProgress})
      </button>

      <button
        onClick={() => handleChipClick('last7Days')}
        className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 font-poppins ${
          activeFilters.last7Days 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' 
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        <TrendingUp className="h-4 w-4" />
        Last 7 Days ({counts.last7Days})
      </button>

      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all duration-300 font-poppins"
        >
          <X className="h-4 w-4" />
          Clear All
        </button>
      )}
    </div>
  );
};

// Stats Overview Component
const ServiceStats = ({ serviceJobs }: { serviceJobs: ServiceJob[] }) => {
  const totalJobs = serviceJobs.length;
  const pendingJobs = serviceJobs.filter(job => job.status === 'pending').length;
  const inProgressJobs = serviceJobs.filter(job => job.status === 'in-progress').length;
  const completedJobs = serviceJobs.filter(job => job.status === 'completed').length;
  const totalRevenue = serviceJobs
    .filter(job => job.status === 'completed')
    .reduce((acc, job) => acc + job.service_fee, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className={`bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium font-poppins">Total Jobs</p>
            <p className="text-3xl font-bold mt-2 font-poppins">{totalJobs.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Package className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-purple-100 text-sm font-poppins">
          <TrendingUp className="h-4 w-4" />
          <span>All service jobs</span>
        </div>
      </div>

      <div className={`bg-gradient-to-br from-blue-500 via-blue-600 to-sky-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium font-poppins">Pending Jobs</p>
            <p className="text-3xl font-bold mt-2 font-poppins">{pendingJobs.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Clock className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-blue-100 text-sm font-poppins">
          <Clock className="h-4 w-4" />
          <span>Awaiting service</span>
        </div>
      </div>

      <div className={`bg-gradient-to-br from-teal-400 via-cyan-500 to-green-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-teal-100 text-sm font-medium font-poppins">In Progress</p>
            <p className="text-3xl font-bold mt-2 font-poppins">{inProgressJobs.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Wrench className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-teal-100 text-sm font-poppins">
          <Wrench className="h-4 w-4" />
          <span>Currently being serviced</span>
        </div>
      </div>

      <div className={`bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium font-poppins">Total Revenue</p>
            <p className="text-3xl font-bold mt-2 font-poppins">₱{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-purple-100 text-sm font-poppins">
          <TrendingUp className="h-4 w-4" />
          <span>All time</span>
        </div>
      </div>
    </div>
  );
};

// Quick Actions Component
const QuickActions = ({ 
  onAddJob, 
  onExportData,
  onViewCalendar 
}: { 
  onAddJob: () => void, 
  onExportData: () => void,
  onViewCalendar: () => void 
}) => {
  const actions = [
    {
      label: "New Service Job",
      description: "Create a new service job",
      icon: PlusCircle,
      onClick: onAddJob,
      color: "from-purple-500 to-indigo-600"
    },
    {
      label: "Export Report",
      description: "Export service report",
      icon: Download,
      onClick: onExportData,
      color: "from-blue-500 to-sky-600"
    },
    {
      label: "View Calendar",
      description: "View service schedule",
      icon: Calendar,
      onClick: onViewCalendar,
      color: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {actions.map((action, index) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`bg-gradient-to-r ${action.color} rounded-xl p-4 text-white text-left shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group font-poppins`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">{action.label}</p>
              <p className="text-white/80 text-sm mt-1">{action.description}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <action.icon className="h-5 w-5" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

// Calendar View Component
const CalendarView = ({ 
  serviceJobs, 
  isOpen, 
  onClose 
}: { 
  serviceJobs: ServiceJob[], 
  isOpen: boolean, 
  onClose: () => void 
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const jobsForSelectedDate = serviceJobs.filter(job => {
    const jobDate = new Date(job.job_date);
    return jobDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
            Service Calendar
          </DialogTitle>
          <DialogDescription className="text-slate-600 font-poppins">
            View and manage service schedules
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 font-poppins">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                className={buttonStyles.secondary}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSelectedDate(new Date())}
                className={buttonStyles.secondary}
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                className={buttonStyles.secondary}
              >
                Next
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2 text-center font-poppins">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="font-semibold text-slate-600 py-2">{day}</div>
            ))}
            
            <div className="col-span-7 p-4 bg-slate-50 rounded-lg text-slate-500 text-center">
              Calendar grid implementation would go here
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="font-semibold text-slate-800 mb-3 font-poppins">
              Jobs for {selectedDate.toLocaleDateString()}
            </h4>
            {jobsForSelectedDate.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {jobsForSelectedDate.map(job => (
                  <div key={job.job_id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-800 font-poppins">{job.job_description}</p>
                      <p className="text-sm text-slate-600 font-poppins">
                        {job.user?.name || 'Unknown Employee'} • ₱{job.service_fee.toFixed(2)}
                      </p>
                    </div>
                    <Badge className={`capitalize ${statusColors[job.status]}`}>
                      {job.status.replace('-', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4 font-poppins">No jobs scheduled for this date</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className={buttonStyles.back}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Pagination Component
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
          onClick={() => onPageChange(currentPage - 1)} 
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
          onClick={() => onPageChange(currentPage + 1)} 
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

// Tabbed Form Component
const TabbedServiceForm = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading,
  formData,
  onFormDataChange,
  isEdit = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  formData: any;
  onFormDataChange: (data: any) => void;
  isEdit?: boolean;
}) => {

  const [activeTab, setActiveTab] = useState('basic');
  useEffect(() => {
    if (isOpen) {
      setActiveTab('basic');
    }
  }, [isOpen]);

  const { customers, vehicleTypes, inventoryItems, customerVehicles } = formData;
  
  const calculateItemsTotal = useMemo(() => {
    return formData.selectedItems.reduce((total: number, item: any) => {
      const inventoryItem = inventoryItems.find((i: any) => i.item_id === item.item_id);
      if (inventoryItem) {
        return total + (inventoryItem.sale_price * item.quantity);
      }
      return total;
    }, 0);
  }, [formData.selectedItems, inventoryItems]);

  const calculateGrandTotal = useMemo(() => {
    const fee = parseFloat(formData.serviceFee) || 0;
    return fee + calculateItemsTotal;
  }, [formData.serviceFee, calculateItemsTotal]);

  const filteredInventoryItems = useMemo(() => {
    if (!formData.vehicleTypeId) {
      return [];
    }
    
    const selectedVehicleType = vehicleTypes.find((vt: any) => vt.vehicle_type_id === formData.vehicleTypeId);
    if (!selectedVehicleType) return [];
    
    return inventoryItems.filter((item: any) => 
      item.vehicle_type?.toLowerCase() === selectedVehicleType.name.toLowerCase() && item.stock_quantity > 0
    );
  }, [inventoryItems, formData.vehicleTypeId, vehicleTypes]);

  const isFieldsLocked = useMemo(() => {
    return formData.jobStatus === 'completed';
  }, [formData.jobStatus]);

  const handleNext = () => {
    if (activeTab === 'basic') setActiveTab('items');
    else if (activeTab === 'items') setActiveTab('review');
  };

  const handleBack = () => {
    if (activeTab === 'review') setActiveTab('items');
    else if (activeTab === 'items') setActiveTab('basic');
  };

  const isBasicValid = formData.customerId && formData.vehicleTypeId && 
    (formData.selectedServiceType !== 'Other (Please specify below)' ? 
      formData.jobDescription : formData.customJobDescription);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl font-poppins fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 gap-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
            {isEdit ? 'Edit Service Job' : 'Create Service Job'}
          </DialogTitle>
          <DialogDescription className="text-slate-600 font-poppins">
            {isEdit ? `Update details for job` : 'Fill in the details for a new service job.'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex justify-between mb-6">
          {['Basic Info', 'Items', 'Review'].map((step, index) => {
            const stepNumber = index + 1;
            const isActive = activeTab === ['basic', 'items', 'review'][index];
            const isCompleted = 
              (activeTab === 'items' && stepNumber < 2) ||
              (activeTab === 'review' && stepNumber < 3);
            
            return (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                    : isCompleted 
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-slate-500'
                }`}>
                  {step}
                </span>
                {index < 2 && (
                  <div className={`w-12 h-1 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            {isFieldsLocked && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 font-poppins">Fields Locked</AlertTitle>
                <AlertDescription className="text-amber-700 font-poppins">
                  This job is marked as completed. Change the status to edit job details.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer" className="text-slate-700 font-medium font-poppins">Customer</Label>
                <Select 
                  value={formData.customerId} 
                  onValueChange={(value) => onFormDataChange({ ...formData, customerId: value, vehicleId: '' })}
                  disabled={isFieldsLocked}
                >
                  <SelectTrigger className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins ${isFieldsLocked ? 'bg-slate-100 cursor-not-allowed' : 'bg-white/80'}`}>
                    <SelectValue placeholder="Select customer reference..."/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANONYMOUS_CUSTOMER_ID} className="font-poppins">Walk-in Customer</SelectItem>
                    {customers.filter((c: any) => c.customer_id !== ANONYMOUS_CUSTOMER_ID).map((c: any) => (
                      <SelectItem key={c.customer_id} value={c.customer_id} className="font-poppins">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>              
              
              {formData.customerId && formData.customerId !== ANONYMOUS_CUSTOMER_ID && (
                <div className="space-y-2">
                  <Label htmlFor="vehicle" className="text-slate-700 font-medium font-poppins">
                    Vehicle (Plate Number)
                  </Label>
                  {customerVehicles && customerVehicles.length > 0 ? (
                    <Select 
                      value={formData.vehicleId} 
                      onValueChange={(value) => {
                        const selectedVehicle = customerVehicles.find((v: Vehicle) => v.vehicle_id === value);
                        onFormDataChange({ 
                          ...formData, 
                          vehicleId: value,
                          vehicleTypeId: selectedVehicle?.vehicle_type_id || formData.vehicleTypeId
                        });
                      }}
                      disabled={isFieldsLocked}
                    >
                      <SelectTrigger className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins ${isFieldsLocked ? 'bg-slate-100 cursor-not-allowed' : 'bg-white/80'}`}>
                        <SelectValue placeholder="Select vehicle (optional)"/>
                      </SelectTrigger>
                      <SelectContent>
                        {customerVehicles.map((vehicle: Vehicle) => (
                          <SelectItem key={vehicle.vehicle_id} value={vehicle.vehicle_id} className="font-poppins">
                            {vehicle.plate_number}
                            {vehicle.make && vehicle.model && ` - ${vehicle.make} ${vehicle.model}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200 font-poppins">
                      No vehicles registered for this customer. You can add vehicles in the Customer Management page.
                    </p>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vehicle-type" className="text-slate-700 font-medium font-poppins">
                    Vehicle Type
                  </Label>
                  {/* ✅ Show lock indicator when vehicle is selected */}
                  {formData.vehicleId && (
                    <Badge variant="secondary" className="text-xs font-poppins">
                      <Car className="h-3 w-3 mr-1" />
                      Auto-filled
                    </Badge>
                  )}
                </div>
                <Select 
                  value={formData.vehicleTypeId || undefined} 
                  onValueChange={(val) => onFormDataChange({ ...formData, vehicleTypeId: val })}
                  disabled={isFieldsLocked || !!formData.vehicleId} // ✅ Disable when vehicle is selected
                >
                  <SelectTrigger className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins ${
                    isFieldsLocked || formData.vehicleId ? 'bg-slate-100 cursor-not-allowed' : 'bg-white/80'
                  }`}>
                    <SelectValue placeholder="Select vehicle type..."/>
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((vt: any) => (
                      <SelectItem key={vt.vehicle_type_id} value={vt.vehicle_type_id} className="font-poppins">
                        {vt.name.charAt(0).toUpperCase() + vt.name.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* ✅ Show helpful message when vehicle type is locked */}
                {formData.vehicleId && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-poppins">
                    <AlertTriangle className="h-3 w-3" />
                    Vehicle type is auto-filled from selected vehicle. Clear vehicle to change manually.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-type" className="text-slate-700 font-medium font-poppins">Service Type *</Label>
                <Select 
                  value={formData.selectedServiceType} 
                  onValueChange={(value) => {
                    onFormDataChange({ 
                      ...formData, 
                      selectedServiceType: value,
                      jobDescription: value === 'Other (Please specify below)' ? '' : value
                    });
                  }}
                  disabled={isFieldsLocked}
                >
                  <SelectTrigger className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins ${isFieldsLocked ? 'bg-slate-100 cursor-not-allowed' : 'bg-white/80'}`}>
                    <SelectValue placeholder="Select a service type..."/>
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SERVICES.map(service => (
                      <SelectItem key={service} value={service} className="font-poppins">
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.selectedServiceType === 'Other (Please specify below)' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-job-description" className="text-slate-700 font-medium font-poppins">Custom Service Description *</Label>
                  <Textarea 
                    id="custom-job-description"
                    value={formData.customJobDescription} 
                    onChange={e => onFormDataChange({ ...formData, customJobDescription: e.target.value })} 
                    placeholder="Describe the custom service..."
                    disabled={isFieldsLocked}
                    className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins ${isFieldsLocked ? 'bg-slate-100 cursor-not-allowed' : 'bg-white/80'}`}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="service-fee" className="text-slate-700 font-medium font-poppins">Service Fee</Label>
                <Input
                  id="service-fee"
                  type="number"
                  value={formData.serviceFee}
                  onChange={(e) => onFormDataChange({ ...formData, serviceFee: e.target.value })}
                  disabled={isFieldsLocked}
                  className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins ${isFieldsLocked ? 'bg-slate-100 cursor-not-allowed' : 'bg-white/80'}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-slate-700 font-medium font-poppins">Remarks</Label>
                <Textarea 
                  id="remarks"
                  value={formData.remarks} 
                  onChange={e => onFormDataChange({ ...formData, remarks: e.target.value })} 
                  placeholder="Customer notes or internal remarks..."
                  disabled={isFieldsLocked}
                  className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins ${isFieldsLocked ? 'bg-slate-100 cursor-not-allowed' : 'bg-white/80'}`}
                />
              </div>
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-700 font-medium font-poppins">Items Used (Optional)</Label>
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onFormDataChange({ 
                    ...formData, 
                    selectedItems: [...formData.selectedItems, { item_id: '', quantity: 1 }]
                  })}
                  disabled={!formData.vehicleTypeId || isFieldsLocked}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {!formData.vehicleTypeId && !isFieldsLocked && (
                <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded font-poppins">
                  Please select a vehicle type first to add items
                </p>
              )}

              {formData.selectedItems.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                    <div className="col-span-5 text-xs font-semibold text-slate-600 font-poppins">Item Name</div>
                    <div className="col-span-2 text-xs font-semibold text-slate-600 font-poppins">Type</div>
                    <div className="col-span-2 text-xs font-semibold text-slate-600 font-poppins">Price</div>
                    <div className="col-span-2 text-xs font-semibold text-slate-600 font-poppins">Quantity</div>
                    <div className="col-span-1"></div>
                  </div>

                  {formData.selectedItems.map((item: any, index: number) => {
                    const inventoryItem = inventoryItems.find((i: any) => i.item_id === item.item_id);
                    const itemSubtotal = inventoryItem ? inventoryItem.sale_price * item.quantity : 0;
                    
                    return (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white transition-colors">
                        <div className="col-span-5 space-y-1">
                          <Select 
                            value={item.item_id} 
                            onValueChange={(val) => {
                              const updated = [...formData.selectedItems];
                              updated[index] = { ...updated[index], item_id: val };
                              onFormDataChange({ ...formData, selectedItems: updated });
                            }}
                            disabled={isFieldsLocked}
                          >
                            <SelectTrigger className={`h-9 text-sm border-slate-300 focus:border-purple-500 font-poppins ${isFieldsLocked ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}>
                              <SelectValue placeholder="Select item..." />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredInventoryItems.length === 0 ? (
                                <div className="p-2 text-sm text-slate-500 font-poppins">
                                  No items available
                                </div>
                              ) : (
                                filteredInventoryItems.map((invItem: any) => (
                                  <SelectItem key={invItem.item_id} value={invItem.item_id} className="font-poppins">
                                    {invItem.name} ({invItem.stock_quantity} left)
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <div className="h-9 px-3 flex items-center text-sm bg-slate-100 text-slate-600 rounded font-poppins border border-slate-200">
                            {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : '—'}
                          </div>
                        </div>

                        <div className="col-span-2">
                          <div className="h-9 px-3 flex items-center text-sm bg-green-50 text-green-700 rounded font-poppins border border-green-200 font-semibold">
                            ₱{inventoryItem?.sale_price.toFixed(2) || '0.00'}
                          </div>
                        </div>

                        <div className="col-span-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updated = [...formData.selectedItems];
                                if (updated[index].quantity > 1) {
                                  updated[index].quantity -= 1;
                                  onFormDataChange({ ...formData, selectedItems: updated });
                                }
                              }}
                              disabled={isFieldsLocked}
                              className="h-9 w-9 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...formData.selectedItems];
                                updated[index].quantity = parseInt(e.target.value) || 1;
                                onFormDataChange({ ...formData, selectedItems: updated });
                              }}
                              min="1"
                              max={inventoryItem?.stock_quantity || 999}
                              disabled={isFieldsLocked}
                              className={`h-9 text-center text-sm font-poppins ${isFieldsLocked ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updated = [...formData.selectedItems];
                                updated[index].quantity = (updated[index].quantity || 1) + 1;
                                onFormDataChange({ ...formData, selectedItems: updated });
                              }}
                              disabled={isFieldsLocked || (inventoryItem ? item.quantity >= inventoryItem.stock_quantity : false)}
                              className="h-9 w-9 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = formData.selectedItems.filter((_: any, i: number) => i !== index);
                              onFormDataChange({ ...formData, selectedItems: updated });
                            }}
                            disabled={isFieldsLocked}
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {formData.selectedItems.length > 0 && calculateItemsTotal > 0 && (
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-purple-700 font-poppins">Items Total:</span>
                        <span className="text-lg font-bold text-purple-700 font-poppins">₱{calculateItemsTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-4">
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-800 font-poppins">Job Summary</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 font-poppins">Customer:</span>
                  <p className="font-semibold text-slate-800 font-poppins">
                    {formData.customerId === ANONYMOUS_CUSTOMER_ID ? 'Walk-in Customer' : 
                     customers.find((c: any) => c.customer_id === formData.customerId)?.name}
                  </p>
                </div>
                
                <div>
                  <span className="text-slate-600 font-poppins">Vehicle Type:</span>
                  <p className="font-semibold text-slate-800 font-poppins">
                    {vehicleTypes.find((vt: any) => vt.vehicle_type_id === formData.vehicleTypeId)?.name || 'Not specified'}
                  </p>
                </div>
                
                <div className="col-span-2">
                  <span className="text-slate-600 font-poppins">Service Description:</span>
                  <p className="font-semibold text-slate-800 font-poppins">
                    {formData.selectedServiceType === 'Other (Please specify below)' ? 
                     formData.customJobDescription : formData.jobDescription}
                  </p>
                </div>
                
                {formData.remarks && (
                  <div className="col-span-2">
                    <span className="text-slate-600 font-poppins">Remarks:</span>
                    <p className="text-slate-800 font-poppins">{formData.remarks}</p>
                  </div>
                )}
              </div>

              {formData.selectedItems.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-slate-800 mb-2 font-poppins">Items Used:</h4>
                  <div className="space-y-2">
                    {formData.selectedItems.map((item: any, index: number) => {
                      const inventoryItem = inventoryItems.find((i: any) => i.item_id === item.item_id);
                      return (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{inventoryItem?.name || 'Unknown Item'} × {item.quantity}</span>
                          <span className="font-semibold">
                            ₱{inventoryItem ? (inventoryItem.sale_price * item.quantity).toFixed(2) : '0.00'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Breakdown */}
            <div className="space-y-3 p-4 bg-gradient-to-br from-slate-50 to-purple-50 rounded-xl border-2 border-purple-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 font-poppins">Service Fee:</span>
                <span className="text-lg font-semibold text-slate-700 font-poppins">₱{(parseFloat(formData.serviceFee) || 0).toFixed(2)}</span>
              </div>
              {calculateItemsTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 font-poppins">Items Total:</span>
                  <span className="text-lg font-semibold text-slate-700 font-poppins">₱{calculateItemsTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-slate-300"></div>
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-slate-800 font-poppins">Grand Total:</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
                  ₱{calculateGrandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div>
            {activeTab !== 'basic' && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBack}
                className={buttonStyles.back}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className={buttonStyles.back}>
                Cancel
              </Button>
            </DialogClose>
            
            {activeTab !== 'review' ? (
              <Button 
                onClick={handleNext}
                disabled={!isBasicValid}
                className={buttonStyles.primary}
              >
                Next
                <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            ) : (
              <Button 
                onClick={onSubmit} 
                disabled={isLoading}
                className={buttonStyles.primary}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {isEdit ? 'Update Job' : 'Create Job'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ExpandableRow = ({ 
  job, 
  isExpanded, 
  onToggle, 
  inventoryItems,
  onEdit,
  onDelete,
  onStatusUpdate
}: { 
  job: ServiceJob;
  isExpanded: boolean;
  onToggle: () => void;
  inventoryItems: InventoryItem[];
  onEdit: (job: ServiceJob) => void;
  onDelete: (job: ServiceJob) => void;
  onStatusUpdate: (jobId: string, status: ServiceJob['status']) => Promise<void>;
}) => {
  const itemsTotal = job.items ? job.items.reduce((total, item) => {
    const inventoryItem = inventoryItems.find(i => i.item_id === item.item_id);
    return total + (inventoryItem ? inventoryItem.sale_price * item.quantity : 0);
  }, 0) : 0;
  
  const serviceFeeOnly = job.service_fee;
  const grandTotal = serviceFeeOnly + itemsTotal;

  return (
    <div className="transition-all duration-300">
      {/* Main Row */}
      <div 
        className="grid grid-cols-11 gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors duration-200 cursor-pointer group"
        onClick={onToggle}
      >
        {/* Job Details */}
        <div className="col-span-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900 text-lg font-poppins">{job.job_description}</p>
                  <p className="text-sm text-slate-600 mt-1 font-poppins">
                    Customer: {job.customer?.name || 'Walk-in Customer'}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400 mt-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400 mt-1" />
                )}
              </div>
              {job.items && job.items.length > 0 && (
                <Badge variant="secondary" className="mt-2 font-poppins">
                  <Package className="h-3 w-3 mr-1" />
                  {job.items.length} item{job.items.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Type */}
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <VehicleIcon vehicleType={job.vehicle_type?.name} />
            <span className="text-sm text-slate-700 capitalize font-poppins">
              {job.vehicle_type?.name || 'Not specified'}
            </span>
          </div>
        </div>

        {/* Employee */}
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-700 font-poppins">
              {job.user?.name || 'Unknown Employee'}
            </span>
          </div>
        </div>

        {/* Date & Fee */}
        <div className="col-span-2 space-y-1">
          <p className="text-sm text-slate-700 font-poppins">
            {new Date(job.job_date).toLocaleDateString()}
          </p>
          <p className="text-xs text-slate-500 font-poppins">
            {getRelativeTime(job.job_date)}
          </p>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-green-600 font-poppins">
              ₱{grandTotal.toFixed(2)}
            </span>
            {itemsTotal > 0 && (
              <span className="text-xs text-slate-500 font-poppins">
                (₱{serviceFeeOnly.toFixed(2)} + ₱{itemsTotal.toFixed(2)})
              </span>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="col-span-1">
          <StatusPopover 
            job={job}
            onStatusUpdate={onStatusUpdate}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-4 bg-slate-50/50 border-t border-slate-200/50 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 gap-6 py-4">
            {/* Left Column - Job Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800 font-poppins">Job Information</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 font-poppins">Customer:</span>
                  <span className="text-sm font-semibold text-slate-800 font-poppins">
                    {job.customer?.name || 'Walk-in Customer'}
                  </span>
                </div>
                
                {job.customer?.phone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 font-poppins">Phone:</span>
                    <span className="text-sm text-slate-800 font-poppins">{job.customer.phone}</span>
                  </div>
                )}

                {job.vehicle?.plate_number && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 font-poppins">Vehicle Plate:</span>
                    <span className="text-sm font-semibold text-slate-800 font-poppins bg-slate-100 px-3 py-1 rounded-md">
                      {job.vehicle.plate_number}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 font-poppins">Vehicle Type:</span>
                  <span className="text-sm font-semibold text-slate-800 font-poppins capitalize">
                    {job.vehicle_type?.name || 'Not specified'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 font-poppins">Assigned To:</span>
                  <span className="text-sm text-slate-800 font-poppins">
                    {job.user?.name || 'Unknown Employee'}
                  </span>
                </div>
              </div>

              {job.remarks && (
                <div>
                  <h5 className="text-sm font-semibold text-slate-700 mb-1 font-poppins">Remarks:</h5>
                  <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200 font-poppins">
                    {job.remarks}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Pricing & Items */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800 font-poppins">Pricing Breakdown</h4>
              
              <div className="space-y-2 p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 font-poppins">Service Fee (Labor):</span>
                  <span className="text-sm font-semibold text-slate-800 font-poppins">
                    ₱{serviceFeeOnly.toFixed(2)}
                  </span>
                </div>
                
                {itemsTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 font-poppins">Items Total:</span>
                    <span className="text-sm font-semibold text-slate-800 font-poppins">
                      ₱{itemsTotal.toFixed(2)}
                    </span>
                  </div>
                )}
                
                <div className="h-px bg-slate-200 my-2"></div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-slate-800 font-poppins">Grand Total:</span>
                  <span className="text-sm font-bold text-green-600 font-poppins">
                    ₱{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {job.items && job.items.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-slate-700 mb-2 font-poppins">Items Used:</h5>
                  <div className="space-y-2">
                    {job.items.map((item, index) => {
                      const inventoryItem = inventoryItems.find(i => i.item_id === item.item_id);
                      return (
                        <div key={index} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-slate-200">
                          <div>
                            <span className="font-medium text-slate-800 font-poppins">
                              {inventoryItem?.name || 'Unknown Item'}
                            </span>
                            <span className="text-slate-500 ml-2 font-poppins">
                              × {item.quantity}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-800 font-poppins">
                            ₱{inventoryItem ? (inventoryItem.sale_price * item.quantity).toFixed(2) : '0.00'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/50">
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(job);
              }}
              className="flex items-center gap-2 font-poppins"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(job);
              }}
              className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-poppins"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get vehicle icon
const VehicleIcon = ({ vehicleType }: { vehicleType?: string | null }) => {
  const Icon = getVehicleIcon(vehicleType || 'car');
  return <Icon className="h-4 w-4 text-slate-400" />;
};

// Helper function to get relative time
const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const jobLocalDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  
  const now = new Date();
  const todayLocal = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  
  const diffTime = todayLocal.getTime() - jobLocalDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === 2) return '2 days ago';
  if (diffDays === 3) return '3 days ago';
  if (diffDays === 4) return '4 days ago';
  if (diffDays === 5) return '5 days ago';
  if (diffDays === 6) return '6 days ago';
  if (diffDays === 7) return '1 week ago';
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 21) return '2 weeks ago';
  if (diffDays < 28) return '3 weeks ago';
  if (diffDays < 60) return '1 month ago';
  if (diffDays < 90) return '2 months ago';
  if (diffDays < 120) return '3 months ago';
  if (diffDays < 180) return '4-5 months ago';
  if (diffDays < 365) return '6+ months ago';
  
  const years = Math.floor(diffDays / 365);
  if (years === 1) return '1 year ago';
  return `${years} years ago`;
};

export default function EnhancedServiceManagementPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [serviceJobs, setServiceJobs] = useState<ServiceJob[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<ServiceJob | null>(null);
    const [deletingJob, setDeletingJob] = useState<ServiceJob | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
    const [quickFilters, setQuickFilters] = useState({
      today: false,
      pending: false,
      inProgress: false,
      last7Days: false
    });

    const [selectedVehicleId, setSelectedVehicleId] = useState('');

    // Expanded rows state
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // ✅ ADD: Success Animation State
    const [successAnimation, setSuccessAnimation] = useState<{
      isVisible: boolean;
      title: string;
      message: string;
      actionType: 'add' | 'edit' | 'delete' | 'status_change' | 'export' | 'refresh';
      jobDetails?: {
        jobId?: string;
        description?: string;
        customer?: string;
        status?: string;
        total?: number;
        oldStatus?: string;
        newStatus?: string;
      };
    }>({
      isVisible: false,
      title: '',
      message: '',
      actionType: 'add'
    });

    // Form state for tabbed form
    const [formData, setFormData] = useState({
      customerId: ANONYMOUS_CUSTOMER_ID,
      vehicleId: '',
      jobDescription: '',
      customJobDescription: '',
      selectedServiceType: '',
      remarks: '',
      jobStatus: 'pending' as 'pending' | 'in-progress' | 'completed' | 'cancelled',
      serviceFee: '0',
      vehicleTypeId: '',
      selectedItems: [] as ServiceJobItem[],
      originalStatus: null as ServiceJob['status'] | null
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch customer vehicles
    useEffect(() => {
      const fetchCustomerVehicles = async () => {
        if (!supabase || !formData.customerId || formData.customerId === ANONYMOUS_CUSTOMER_ID) {
          setCustomerVehicles([]);
          setFormData(prev => ({ ...prev, vehicleId: '' }));
          return;
        }

        const { data, error } = await supabase
          .from('vehicle')
          .select('vehicle_id, plate_number, make, model, customer_id, vehicle_type_id')
          .eq('customer_id', formData.customerId)
          .order('plate_number');

        if (error && (error.message || error.code || error.hint)) {
          toast({
            title: 'Vehicle Fetch Error',
            description: error.message || 'Failed to load vehicles',
            variant: 'destructive'
          });
          setCustomerVehicles([]);
          return;
        }

        setCustomerVehicles((data || []) as Vehicle[]);
      };

      fetchCustomerVehicles();
    }, [formData.customerId, supabase, toast]);

    // Handle service type selection
    useEffect(() => {
        if (formData.selectedServiceType === 'Other (Please specify below)') {
            setFormData(prev => ({ ...prev, jobDescription: '' }));
        } else if (formData.selectedServiceType) {
            setFormData(prev => ({ ...prev, jobDescription: formData.selectedServiceType }));
        }
    }, [formData.selectedServiceType]);

    // Fetch data functions
    const fetchJobs = useCallback(async () => {
        if (!supabase) return;
        setIsLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('service_job')
                .select(`
                    *,
                    user:user_id (user_id, name),
                    customer:customer_id (customer_id, name, phone),
                    vehicle:vehicle_id (vehicle_id, plate_number, make, model),
                    vehicle_type:vehicle_type_id (vehicle_type_id, name),
                    items:service_job_item (
                        service_job_item_id,
                        job_id,
                        item_id,
                        quantity
                    )
                `)
                .order('job_date', { ascending: false });
            
            if (error) {
                setFetchError(error.message);
                setServiceJobs([]);
                toast({ title: 'Error', description: error.message, variant: 'destructive' });
            } else {
                setServiceJobs((data || []) as ServiceJob[]);
                setFetchError(null);
            }
        } catch (error: any) {
            console.error('Service jobs fetch error:', error);
            setFetchError(error.message);
            setServiceJobs([]);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        
        setIsLoading(false);
        setLastUpdated(new Date());
    }, [toast, supabase]);
    
    const fetchCustomers = useCallback(async () => {
        if (!supabase) return;
        setIsDataLoading(true);
        
        try {
            const { data, error } = await supabase
                .rpc('get_customers_for_service');
            
            if (error) throw error;
            
            setCustomers([
                { customer_id: ANONYMOUS_CUSTOMER_ID, name: 'Walk-in Customer' },
                ...(data || [])
            ]);
        } catch (error: any) {
            console.error('Customer fetch error:', error);
            setFetchError(`Failed to load customers: ${error.message}`);
            toast({ 
                title: 'Error', 
                description: `Failed to load customers: ${error.message}`, 
                variant: 'destructive'
            });
        }
        
        setIsDataLoading(false);
    }, [toast]);

    const fetchVehicleTypes = useCallback(async () => {
        if (!supabase) return;
        
        try {
            const { data, error } = await supabase
                .from('vehicle_type')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            setVehicleTypes(data as VehicleType[]);
        } catch (error: any) {
            console.error('Vehicle types fetch error:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    }, [toast]);

    const fetchInventoryItems = useCallback(async () => {
        if (!supabase) {
            console.log('No supabase client');
            return;
        }
        
        try {
            console.log('Fetching inventory items...');
            
            const { data, error } = await supabase
                .from('inventory_item')
                .select('*')
                .gt('stock_quantity', 0)
                .order('name');
            
            if (error) {
                console.error('Inventory fetch error details:', error);
                throw error;
            }
            
            console.log(`Successfully fetched ${data?.length || 0} inventory items`);
            setInventoryItems(data as InventoryItem[]);
        } catch (error: any) {
            console.error('Inventory fetch error:', error);
            setInventoryItems([]);
        }
    }, [supabase]);

    useEffect(() => {
        fetchJobs();
        fetchCustomers();
        fetchVehicleTypes();
        fetchInventoryItems();
    }, [fetchJobs, fetchCustomers, fetchVehicleTypes, fetchInventoryItems]);

    useEffect(() => {
      setCurrentPage(1);
    }, [searchTerm, statusFilter, vehicleTypeFilter, quickFilters]);
    
    if (fetchError && fetchError.includes('infinite recursion')) {
      return (
        <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">
          <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Database Security Policy Error</AlertTitle>
              <AlertDescription>
                {fetchError}
                <p className="font-bold mt-4">How to fix:</p>
                <p>Go to your Supabase project's SQL Editor and run the following script to fix the recursive policy on the `users` table. This script will safely remove the old policy if it exists and create a correct one.</p>
                <pre className="mt-2 p-2 bg-gray-800 text-white rounded-md text-xs whitespace-pre-wrap">
    {`-- This script safely replaces a potentially recursive policy on the 'users' table.
    DROP POLICY IF EXISTS "Allow all read access on users" ON public.users;
    
    CREATE POLICY "Allow all read access on users"
    ON public.users
    FOR SELECT
    USING (true);`}
                </pre>
                <p className="mt-2">After running the script, refresh this page.</p>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    // Filter jobs with quick filters
    const filteredJobs = useMemo(() => {
      let filtered = serviceJobs.filter(job => {
        const matchesSearch = 
          job.job_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (job.remarks || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (job.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
        const matchesVehicleType = vehicleTypeFilter === 'all' || job.vehicle_type_id === vehicleTypeFilter;

        const jobDate = new Date(job.job_date);
        
        if (isNaN(jobDate.getTime())) {
          console.warn(`Invalid date for job ${job.job_id}:`, job.job_date);
          return false;
        }
        
        const jobLocalDate = new Date(
          jobDate.getFullYear(),
          jobDate.getMonth(),
          jobDate.getDate()
        );
        
        const today = new Date();
        const todayLocal = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        
        const yesterdayLocal = new Date(todayLocal);
        yesterdayLocal.setDate(yesterdayLocal.getDate() - 1);
        
        const last7DaysStart = new Date(todayLocal);
        last7DaysStart.setDate(last7DaysStart.getDate() - 7);

        const matchesToday = !quickFilters.today || 
          jobLocalDate.getTime() === todayLocal.getTime();
        
        const matchesPending = !quickFilters.pending || job.status === 'pending';
        const matchesInProgress = !quickFilters.inProgress || job.status === 'in-progress';
        
        const matchesLast7Days = !quickFilters.last7Days || 
          jobLocalDate >= last7DaysStart;

        return matchesSearch && matchesStatus && matchesVehicleType && 
               matchesToday && matchesPending && matchesInProgress && matchesLast7Days;
      });

      return filtered;
    }, [serviceJobs, searchTerm, statusFilter, vehicleTypeFilter, quickFilters]);

    // Paginated jobs
    const paginatedJobs = useMemo(() => {
      const startIndex = (currentPage - 1) * rowsPerPage;
      return filteredJobs.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredJobs, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(filteredJobs.length / rowsPerPage);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setVehicleTypeFilter('all');
        setQuickFilters({
          today: false,
          pending: false,
          inProgress: false,
          last7Days: false
        });
    };
    
    const resetForm = () => {
        setFormData({
          customerId: ANONYMOUS_CUSTOMER_ID,
          vehicleId: '',
          jobDescription: '',
          customJobDescription: '',
          selectedServiceType: '',
          remarks: '',
          jobStatus: 'pending',
          serviceFee: '0',
          vehicleTypeId: '',
          selectedItems: [],
          originalStatus: null
        });
        setEditingJob(null);
    };

    const handleOpenAddDialog = () => {
        resetForm();
        setIsEditDialogOpen(false); // ✅ Ensure edit dialog is closed
        setIsAddDialogOpen(true);
    };

    const handleOpenEditDialog = (job: ServiceJob) => {
        setEditingJob(job);
        
        let customerToSet = ANONYMOUS_CUSTOMER_ID;
        
        if (job.customer_id) {
            customerToSet = job.customer_id;
        } else if (job.user_id) {
            const customerExists = customers.find(c => c.customer_id === job.user_id);
            if (customerExists) {
                customerToSet = job.user_id;
            }
        }
        
        let cleanRemarks = job.remarks || '';
        if (cleanRemarks.startsWith('Customer:')) {
            const parts = cleanRemarks.split('\n\nRemarks: ');
            cleanRemarks = parts.length > 1 ? parts[1] : '';
        }
    
        let serviceFeeValue = String(job.service_fee);
        if (job.items && job.items.length > 0) {
            const itemsTotal = job.items.reduce((total, item) => {
                const inventoryItem = inventoryItems.find(i => i.item_id === item.item_id);
                if (inventoryItem) {
                    return total + (inventoryItem.sale_price * item.quantity);
                }
                return total;
            }, 0);
            serviceFeeValue = String(job.service_fee - itemsTotal);
        }
    
        setFormData({
          customerId: customerToSet,
          vehicleId: job.vehicle_id || '',
          jobDescription: job.job_description,
          selectedServiceType: job.job_description,
          customJobDescription: job.job_description,
          remarks: cleanRemarks,
          jobStatus: job.status,
          serviceFee: serviceFeeValue,
          vehicleTypeId: job.vehicle_type_id || '',
          selectedItems: job.items || [],
          originalStatus: job.status
        });
        
        setIsAddDialogOpen(false); // ✅ Ensure add dialog is closed
        setIsEditDialogOpen(true);
    };

    const handleOpenDeleteDialog = (job: ServiceJob) => {
        setDeletingJob(job);
        setIsDeleteConfirmationOpen(true);
    };

    // ✅ UPDATE: Enhanced Refresh with Success Animation
    const handleRefresh = () => {
        setIsLoading(true);
        Promise.all([
            fetchJobs(),
            fetchCustomers(),
            fetchVehicleTypes(),
            fetchInventoryItems()
        ]).then(() => {
            // Show success animation for refresh
            setSuccessAnimation({
                isVisible: true,
                title: "Data Refreshed!",
                message: "Service data has been successfully refreshed with latest information.",
                actionType: 'refresh'
            });
        }).catch(() => {
            // Error handling is done in individual fetch functions
        }).finally(() => {
            setIsLoading(false);
        });
    };

    // ✅ UPDATE: Enhanced Export with Success Animation
    const handleExportData = () => {
        if (filteredJobs.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There is no data available for export.",
                variant: "destructive"
            });
            return;
        }

        const headers = ['Job ID', 'Description', 'Customer', 'Vehicle Type', 'Status', 'Service Fee', 'Date', 'Remarks'];
        
        const csvContent = convertToCSV(filteredJobs, headers);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'service_jobs_export.csv');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Show success animation for export
        setSuccessAnimation({
            isVisible: true,
            title: "Export Successful!",
            message: `Exported ${filteredJobs.length} service jobs to CSV file.`,
            actionType: 'export'
        });
    };

    const convertToCSV = (data: ServiceJob[], headers: string[]) => {
        const headerRow = headers.join(',') + '\n';
        
        const dataRows = data.map(job => {
            return [
                `"${job.job_id || ''}"`,
                `"${job.job_description || ''}"`,
                `"${job.customer?.name || 'Walk-in Customer'}"`,
                `"${job.vehicle_type?.name || 'Not specified'}"`,
                `"${job.status || ''}"`,
                `"${Number(job.service_fee || 0).toFixed(2)}"`,
                `"${job.job_date ? new Date(job.job_date).toLocaleDateString() : ''}"`,
                `"${job.remarks || ''}"`
            ].join(',');
        }).join('\n');

        return headerRow + dataRows;
    };

    // Calculate totals for form
    const calculateItemsTotal = useMemo(() => {
        return formData.selectedItems.reduce((total, item) => {
            const inventoryItem = inventoryItems.find(i => i.item_id === item.item_id);
            if (inventoryItem) {
                return total + (inventoryItem.sale_price * item.quantity);
            }
            return total;
        }, 0);
    }, [formData.selectedItems, inventoryItems]);

    const calculateGrandTotal = useMemo(() => {
        const fee = parseFloat(formData.serviceFee) || 0;
        return fee + calculateItemsTotal;
    }, [formData.serviceFee, calculateItemsTotal]);

    // ✅ UPDATE: Enhanced Submit with Success Animation
    const handleSubmit = async () => {
      if (!supabase || !authUser) return;

      const finalJobDescription =
        formData.selectedServiceType === 'Other (Please specify below)'
          ? formData.customJobDescription
          : formData.jobDescription;

      if (!finalJobDescription) {
        toast({
          title: 'Validation Error',
          description: 'Job description is required.',
          variant: 'destructive',
        });
        return;
      }

      const feeOnly = parseFloat(formData.serviceFee) || 0;

      const validItems = (formData.selectedItems || []).filter(
        (i) => i.item_id && i.quantity > 0
      );
      const itemsTotal = validItems.reduce((total, item) => {
        const inv = inventoryItems.find((i) => i.item_id === item.item_id);
        return inv ? total + inv.sale_price * item.quantity : total;
      }, 0);

      const isNowCompleted = formData.jobStatus === 'completed';
      const wasNotCompleted = editingJob ? formData.originalStatus !== 'completed' : true;
      const shouldCreateSale = isNowCompleted && wasNotCompleted;

      if (shouldCreateSale && validItems.length > 0) {
        for (const item of validItems) {
          const inventoryItem = inventoryItems.find((i) => i.item_id === item.item_id);
          if (inventoryItem && inventoryItem.stock_quantity < item.quantity) {
            toast({
              title: 'Insufficient Stock',
              description: `Not enough stock for ${inventoryItem.name}. Available: ${inventoryItem.stock_quantity}`,
              variant: 'destructive',
            });
            return;
          }
        }
      }

      setIsLoading(true);

      try {
        const jobData = {
          user_id: authUser.user_id,
          customer_id: formData.customerId === ANONYMOUS_CUSTOMER_ID ? null : formData.customerId,
          vehicle_id: formData.vehicleId || null,
          job_description: finalJobDescription,
          status: formData.jobStatus,
          service_fee: feeOnly,
          remarks: formData.remarks || null,
          vehicle_type_id: formData.vehicleTypeId ? formData.vehicleTypeId : null,
          ...(!editingJob && { job_date: new Date().toISOString() })
        };

        let jobId: string;
        
        if (editingJob) {
          const { error } = await supabase
            .from('service_job')
            .update(jobData)
            .eq('job_id', editingJob.job_id);
          
          if (error) throw error;
          jobId = editingJob.job_id;

          await supabase.from('service_job_item').delete().eq('job_id', jobId);
        } else {
          const { data, error } = await supabase
            .from('service_job')
            .insert([jobData])
            .select('job_id')
            .single();
          
          if (error) throw error;
          if (!data) throw new Error('Failed to create service job');
          jobId = data.job_id;
        }

        if (validItems.length > 0) {
          const itemsToInsert = validItems.map(item => ({
            job_id: jobId,
            item_id: item.item_id,
            quantity: item.quantity
          }));
          
          const { error: itemsError } = await supabase
            .from('service_job_item')
            .insert(itemsToInsert);
          
          if (itemsError) throw itemsError;
        }

        if (shouldCreateSale && validItems.length > 0) {
          const saleData = {
            customer_id: formData.customerId === ANONYMOUS_CUSTOMER_ID ? null : formData.customerId,
            total_amount: itemsTotal,
            payment_method: 'cash',
            status: 'completed',
            user_id: authUser.user_id,
            job_id: jobId
          };

          const { data: saleResult, error: saleError } = await supabase
            .from('sale')
            .insert([saleData])
            .select('sale_id')
            .single();

          if (saleError) throw saleError;

          if (saleResult) {
            const saleItems = validItems.map(item => ({
              sale_id: saleResult.sale_id,
              item_id: item.item_id,
              quantity: item.quantity,
              price: inventoryItems.find(i => i.item_id === item.item_id)?.sale_price || 0
            }));

            const { error: saleItemsError } = await supabase
              .from('sale_item')
              .insert(saleItems);

            if (saleItemsError) throw saleItemsError;

            for (const item of validItems) {
              const inventoryItem = inventoryItems.find(i => i.item_id === item.item_id);
              if (inventoryItem) {
                const newStock = inventoryItem.stock_quantity - item.quantity;
                await supabase
                  .from('inventory_item')
                  .update({ stock_quantity: newStock })
                  .eq('item_id', item.item_id);
              }
            }
          }
        }

        // ✅ UPDATED: Only write tire_history if job is completed AND has a vehicle (registered customer)
        if (jobData.vehicle_id && jobData.customer_id) {
          if (formData.jobStatus === 'completed') {
            // Upsert tire_history when completed
            const { error: thErr } = await supabase
              .from('tire_history')
              .upsert([{
                history_id: jobId,
                vehicle_id: jobData.vehicle_id,
                item_id: null,
                service_type: jobData.job_description,
                service_date: editingJob ? editingJob.job_date : new Date().toISOString(),
                notes: jobData.remarks,
                created_by: jobData.user_id
              }], { onConflict: 'history_id' });
          
            if (thErr) {
              toast({ title: 'Tire History Error', description: thErr.message, variant: 'destructive' });
            }
        
            // Sync tire_history_item rows
            await supabase.from('tire_history_item').delete().eq('history_id', jobId);
            if (validItems.length > 0) {
              const { error: thiInsErr } = await supabase
                .from('tire_history_item')
                .insert(validItems.map(i => ({
                  history_id: jobId,
                  item_id: i.item_id,
                  quantity: i.quantity
                })));
              if (thiInsErr) {
                toast({ title: 'Tire History Item Error', description: thiInsErr.message, variant: 'destructive' });
              }
            }
          } else {
            // Remove from tire_history if status is not completed
            await supabase.from('tire_history_item').delete().eq('history_id', jobId);
            await supabase.from('tire_history').delete().eq('history_id', jobId);
          }
        }

        setSuccessAnimation({
          isVisible: true,
          title: editingJob ? 'Service Job Updated!' : 'Service Job Created!',
          message: editingJob 
            ? 'Service job has been updated successfully.'
            : 'New service job has been created successfully.',
          actionType: editingJob ? 'edit' : 'add'
        });
        
        // ✅ Close dialogs first
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
        
        // ✅ Reset form and fetch data
        resetForm();
        fetchJobs();

      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    // ✅ UPDATE: Enhanced Delete with Success Animation
    const handleDelete = async () => {
        if (!deletingJob || !supabase) return;
        
        setIsLoading(true);
        
        try {
            const { error } = await supabase
                .from('service_job')
                .delete()
                .eq('job_id', deletingJob.job_id);

            if (error) {
                toast({ title: 'Delete Error', description: error.message, variant: 'destructive' });
            } else {
                // Show success animation for deletion
                setSuccessAnimation({
                  isVisible: true,
                  title: "Service Job Deleted!",
                  message: "The service job has been permanently removed from the system.",
                  actionType: 'delete',
                  jobDetails: {
                    description: deletingJob.job_description,
                    customer: deletingJob.customer?.name || 'Walk-in Customer'
                  }
                });
                
                setIsDeleteConfirmationOpen(false);
                setDeletingJob(null);
                fetchJobs();
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        
        setIsLoading(false);
    };

    // ✅ CORRECTED: handleStatusUpdate function
    const handleStatusUpdate = async (jobId: string, status: ServiceJob['status']) => {
        if (!supabase || !authUser) return;
        const job = serviceJobs.find(j => j.job_id === jobId);
        if (!job) return;
        if (job.status === status) return;
    
        const itemsTotal = (job.items || []).reduce((t, it) => {
            const inv = inventoryItems.find(i => i.item_id === it.item_id);
            return inv ? t + inv.sale_price * it.quantity : t;
        }, 0);
    
        const isBecomingCompleted = status === 'completed' && job.status !== 'completed';
        const isLeavingCompleted = job.status === 'completed' && status !== 'completed';
    
        setIsLoading(true);
    
        try {
            // ✅ 1. Check stock if becoming completed
            if (isBecomingCompleted && job.items && job.items.length > 0) {
                for (const it of job.items) {
                    const inv = inventoryItems.find(i => i.item_id === it.item_id);
                    if (inv && inv.stock_quantity < it.quantity) {
                        toast({
                            title: 'Insufficient Stock',
                            description: `Not enough stock for ${inv.name}. Available: ${inv.stock_quantity}`,
                            variant: 'destructive'
                        });
                        setIsLoading(false);
                        return;
                    }
                }
            }
    
            // ✅ 2. Update job status
            const { error: statusErr } = await supabase
                .from('service_job')
                .update({ status })
                .eq('job_id', jobId);
            if (statusErr) throw statusErr;
    
            // ✅ 3. Handle tire_history ONLY if vehicle + customer exist
            if (job.vehicle_id && job.customer_id) {
                if (isBecomingCompleted) {
                    // ✅ A. CREATE tire_history record (ONE record)
                    const { error: thErr } = await supabase
                        .from('tire_history')
                        .upsert([{
                            history_id: jobId,
                            vehicle_id: job.vehicle_id,
                            service_type: job.job_description,
                            service_date: job.job_date,
                            notes: job.remarks,
                            created_by: job.user_id
                        }], { onConflict: 'history_id' });
                    
                    if (thErr) {
                        toast({ title: 'Tire History Error', description: thErr.message, variant: 'destructive' });
                    }
    
                    // ✅ B. Sync tire_history_item (ALL items at once)
                    await supabase.from('tire_history_item').delete().eq('history_id', jobId);
                    
                    if (job.items && job.items.length > 0) {
                        const historyItems = job.items.map(i => ({
                            history_id: jobId,
                            item_id: i.item_id,
                            quantity: i.quantity
                        }));
    
                        const { error: thiInsErr } = await supabase
                            .from('tire_history_item')
                            .insert(historyItems); // ✅ Insert ALL items in one call
                        
                        if (thiInsErr) {
                            toast({ title: 'Tire History Item Error', description: thiInsErr.message, variant: 'destructive' });
                        }
                    }
                } else if (isLeavingCompleted) {
                    // ✅ C. Remove from tire_history when leaving completed status
                    await supabase.from('tire_history_item').delete().eq('history_id', jobId);
                    await supabase.from('tire_history').delete().eq('history_id', jobId);
                }
            }
    
            // ✅ 4. Handle sales logic (existing code - unchanged)
            if (isBecomingCompleted && job.items && job.items.length > 0) {
                const { data: existingSale, error: saleCheckErr } = await supabase
                    .from('sale')
                    .select('sale_id')
                    .eq('job_id', jobId)
                    .maybeSingle();
                if (saleCheckErr) throw saleCheckErr;
    
                if (existingSale) {
                    toast({ title: 'Already Processed', description: 'Sale already exists.', variant: 'default' });
                } else {
                    const firstItem = job.items[0];
                    const { data: firstInv, error: invErr } = await supabase
                        .from('inventory_item')
                        .select('branch_id')
                        .eq('item_id', firstItem.item_id)
                        .maybeSingle();
                    if (invErr) throw invErr;
    
                    let saleId: string | null = null;
                    if (firstInv) {
                        const { data: newSale, error: saleCreateErr } = await supabase
                            .from('sale')
                            .insert([{
                                user_id: authUser.user_id,
                                branch_id: firstInv.branch_id,
                                customer_id: job.customer_id || null,
                                sale_date: new Date().toISOString(),
                                job_id: jobId,
                                total_amount: itemsTotal,
                                payment_method: 'cash'
                            }])
                            .select('sale_id')
                            .single();
                        if (saleCreateErr) throw saleCreateErr;
                        saleId = newSale?.sale_id || null;
                    }
                    if (saleId) {
                        for (const it of job.items) {
                            const { data: currentItem, error: itemErr } = await supabase
                                .from('inventory_item')
                                .select('sale_price')
                                .eq('item_id', it.item_id)
                                .maybeSingle();
                            if (itemErr) throw itemErr;
    
                            await supabase.from('sale_item').insert([{
                                sale_id: saleId,
                                item_id: it.item_id,
                                quantity: it.quantity,
                                price_at_sale: currentItem?.sale_price ?? 0,
                                installation_fee: 0
                            }]);
                        }
                    }
                }
            }
    
            if (isLeavingCompleted) {
                const { data: sale, error: saleErr } = await supabase
                    .from('sale')
                    .select('sale_id')
                    .eq('job_id', jobId)
                    .maybeSingle();
                if (saleErr) throw saleErr;
    
                if (sale?.sale_id) {
                    const saleId = sale.sale_id;
    
                    const { data: saleItems, error: saleItemsErr } = await supabase
                        .from('sale_item')
                        .select('item_id, quantity')
                        .eq('sale_id', saleId);
                    if (saleItemsErr) throw saleItemsErr;
    
                    for (const si of (saleItems || [])) {
                        const { data: currentItem, error: itemErr } = await supabase
                            .from('inventory_item')
                            .select('stock_quantity')
                            .eq('item_id', si.item_id)
                            .maybeSingle();
                        if (itemErr) throw itemErr;
                        if (!currentItem) continue;
    
                        await supabase
                            .from('inventory_item')
                            .update({ stock_quantity: currentItem.stock_quantity + si.quantity })
                            .eq('item_id', si.item_id);
                    }
    
                    const { error: delItemsErr } = await supabase
                        .from('sale_item')
                        .delete()
                        .eq('sale_id', saleId);
                    if (delItemsErr) throw delItemsErr;
    
                    const { error: delSaleErr } = await supabase
                        .from('sale')
                        .delete()
                        .eq('sale_id', saleId);
                    if (delSaleErr) throw delSaleErr;
                }
            }
    
            // ✅ 5. Show success animation
            setSuccessAnimation({
                isVisible: true,
                title: "Status Updated!",
                message: `Service job status has been changed to ${status}.`,
                actionType: 'status_change',
                jobDetails: {
                    description: job.job_description,
                    customer: job.customer?.name || 'Walk-in Customer',
                    oldStatus: job.status,
                    newStatus: status
                }
            });
    
            fetchJobs();
            fetchInventoryItems();
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle row expansion
    const toggleRowExpansion = (jobId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(jobId)) {
            newExpanded.delete(jobId);
        } else {
            newExpanded.add(jobId);
        }
        setExpandedRows(newExpanded);
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
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-300/20 rounded-bl-full"></div>
            </div>

            <div className="absolute top-64 left-0 w-full h-full bg-indigo-50/10">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-100/15 to-indigo-50/10"></div>
            </div>

            <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
                
                {/* Header Section */}
                <div className={`mb-8 pt-7 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>
                        
                        <div className="relative z-10 flex-1">
                            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl font-poppins tracking-tight">
                                Service Management
                            </h1>
                            <div className="flex items-center gap-6 text-white/90">
                                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium font-poppins">
                                    <Wrench className="h-6 w-6 opacity-90" />
                                    Track and manage all service and repair jobs
                                </p>
                                <div className="flex items-center gap-4 text-lg">
                                    {lastUpdated && (
                                        <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm font-poppins">
                                            <Clock className="w-5 h-5" />
                                            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm font-poppins">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        Live data
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <Button 
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className={buttonStyles.glass + " active:scale-95 font-poppins"}
                        >
                            <RefreshCw className={`h-6 w-6 mr-3 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </Button>
                    </div>
                </div>

                <div className="mt-12"></div>
                
                {/* Stats Overview */}
                <ServiceStats serviceJobs={serviceJobs} />

                {/* Quick Actions */}
                <QuickActions 
                    onAddJob={handleOpenAddDialog} 
                    onExportData={handleExportData}
                    onViewCalendar={() => setIsCalendarOpen(true)}
                />

                {/* Main Table Section */}
                <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xl font-poppins">
                    
                    {/* 1. Gradient Header */}
                    <div className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-400 text-white p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl shadow-inner">
                                <Wrench className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <div className="text-xl font-bold tracking-tight">Service Jobs</div>
                                <div className="text-sm text-white/80 font-medium font-poppins">
                                    Manage vehicle service records
                                </div>
                                <div className="text-sm text-white/90 mt-1">
                                    Total: <strong className="font-semibold">{filteredJobs.length}</strong> jobs found
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Toolbar Section (Search & Dropdowns Only) */}
                    <div className="bg-white border-b border-slate-100 p-4">
                        
                        {/* Search and Dropdowns Row */}
                        <div className="flex flex-col xl:flex-row gap-4 justify-between items-end">
                            {/* Search Bar */}
                            <div className="relative w-full flex-1">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Search</Label>
                                <SearchInput 
                                    id="search-jobs"
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    placeholder="Search by description, customer, or remarks..."
                                />
                            </div>

                            {/* Filters Group */}
                            <div className="flex flex-col sm:flex-row items-end gap-3 w-full xl:w-auto">
                                
                                {/* Status Filter */}
                                <div className="w-full sm:w-auto">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="h-10 w-full sm:w-[180px] border-slate-200 bg-white focus:ring-indigo-500">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="in-progress">In Progress</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Vehicle Type Filter */}
                                <div className="w-full sm:w-auto">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Type</Label>
                                    <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                                        <SelectTrigger className="h-10 w-full sm:w-[180px] border-slate-200 bg-white focus:ring-indigo-500">
                                            <SelectValue placeholder="All Types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            {vehicleTypes.map(type => (
                                                <SelectItem key={type.vehicle_type_id} value={type.vehicle_type_id}>
                                                    {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* NEW: Rows Per Page Filter */}
                                <div className="w-full sm:w-auto">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Rows</Label>
                                    <Select 
                                        value={String(rowsPerPage)} 
                                        onValueChange={(val) => {
                                            setRowsPerPage(Number(val));
                                            setCurrentPage(1); // Reset to page 1
                                        }}
                                    >
                                        <SelectTrigger className="h-10 w-full sm:w-[80px] border-slate-200 bg-white focus:ring-indigo-500">
                                            <SelectValue placeholder={String(rowsPerPage)} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[5, 10, 15, 20, 50].map(opt => (
                                                <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Clear Button */}
                                {(searchTerm || statusFilter !== 'all' || vehicleTypeFilter !== 'all') && (
                                    <div className="w-full sm:w-auto">
                                        <Button 
                                            onClick={clearFilters}
                                            variant="outline" 
                                            className="h-10 border-dashed border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors w-full"
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Clear
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* 3. Table Content Container */}
                    <div className="p-0">
                        {fetchError && !fetchError.includes('infinite recursion') && (
                            <Alert variant="destructive" className="m-6 font-poppins">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{fetchError}</AlertDescription>
                            </Alert>
                        )}

                        {(isLoading && serviceJobs.length === 0) ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                {/* Table Column Headers */}
                                <div className="grid grid-cols-11 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider font-poppins">
                                    <div className="col-span-4 pl-2">Job Details</div>
                                    <div className="col-span-2">Vehicle Type</div>
                                    <div className="col-span-2">Employee</div>
                                    <div className="col-span-2">Date & Fee</div>
                                    <div className="col-span-1">Status</div>
                                </div>

                                {/* Table Body Rows */}
                                <div className="divide-y divide-slate-100">
                                    {filteredJobs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-500 font-poppins bg-white">
                                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                <Search className="h-10 w-10 text-slate-300" />
                                            </div>
                                            <p className="text-lg font-medium text-slate-900">No service jobs found</p>
                                            <p className="text-sm mt-1 text-slate-500">
                                                {serviceJobs.length === 0 ? 'No service jobs created yet' : 'Try adjusting your filters or search terms'}
                                            </p>
                                            <Button variant="outline" onClick={clearFilters} className="mt-4">
                                                Clear All Filters
                                            </Button>
                                        </div>
                                    ) : (
                                        paginatedJobs.map((job) => (
                                            <ExpandableRow
                                                key={job.job_id}
                                                job={job}
                                                isExpanded={expandedRows.has(job.job_id)}
                                                onToggle={() => toggleRowExpansion(job.job_id)}
                                                inventoryItems={inventoryItems}
                                                onEdit={handleOpenEditDialog}
                                                onDelete={handleOpenDeleteDialog}
                                                onStatusUpdate={handleStatusUpdate}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {filteredJobs.length > 0 && (
                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                totalItems={filteredJobs.length}
                                rowsPerPage={rowsPerPage}
                            />
                        )}
                    </div>
                </div>

                {/* Tabbed Add/Edit Dialog */}
                <TabbedServiceForm 
                    isOpen={isAddDialogOpen || isEditDialogOpen} 
                    onClose={() => {
                        setIsAddDialogOpen(false);
                        setIsEditDialogOpen(false);
                        resetForm();
                    }}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    formData={{
                        ...formData,
                        customers,
                        vehicleTypes,
                        inventoryItems,
                        customerVehicles
                    }}
                    onFormDataChange={setFormData}
                    isEdit={!!editingJob}
                />

                {/* Enhanced Delete Confirmation Dialog */}
                <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
                    <AlertDialogContent className="bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-slate-900 font-poppins">Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600 font-poppins">
                                Are you sure you want to delete the service job "{deletingJob?.job_description}"? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className={buttonStyles.back}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleDelete} 
                                disabled={isLoading} 
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-red-600 active:scale-95 font-poppins"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Calendar View */}
                <CalendarView 
                    serviceJobs={serviceJobs} 
                    isOpen={isCalendarOpen} 
                    onClose={() => setIsCalendarOpen(false)} 
                />

                {/* ✅ ADD: Success Animation Component */}
                <ServiceSuccessAnimation
                    isVisible={successAnimation.isVisible}
                    title={successAnimation.title}
                    message={successAnimation.message}
                    actionType={successAnimation.actionType}
                    jobDetails={successAnimation.jobDetails}
                    onConfirm={() => setSuccessAnimation(prev => ({ ...prev, isVisible: false }))}
                />
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                
                .font-poppins {
                    font-family: 'Poppins', sans-serif;
                }

                .ease-spring {
                    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                .custom-date-input::-webkit-calendar-picker-indicator {
                    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>');
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                }

                .custom-date-input::-webkit-calendar-picker-indicator:hover {
                    background-color: #f3f4f6;
                }

                input:focus, textarea:focus, select:focus {
                    outline: none;
                    ring: 2px;
                }

                button, input, select, textarea {
                    transition: all 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .animate-in {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>  
    );
}