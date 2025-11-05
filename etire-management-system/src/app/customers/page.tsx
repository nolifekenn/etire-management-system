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
  Loader2, PlusCircle, AlertTriangle, Users, Car, History, Wrench, 
  RefreshCw, Clock, Edit, Trash2, Search, Filter, X, MapPin, Phone, Mail,
  Bike, Truck, Bus, CarTaxiFront, ArrowLeft
} from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Customer, Vehicle, TireHistory, InventoryItem, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 font-poppins",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg font-poppins",
  back: "flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-slate-300 hover:border-slate-400 font-poppins"
};

// Vehicle Type Icons Mapping
const VehicleIcons = {
  car: Car,
  motorcycle: Bike,
  truck: Truck,
  bus: Bus,
  suv: CarTaxiFront,
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
  balancing: "bg-purple-100 text-purple-700 border-purple-200"
};

interface VehicleType {
    vehicle_type_id: string;
    name: string;
}

// Column definitions
const customerColumns = [
  { key: 'name', header: 'Customer Name' },
  { key: 'phone', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'address', header: 'Address' },
  { key: 'vehicle_count', header: 'Vehicles' },
];

const vehicleColumns = [
  { key: 'plate_number', header: 'Plate Number' },
  { key: 'customer_name', header: 'Customer' },
  { key: 'vehicle_type', header: 'Type' },
  { key: 'make', header: 'Make' },
  { key: 'model', header: 'Model' },
  { key: 'year', header: 'Year' },
  { key: 'color', header: 'Color' },
];

const historyColumns = [
  { key: 'plate_number', header: 'Vehicle' },
  { key: 'item_name', header: 'Tire/Item' },
  { key: 'service_type', header: 'Service Type' },
  { key: 'service_date', header: 'Date' },
  { key: 'mileage', header: 'Mileage' },
  { key: 'created_by_name', header: 'Service By' },
];

// Custom Date Input Component with better styling
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
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout for debounced update
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 150); // Reduced debounce time for better responsiveness
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

