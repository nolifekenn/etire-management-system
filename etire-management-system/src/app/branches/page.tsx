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
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, AlertTriangle, Building2, Users, MapPin, Phone, Mail } from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Branch, User } from '@/lib/types';

const columns = [
  { key: 'name', header: 'Branch Name' },
  { key: 'address', header: 'Address' },
  { key: 'phone', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'manager_name', header: 'Manager' },
  { key: 'is_active', header: 'Status' },
];

export default function BranchesPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [managers, setManagers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);

    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [managerId, setManagerId] = useState('');
    const [isActive, setIsActive] = useState(true);

    const fetchBranches = useCallback(async () => {
        if (!supabase) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('branch')
            .select(`
                *,
                user:manager_id(user_id, name)
            `)
            .order('name', { ascending: true });
    
        if (error) {
            setFetchError(`Could not fetch branches: ${error.message}`);
            setBranches([]);
        } else {
            setBranches(data as any);
            setFetchError(null);
        }
        setIsLoading(false);
    }, []);

    const fetchManagers = useCallback(async () => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from('user') // Changed from 'users' to 'user'
            .select('user_id, name')
            .in('role', [1, 2]) // Staff and Admin roles
            .order('name', { ascending: true });
    
        if (error) {
            console.error('Error fetching managers:', error);
            setManagers([]);
        } else {
            setManagers(data as User[]);
        }
    }, []);

    useEffect(() => {
        fetchBranches();
        fetchManagers();
    }, [fetchBranches, fetchManagers]);

    const resetForm = () => {
        setName('');
        setAddress('');
        setPhone('');
        setEmail('');
        setManagerId('');
        setIsActive(true);
        setEditingBranch(null);
    };

    const handleOpenAddDialog = () => {
        resetForm();
        setIsAddDialogOpen(true);
    };

    const handleOpenEditDialog = (branch: Branch) => {
        setEditingBranch(branch);
        setName(branch.name);
        setAddress(branch.address || '');
        setPhone(branch.phone || '');
        setEmail(branch.email || '');
        setManagerId(branch.manager_id || '');
        setIsActive(branch.is_active);
        setIsEditDialogOpen(true);
    };

    const handleOpenDeleteDialog = (branch: Branch) => {
        setDeletingBranch(branch);
        setIsDeleteConfirmationOpen(true);
    };

    const handleSubmit = async () => {
        if (!supabase || !authUser) return;
        if (!name) {
            toast({ title: "Validation Error", description: "Branch name is required.", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        const branchData = {
            name,
            address: address || null,
            phone: phone || null,
            email: email || null,
            manager_id: managerId && managerId !== 'none' ? managerId : null, // Handle "none" value
            is_active: isActive,
        };

        let error;
        if (editingBranch) {
            const { error: updateError } = await supabase
                .from('branch')
                .update(branchData)
                .eq('branch_id', editingBranch.branch_id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('branch')
                .insert([branchData]);
            error = insertError;
        }

        setIsLoading(false);

        if (error) {
            toast({ title: "Save Error", description: `Could not save branch: ${error.message}`, variant: "destructive" });
        } else {
            toast({ title: "Success", description: `Branch ${editingBranch ? 'updated' : 'created'} successfully.` });
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            fetchBranches();
        }
    };

    const handleDeleteBranch = async () => {
        if (!deletingBranch || !supabase) return;
        setIsLoading(true);
        const { error } = await supabase
            .from('branch')
            .delete()
            .eq('branch_id', deletingBranch.branch_id);
        setIsLoading(false);

        if (error) {
            toast({ title: "Delete Error", description: `Could not delete branch: ${error.message}`, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Branch deleted successfully." });
            setIsDeleteConfirmationOpen(false);
            fetchBranches();
        }
    };

    const renderCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'manager_name') {
            // Check both 'user' (from API) and 'users' (from direct Supabase) for compatibility
            return item.manager?.name || item.user?.name || 'No Manager';
        }
        if (columnKey === 'is_active') {
            return (
                <Badge variant={value ? 'default' : 'secondary'}>
                    {value ? 'Active' : 'Inactive'}
                </Badge>
            );
        }
        if (columnKey === 'address' && !value) {
            return <span className="text-muted-foreground">No address</span>;
        }
        if (columnKey === 'phone' && !value) {
            return <span className="text-muted-foreground">No phone</span>;
        }
        if (columnKey === 'email' && !value) {
            return <span className="text-muted-foreground">No email</span>;
        }
        return String(value || '');
    };

    if (fetchError) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PageHeader title="Branch Management" description="Manage your business branches and locations." />
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Database Error</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageHeader 
                title="Branch Management" 
                description="Manage your business branches and locations."
            >
                <Button size="sm" onClick={handleOpenAddDialog} disabled={isLoading}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Branch
                </Button>
            </PageHeader>

            <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setIsAddDialogOpen(false);
                    setIsEditDialogOpen(false);
                    resetForm();
                }
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
                        <DialogDescription>
                            {editingBranch ? `Update details for ${editingBranch.name}.` : 'Enter the details for the new branch.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Branch Name *</Label>
                            <Input 
                                id="name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder="Main Branch"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea 
                                id="address" 
                                value={address} 
                                onChange={(e) => setAddress(e.target.value)} 
                                placeholder="123 Main Street, City, State"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input 
                                    id="phone" 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    placeholder="+1-555-0101"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input 
                                    id="email" 
                                    type="email"
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    placeholder="branch@company.com"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="manager">Manager</Label>
                            <Select value={managerId} onValueChange={setManagerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a manager" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Manager</SelectItem> {/* Changed from empty string to "none" */}
                                    {managers.map(manager => (
                                        <SelectItem key={manager.user_id} value={manager.user_id}>
                                            {manager.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch 
                                id="is_active" 
                                checked={isActive} 
                                onCheckedChange={setIsActive}
                            />
                            <Label htmlFor="is_active">Active Branch</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingBranch ? 'Save Changes' : 'Create Branch'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the branch "{deletingBranch?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteBranch} 
                            disabled={isLoading} 
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {(isLoading && branches.length === 0) ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <DataTableWrapper
                    title="Branches"
                    columns={columns}
                    data={branches.map(branch => ({ ...branch, id: branch.branch_id }))}
                    onAddNew={handleOpenAddDialog}
                    onEdit={handleOpenEditDialog}
                    onDelete={handleOpenDeleteDialog}
                    renderCell={renderCell}
                />
            )}

        </div>
    );
}
