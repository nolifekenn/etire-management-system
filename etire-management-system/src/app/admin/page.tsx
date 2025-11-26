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
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, UserPlus, AlertTriangle, Eye, EyeOff, Shield, Users, RefreshCw, 
  Search, X, Filter, Edit, Trash2, CheckCircle, KeyRound, ShieldCheck
} from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/lib/types';

// Design system
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg active:scale-95",
  actionEdit: "h-8 w-8 p-0 rounded-lg bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-400",
  actionDelete: "h-8 w-8 p-0 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/50 dark:hover:text-red-400",
  actionRole: "h-8 w-8 p-0 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50",
  actionApprove: "h-8 w-auto px-3 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border-green-200 text-xs font-medium flex items-center gap-1 dark:bg-green-900/20 dark:text-green-400"
};

export default function AdminPage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
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
  const [role, setRole] = useState<number>(1);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    const { data, error } = await supabase.from('user').select('*').order('name', { ascending: true });

    if (error) {
      setFetchError(`Could not fetch users: ${error.message}`);
      setUsers([]);
    } else {
      setUsers(data as User[]);
      setFetchError(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === 2 || user?.role === 3) {
      fetchUsers();
    }
  }, [fetchUsers, user]);

  // Handlers
  const resetForm = () => {
    setName('');
    setUsername('');
    setPassword('');
    setRole(1);
    setEditingUser(null);
    setRoleUser(null);
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
    setIsEditUserDialogOpen(true);
  };

  const handleOpenRoleDialog = (userToMod: User) => {
    setRoleUser(userToMod);
    setRole(userToMod.role);
    setIsRoleDialogOpen(true);
  };

  const handleQuickApprove = async (userToApprove: User) => {
    if (!supabase) return;
    setIsLoading(true);
    const { error } = await supabase.from('user').update({ role: 1 }).eq('user_id', userToApprove.user_id);
    setIsLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User Approved", description: `${userToApprove.name} is now a Staff member.` });
      fetchUsers();
    }
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
      const matchesRole = roleFilter === 'all' ? true : u.role.toString() === roleFilter;
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
        if (role === 3) return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">Admin</Badge>;
        if (role === 2) return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">Manager</Badge>;
        if (role === 1) return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">Staff</Badge>;
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800">Pending</Badge>;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_: any, item: User) => (
        <div className="flex items-center gap-2">
          {item.role === 0 ? (
            <Button variant="outline" size="sm" onClick={() => handleQuickApprove(item)} className={buttonStyles.actionApprove} title="Quick Approve as Staff">
              <CheckCircle className="h-3.5 w-3.5" /> Approve
            </Button>
          ) : (
            <Button variant="outline" size="icon" onClick={() => handleOpenRoleDialog(item)} className={buttonStyles.actionRole} title="Manage Access Level">
              <ShieldCheck className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => handleOpenEditDialog(item)} className={buttonStyles.actionEdit} title="Reset Password / View Details">
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleOpenDeleteDialog(item)} className={buttonStyles.actionDelete} title="Delete User">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ], []); 

  const handleSubmit = async () => {
    if (!supabase) return;
    if (!name || !username) {
        toast({ title: "Validation Error", description: "Name and Username are required.", variant: "destructive" });
        return;
    }
    if (!editingUser && !password) {
        toast({ title: "Validation Error", description: "Password is required for new users.", variant: "destructive" });
        return;
    }

    setIsLoading(true);

    let error;
    if (editingUser) {
      const updateData: any = {};
      if (password) updateData.password = password;
      
      if (Object.keys(updateData).length === 0) {
         setIsLoading(false);
         setIsEditUserDialogOpen(false);
         toast({ title: "No Changes", description: "No data was changed." });
         return;
      }

      const { error: updateError } = await supabase.from('user').update(updateData).eq('user_id', editingUser.user_id);
      error = updateError;
    } else {
      const insertData = { name, username, password, role };
      const { error: insertError } = await supabase.from('user').insert([insertData]);
      error = insertError;
    }
    
    setIsLoading(false);

    if (error) {
      toast({ title: "Save Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: editingUser ? "User updated successfully." : "User created successfully." });
      setIsAddUserDialogOpen(false);
      setIsEditUserDialogOpen(false);
      fetchUsers();
    }
  };

  const handleRoleSubmit = async () => {
    if (!supabase || !roleUser) return;
    if (roleUser.role === role) {
        setIsRoleDialogOpen(false);
        return;
    }

    setIsLoading(true);
    const { error } = await supabase.from('user').update({ role: role }).eq('user_id', roleUser.user_id);
    setIsLoading(false);

    if (error) {
        toast({ title: "Error", description: "Failed to update role.", variant: "destructive" });
    } else {
        toast({ title: "Access Updated", description: `Role for ${roleUser.name} has been updated.` });
        setIsRoleDialogOpen(false);
        fetchUsers();
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser || !supabase) return;
    setIsLoading(true);
    const { error } = await supabase.from('user').delete().eq('user_id', deletingUser.user_id);
    setIsLoading(false);

    if (error) {
      toast({ title: "Delete Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "User deleted successfully." });
      setIsDeleteConfirmationOpen(false);
      fetchUsers();
    }
  };

  const getRoleName = (roleId: number) => {
    if (roleId === 3) return 'Admin';
    if (roleId === 2) return 'Branch Manager';
    if (roleId === 1) return 'Staff';
    return 'Guest';
  };

  const refreshData = () => {
    fetchUsers();
  };

  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 3).length,
    managers: users.filter(u => u.role === 2).length,
    staff: users.filter(u => u.role === 1).length,
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user || (user.role !== 2 && user.role !== 3)) {
    return (
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>You do not have administrator privileges.</AlertDescription>
          </Alert>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-poppins">
      <div className="container mx-auto p-6 sm:p-8 lg:p-10">
        
        {/* HEADER */}
        <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5"></div>
            <div className="relative z-10 flex-1">
              <h1 className="text-3xl font-bold text-white mb-2 font-poppins tracking-tight drop-shadow-md">
                Admin Panel
              </h1>
              <div className="flex items-center gap-6 text-white/90">
                <p className="flex items-center gap-3 text-lg font-medium">
                  <Shield className="h-5 w-5 opacity-90" />
                  Manage user accounts and roles
                </p>
              </div>
            </div>
            <div className="relative z-10 mt-4 md:mt-0">
              <Button
                onClick={refreshData}
                disabled={isLoading}
                className={buttonStyles.glass}
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {/* KEY METRICS (STATISTICS CARDS) - RESTORED */}
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
        
        {/* TABLE */}
        <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Table Header */}
            <div className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold font-poppins">User Management</div>
                  <div className="text-sm opacity-90">View and manage system access</div>
                </div>
              </div>
              <Button onClick={handleOpenAddDialog} className={buttonStyles.glass}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add New User
              </Button>
            </div>

            {/* Filters */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-end">
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
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Role Filter</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-slate-500" />
                      <SelectValue placeholder="Filter by role" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="3">Admin</SelectItem>
                    <SelectItem value="2">Branch Manager</SelectItem>
                    <SelectItem value="1">Staff</SelectItem>
                    <SelectItem value="0">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(searchQuery || roleFilter !== 'all') && (
                <div className="pb-0.5">
                  <Button variant="outline" onClick={() => { setSearchQuery(''); setRoleFilter('all'); }} className="h-10 border-slate-200 dark:border-slate-800 text-slate-500">
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <DataTableWrapper
              columns={columns}
              data={filteredUsers.map(u => ({ ...u, id: u.user_id }))}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </div>
        </div>

        {/* 1. ADD / EDIT (Password Reset) Dialog */}
        <Dialog open={isAddUserDialogOpen || isEditUserDialogOpen} onOpenChange={isOpen => {
          if (!isOpen) {
            setIsAddUserDialogOpen(false);
            setIsEditUserDialogOpen(false);
          }
        }}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-white">
                {editingUser ? <KeyRound className="h-5 w-5 text-indigo-600" /> : <UserPlus className="h-5 w-5 text-indigo-600" />}
                {editingUser ? 'User Details & Password' : 'Add New User'}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {editingUser 
                  ? "Identity fields are locked to prevent errors. You can reset the password here." 
                  : "Create a new user account. They will start as Staff unless specified."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 font-medium">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  disabled={!!editingUser} // LOCKED IF EDITING
                  className={`border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-200 focus:border-indigo-400 ${editingUser ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed' : ''}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-medium">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  disabled={!!editingUser} // LOCKED IF EDITING
                  className={`border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-200 focus:border-indigo-400 ${editingUser ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed' : ''}`}
                />
              </div>
              
              {/* Only Show Role Dropdown in ADD mode. Hidden in Edit mode. */}
              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-slate-700 dark:text-slate-300 font-medium">Initial Role</Label>
                  <Select value={String(role)} onValueChange={(v) => setRole(Number(v))}>
                    <SelectTrigger className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      <SelectItem value="0">Guest</SelectItem>
                      <SelectItem value="1">Staff</SelectItem>
                      <SelectItem value="2">Branch Manager</SelectItem>
                      <SelectItem value="3">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">
                  {editingUser ? 'New Password (Optional)' : 'Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                    className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-200 focus:border-indigo-400 pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                className={buttonStyles.primary}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingUser ? 'Update Password' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2. NEW: Manage Role Dialog */}
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
            
            <div className="py-6">
                <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">Current Role: {getRoleName(roleUser?.role || 0)}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Select a new role below to upgrade or downgrade permissions.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">Select New Role</Label>
                        <Select value={String(role)} onValueChange={(v) => setRole(Number(v))}>
                            <SelectTrigger className="h-12 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                <SelectItem value="0" className="dark:text-slate-200">Guest (Restricted Access)</SelectItem>
                                <SelectItem value="1" className="dark:text-slate-200">Staff (Standard Access)</SelectItem>
                                <SelectItem value="2" className="dark:text-slate-200">Branch Manager (Elevated Access)</SelectItem>
                                <SelectItem value="3" className="dark:text-slate-200">Admin (Full Control)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
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

        {/* 3. Delete Confirmation */}
        <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
          <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 dark:text-white">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Confirm Deletion
              </AlertDialogTitle>
              <AlertDialogDescription className="dark:text-slate-400">
                Are you sure you want to delete the user <strong>{deletingUser?.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}