export default function EnhancedCustomersPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState('customers');
    const [mounted, setMounted] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    // Customers state
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCustomerLoading, setIsCustomerLoading] = useState(true);
    const [customerError, setCustomerError] = useState<string | null>(null);
    
    // Vehicles state
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isVehicleLoading, setIsVehicleLoading] = useState(true);
    const [vehicleError, setVehicleError] = useState<string | null>(null);
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
    
    // Tire History state
    const [tireHistory, setTireHistory] = useState<TireHistory[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    
    // Supporting data
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    
    // Dialog states
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
    const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [editingHistory, setEditingHistory] = useState<TireHistory | null>(null);
    const [deletingItem, setDeletingItem] = useState<any>(null);

    // Separate search terms for each tab to prevent unnecessary re-renders
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    
    const [customerFilter, setCustomerFilter] = useState('all');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
    const [serviceTypeFilter, setServiceTypeFilter] = useState('all');

    // Customer form state
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');

    // Vehicle form state
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [color, setColor] = useState('');
    const [selectedVehicleType, setSelectedVehicleType] = useState('');

    // History form state
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [serviceType, setServiceType] = useState<'repair' | 'replacement' | 'rotation' | 'balancing'>('repair');
    const [serviceDate, setServiceDate] = useState('');
    const [mileage, setMileage] = useState('');
    const [historyNotes, setHistoryNotes] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchCustomers = useCallback(async () => {
        if (!supabase) return;
        setIsCustomerLoading(true);
        const { data, error } = await supabase
            .from('customer')
            .select('*, vehicle(vehicle_id)')
            .order('name', { ascending: true });
    
        if (error) {
            setCustomerError(`Could not fetch customers: ${error.message}`);
            setCustomers([]);
        } else {
            setCustomers(data as any);
            setCustomerError(null);
        }
        setIsCustomerLoading(false);
        setLastUpdated(new Date());
    }, []);

    const fetchVehicles = useCallback(async () => {
        if (!supabase) return;
        setIsVehicleLoading(true);
        const { data, error } = await supabase
            .from('vehicle')
            .select('*, customer:customer_id(name), vehicle_type:vehicle_type_id(vehicle_type_id, name)')
            .order('plate_number', { ascending: true });

        if (error) {
            setVehicleError(`Could not fetch vehicles: ${error.message}`);
            setVehicles([]);
        } else {
            setVehicles(data as any);
            setVehicleError(null);
        }
        setIsVehicleLoading(false);
    }, []);

    const fetchVehicleTypes = useCallback(async () => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from('vehicle_type')
            .select('*')
            .order('name');

        if (data) setVehicleTypes(data as VehicleType[]);
    }, []);

    const fetchTireHistory = useCallback(async () => {
        if (!supabase) return;
        setIsHistoryLoading(true);
        const { data, error } = await supabase
            .from('tire_history')
            .select('*, vehicle:vehicle_id(plate_number), inventory_item:item_id(name), user:created_by(name)')
            .order('service_date', { ascending: false });

        if (error) {
            setHistoryError(`Could not fetch tire history: ${error.message}`);
            setTireHistory([]);
        } else {
            setTireHistory(data as any);
            setHistoryError(null);
        }
        setIsHistoryLoading(false);
    }, []);

    const fetchSupportingData = useCallback(async () => {
        if (!supabase) return;
        
        const [inventoryRes, usersRes] = await Promise.all([
            supabase.from('inventory_item').select('item_id, name, category').eq('category', 'tire'),
            supabase.from('user').select('user_id, name').in('role', [1, 2])
        ]);

        if (inventoryRes.data) setInventory(inventoryRes.data as InventoryItem[]);
        if (usersRes.data) setUsers(usersRes.data as User[]);
    }, []);

    useEffect(() => {
        fetchCustomers();
        fetchVehicles();
        fetchTireHistory();
        fetchSupportingData();
        fetchVehicleTypes();
    }, [fetchCustomers, fetchVehicles, fetchTireHistory, fetchSupportingData, fetchVehicleTypes]);

    // Optimized filter functions with useMemo
    const filteredCustomers = useMemo(() => {
        return customers.filter(customer => {
            const matchesSearch = customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                customer.address?.toLowerCase().includes(customerSearchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [customers, customerSearchTerm]);

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(vehicle => {
            const matchesSearch = vehicle.plate_number.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
                                vehicle.make?.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
                                vehicle.model?.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
                                vehicle.customer?.name.toLowerCase().includes(vehicleSearchTerm.toLowerCase());

            const matchesType = vehicleTypeFilter === 'all' || 
                               vehicle.vehicle_type_id === vehicleTypeFilter;

            const matchesCustomer = customerFilter === 'all' || 
                                  vehicle.customer_id === customerFilter;

            return matchesSearch && matchesType && matchesCustomer;
        });
    }, [vehicles, vehicleSearchTerm, vehicleTypeFilter, customerFilter]);

    const filteredHistory = useMemo(() => {
        return tireHistory.filter(history => {
            const matchesSearch = history.vehicle?.plate_number.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                                history.inventory_item?.name.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                                history.vehicle?.customer?.name?.toLowerCase().includes(historySearchTerm.toLowerCase());

            const matchesService = serviceTypeFilter === 'all' || 
                                 history.service_type === serviceTypeFilter;

            return matchesSearch && matchesService;
        });
    }, [tireHistory, historySearchTerm, serviceTypeFilter]);

    const clearFilters = () => {
        setCustomerSearchTerm('');
        setVehicleSearchTerm('');
        setHistorySearchTerm('');
        setCustomerFilter('all');
        setVehicleTypeFilter('all');
        setServiceTypeFilter('all');
    };

    const resetCustomerForm = () => {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerAddress('');
        setEditingCustomer(null);
    };

    const resetVehicleForm = () => {
        setSelectedCustomer('');
        setPlateNumber('');
        setMake('');
        setModel('');
        setYear('');
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
        setCustomerEmail(customer.email || '');
        setCustomerAddress(customer.address || '');
        setIsCustomerDialogOpen(true);
    };

    const handleEditVehicle = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setSelectedCustomer(vehicle.customer_id);
        setPlateNumber(vehicle.plate_number);
        setMake(vehicle.make || '');
        setModel(vehicle.model || '');
        setYear(vehicle.year?.toString() || '');
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
        fetchCustomers();
        fetchVehicles();
        fetchTireHistory();
        fetchSupportingData();
        fetchVehicleTypes();
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
            email: customerEmail || null,
            address: customerAddress || null,
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
            toast({ title: "Success", description: `Customer ${editingCustomer ? 'updated' : 'created'} successfully.` });
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
            year: year ? parseInt(year) : null,
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
            toast({ title: "Success", description: `Vehicle ${editingVehicle ? 'updated' : 'created'} successfully.` });
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
            toast({ title: "Success", description: `Tire history ${editingHistory ? 'updated' : 'created'} successfully.` });
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
            toast({ title: "Success", description: `${deletingItem.type} deleted successfully.` });
            setIsDeleteDialogOpen(false);
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

    // Custom cell renderers for DataTableWrapper
    const renderCustomerCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'vehicle_count') {
            return item.vehicle && Array.isArray(item.vehicle) ? item.vehicle.length : 0;
        }
        if (columnKey === 'phone' && !value) {
            return <span className="text-slate-400">No phone</span>;
        }
        if (columnKey === 'email' && !value) {
            return <span className="text-slate-400">No email</span>;
        }
        if (columnKey === 'address' && !value) {
            return <span className="text-slate-400">No address</span>;
        }
        return String(value || '');
    };

    const renderVehicleCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'customer_name') {
            return item.customer?.name || 'Unknown Customer';
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
        if (columnKey === 'year' && !value) {
            return <span className="text-slate-400">-</span>;
        }
        if (columnKey === 'make' && !value) {
            return <span className="text-slate-400">-</span>;
        }
        if (columnKey === 'model' && !value) {
            return <span className="text-slate-400">-</span>;
        }
        if (columnKey === 'color' && !value) {
            return <span className="text-slate-400">-</span>;
        }
        return String(value || '');
    };

    const renderHistoryCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'plate_number') {
            return item.vehicle?.plate_number || 'Unknown Vehicle';
        }
        if (columnKey === 'item_name') {
            return item.inventory_item?.name || 'Unknown Item';
        }
        if (columnKey === 'service_type') {
            return (
                <Badge className={`capitalize ${serviceTypeColors[item.service_type]} font-poppins`}>
                    {value}
                </Badge>
            );
        }
        if (columnKey === 'service_date') {
            return new Date(value).toLocaleDateString();
        }
        if (columnKey === 'mileage' && !value) {
            return <span className="text-slate-400">-</span>;
        }
        if (columnKey === 'created_by_name') {
            return item.user?.name || 'Unknown User';
        }
        return String(value || '');
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
    
    {/* Header Section - Updated to match Service Management */}
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

    <EnhancedTabs value={activeTab} onValueChange={setActiveTab}>
                    {/* Customers Tab */}
                    <TabsContent value="customers" className="space-y-6">
                        <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-purple-50/50 border-b border-slate-200/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Customer Management</CardTitle>
                                        <CardDescription className="text-slate-600 font-poppins">
                                            {filteredCustomers.length} of {customers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} shown
                                        </CardDescription>
                                    </div>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 rounded-xl border border-slate-200/50">
                                    <div className="flex-1">
                                        <Label htmlFor="search-customers" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Search Customers</Label>
                                        <SearchInput 
                                            id="search-customers"
                                            value={customerSearchTerm}
                                            onChange={setCustomerSearchTerm}
                                            placeholder="Search by name, phone, email, or address..."
                                        />
                                    </div>
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

                                {(isCustomerLoading && customers.length === 0) ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <DataTableWrapper
                                        title="Customers"
                                        columns={customerColumns}
                                        data={filteredCustomers.map(customer => ({ 
                                            ...customer, 
                                            id: customer.customer_id 
                                        }))}
                                        onEdit={handleEditCustomer}
                                        onDelete={(item) => handleDeleteItem(item, 'customer')}
                                        renderCell={renderCustomerCell}
                                        searchTerm={customerSearchTerm}
                                        onSearchChange={setCustomerSearchTerm}
                                        onAddNew={handleOpenCustomerDialog}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Vehicles Tab */}
                    <TabsContent value="vehicles" className="space-y-6">
                        <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Vehicle Management</CardTitle>
                                        <CardDescription className="text-slate-600 font-poppins">
                                            {filteredVehicles.length} of {vehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} shown
                                        </CardDescription>
                                    </div>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 rounded-xl border border-slate-200/50">
                                    <div className="flex-1">
                                        <Label htmlFor="search-vehicles" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Search Vehicles</Label>
                                        <SearchInput 
                                            id="search-vehicles"
                                            value={vehicleSearchTerm}
                                            onChange={setVehicleSearchTerm}
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
                                                <SelectItem value="all">All Customers</SelectItem>
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
                                                <SelectItem value="all">All Types</SelectItem>
                                                {vehicleTypes.map(type => (
                                                    <SelectItem key={type.vehicle_type_id} value={type.vehicle_type_id} className="font-poppins">
                                                        {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {(vehicleSearchTerm || customerFilter !== 'all' || vehicleTypeFilter !== 'all') && (
                                        <div className="flex items-end">
                                            <Button 
                                                onClick={() => {
                                                    setVehicleSearchTerm('');
                                                    setCustomerFilter('all');
                                                    setVehicleTypeFilter('all');
                                                }}
                                                variant="outline" 
                                                className="h-10 border-slate-300 text-slate-600 hover:text-slate-700 font-poppins"
                                            >
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

                                {(isVehicleLoading && vehicles.length === 0) ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <DataTableWrapper
                                        title="Vehicles"
                                        columns={vehicleColumns}
                                        data={filteredVehicles.map(vehicle => ({ 
                                            ...vehicle, 
                                            id: vehicle.vehicle_id 
                                        }))}
                                        onAddNew={handleOpenVehicleDialog}
                                        onEdit={handleEditVehicle}
                                        onDelete={(item) => handleDeleteItem(item, 'vehicle')}
                                        renderCell={renderVehicleCell}
                                        searchTerm={vehicleSearchTerm}
                                        onSearchChange={setVehicleSearchTerm}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tire History Tab */}
                    <TabsContent value="history" className="space-y-6">
                        <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-green-50/50 border-b border-slate-200/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Tire Service History</CardTitle>
                                        <CardDescription className="text-slate-600 font-poppins">
                                            {filteredHistory.length} of {tireHistory.length} service record{filteredHistory.length !== 1 ? 's' : ''} shown
                                        </CardDescription>
                                    </div>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 rounded-xl border border-slate-200/50">
                                    <div className="flex-1">
                                        <Label htmlFor="search-history" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Search History</Label>
                                        <SearchInput 
                                            id="search-history"
                                            value={historySearchTerm}
                                            onChange={setHistorySearchTerm}
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
                                                <SelectItem value="all">All Services</SelectItem>
                                                <SelectItem value="repair">Repair</SelectItem>
                                                <SelectItem value="replacement">Replacement</SelectItem>
                                                <SelectItem value="rotation">Rotation</SelectItem>
                                                <SelectItem value="balancing">Balancing</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {(historySearchTerm || serviceTypeFilter !== 'all') && (
                                        <div className="flex items-end">
                                            <Button 
                                                onClick={() => {
                                                    setHistorySearchTerm('');
                                                    setServiceTypeFilter('all');
                                                }}
                                                variant="outline" 
                                                className="h-10 border-slate-300 text-slate-600 hover:text-slate-700 font-poppins"
                                            >
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

                                {(isHistoryLoading && tireHistory.length === 0) ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <DataTableWrapper
                                        title="Tire History"
                                        columns={historyColumns}
                                        data={filteredHistory.map(history => ({ 
                                            ...history, 
                                            id: history.history_id 
                                        }))}
                                        onAddNew={handleOpenHistoryDialog}
                                        onEdit={handleEditHistory}
                                        onDelete={(item) => handleDeleteItem(item, 'history')}
                                        renderCell={renderHistoryCell}
                                        searchTerm={historySearchTerm}
                                        onSearchChange={setHistorySearchTerm}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </EnhancedTabs>

                {/* Enhanced Customer Dialog */}
                <Dialog open={isCustomerDialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsCustomerDialogOpen(false);
                        resetCustomerForm();
                    }
                }}>
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
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
                                <div className="space-y-2">
                                    <Label htmlFor="customer-email" className="text-slate-700 font-medium font-poppins">Email</Label>
                                    <Input 
                                        id="customer-email" 
                                        type="email"
                                        value={customerEmail} 
                                        onChange={(e) => setCustomerEmail(e.target.value)} 
                                        placeholder="john@example.com"
                                        className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customer-address" className="text-slate-700 font-medium font-poppins">Address</Label>
                                <Textarea 
                                    id="customer-address" 
                                    value={customerAddress} 
                                    onChange={(e) => setCustomerAddress(e.target.value)} 
                                    placeholder="123 Main Street, City, State"
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
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
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
                                    <Label htmlFor="year" className="text-slate-700 font-medium font-poppins">Year</Label>
                                    <Input 
                                        id="year" 
                                        type="number"
                                        value={year} 
                                        onChange={(e) => setYear(e.target.value)} 
                                        placeholder="2020"
                                        className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                    />
                                </div>
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
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
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
                    <AlertDialogContent className="bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
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
            `}</style>
        </div>
    );
}