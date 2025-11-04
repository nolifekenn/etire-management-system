"use client";

import { useState, useEffect, useCallback } from 'react';
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
  TrendingUp, DollarSign, Package, ArrowUpDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

// Stats Overview Component
const ServiceStats = ({ serviceJobs }: { serviceJobs: ServiceJob[] }) => {
  const totalJobs = serviceJobs.length;
  const pendingJobs = serviceJobs.filter(job => job.status === 'pending').length;
  const inProgressJobs = serviceJobs.filter(job => job.status === 'in-progress').length;
  const completedJobs = serviceJobs.filter(job => job.status === 'completed').length;
  const totalRevenue = serviceJobs.reduce((acc, job) => acc + job.service_fee, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Jobs - Purple to Indigo */}
      <div className={`bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium">Total Jobs</p>
            <p className="text-3xl font-bold mt-2">{totalJobs}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Package className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-purple-100 text-sm">
          <TrendingUp className="h-4 w-4" />
          <span>All service jobs</span>
        </div>
      </div>

      {/* Pending Jobs - Yellow to Orange */}
      <div className={`bg-gradient-to-br from-yellow-500 via-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-100 text-sm font-medium">Pending Jobs</p>
            <p className="text-3xl font-bold mt-2">{pendingJobs}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Clock className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-yellow-100 text-sm">
          <Clock className="h-4 w-4" />
          <span>Awaiting service</span>
        </div>
      </div>

      {/* In Progress - Blue to Sky Blue */}
      <div className={`bg-gradient-to-br from-blue-500 via-blue-600 to-sky-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">In Progress</p>
            <p className="text-3xl font-bold mt-2">{inProgressJobs}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Wrench className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-blue-100 text-sm">
          <Wrench className="h-4 w-4" />
          <span>Currently being serviced</span>
        </div>
      </div>

      {/* Total Revenue - Green to Emerald */}
      <div className={`bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm font-medium">Total Revenue</p>
            <p className="text-3xl font-bold mt-2">₱{(totalRevenue / 1000).toFixed(0)}K</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-green-100 text-sm">
          <TrendingUp className="h-4 w-4" />
          <span>This month</span>
        </div>
      </div>
    </div>
  );
};

// Quick Actions Component
const QuickActions = ({ onAddJob }: { onAddJob: () => void }) => {
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
      icon: Package,
      onClick: () => {},
      color: "from-blue-500 to-sky-600"
    },
    {
      label: "View Calendar",
      description: "View service schedule",
      icon: Calendar,
      onClick: () => {},
      color: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {actions.map((action, index) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`bg-gradient-to-r ${action.color} rounded-xl p-4 text-white text-left shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group`}
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
    const filteredJobs = serviceJobs.filter(job => {
        const matchesSearch = job.job_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            job.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            job.user?.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;

        const matchesVehicleType = vehicleTypeFilter === 'all' || 
                                 job.vehicle_type_id === vehicleTypeFilter;

        return matchesSearch && matchesStatus && matchesVehicleType;
    });

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
            <div className="absolute top-0 left-0 w-full h-80 rounded-b-[40px] overflow-hidden">
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

            <div className="absolute top-80 left-0 w-full h-full bg-indigo-50/10">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-100/15 to-indigo-50/10"></div>
            </div>

            <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
                
                {/* Header Section */}
                <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>
                        
                        <div className="relative z-10 flex-1">
                            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl font-poppins tracking-tight">
                                Service Management
                            </h1>
                            <div className="flex items-center gap-6 text-white/90">
                                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium">
                                    <Wrench className="h-6 w-6 opacity-90" />
                                    Track and manage all service and repair jobs
                                </p>
                                {lastUpdated && (
                                    <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                                        <Clock className="w-5 h-5" />
                                        Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </div>
                                )}
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

                {/* Stats Overview */}
                <ServiceStats serviceJobs={serviceJobs} />

                {/* Quick Actions */}
                <QuickActions onAddJob={handleOpenAddDialog} />

                {/* Main Table Card */}
                <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                    <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-purple-50/50 border-b border-slate-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900">Service Jobs</CardTitle>
                                <CardDescription className="text-slate-600">
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
                                <Label htmlFor="search-jobs" className="text-sm font-medium text-slate-700 mb-2 block">Search Jobs</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="search-jobs"
                                        placeholder="Search by description, remarks, or employee..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border-slate-300 focus:border-indigo-400 bg-white/80"
                                    />
                                    {searchTerm && (
                                        <button 
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="sm:w-48">
                                <Label htmlFor="status-filter" className="text-sm font-medium text-slate-700 mb-2 block">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="border-slate-300 focus:border-indigo-400 bg-white/80">
                                        <SelectValue placeholder="All statuses" />
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

                            <div className="sm:w-48">
                                <Label htmlFor="vehicle-type-filter" className="text-sm font-medium text-slate-700 mb-2 block">Vehicle Type</Label>
                                <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                                    <SelectTrigger className="border-slate-300 focus:border-indigo-400 bg-white/80">
                                        <SelectValue placeholder="All types" />
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

                            {(searchTerm || statusFilter !== 'all' || vehicleTypeFilter !== 'all') && (
                                <div className="flex items-end">
                                    <Button 
                                        onClick={clearFilters}
                                        variant="outline" 
                                        className="h-10 border-slate-300 text-slate-600 hover:text-slate-700"
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
                            <Alert variant="destructive" className="m-6">
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
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/80 border-b border-slate-200/50 text-sm font-semibold text-slate-700">
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
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
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
                                                                <p className="font-semibold text-slate-900 text-lg">{job.job_description}</p>
                                                                {job.remarks && (
                                                                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
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
                                                            <span className="text-sm text-slate-700 capitalize">
                                                                {job.vehicle_type?.name || 'Not specified'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Employee */}
                                                    <div className="col-span-2">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4 text-slate-400" />
                                                            <span className="text-sm text-slate-700">
                                                                {job.user?.name || 'Unknown Employee'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Date & Fee */}
                                                    <div className="col-span-2 space-y-1">
                                                        <p className="text-sm text-slate-700">
                                                            {new Date(job.job_date).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-sm font-semibold text-green-600">
                                                            ₱{job.service_fee.toFixed(2)}
                                                        </p>
                                                    </div>

                                                    {/* Status */}
                                                    <div className="col-span-1">
                                                        <Badge className={`capitalize ${statusColors[job.status]} transition-colors duration-200`}>
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

                {/* Enhanced Add/Edit Dialog */}
                <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) { 
                        setIsAddDialogOpen(false); 
                        setIsEditDialogOpen(false); 
                        resetForm(); 
                    }
                }}>
                    <DialogContent className="sm:max-w-xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border-0 shadow-2xl mt-20">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                {editingJob ? 'Edit Service Job' : 'Create Service Job'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-600">
                                {editingJob ? `Update details for job #${editingJob.job_id.substring(0, 8)}` : 'Fill in the details for a new service job.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Customer</Label>
                                <Select value={customerId} onValueChange={setCustomerId}>
                                    <SelectTrigger className="border-slate-300 focus:border-indigo-400 bg-white/80">
                                        <SelectValue placeholder="Select customer reference..."/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ANONYMOUS_CUSTOMER_ID}>Walk-in Customer</SelectItem>
                                        {customers.filter(c => c.user_id !== ANONYMOUS_CUSTOMER_ID).map(c => (
                                            <SelectItem key={c.user_id} value={c.user_id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Vehicle Type</Label>
                                <Select value={vehicleTypeId || undefined} onValueChange={(val) => setVehicleTypeId(val)}>
                                    <SelectTrigger className="border-slate-300 focus:border-indigo-400 bg-white/80">
                                        <SelectValue placeholder="Select vehicle type..."/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicleTypes.map(vt => (
                                            <SelectItem key={vt.vehicle_type_id} value={vt.vehicle_type_id}>
                                                {vt.name.charAt(0).toUpperCase() + vt.name.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Status</Label>
                                <Select value={jobStatus} onValueChange={val => setJobStatus(val as any)}>
                                    <SelectTrigger className="border-slate-300 focus:border-indigo-400 bg-white/80">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in-progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Service Fee (₱)</Label>
                                <Input 
                                    type="number" 
                                    value={serviceFee} 
                                    onChange={e => setServiceFee(e.target.value)} 
                                    placeholder="0.00"
                                    className="border-slate-300 focus:border-indigo-400 bg-white/80"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-slate-700 font-medium">Job Description *</Label>
                                <Textarea 
                                    value={jobDescription} 
                                    onChange={e => setJobDescription(e.target.value)} 
                                    placeholder="e.g., Tire rotation and balancing"
                                    className="border-slate-300 focus:border-indigo-400 bg-white/80"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-slate-700 font-medium">Remarks</Label>
                                <Textarea 
                                    value={remarks} 
                                    onChange={e => setRemarks(e.target.value)} 
                                    placeholder="Customer notes or internal remarks..."
                                    className="border-slate-300 focus:border-indigo-400 bg-white/80"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className={buttonStyles.secondary}>
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
                    <AlertDialogContent className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border-0 shadow-2xl mt-20">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-slate-900">Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600">
                                Are you sure you want to delete the service job "{deletingJob?.job_description}"? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className={buttonStyles.secondary}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleDelete} 
                                disabled={isLoading}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-red-600 active:scale-95"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
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

                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
}