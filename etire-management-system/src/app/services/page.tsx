"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, AlertTriangle } from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useFormFieldPersistence } from '@/hooks/useFormPersistence';
import { FormPersistenceIndicator } from '@/components/FormPersistenceIndicator';

// Interfaces based on the user's schema
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

const columns = [
  { key: 'job_description', header: 'Description' },
  { key: 'vehicle_type', header: 'Vehicle Type' },
  { key: 'user_name', header: 'Employee' },
  { key: 'job_date', header: 'Date' },
  { key: 'service_fee', header: 'Fee (₱)' },
  { key: 'status', header: 'Status' },
];

const ANONYMOUS_CUSTOMER_ID = "anonymous_customer";

export default function ServiceManagementPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [serviceJobs, setServiceJobs] = useState<ServiceJob[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<ServiceJob | null>(null);

    // Form state for Add/Edit dialog with persistence
    const { value: customerId, setValue: setCustomerId } = useFormFieldPersistence('service-job-form', 'customerId', ANONYMOUS_CUSTOMER_ID);
    const { value: jobDescription, setValue: setJobDescription } = useFormFieldPersistence('service-job-form', 'jobDescription', '');
    const { value: remarks, setValue: setRemarks } = useFormFieldPersistence('service-job-form', 'remarks', '');
    const { value: jobStatus, setValue: setJobStatus } = useFormFieldPersistence('service-job-form', 'jobStatus', 'pending');
    const { value: serviceFee, setValue: setServiceFee } = useFormFieldPersistence('service-job-form', 'serviceFee', '0');
    const { value: vehicleTypeId, setValue: setVehicleTypeId } = useFormFieldPersistence('service-job-form', 'vehicleTypeId', '');

    const fetchJobs = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/services/api?type=all');
            const body = await res.json();
            
            if (!res.ok) {
                throw new Error(body.error?.message || 'Failed to fetch service jobs');
            }
            
            setServiceJobs(body || []);
            setFetchError(null);
        } catch (error: any) {
            console.error('Service jobs fetch error:', error);
            setFetchError(error.message);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const fetchCustomers = useCallback(async () => {
        if (!supabase) return;
        setIsDataLoading(true);
        try {
            const { data, error } = await supabase.from('user').select('user_id, name');
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
        } finally {
            setIsDataLoading(false);
        }
    }, [toast]);

    const fetchVehicleTypes = useCallback(async () => {
        try {
            const res = await fetch('/services/api?type=vehicle-types');
            const body = await res.json();
            
            if (!res.ok) {
                throw new Error(body.error?.message || 'Failed to fetch vehicle types');
            }
            
            setVehicleTypes(body || []);
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

    const handleSubmit = async () => {
        if (!authUser) {
            toast({ title: 'Error', description: 'You must be logged in to create a job.', variant: 'destructive'});
            return;
        }
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

            if (editingJob) {
                const res = await fetch('/services/api', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...jobData, job_id: editingJob.job_id }),
                });
                
                const body = await res.json();
                
                console.log('Update response:', res.status, body);
                
                if (!res.ok) {
                    throw new Error(body.error?.message || 'Failed to update job');
                }
                
                toast({ title: 'Success', description: 'Service job updated.' });
                setIsEditDialogOpen(false);
                resetForm();
                await fetchJobs();
            } else {
                const res = await fetch('/services/api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jobData),
                });
                
                const body = await res.json();
                
                console.log('Create response:', res.status, body);
                
                if (!res.ok) {
                    throw new Error(body.error?.message || 'Failed to create job');
                }
                
                toast({ title: 'Success', description: 'New service job created.' });
                setIsAddDialogOpen(false);
                resetForm();
                await fetchJobs();
            }
        } catch (error: any) {
            console.error('Submit error:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (jobId: string) => {
        if (confirm('Are you sure you want to delete this job?')) {
            setIsLoading(true);
            try {
                const res = await fetch(`/services/api?job_id=${jobId}`, {
                    method: 'DELETE',
                });
                const body = await res.json();
                if (!res.ok) {
                    throw new Error(body.error?.message || 'Failed to delete job');
                }
                toast({ title: 'Success', description: 'Service job deleted.' });
                fetchJobs();
            } catch (error: any) {
                toast({ title: 'Error', description: error.message, variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const renderCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'user_name') {
            return item.user ? item.user.name : 'Unknown Employee';
        }
        if (columnKey === 'vehicle_type') {
            if (!item.vehicle_type) return <Badge variant="outline">N/A</Badge>;
            const vehicleName = item.vehicle_type.name;
            const color = vehicleName === 'car' ? 'bg-blue-100 text-blue-700' :
                         vehicleName === 'motor' ? 'bg-green-100 text-green-700' :
                         'bg-orange-100 text-orange-700';
            return <Badge className={`capitalize ${color}`}>{vehicleName}</Badge>;
        }
        if (columnKey === 'job_date') {
            return new Date(value).toLocaleDateString();
        }
        if (columnKey === 'service_fee') {
            return `₱${Number(value).toFixed(2)}`;
        }
        if (columnKey === 'status') {
            const status = value as ServiceJob['status'];
            let color = '';
            if(status === 'pending') color='bg-yellow-100 text-yellow-700';
            if(status === 'in-progress') color='bg-blue-100 text-blue-700';
            if(status === 'completed') color='bg-green-100 text-green-700';
            if(status === 'cancelled') color='bg-red-100 text-red-700';
            return <Badge className={`capitalize ${color}`}>{status.replace('-', ' ')}</Badge>
        }
        return String(value);
    };

    if (fetchError && fetchError.includes('infinite recursion')) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PageHeader title="Service Management" description="Track and manage all service and repair jobs."/>
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
        );
    }
    
    if (fetchError) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PageHeader title="Service Management" description="Track and manage all service and repair jobs."/>
                 <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Database Error</AlertTitle>
                    <AlertDescription>
                        {fetchError}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageHeader title="Service Management" description="Track and manage all service and repair jobs.">
                <Button size="sm" onClick={handleOpenAddDialog} disabled={isLoading || isDataLoading}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Service Job
                </Button>
            </PageHeader>
    
            <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) { setIsAddDialogOpen(false); setIsEditDialogOpen(false); resetForm(); }
            }}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingJob ? 'Edit Service Job' : 'Create Service Job'}</DialogTitle>
                        <DialogDescription>{editingJob ? `Update details for job #${editingJob.job_id.substring(0, 8)}` : 'Fill in the details for a new service job.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto">
                        <FormPersistenceIndicator formId="service-job-form" />
                        <div className="space-y-2">
                            <Label>Customer</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger><SelectValue placeholder="Select customer reference..."/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ANONYMOUS_CUSTOMER_ID}>Walk-in Customer</SelectItem>
                                    {customers.filter(c => c.user_id !== ANONYMOUS_CUSTOMER_ID).map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Vehicle Type</Label>
                            <Select value={vehicleTypeId || undefined} onValueChange={(val) => setVehicleTypeId(val)}>
                                <SelectTrigger><SelectValue placeholder="Select vehicle type..."/></SelectTrigger>
                                <SelectContent>
                                    {vehicleTypes.map(vt => (
                                        <SelectItem key={vt.vehicle_type_id} value={vt.vehicle_type_id}>
                                            {vt.name.charAt(0).toUpperCase() + vt.name.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {vehicleTypeId && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setVehicleTypeId('')}
                                    className="text-xs"
                                >
                                    Clear selection
                                </Button>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={jobStatus} onValueChange={val => setJobStatus(val as any)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label>Job Description</Label>
                            <Textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="e.g., Tire rotation and balancing"/>
                        </div>
                        <div className="space-y-2">
                            <Label>Service Fee</Label>
                            <Input type="number" value={serviceFee} onChange={e => setServiceFee(e.target.value)} placeholder="0.00"/>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label>Remarks</Label>
                            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Customer notes or internal remarks..."/>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSubmit} disabled={isLoading || isDataLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save Job</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
    
            {(isLoading && serviceJobs.length === 0) ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <DataTableWrapper 
                    title="Service Jobs"
                    columns={columns}
                    data={serviceJobs.map(job => ({ ...job, id: job.job_id }))}
                    onAddNew={handleOpenAddDialog}
                    onEdit={handleOpenEditDialog}
                    onDelete={handleDelete}
                    renderCell={renderCell}
                />
            )}
        </div>
    );
}