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
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Customer, Vehicle, TireHistory, InventoryItem, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
      case 'create':
        return { 
          gradient: 'from-purple-500 to-indigo-600',
          icon: CheckCircle 
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
            Continue
          </Button>
        </div>
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

// Column definitions
const customerColumns = [
  { key: 'name', header: 'Customer Name', sortable: true },
  { key: 'phone', header: 'Phone', sortable: true },
  { key: 'vehicle_count', header: 'Vehicles', sortable: true },
];

const vehicleColumns = [
  { key: 'plate_number', header: 'Plate Number', sortable: true },
  {
    key: 'customer',
    header: 'Customer',
    sortable: true,
    render: (value: any) => <span className="capitalize">{value?.name || '—'}</span>,
  },
  {
    key: 'vehicle_type',
    header: 'Type',
    sortable: true,
    render: (value: any) => <span className="capitalize">{value?.name || '—'}</span>,
  },
  { key: 'make', header: 'Make', sortable: true },
  { key: 'model', header: 'Model', sortable: true },
  { key: 'color', header: 'Color', sortable: true },
];

const historyColumns = [
  {
    key: 'plate_number',
    header: 'Vehicle',
    render: (_value: any, item: any) => item.vehicle?.plate_number || '—',
  },
  {
    key: 'item_name',
    header: 'Service/Item',
    render: (_value: any, item: any) => {
      if (item.source === 'service_job') {
        return (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-poppins">
            Service Job
          </Badge>
        );
      }
      return item.inventory_item?.name || '—';
    },
  },
  {
    key: 'service_type',
    header: 'Type',
    render: (_value: any, item: any) => {
      if (item.source === 'service_job') {
        return (
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-poppins">
            General Service
          </Badge>
        );
      }
      const st = String(item.service_type ?? '').toLowerCase();
      return (
        <Badge className={`capitalize ${serviceTypeColors[st as keyof typeof serviceTypeColors] ?? ''} font-poppins`}>
          {st || '—'}
        </Badge>
      );
    },
  },
  {
    key: 'service_date',
    header: 'Date',
    render: (value: any) => (value ? new Date(value).toLocaleDateString('en-US') : '—'),
  },
  {
    key: 'mileage',
    header: 'Mileage',
    render: (value: any) => (value ? `${value.toLocaleString()} km` : <span className="text-slate-400">-</span>),
  },
  {
    key: 'notes',
    header: 'Notes/Description',
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
      <Icon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-500 mb-4">
        {description}
      </p>
      <div className="flex gap-3 justify-center">
        <Button 
          onClick={onAddNew}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 hover:scale-105"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
        {onClearFilters && (
          <Button 
            onClick={onClearFilters}
            variant="outline"
            className="flex items-center gap-2 transition-all duration-300 hover:scale-105"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
};

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
  const timeoutRef = useRef<NodeJS.Timeout>();

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

// Modern Widget Components - Solid Color StatsOverview
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
      <div className="mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 border border-white/20 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px, rgba(255,255,255,0.15) 1px, transparent 0)] bg-[length:20px_20px]"></div>
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

          <div className="relative p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white font-poppins drop-shadow-lg">
                    Business Overview
                  </h2>
                  <p className="text-white/90 text-sm font-poppins">
                    Real-time insights for your tire management
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white/20 rounded-xl p-3 border border-white/30 hover:bg-white/25 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 bg-white/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-white/90 text-xs font-poppins mb-1">Customers</p>
                        <p className="text-lg font-bold text-white font-poppins">{totalCustomers}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/20 rounded-xl p-3 border border-white/30 hover:bg-white/25 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 bg-white/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                        <Car className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-white/90 text-xs font-poppins mb-1">Vehicles</p>
                        <p className="text-lg font-bold text-white font-poppins">{totalVehicles}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/20 rounded-xl p-3 border border-white/30 hover:bg-white/25 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 bg-white/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-white/90 text-xs font-poppins mb-1">Services</p>
                        <p className="text-lg font-bold text-white font-poppins">{recentServices}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/20 rounded-xl p-3 border border-white/30 hover:bg-white/25 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 bg-white/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                        <Wrench className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-white/90 text-xs font-poppins mb-1">Serviced</p>
                        <p className="text-lg font-bold text-white font-poppins">{vehiclesWithRecentService}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="bg-white/20 rounded-xl p-3 border border-white/30 shadow-lg">
                    <img 
                      src="/images/car.gif" 
                      alt="Car Animation" 
                      className="w-full h-auto max-w-[120px] md:max-w-[140px] rounded-lg"
                      style={{ imageRendering: 'auto' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};

// Solid Color QuickActions
const QuickActions = ({ onAddCustomer, onAddVehicle, onAddHistory, onExportData }: { 
  onAddCustomer: () => void, 
  onAddVehicle: () => void, 
  onAddHistory: () => void,
  onExportData: () => void 
}) => {
  const actions = [
    {
      label: "New Customer",
      description: "Add customer",
      icon: UserPlus,
      onClick: onAddCustomer,
      gradient: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
    },
    {
      label: "Add Vehicle",
      description: "Register vehicle",
      icon: Car,
      onClick: onAddVehicle,
      gradient: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
    },
    {
      label: "Service Record",
      description: "Add tire service",
      icon: History,
      onClick: onAddHistory,
      gradient: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
    },
    {
      label: "Export Data",
      description: "Export to Excel",
      icon: Download,
      onClick: onExportData,
      gradient: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {actions.map((action, index) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`${action.gradient} rounded-xl p-4 text-white text-left border border-white/20 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 group font-poppins`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">{action.label}</p>
              <p className="text-white/90 text-xs mt-0.5">{action.description}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <action.icon className="h-4 w-4 text-white" />
            </div>
          </div>
        </button>
      ))}
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
    const { user: authUser } = useAuth();
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
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    // Editing states
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [editingHistory, setEditingHistory] = useState<TireHistory | null>(null);
    const [deletingItem, setDeletingItem] = useState<any>(null);

    // Separate search terms for each tab
    const [customerSearch, setCustomerSearch] = useState('');
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [historySearch, setHistorySearch] = useState('');
    
    // Filters
    const [customerFilter, setCustomerFilter] = useState('all');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
    const [serviceTypeFilter, setServiceTypeFilter] = useState('all');

    // Form states
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [color, setColor] = useState('');
    const [selectedVehicleType, setSelectedVehicleType] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [serviceType, setServiceType] = useState<'repair' | 'replacement' | 'rotation' | 'balancing'>('repair');
    const [serviceDate, setServiceDate] = useState('');
    const [mileage, setMileage] = useState('');
    const [historyNotes, setHistoryNotes] = useState('');

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setCustomerSearch('');
        setVehicleSearch('');
        setHistorySearch('');
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
        
        const { data, error } = await supabase
            .rpc('get_customers_with_vehicles');

        if (error) {
            setCustomerError(`Could not fetch customers: ${error.message}`);
            setCustomers([]);
        } else {
            setCustomers((data || []) as Customer[]);
            setCustomerError(null);
        }
        setIsCustomerLoading(false);
        setLastUpdated(new Date());
    };

    const fetchVehicles = async () => {
        if (!supabase) return;
        setIsVehicleLoading(true);
        
        const { data, error } = await supabase
            .rpc('get_vehicles_complete');

        if (error) {
            setVehicleError(`Could not fetch vehicles: ${error.message}`);
            setVehicles([]);
        } else {
            setVehicles((data || []) as Vehicle[]);
            setVehicleError(null);
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
        
        const [inventoryRes, usersRes] = await Promise.all([
            supabase.from('inventory_item').select('item_id, name, category').eq('category', 'tire'),
            supabase.from('user').select('user_id, name').in('role', [1, 2])
        ]);

        if (inventoryRes.data) setInventory(inventoryRes.data as InventoryItem[]);
        if (usersRes.data) setUsers(usersRes.data as User[]);
    };

    const filteredCustomers = useMemo(() => {
      return customers.filter(customer => {
        if (!customerSearch) return true;
        const searchLower = customerSearch.toLowerCase();
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          customer.phone?.toLowerCase().includes(searchLower)
        );
      });
    }, [customers, customerSearch]);
    
    const filteredVehicles = useMemo(() => {
        const q = vehicleSearch.trim().toLowerCase();
        if (!q) return vehicles;
        return vehicles.filter(v =>
            v.plate_number?.toLowerCase().includes(q) ||
            v.customer?.name?.toLowerCase().includes(q) ||
            v.vehicle_type?.name?.toLowerCase().includes(q) ||
            v.make?.toLowerCase().includes(q) ||
            v.model?.toLowerCase().includes(q) ||
            v.color?.toLowerCase().includes(q)
        );
    }, [vehicles, vehicleSearch]);
        
    const filteredHistory = useMemo(() => {
        return tireHistory.filter(history => {
            const searchLower = historySearch.toLowerCase();
            const matchesSearch = !historySearch || 
                history.vehicle?.plate_number.toLowerCase().includes(searchLower) ||
                history.inventory_item?.name.toLowerCase().includes(searchLower) ||
                history.vehicle?.customer?.name?.toLowerCase().includes(searchLower);

            const matchesService = serviceTypeFilter === 'all' || 
                                 history.service_type === serviceTypeFilter;

            return matchesSearch && matchesService;
        });
    }, [tireHistory, historySearch, serviceTypeFilter]);

    const clearCustomerFilters = () => {
        setCustomerSearch('');
    };

    const clearVehicleFilters = () => {
        setVehicleSearch('');
        setCustomerFilter('all');
        setVehicleTypeFilter('all');
    };

    const clearHistoryFilters = () => {
        setHistorySearch('');
        setServiceTypeFilter('all');
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

    const resetHistoryForm = () => {
        setSelectedVehicle('');
        setSelectedItem('');
        setServiceType('repair');
        setServiceDate('');
        setMileage('');
        setHistoryNotes('');
        setEditingHistory(null);
    };

    const handleOpenCustomerDialog = () => {
        resetCustomerForm();
        setIsCustomerDialogOpen(true);
    };

    const handleOpenVehicleDialog = () => {
        resetVehicleForm();
        setIsVehicleDialogOpen(true);
    };

    const handleOpenHistoryDialog = () => {
        resetHistoryForm();
        setIsHistoryDialogOpen(true);
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

    const handleEditHistory = (history: TireHistory) => {
        setEditingHistory(history);
        setSelectedVehicle(history.vehicle_id);
        setSelectedItem(history.item_id);
        setServiceType(history.service_type);
        setServiceDate(history.service_date.split('T')[0]);
        setMileage(history.mileage?.toString() || '');
        setHistoryNotes(history.notes || '');
        setIsHistoryDialogOpen(true);
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
            headers = ['Vehicle', 'Tire/Item', 'Service Type', 'Date', 'Mileage', 'Service By'];
        }

        if (dataToExport.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There is no data available for export.",
                variant: "destructive"
            });
            return;
        }

        // Convert data to CSV format
        const csvContent = convertToCSV(dataToExport, headers, activeTab);
        
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

    const convertToCSV = (data: any[], headers: string[], type: string) => {
    const headerRow = headers.join(',') + '\n'; 
    const dataRows = data.map(item => {
        if (type === 'customers') {
        return [
            `"${item.name || ''}"`,
            `"${item.phone || ''}"`,
            `"${item.vehicle_count || 0}"`
        ].join(',');
        } else if (type === 'vehicles') {
        return [
            `"${item.plate_number || ''}"`,
            `"${item.customer?.name || ''}"`,
            `"${item.vehicle_type?.name || ''}"`,
            `"${item.make || ''}"`,
            `"${item.model || ''}"`,
            `"${item.color || ''}"`
        ].join(',');
        } else {
        return [
            `"${item.vehicle?.plate_number || ''}"`,
            `"${item.inventory_item?.name || ''}"`,
            `"${toTitle(item.service_type) || ''}"`,
            `"${item.service_date ? new Date(item.service_date).toLocaleDateString('en-US') : ''}"`,
            `"${item.mileage || ''}"`,
            `"${item.user?.name || ''}"`
        ].join(',');
        }
    }).join('\n');

    return headerRow + dataRows;
    };

    const handleSubmitCustomer = async () => {
        if (!supabase || !authUser) return;
        if (!customerName) {
            toast({ title: "Validation Error", description: "Customer name is required.", variant: "destructive" });
            return;
        }

        setIsCustomerLoading(true);

        const customerData = {
            name: customerName,
            phone: customerPhone || null,
        };

        let error;
        if (editingCustomer) {
            const { error: updateError } = await supabase
                .from('customer')
                .update(customerData)
                .eq('customer_id', editingCustomer.customer_id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('customer')
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
            const { error: updateError } = await supabase
                .from('vehicle')
                .update(vehicleData)
                .eq('vehicle_id', editingVehicle.vehicle_id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('vehicle')
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

    const handleSubmitHistory = async () => {
        if (!supabase || !authUser) return;
        if (!selectedVehicle || !selectedItem || !serviceDate) {
            toast({ title: "Validation Error", description: "Vehicle, item, and service date are required.", variant: "destructive" });
            return;
        }

        setIsHistoryLoading(true);

        const historyData = {
            vehicle_id: selectedVehicle,
            item_id: selectedItem,
            service_type: serviceType,
            service_date: serviceDate,
            mileage: mileage ? parseInt(mileage) : null,
            notes: historyNotes || null,
            created_by: authUser.user_id,
        };

        let error;
        if (editingHistory) {
            const { error: updateError } = await supabase
                .from('tire_history')
                .update(historyData)
                .eq('history_id', editingHistory.history_id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('tire_history')
                .insert([historyData]);
            error = insertError;
        }

        setIsHistoryLoading(false);

        if (error) {
            toast({ title: "Save Error", description: `Could not save tire history: ${error.message}`, variant: "destructive" });
        } else {
            // Show success animation
            setSuccessAnimation({
                isVisible: true,
                title: editingHistory ? "Service Record Updated!" : "Service Record Added!",
                message: editingHistory 
                    ? "Tire service record has been updated successfully."
                    : "New tire service record has been created successfully.",
                actionType: editingHistory ? 'edit' : 'add'
            });
            
            setIsHistoryDialogOpen(false);
            fetchTireHistory();
        }
    };

    const handleDelete = async () => {
        if (!deletingItem || !supabase) return;
        
        const tableName = deletingItem.type === 'customer' ? 'customer' : 
                         deletingItem.type === 'vehicle' ? 'vehicle' : 'tire_history';
        const idField = deletingItem.type === 'customer' ? 'customer_id' : 
                       deletingItem.type === 'vehicle' ? 'vehicle_id' : 'history_id';
        
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq(idField, deletingItem[idField]);

        if (error) {
            toast({ title: "Delete Error", description: `Could not delete ${deletingItem.type}: ${error.message}`, variant: "destructive" });
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

    // Custom cell renderers
    const renderCustomerCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'vehicle_count') {
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {item.vehicle_count || 0} vehicles
                </Badge>
            );
        }
        if (columnKey === 'phone' && !value) {
            return <span className="text-slate-400">-</span>;
        }
        return String(value || '');
    };

    const renderVehicleCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'customer_name') {
            return <span className="font-medium text-slate-800">{item.customer?.name || 'Unknown Customer'}</span>;
        }
        if (columnKey === 'vehicle_type') {
            if (!item.vehicle_type) return <Badge variant="outline">N/A</Badge>;
            const vehicleName = item.vehicle_type.name;
            const VehicleIcon = getVehicleIcon(vehicleName);
            return (
                <Badge variant="outline" className="flex items-center gap-1 bg-slate-100 text-slate-700 border-slate-300 capitalize font-poppins">
                    <VehicleIcon className="h-3 w-3" />
                    {vehicleName}
                </Badge>
            );
        }
        if (!value) {
            return <span className="text-slate-400">-</span>;
        }
        return <span className="text-slate-700">{String(value)}</span>;
    };

    const renderHistoryCell = (item: any, columnKey: string, value: any) => {
    if (columnKey === 'plate_number') {
        return <span className="font-medium text-slate-800">{item.vehicle?.plate_number || '—'}</span>;
    }
    if (columnKey === 'item_name') {
        if (item.source === 'service_job') {
        return (
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-poppins">
            Service Job
            </Badge>
        );
        }
        return item.inventory_item?.name || '—';
    }
    if (columnKey === 'service_type') {
        if (item.source === 'service_job') {
        return (
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-poppins">
            General Service
            </Badge>
        );
        }
        const st = String(item.service_type ?? '').toLowerCase();
        return (
        <Badge className={`capitalize ${serviceTypeColors[st as keyof typeof serviceTypeColors] ?? ''} font-poppins`}>
            {st || '—'}
        </Badge>
        );
    }
    if (columnKey === 'service_date') {
        return value ? new Date(value).toLocaleDateString('en-US') : '—';
    }
    if (columnKey === 'mileage') {
        return value ? <span className="font-medium">{value.toLocaleString()} km</span> : <span className="text-slate-400">-</span>;
    }
    if (columnKey === 'notes') {
        return value || <span className="text-slate-400">-</span>;
    }
    if (columnKey === 'created_by_name') {
        return <span className="text-slate-700">{item.user?.name || '—'}</span>;
    }
    return String(value ?? '');
    };

    // Helper function to convert to title case
    const toTitle = (str: string) => {
        return str?.charAt(0).toUpperCase() + str?.slice(1).toLowerCase() || '';
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
                                Customer & Vehicle Management
                            </h1>
                            <div className="flex items-center gap-6 text-white/90">
                                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium font-poppins">
                                    <Users className="h-6 w-6 opacity-90" />
                                    Manage customers, vehicles, and tire service history
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
                            disabled={isCustomerLoading || isVehicleLoading || isHistoryLoading}
                            className={buttonStyles.glass + " active:scale-95 font-poppins"}
                        >
                            <RefreshCw className={`h-6 w-6 mr-3 ${isCustomerLoading || isVehicleLoading || isHistoryLoading ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </Button>
                    </div>
                </div>

                <div className="mt-12"></div>
                
                {/* Stats Overview */}
                <StatsOverview customers={customers} vehicles={vehicles} tireHistory={tireHistory} />

                {/* Quick Actions */}
                <QuickActions 
                    onAddCustomer={handleOpenCustomerDialog} 
                    onAddVehicle={handleOpenVehicleDialog}
                    onAddHistory={handleOpenHistoryDialog}
                    onExportData={handleExportData}
                />

                <EnhancedTabs value={activeTab} onValueChange={handleTabChange}>
                    {/* Customers Tab */}
                    <TabsContent value="customers" className="space-y-6 animate-in fade-in duration-500">
                        <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-purple-50/50 border-b border-slate-200/50">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Customer Management</CardTitle>
                                        <CardDescription className="text-slate-600 font-poppins">
                                            {filteredCustomers.length} of {customers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} shown
                                        </CardDescription>
                                    </div>
                                    <Button 
                                        onClick={handleOpenCustomerDialog}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-poppins"
                                    >
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Add Customer
                                    </Button>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 rounded-xl border border-slate-200/50">
                                    <div className="flex-1">
                                        <Label htmlFor="search-customers" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Search Customers</Label>
                                        <SearchInput 
                                            id="search-customers"
                                            value={customerSearch}
                                            onChange={setCustomerSearch}
                                            placeholder="Search by name or phone..."
                                        />
                                    </div>
                                    {customerSearch && (
                                        <div className="flex items-end">
                                            <Button onClick={clearCustomerFilters} variant="outline" className="h-10 border-slate-300 text-slate-600 hover:text-slate-700 font-poppins">
                                                <X className="h-4 w-4 mr-2" />
                                                Clear
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-6">
                                {customerError && (
                                    <Alert variant="destructive" className="mb-6 font-poppins">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{customerError}</AlertDescription>
                                    </Alert>
                                )}

                                {isCustomerLoading ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : filteredCustomers.length === 0 ? (
                                    <EnhancedEmptyState 
                                        type="customers"
                                        onAddNew={handleOpenCustomerDialog}
                                        onClearFilters={clearCustomerFilters}
                                    />
                                ) : (
                                    <DataTableWrapper
                                        title=""
                                        columns={customerColumns}
                                        data={filteredCustomers.map(customer => ({ ...customer, id: customer.customer_id }))}
                                        onEdit={handleEditCustomer}
                                        onDelete={(item) => handleDeleteItem(item, 'customer')}
                                        renderCell={renderCustomerCell}
                                        onAddNew={handleOpenCustomerDialog}
                                        searchTerm={customerSearch}
                                        onSearchChange={setCustomerSearch}
                                        enableStripes={true}
                                        rowClassName="hover:bg-purple-50/50 transition-colors duration-200"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Vehicles Tab */}
                    <TabsContent value="vehicles" className="space-y-6 animate-in fade-in duration-500">
                        <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200/50">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Vehicle Management</CardTitle>
                                        <CardDescription className="text-slate-600 font-poppins">
                                            {filteredVehicles.length} of {vehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} shown
                                        </CardDescription>
                                    </div>
                                    <Button 
                                        onClick={handleOpenVehicleDialog}
                                        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-poppins"
                                    >
                                        <Car className="h-4 w-4 mr-2" />
                                        Add Vehicle
                                    </Button>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 rounded-xl border border-slate-200/50">
                                    <div className="flex-1">
                                        <Label htmlFor="search-vehicles" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Search Vehicles</Label>
                                        <SearchInput 
                                            id="search-vehicles"
                                            value={vehicleSearch}
                                            onChange={setVehicleSearch}
                                            placeholder="Search by plate, make, model, or customer..."
                                        />
                                    </div>
                                    
                                    <div className="sm:w-48">
                                        <Label htmlFor="customer-filter" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Customer</Label>
                                        <Select value={customerFilter} onValueChange={setCustomerFilter}>
                                            <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                                <SelectValue placeholder="All customers" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="font-poppins">All Customers</SelectItem>
                                                {customers.map(customer => (
                                                    <SelectItem key={customer.customer_id} value={customer.customer_id} className="font-poppins">
                                                        {customer.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="sm:w-48">
                                        <Label htmlFor="vehicle-type-filter" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Vehicle Type</Label>
                                        <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                                            <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                                <SelectValue placeholder="All types" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="font-poppins">All Types</SelectItem>
                                                {vehicleTypes.map(type => (
                                                    <SelectItem key={type.vehicle_type_id} value={type.vehicle_type_id} className="font-poppins">
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {(vehicleSearch || customerFilter !== 'all' || vehicleTypeFilter !== 'all') && (
                                        <div className="flex items-end">
                                            <Button onClick={clearVehicleFilters} variant="outline" className="h-10 border-slate-300 text-slate-600 hover:text-slate-700 font-poppins">
                                                <X className="h-4 w-4 mr-2" />
                                                Clear
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-6">
                                {vehicleError && (
                                    <Alert variant="destructive" className="mb-6 font-poppins">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{vehicleError}</AlertDescription>
                                    </Alert>
                                )}

                                {isVehicleLoading ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : filteredVehicles.length === 0 ? (
                                    <EnhancedEmptyState 
                                        type="vehicles"
                                        onAddNew={handleOpenVehicleDialog}
                                        onClearFilters={clearVehicleFilters}
                                    />
                                ) : (
                                    <DataTableWrapper
                                        title=""
                                        columns={vehicleColumns}
                                        data={filteredVehicles.map(vehicle => ({ ...vehicle, id: vehicle.vehicle_id }))}
                                        onAddNew={handleOpenVehicleDialog}
                                        onEdit={handleEditVehicle}
                                        onDelete={(item) => handleDeleteItem(item, 'vehicle')}
                                        renderCell={renderVehicleCell}
                                        searchTerm={vehicleSearch}
                                        onSearchChange={setVehicleSearch}
                                        enableStripes={true}
                                        rowClassName="hover:bg-blue-50/50 transition-colors duration-200"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* History Tab */}
                    <TabsContent value="history" className="space-y-6 animate-in fade-in duration-500">
                        <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-green-50/50 border-b border-slate-200/50">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Tire Service History</CardTitle>
                                        <CardDescription className="text-slate-600 font-poppins">
                                            {filteredHistory.length} of {tireHistory.length} service record{filteredHistory.length !== 1 ? 's' : ''} shown
                                        </CardDescription>
                                    </div>
                                    <Button 
                                        onClick={handleOpenHistoryDialog}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-poppins"
                                    >
                                        <History className="h-4 w-4 mr-2" />
                                        Add Record
                                    </Button>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 rounded-xl border border-slate-200/50">
                                    <div className="flex-1">
                                        <Label htmlFor="search-history" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Search History</Label>
                                        <SearchInput 
                                            id="search-history"
                                            value={historySearch}
                                            onChange={setHistorySearch}
                                            placeholder="Search by plate number, item, or customer..."
                                        />
                                    </div>
                                    
                                    <div className="sm:w-48">
                                        <Label htmlFor="service-type-filter" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Service Type</Label>
                                        <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                                            <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                                <SelectValue placeholder="All services" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="font-poppins">All Services</SelectItem>
                                                <SelectItem value="repair" className="font-poppins">Repair</SelectItem>
                                                <SelectItem value="replacement" className="font-poppins">Replacement</SelectItem>
                                                <SelectItem value="rotation" className="font-poppins">Rotation</SelectItem>
                                                <SelectItem value="balancing" className="font-poppins">Balancing</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {(historySearch || serviceTypeFilter !== 'all') && (
                                        <div className="flex items-end">
                                            <Button onClick={clearHistoryFilters} variant="outline" className="h-10 border-slate-300 text-slate-600 hover:text-slate-700 font-poppins">
                                                <X className="h-4 w-4 mr-2" />
                                                Clear
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-6">
                                {historyError && (
                                    <Alert variant="destructive" className="mb-6 font-poppins">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{historyError}</AlertDescription>
                                    </Alert>
                                )}

                                {isHistoryLoading ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : filteredHistory.length === 0 ? (
                                    <EnhancedEmptyState 
                                        type="history"
                                        onAddNew={handleOpenHistoryDialog}
                                        onClearFilters={clearHistoryFilters}
                                    />
                                ) : (
                                <DataTableWrapper
                                title=""
                                columns={historyColumns}
                                data={filteredHistory.map(h => ({
                                    ...h,
                                    id: h.history_id,
                                    plate_number: h.vehicle?.plate_number ?? '',
                                    item_name: h.inventory_item?.name ?? '',
                                    created_by_name: h.user?.name ?? '',
                                }))}
                                onAddNew={handleOpenHistoryDialog}
                                onEdit={handleEditHistory}
                                onDelete={(item) => handleDeleteItem(item, 'history')}
                                renderCell={renderHistoryCell}
                                searchTerm={historySearch}
                                onSearchChange={setHistorySearch}
                                enableStripes={true}
                                rowClassName="hover:bg-green-50/50 transition-colors duration-200"
                                />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </EnhancedTabs>

                {/* Success Animation for All Actions */}
                <SuccessAnimation
                    isVisible={successAnimation.isVisible}
                    title={successAnimation.title}
                    message={successAnimation.message}
                    actionType={successAnimation.actionType}
                    onConfirm={() => setSuccessAnimation(prev => ({ ...prev, isVisible: false }))}
                />

                {/* Enhanced Customer Dialog */}
                <Dialog open={isCustomerDialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsCustomerDialogOpen(false);
                        resetCustomerForm();
                    }
                }}>
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins animate-in zoom-in duration-300">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
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
                                    onChange={(e) => setCustomerName(e.target.value)} 
                                    placeholder="John Doe"
                                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="customer-phone" className="text-slate-700 font-medium font-poppins">Phone</Label>
                                    <Input 
                                        id="customer-phone" 
                                        value={customerPhone} 
                                        onChange={(e) => setCustomerPhone(e.target.value)} 
                                        placeholder="+1-555-0101"
                                        className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className={buttonStyles.back}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button onClick={handleSubmitCustomer} disabled={isCustomerLoading} className={buttonStyles.primary}>
                                {isCustomerLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingCustomer ? 'Save Changes' : 'Create Customer'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Enhanced Vehicle Dialog */}
                <Dialog open={isVehicleDialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsVehicleDialogOpen(false);
                        resetVehicleForm();
                    }
                }}>
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins animate-in zoom-in duration-300">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
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
                                    <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
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
                                    onChange={(e) => setPlateNumber(e.target.value)} 
                                    placeholder="ABC-1234"
                                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehicle-type" className="text-slate-700 font-medium font-poppins">Vehicle Type</Label>
                                <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
                                    <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
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
                                        onChange={(e) => setMake(e.target.value)} 
                                        placeholder="Toyota"
                                        className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model" className="text-slate-700 font-medium font-poppins">Model</Label>
                                    <Input 
                                        id="model" 
                                        value={model} 
                                        onChange={(e) => setModel(e.target.value)} 
                                        placeholder="Camry"
                                        className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="color" className="text-slate-700 font-medium font-poppins">Color</Label>
                                    <Input 
                                        id="color" 
                                        value={color} 
                                        onChange={(e) => setColor(e.target.value)} 
                                        placeholder="White"
                                        className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className={buttonStyles.back}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button onClick={handleSubmitVehicle} disabled={isVehicleLoading} className={buttonStyles.primary}>
                                {isVehicleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingVehicle ? 'Save Changes' : 'Create Vehicle'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Enhanced History Dialog */}
                <Dialog open={isHistoryDialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsHistoryDialogOpen(false);
                        resetHistoryForm();
                    }
                }}>
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins animate-in zoom-in duration-300">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
                                {editingHistory ? 'Edit Tire History' : 'Add Tire History'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-600 font-poppins">
                                {editingHistory ? `Update tire service record.` : 'Record a new tire service for a vehicle.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="vehicle" className="text-slate-700 font-medium font-poppins">Vehicle *</Label>
                                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                    <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                        <SelectValue placeholder="Select vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicles.map(vehicle => (
                                            <SelectItem key={vehicle.vehicle_id} value={vehicle.vehicle_id} className="font-poppins">
                                                {vehicle.plate_number} - {vehicle.customer?.name || 'Unknown Customer'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="item" className="text-slate-700 font-medium font-poppins">Tire/Item *</Label>
                                <Select value={selectedItem} onValueChange={setSelectedItem}>
                                    <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                        <SelectValue placeholder="Select tire/item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {inventory.map(item => (
                                            <SelectItem key={item.item_id} value={item.item_id} className="font-poppins">
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service-type" className="text-slate-700 font-medium font-poppins">Service Type *</Label>
                                <Select value={serviceType} onValueChange={(value: any) => setServiceType(value)}>
                                    <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="repair" className="font-poppins">Repair</SelectItem>
                                        <SelectItem value="replacement" className="font-poppins">Replacement</SelectItem>
                                        <SelectItem value="rotation" className="font-poppins">Rotation</SelectItem>
                                        <SelectItem value="balancing" className="font-poppins">Balancing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="service-date" className="text-slate-700 font-medium font-poppins">Service Date *</Label>
                                    <CustomDateInput
                                        id="service-date"
                                        value={serviceDate}
                                        onChange={setServiceDate}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mileage" className="text-slate-700 font-medium font-poppins">Mileage (km)</Label>
                                    <Input 
                                        id="mileage" 
                                        type="number"
                                        value={mileage} 
                                        onChange={(e) => setMileage(e.target.value)} 
                                        placeholder="50000 (km)"
                                        className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="history-notes" className="text-slate-700 font-medium font-poppins">Notes</Label>
                                <Textarea 
                                    id="history-notes" 
                                    value={historyNotes} 
                                    onChange={(e) => setHistoryNotes(e.target.value)} 
                                    placeholder="Additional notes about the service..."
                                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className={buttonStyles.back}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button onClick={handleSubmitHistory} disabled={isHistoryLoading} className={buttonStyles.primary}>
                                {isHistoryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingHistory ? 'Save Changes' : 'Create History'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Enhanced Delete Confirmation Dialog */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent className="bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins animate-in zoom-in duration-300">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-slate-900 font-poppins">Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600 font-poppins">
                                Are you sure you want to delete this {deletingItem?.type}? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className={buttonStyles.back}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleDelete} 
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-red-600 active:scale-95 font-poppins"
                            >
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