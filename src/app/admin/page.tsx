"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { supabaseUntyped as supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, UserPlus, AlertTriangle, Eye, EyeOff, Shield, Users, RefreshCw,
  Search, X, Filter, Edit, Trash2, CheckCircle, KeyRound, ShieldCheck
} from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { User, UserRole, Branch } from '@/lib/types';

// Design system constants
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg active:scale-95",
  actionEdit: "h-8 w-8 p-0 rounded-lg bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-400",
  actionDelete: "h-8 w-8 p-0 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/50 dark:hover:text-red-400",
  actionRole: "h-8 w-8 p-0 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50",
};

export default function AdminPage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading, refreshUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Dialog States
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [roleUser, setRoleUser] = useState<User | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [branchId, setBranchId] = useState<string>('unassigned_dummy_val');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const result = await response.json();

      if (!response.ok) {
        setFetchError(result.error || 'Could not fetch users');
        setUsers([]);
      } else {
        setUsers(result.data as User[]);
        setFetchError(null);
      }
    } catch (err: any) {
      setFetchError(`Could not fetch users: ${err.message}`);
      setUsers([]);
    }
    setIsLoading(false);
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('branch')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (!error && data) {
        setBranches(data);
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin' || user?.role === 'branch_manager') {
      fetchUsers();
      fetchBranches();
    }
  }, [fetchUsers, fetchBranches, user]);

  const resetForm = () => {
    setName('');
    setUsername('');
    setPassword('');
    setRole('staff');
    setBranchId('unassigned_dummy_val');
    setEditingUser(null);
    setRoleUser(null);
    setShowPassword(false);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddUserDialogOpen(true);
  };

  const handleOpenEditDialog = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setName(userToEdit.name);
    setUsername(userToEdit.username);
    setPassword('');
    setBranchId(userToEdit.branch_id || 'unassigned_dummy_val');
    setIsEditUserDialogOpen(true);
  };

  const handleOpenRoleDialog = (userToMod: User) => {
    setRoleUser(userToMod);
    setRole(userToMod.role);
    setIsRoleDialogOpen(true);
  };

  const handleOpenDeleteDialog = (userToDelete: User) => {
    setDeletingUser(userToDelete);
    setIsDeleteConfirmationOpen(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const columns = useMemo(() => [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'username', header: 'Username', sortable: true },
    { key: 'password_display', header: 'Password', sortable: false, render: () => <span className="text-slate-400 text-xs">••••••••</span> },
    {
      key: 'role_display',
      header: 'Role',
      sortable: true,
      render: (_: any, item: any) => {
        const role = (item as User).role;
        const style = role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-200' :
          role === 'branch_manager' ? 'bg-purple-50 text-purple-700 border-purple-200' :
            role === 'cashier' ? 'bg-green-50 text-green-700 border-green-200' :
              'bg-blue-50 text-blue-700 border-blue-200';
        const label = role.replace('_', ' ').toUpperCase();
        return <Badge variant="outline" className={style}>{label}</Badge>;
      }
    },
    {
      key: 'branch_display',
      header: 'Branch',
      sortable: false,
      render: (_: any, item: User) => {
        const branch = branches.find(b => b.branch_id === item.branch_id);
        return <span className="text-sm text-gray-600 dark:text-gray-400">{branch ? branch.name : 'Unassigned'}</span>;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_: any, item: User) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleOpenRoleDialog(item)} className={buttonStyles.actionRole} title="Manage Access Level">
            <ShieldCheck className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleOpenEditDialog(item)} className={buttonStyles.actionEdit} title="Edit User">
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleOpenDeleteDialog(item)} className={buttonStyles.actionDelete} title="Delete User">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ], [branches]);

  const handleSubmit = async () => {
    if (!name || !username) {
      toast({ title: "Validation Error", description: "Name and Username are required.", variant: "destructive" });
      return;
    }
    if (!editingUser && !password) {
      toast({ title: "Validation Error", description: "Password is required for new users.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const finalBranchId = (branchId === 'unassigned_dummy_val' || branchId === '') ? null : branchId;

      if (editingUser) {
        const updatePayload: any = { user_id: editingUser.user_id };
        let hasChanges = false;

        if (password) {
          updatePayload.password = password;
          hasChanges = true;
        }

        const currentBranchId = editingUser.branch_id || null;
        if (finalBranchId !== currentBranchId) {
          updatePayload.branch_id = finalBranchId;
          hasChanges = true;
        }

        if (!hasChanges) {
          setIsLoading(false);
          setIsEditUserDialogOpen(false);
          toast({ title: "No Changes", description: "No data was changed." });
          return;
        }

        const response = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
        const result = await response.json();

        if (!response.ok) {
          toast({ title: "Save Error", description: result.error || 'Failed to update user', variant: "destructive" });
        } else {
          toast({ title: "Success", description: "User updated successfully." });
          setIsEditUserDialogOpen(false);
          fetchUsers();
          // If branch_id was changed, refresh the current user's auth context
          // so activeBranchId updates immediately without requiring re-login
          if (updatePayload.branch_id !== undefined && user?.user_id === editingUser.user_id) {
            await refreshUser();
          }
        }
      } else {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            username,
            password,
            role,
            branch_id: finalBranchId
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          toast({ title: "Save Error", description: result.error || 'Failed to create user', variant: "destructive" });
        } else {
          toast({ title: "Success", description: "User created successfully." });
          setIsAddUserDialogOpen(false);
          fetchUsers();
        }
      }
    } catch (err: any) {
      toast({ title: "Save Error", description: err.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleRoleSubmit = async () => {
    if (!roleUser) return;
    if (roleUser.role === role) {
      setIsRoleDialogOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: roleUser.user_id, role }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast({ title: "Error", description: result.error || 'Failed to update role', variant: "destructive" });
      } else {
        toast({ title: "Access Updated", description: `Role for ${roleUser.name} has been updated.` });
        setIsRoleDialogOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users?user_id=${deletingUser.user_id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        toast({ title: "Delete Error", description: result.error || 'Failed to delete user', variant: "destructive" });
      } else {
        toast({ title: "Success", description: "User deleted successfully." });
        setIsDeleteConfirmationOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'super_admin').length,
    managers: users.filter(u => u.role === 'branch_manager').length,
    staff: users.filter(u => u.role === 'staff').length,
    cashiers: users.filter(u => u.role === 'cashier').length,
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (user?.role !== 'super_admin') {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have administrator privileges. Only Super Admins can access this area.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 py-4">

        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              Admin Panel
            </h1>
          </div>
          <Button onClick={fetchUsers} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p><p className="text-2xl font-bold text-slate-800 dark:text-white">{userStats.total}</p></div>
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center"><Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /></div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-500 dark:text-slate-400">Admins</p><p className="text-2xl font-bold text-red-600 dark:text-red-400">{userStats.admins}</p></div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center"><Shield className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-500 dark:text-slate-400">Managers</p><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userStats.managers}</p></div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center"><Users className="h-5 w-5 text-purple-600 dark:text-purple-400" /></div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-500 dark:text-slate-400">Staff</p><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{userStats.staff}</p></div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center"><Users className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="rounded-lg overflow-hidden border border-border">
            <div className="w-full bg-muted/50 border-b border-border p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-semibold text-foreground">User Management</div>
                  <div className="text-xs text-muted-foreground">View and manage system access</div>
                </div>
              </div>
              <Button onClick={handleOpenAddDialog} className="bg-[#714B67] hover:bg-[#5a3c53] text-white" size="sm">
                <UserPlus className="h-4 w-4 mr-2" /> Add New User
              </Button>
            </div>

            {/* Filters */}
            <div className="p-4 bg-background border-b border-border flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-3 w-3" /></button>
                  )}
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Role Filter</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2"><Filter className="h-3.5 w-3.5 text-slate-500" /><SelectValue placeholder="Filter by role" /></div>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="branch_manager">Branch Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DataTableWrapper
              columns={columns}
              data={filteredUsers.map(u => ({ ...u, id: u.user_id }))}
            />
          </div>
        </div>

        {/* 1. Add/Edit Dialog */}
        <Dialog open={isAddUserDialogOpen || isEditUserDialogOpen} onOpenChange={isOpen => { if (!isOpen) { setIsAddUserDialogOpen(false); setIsEditUserDialogOpen(false); } }}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-white">
                {editingUser ? <KeyRound className="h-5 w-5 text-indigo-600" /> : <UserPlus className="h-5 w-5 text-indigo-600" />}
                {editingUser ? 'User Details & Branch' : 'Add New User'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="dark:text-slate-300">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!!editingUser} className="dark:bg-slate-950 dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="dark:text-slate-300">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!!editingUser} className="dark:bg-slate-950 dark:border-slate-700" />
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Initial Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger className="dark:bg-slate-950 dark:border-slate-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="branch_manager">Branch Manager</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Assigned Branch</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="dark:bg-slate-950 dark:border-slate-700"><SelectValue placeholder="Select a branch..." /></SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                    <SelectItem value="unassigned_dummy_val">No Branch (Global)</SelectItem>
                    {branches.map(b => <SelectItem key={b.branch_id} value={b.branch_id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300">{editingUser ? 'New Password (Optional)' : 'Password'}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="dark:bg-slate-950 dark:border-slate-700 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={isLoading} className={buttonStyles.primary}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingUser ? 'Update' : 'Create User')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2. Role Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-white">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Manage Access Level
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Change the permission level for <strong>{roleUser?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Select New Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger className="h-12 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectItem value="cashier">Cashier (POS Access)</SelectItem>
                    <SelectItem value="staff">Staff (Standard Access)</SelectItem>
                    <SelectItem value="branch_manager">Branch Manager (Elevated Access)</SelectItem>
                    <SelectItem value="super_admin">Super Admin (Full Control)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)} className="dark:border-slate-700 dark:text-slate-300">Cancel</Button>
              <Button onClick={handleRoleSubmit} disabled={isLoading} className={buttonStyles.primary}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Update Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 3. Delete Dialog */}
        <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
          <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 dark:text-white">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Confirm Deletion
              </AlertDialogTitle>
              <AlertDialogDescription className="dark:text-slate-400">
                Are you sure you want to delete <strong>{deletingUser?.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}