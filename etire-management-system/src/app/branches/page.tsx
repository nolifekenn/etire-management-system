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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, PlusCircle, AlertTriangle, Building2, Users, MapPin, Phone, Mail, 
  RefreshCw, Clock, Edit, Trash2, Search, Filter, X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Branch, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg"
};

export default function EnhancedBranchesPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [managers, setManagers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
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

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [managerFilter, setManagerFilter] = useState('all');

    useEffect(() => {
        setMounted(true);
    }, []);

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
        setLastUpdated(new Date());
    }, []);

    const fetchManagers = useCallback(async () => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from('user')
            .select('user_id, name')
            .in('role', [1, 2])
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

    // Filter branches based on search and filters
    const filteredBranches = branches.filter(branch => {
        const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            branch.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            branch.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            branch.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'active' && branch.is_active) ||
                            (statusFilter === 'inactive' && !branch.is_active);

        const matchesManager = managerFilter === 'all' || 
                             branch.manager_id === managerFilter;

        return matchesSearch && matchesStatus && matchesManager;
    });

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

    const handleRefresh = () => {
        fetchBranches();
        fetchManagers();
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
            manager_id: managerId && managerId !== 'none' ? managerId : null,
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

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setManagerFilter('all');
    };

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
                
                {/* Header Section - Consistent Size */}
                <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>
                        
                        <div className="relative z-10 flex-1">
                            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl font-poppins tracking-tight">
                                Branch Management
                            </h1>
                            <div className="flex items-center gap-6 text-white/90">
                                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium">
                                    <Building2 className="h-6 w-6 opacity-90" />
                                    Manage your business branches and locations
                                </p>
                                {lastUpdated && (
                                    <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                                        <Clock className="w-5 h-5" />
                                        Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="relative z-10">
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
                </div>

                {/* Modal-style Table Card */}
                <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                    <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-purple-50/50 border-b border-slate-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900">Branch Locations</CardTitle>
                                <CardDescription className="text-slate-600">
                                    {filteredBranches.length} of {branches.length} branch{filteredBranches.length !== 1 ? 'es' : ''} shown
                                </CardDescription>
                            </div>
                            <Button 
                                onClick={handleOpenAddDialog}
                                className={buttonStyles.primary}
                            >
                                <PlusCircle className="h-5 w-5 mr-2" />
                                Add New Branch
                            </Button>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 rounded-xl border border-slate-200/50">
                            <div className="flex-1">
                                <Label htmlFor="search" className="text-sm font-medium text-slate-700 mb-2 block">Search Branches</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="search"
                                        placeholder="Search by name, address, phone, or email..." 
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
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:w-48">
                                <Label htmlFor="manager-filter" className="text-sm font-medium text-slate-700 mb-2 block">Manager</Label>
                                <Select value={managerFilter} onValueChange={setManagerFilter}>
                                    <SelectTrigger className="border-slate-300 focus:border-indigo-400 bg-white/80">
                                        <SelectValue placeholder="All managers" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Managers</SelectItem>
                                        {managers.map(manager => (
                                            <SelectItem key={manager.user_id} value={manager.user_id}>
                                                {manager.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {(searchTerm || statusFilter !== 'all' || managerFilter !== 'all') && (
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
                        {fetchError && (
                            <Alert variant="destructive" className="m-6">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{fetchError}</AlertDescription>
                            </Alert>
                        )}

                        {(isLoading && branches.length === 0) ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/80 border-b border-slate-200/50 text-sm font-semibold text-slate-700">
                                    <div className="col-span-4">Branch Information</div>
                                    <div className="col-span-3">Contact Details</div>
                                    <div className="col-span-3">Management</div>
                                    <div className="col-span-2 text-center">Actions</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-slate-200/50">
                                    {filteredBranches.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                            <Building2 className="h-12 w-12 mb-4 text-slate-300" />
                                            <p className="text-lg font-medium">No branches found</p>
                                            <p className="text-sm mt-1">
                                                {branches.length === 0 ? 'No branches created yet' : 'Try adjusting your filters'}
                                            </p>
                                        </div>
                                    ) : (
                                        filteredBranches.map((branch) => {
                                            const managerName = branch.manager?.name || branch.user?.name;
                                            return (
                                                <div key={branch.branch_id} className="grid grid-cols-12 gap-4 px-6 py-6 hover:bg-slate-50/50 transition-colors duration-200 group">
                                                    {/* Branch Information */}
                                                    <div className="col-span-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                                                                <Building2 className="h-5 w-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-900 text-lg">{branch.name}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <MapPin className="h-4 w-4 text-slate-400" />
                                                                    <span className="text-sm text-slate-600">
                                                                        {branch.address || 'No address provided'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Contact Details */}
                                                    <div className="col-span-3 space-y-2">
                                                        {branch.phone && (
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="h-4 w-4 text-slate-400" />
                                                                <span className="text-sm text-slate-700">{branch.phone}</span>
                                                            </div>
                                                        )}
                                                        {branch.email && (
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="h-4 w-4 text-slate-400" />
                                                                <span className="text-sm text-slate-700">{branch.email}</span>
                                                            </div>
                                                        )}
                                                        {!branch.phone && !branch.email && (
                                                            <span className="text-sm text-slate-400">No contact details</span>
                                                        )}
                                                    </div>

                                                    {/* Management */}
                                                    <div className="col-span-3 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4 text-slate-400" />
                                                            <span className="text-sm text-slate-700">
                                                                {managerName || 'No manager assigned'}
                                                            </span>
                                                        </div>
                                                        <Badge 
                                                            variant={branch.is_active ? 'default' : 'secondary'} 
                                                            className={`${branch.is_active 
                                                                ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                                                                : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                                                            } transition-colors duration-200`}
                                                        >
                                                            {branch.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="col-span-2 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleOpenEditDialog(branch)}
                                                            className="h-8 px-3 border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleOpenDeleteDialog(branch)}
                                                            className="h-8 px-3 border-slate-300 hover:border-red-400 hover:text-red-600"
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
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-slate-50 to-indigo-50/30 border-0 shadow-2xl mt-20">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-600">
                                {editingBranch ? `Update details for ${editingBranch.name}.` : 'Enter the details for the new branch location.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-700 font-medium">Branch Name *</Label>
                                <Input 
                                    id="name" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    placeholder="Main Branch"
                                    className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address" className="text-slate-700 font-medium">Address</Label>
                                <Textarea 
                                    id="address" 
                                    value={address} 
                                    onChange={(e) => setAddress(e.target.value)} 
                                    placeholder="123 Main Street, City, State"
                                    className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-slate-700 font-medium">Phone</Label>
                                    <Input 
                                        id="phone" 
                                        value={phone} 
                                        onChange={(e) => setPhone(e.target.value)} 
                                        placeholder="+1-555-0101"
                                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                                    <Input 
                                        id="email" 
                                        type="email"
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        placeholder="branch@company.com"
                                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="manager" className="text-slate-700 font-medium">Manager</Label>
                                <Select value={managerId} onValueChange={setManagerId}>
                                    <SelectTrigger className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80">
                                        <SelectValue placeholder="Select a manager" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Manager</SelectItem>
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
                                <Label htmlFor="is_active" className="text-slate-700 font-medium">Active Branch</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className={buttonStyles.secondary}>
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button onClick={handleSubmit} disabled={isLoading} className={buttonStyles.primary}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingBranch ? 'Save Changes' : 'Create Branch'}
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
                                Are you sure you want to delete the branch "{deletingBranch?.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className={buttonStyles.secondary}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleDeleteBranch} 
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
            `}</style>
        </div>
    );
}