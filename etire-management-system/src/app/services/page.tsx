
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
interface ServiceJob {
    job_id: string;
    user_id: string;
    job_description: string;
    job_date: string;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
    service_fee: number;
    remarks: string | null;
    // Joined data
    user?: { name: string } | null;
}

interface Customer {
    user_id: string;
    name: string;
}

const columns = [
  { key: 'job_description', header: 'Description' },
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
            // Since customers cannot register, we only need to fetch employees/admins
            // For service jobs, we'll use the current employee's ID
            const { data, error } = await supabase.from('user').select('user_id, name');
            if (error) throw error;
            
            // Set customers to just the current user and a walk-in option
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

    useEffect(() => {
        fetchJobs();
        fetchCustomers();
    }, [fetchJobs, fetchCustomers]);

    const resetForm = () => {
        setCustomerId(ANONYMOUS_CUSTOMER_ID);
        setJobDescription('');
        setRemarks('');
        setJobStatus('pending');
        setServiceFee('0');
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
        setIsEditDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!authUser) return;
        if (!jobDescription) {
            toast({ title: 'Validation Error', description: 'Job description is required.', variant: 'destructive'});
            return;
        }

        setIsLoading(true);
        
        try {
            // In this system, service jobs are always associated with the employee who creates them
            // The customer selection is just for reference/notes
            const customerName = customerId === ANONYMOUS_CUSTOMER_ID ? 'Walk-in Customer' : 
                                customers.find(c => c.user_id === customerId)?.name || 'Unknown Customer';
            
            const jobData = {
                user_id: authUser.user_id, // Always use the current employee's ID
                job_description: jobDescription,
                status: jobStatus,
                service_fee: parseFloat(serviceFee),
                remarks: `Customer: ${customerName}${remarks ? '\n\nRemarks: ' + remarks : ''}`,
            };

            if (editingJob) {
                // Update existing job
                const res = await fetch('/services/api', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...jobData, job_id: editingJob.job_id }),
                });
                
                const body = await res.json();
                
                if (!res.ok) {
                    throw new Error(body.error?.message || 'Failed to update job');
                }
                
                toast({ title: 'Success', description: 'Service job updated.' });
                setIsEditDialogOpen(false);
                fetchJobs();
            } else {
                // Create new job
                const res = await fetch('/services/api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jobData),
                });
                
                const body = await res.json();
                
                if (!res.ok) {
                    throw new Error(body.error?.message || 'Failed to create job');
                }
                
                toast({ title: 'Success', description: 'New service job created.' });
                setIsAddDialogOpen(false);
                fetchJobs();
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'user_name') {
            // Since service jobs are now associated with employees, show the employee name
            return item.user ? item.user.name : 'Unknown Employee';
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
            return <Badge className={`capitalize ${color}`}>{status.replace('_', ' ')}</Badge>
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
                            <Label>Customer Reference</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger><SelectValue placeholder="Select customer reference..."/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ANONYMOUS_CUSTOMER_ID}>Walk-in Customer</SelectItem>
                                    {customers.filter(c => c.user_id !== ANONYMOUS_CUSTOMER_ID).map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
                    renderCell={renderCell}
                />
            )}
        </div>
    );
}