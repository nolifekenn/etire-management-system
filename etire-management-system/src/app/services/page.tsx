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
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, PlusCircle, AlertTriangle, Wrench, Clock, CheckCircle, XCircle, 
  RefreshCw, Search, Filter, X, Edit, Trash2, Car, Bike, Truck, Users, Calendar,
  TrendingUp, DollarSign, Package, ArrowUpDown, Download, ArrowLeft, Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

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

interface ServiceJob {
    job_id: string;
    user_id: string;
    job_description: string;
    job_date: string;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
    service_fee: number;
    remarks: string | null;
    vehicle_type_id: string | null;
    user?: { name: string } | null;
    vehicle_type?: VehicleType | null;
}

interface Customer {
    user_id: string;
    name: string;
}

const ANONYMOUS_CUSTOMER_ID = "anonymous_customer";

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

// Stats Overview Component - Updated colors to match purchasing.tsx
const ServiceStats = ({ serviceJobs }: { serviceJobs: ServiceJob[] }) => {
  const totalJobs = serviceJobs.length;
  const pendingJobs = serviceJobs.filter(job => job.status === 'pending').length;
  const inProgressJobs = serviceJobs.filter(job => job.status === 'in-progress').length;
  const completedJobs = serviceJobs.filter(job => job.status === 'completed').length;
  const totalRevenue = serviceJobs.reduce((acc, job) => acc + job.service_fee, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Jobs - Purple to Indigo (same as Active Suppliers) */}
      <div className={`bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium font-poppins">Total Jobs</p>
            <p className="text-3xl font-bold mt-2 font-poppins">{totalJobs}</p>
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

      {/* Pending Jobs - Blue to Sky Blue (same as Pending POs) */}
      <div className={`bg-gradient-to-br from-blue-500 via-blue-600 to-sky-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium font-poppins">Pending Jobs</p>
            <p className="text-3xl font-bold mt-2 font-poppins">{pendingJobs}</p>
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

      {/* In Progress - Teal to Green (same as Delivered This Month) */}
      <div className={`bg-gradient-to-br from-teal-400 via-cyan-500 to-green-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-teal-100 text-sm font-medium font-poppins">In Progress</p>
            <p className="text-3xl font-bold mt-2 font-poppins">{inProgressJobs}</p>
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

      {/* Total Revenue - Purple to Cyan (same as Total PO Value) */}
      <div className={`bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium font-poppins">Total Revenue</p>
            <p className="text-3xl font-bold mt-2 font-poppins">₱{(totalRevenue / 1000).toFixed(0)}K</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-purple-100 text-sm font-poppins">
          <TrendingUp className="h-4 w-4" />
          <span>This month</span>
        </div>
      </div>
    </div>
  );
};

// Quick Actions Component with functional buttons
const QuickActions = ({ onAddJob, onExportData, onViewCalendar }: { 
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
const CalendarView = ({ serviceJobs, isOpen, onClose }: { 
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
            
            {/* Calendar days would go here - simplified for this example */}
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

export default function EnhancedServiceManagementPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [serviceJobs, setServiceJobs] = useState<ServiceJob[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
    
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

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');

    // Form state
    const [customerId, setCustomerId] = useState(ANONYMOUS_CUSTOMER_ID);
    const [jobDescription, setJobDescription] = useState('');
    const [remarks, setRemarks] = useState('');
    const [jobStatus, setJobStatus] = useState<'pending' | 'in-progress' | 'completed' | 'cancelled'>('pending');
    const [serviceFee, setServiceFee] = useState('0');
    const [vehicleTypeId, setVehicleTypeId] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // ===== SUPABASE DIRECT API CALLS =====
    const fetchJobs = useCallback(async () => {
        if (!supabase) return;
        setIsLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('service_job')
                .select('*, user:user_id(name), vehicle_type:vehicle_type_id(vehicle_type_id, name)')
                .order('job_date', { ascending: false });
            
            if (error) {
                setFetchError(error.message);
                setServiceJobs([]);
                toast({ title: 'Error', description: error.message, variant: 'destructive' });
            } else {
                setServiceJobs(data as any);
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
    }, [toast]);

    const fetchCustomers = useCallback(async () => {
        if (!supabase) return;
        setIsDataLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('user')
                .select('user_id, name');
            
            if (error) throw error;
            
            setCustomers([
                { user_id: ANONYMOUS_CUSTOMER_ID, name: 'Walk-in Customer' },
                ...(data || [])
            ]);
        } catch (error: any) {
            let errorMessage = `Failed to load users: ${error.message}`;
            if (error.message.includes('infinite recursion')) {
                errorMessage = `A database security policy is misconfigured. Error: "${error.message}". This usually happens when a Row Level Security (RLS) policy on the 'users' table refers to itself. Please check your RLS policies in the Supabase dashboard.`;
            }
            setFetchError(errorMessage);
            toast({ title: 'Error', description: errorMessage, variant: 'destructive'});
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

    useEffect(() => {
        fetchJobs();
        fetchCustomers();
        fetchVehicleTypes();
    }, [fetchJobs, fetchCustomers, fetchVehicleTypes]);

    // Filter jobs
    const filteredJobs = useMemo(() => {
        return serviceJobs.filter(job => {
            const matchesSearch = job.job_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            job.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            job.user?.name.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || job.status === statusFilter;

            const matchesVehicleType = vehicleTypeFilter === 'all' || 
                                     job.vehicle_type_id === vehicleTypeFilter;

            return matchesSearch && matchesStatus && matchesVehicleType;
        });
    }, [serviceJobs, searchTerm, statusFilter, vehicleTypeFilter]);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setVehicleTypeFilter('all');
    };

    const resetForm = () => {
        setCustomerId(ANONYMOUS_CUSTOMER_ID);
        setJobDescription('');
        setRemarks('');
        setJobStatus('pending');
        setServiceFee('0');
        setVehicleTypeId('');
        setEditingJob(null);
    };

    const handleOpenAddDialog = () => {
        resetForm();
        setIsAddDialogOpen(true);
    };
    
    const handleOpenEditDialog = (job: ServiceJob) => {
        setEditingJob(job);
        setCustomerId(job.user_id || ANONYMOUS_CUSTOMER_ID);
        setJobDescription(job.job_description);
        setRemarks(job.remarks || '');
        setJobStatus(job.status);
        setServiceFee(String(job.service_fee));
        setVehicleTypeId(job.vehicle_type_id || '');
        setIsEditDialogOpen(true);
    };

    const handleOpenDeleteDialog = (job: ServiceJob) => {
        setDeletingJob(job);
        setIsDeleteConfirmationOpen(true);
    };

    const handleRefresh = () => {
        fetchJobs();
        fetchCustomers();
        fetchVehicleTypes();
    };

    // Export Data Functionality
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

        toast({
            title: "Export Successful",
            description: `${filteredJobs.length} service jobs exported to service_jobs_export.csv`,
        });
    };

    const convertToCSV = (data: ServiceJob[], headers: string[]) => {
        const headerRow = headers.join(',') + '\n';
        
        const dataRows = data.map(job => {
            return [
                `"${job.job_id || ''}"`,
                `"${job.job_description || ''}"`,
                `"${job.user?.name || 'Walk-in Customer'}"`,
                `"${job.vehicle_type?.name || 'Not specified'}"`,
                `"${job.status || ''}"`,
                `"${Number(job.service_fee || 0).toFixed(2)}"`,
                `"${job.job_date ? new Date(job.job_date).toLocaleDateString() : ''}"`,
                `"${job.remarks || ''}"`
            ].join(',');
        }).join('\n');

        return headerRow + dataRows;
    };

    const handleSubmit = async () => {
        if (!supabase || !authUser) return;
        
        if (!jobDescription) {
            toast({ title: 'Validation Error', description: 'Job description is required.', variant: 'destructive'});
            return;
        }

        setIsLoading(true);
        
        try {
            const customerName = customerId === ANONYMOUS_CUSTOMER_ID ? 'Walk-in Customer' : 
                                customers.find(c => c.user_id === customerId)?.name || 'Unknown Customer';
            
            const jobData = {
                user_id: authUser.user_id,
                job_description: jobDescription,
                status: jobStatus,
                service_fee: parseFloat(serviceFee) || 0,
                remarks: `Customer: ${customerName}${remarks ? '\n\nRemarks: ' + remarks : ''}`,
                vehicle_type_id: vehicleTypeId && vehicleTypeId !== '' ? vehicleTypeId : null,
            };

            console.log('Submitting job data:', jobData);

            let error;
            
            if (editingJob) {
                const { error: updateError } = await supabase
                    .from('service_job')
                    .update(jobData)
                    .eq('job_id', editingJob.job_id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('service_job')
                    .insert([jobData]);
                error = insertError;
            }

            if (error) {
                toast({ title: 'Save Error', description: error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Success', description: `Service job ${editingJob ? 'updated' : 'created'} successfully.` });
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
                fetchJobs();
            }
        } catch (error: any) {
            console.error('Submit error:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        
        setIsLoading(false);
    };

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
                toast({ title: 'Success', description: 'Service job deleted successfully.' });
                setIsDeleteConfirmationOpen(false);
                fetchJobs();
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        
        setIsLoading(false);
    };

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

                {/* Main Table Card */}
                <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                    <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-purple-50/50 border-b border-slate-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Service Jobs</CardTitle>
                                <CardDescription className="text-slate-600 font-poppins">
                                    {filteredJobs.length} of {serviceJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} shown
                                </CardDescription>
                            </div>
                            <Button 
                                onClick={handleOpenAddDialog}
                                className={buttonStyles.primary}
                            >
                                <PlusCircle className="h-5 w-5 mr-2" />
                                New Service Job
                            </Button>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 rounded-xl border border-slate-200/50">
                            <div className="flex-1">
                                <Label htmlFor="search-jobs" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Search Jobs</Label>
                                <SearchInput 
                                    id="search-jobs"
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    placeholder="Search by description, remarks, or employee..."
                                />
                            </div>
                            
                            <div className="sm:w-48">
                                <Label htmlFor="status-filter" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="font-poppins">All Statuses</SelectItem>
                                        <SelectItem value="pending" className="font-poppins">Pending</SelectItem>
                                        <SelectItem value="in-progress" className="font-poppins">In Progress</SelectItem>
                                        <SelectItem value="completed" className="font-poppins">Completed</SelectItem>
                                        <SelectItem value="cancelled" className="font-poppins">Cancelled</SelectItem>
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
                                                {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {(searchTerm || statusFilter !== 'all' || vehicleTypeFilter !== 'all') && (
                                <div className="flex items-end">
                                    <Button 
                                        onClick={clearFilters}
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
                    
                    <CardContent className="p-0">
                        {fetchError && !fetchError.includes('infinite recursion') && (
                            <Alert variant="destructive" className="m-6 font-poppins">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{fetchError}</AlertDescription>
                            </Alert>
                        )}

                        {(isLoading && serviceJobs.length === 0) ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/80 border-b border-slate-200/50 text-sm font-semibold text-slate-700 font-poppins">
                                    <div className="col-span-4">Job Details</div>
                                    <div className="col-span-2">Vehicle Type</div>
                                    <div className="col-span-2">Employee</div>
                                    <div className="col-span-2">Date & Fee</div>
                                    <div className="col-span-1">Status</div>
                                    <div className="col-span-1 text-center">Actions</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-slate-200/50">
                                    {filteredJobs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-500 font-poppins">
                                            <Wrench className="h-12 w-12 mb-4 text-slate-300" />
                                            <p className="text-lg font-medium">No service jobs found</p>
                                            <p className="text-sm mt-1">
                                                {serviceJobs.length === 0 ? 'No service jobs created yet' : 'Try adjusting your filters'}
                                            </p>
                                        </div>
                                    ) : (
                                        filteredJobs.map((job) => {
                                            const VehicleIcon = getVehicleIcon(job.vehicle_type?.name || 'car');
                                            const StatusIcon = StatusIcons[job.status];
                                            return (
                                                <div key={job.job_id} className="grid grid-cols-12 gap-4 px-6 py-6 hover:bg-slate-50/50 transition-colors duration-200 group">
                                                    {/* Job Details */}
                                                    <div className="col-span-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                                                                <Wrench className="h-5 w-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-900 text-lg font-poppins">{job.job_description}</p>
                                                                {job.remarks && (
                                                                    <p className="text-sm text-slate-600 mt-1 line-clamp-2 font-poppins">
                                                                        {job.remarks.split('\n')[0]}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Vehicle Type */}
                                                    <div className="col-span-2">
                                                        <div className="flex items-center gap-2">
                                                            <VehicleIcon className="h-4 w-4 text-slate-400" />
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
                                                        <p className="text-sm font-semibold text-green-600 font-poppins">
                                                            ₱{job.service_fee.toFixed(2)}
                                                        </p>
                                                    </div>

                                                    {/* Status */}
                                                    <div className="col-span-1">
                                                        <Badge className={`capitalize ${statusColors[job.status]} transition-colors duration-200 font-poppins`}>
                                                            <StatusIcon className="h-3 w-3 mr-1" />
                                                            {job.status.replace('-', ' ')}
                                                        </Badge>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="col-span-1 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleOpenEditDialog(job)}
                                                            className="h-8 px-2 border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleOpenDeleteDialog(job)}
                                                            className="h-8 px-2 border-slate-300 hover:border-red-400 hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Enhanced Add/Edit Dialog - Updated to match purchasing.tsx style */}
                <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) { 
                        setIsAddDialogOpen(false); 
                        setIsEditDialogOpen(false); 
                        resetForm(); 
                    }
                }}>
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
                                {editingJob ? 'Edit Service Job' : 'Create Service Job'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-600 font-poppins">
                                {editingJob ? `Update details for job #${editingJob.job_id.substring(0, 8)}` : 'Fill in the details for a new service job.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="customer" className="text-slate-700 font-medium font-poppins">Customer</Label>
                                <Select value={customerId} onValueChange={setCustomerId}>
                                    <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                        <SelectValue placeholder="Select customer reference..."/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ANONYMOUS_CUSTOMER_ID} className="font-poppins">Walk-in Customer</SelectItem>
                                        {customers.filter(c => c.user_id !== ANONYMOUS_CUSTOMER_ID).map(c => (
                                            <SelectItem key={c.user_id} value={c.user_id} className="font-poppins">{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehicle-type" className="text-slate-700 font-medium font-poppins">Vehicle Type</Label>
                                <Select value={vehicleTypeId || undefined} onValueChange={(val) => setVehicleTypeId(val)}>
                                    <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                        <SelectValue placeholder="Select vehicle type..."/>
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
                                    <Label htmlFor="job-status" className="text-slate-700 font-medium font-poppins">Status</Label>
                                    <Select value={jobStatus} onValueChange={val => setJobStatus(val as any)}>
                                        <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending" className="font-poppins">Pending</SelectItem>
                                            <SelectItem value="in-progress" className="font-poppins">In Progress</SelectItem>
                                            <SelectItem value="completed" className="font-poppins">Completed</SelectItem>
                                            <SelectItem value="cancelled" className="font-poppins">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="service-fee" className="text-slate-700 font-medium font-poppins">Service Fee (₱)</Label>
                                    <Input 
                                        id="service-fee"
                                        type="number" 
                                        value={serviceFee} 
                                        onChange={e => setServiceFee(e.target.value)} 
                                        placeholder="0.00"
                                        className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="job-description" className="text-slate-700 font-medium font-poppins">Job Description *</Label>
                                <Textarea 
                                    id="job-description"
                                    value={jobDescription} 
                                    onChange={e => setJobDescription(e.target.value)} 
                                    placeholder="e.g., Tire rotation and balancing"
                                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="remarks" className="text-slate-700 font-medium font-poppins">Remarks</Label>
                                <Textarea 
                                    id="remarks"
                                    value={remarks} 
                                    onChange={e => setRemarks(e.target.value)} 
                                    placeholder="Customer notes or internal remarks..."
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
                            <Button onClick={handleSubmit} disabled={isLoading || isDataLoading} className={buttonStyles.primary}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {editingJob ? 'Update Job' : 'Create Job'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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