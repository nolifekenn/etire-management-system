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
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, AlertTriangle, Eye, EyeOff, Shield, Users, RefreshCw } from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/lib/types';

// Design system from POS page
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

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'username', header: 'Username' },
  { key: 'password_display', header: 'Password' },
  { key: 'role_display', header: 'Role' },
  { key: 'status', header: 'Status' },
];

export default function AdminPage() {
    const { toast } = useToast();
    const { user, isLoading: isAuthLoading } = useAuth();
    const [mounted, setMounted] = useState(false);
    
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
    const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

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

    const resetForm = () => {
        setName('');
        setUsername('');
        setPassword('');
        setRole(1);
        setEditingUser(null);
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
        setRole(userToEdit.role);
        setIsEditUserDialogOpen(true);
    };

    const handleOpenDeleteDialog = (userToDelete: User) => {
        setDeletingUser(userToDelete);
        setIsDeleteConfirmationOpen(true);
    };

    const handleSubmit = async () => {
        if (!supabase) return;
        if (!name || !username || (!editingUser && !password)) {
            toast({ title: "Validation Error", description: "Name, Username, and Password are required for new users.", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        const userData: Partial<User> = {
            name,
            username,
            role,
        };
        if (password) {
            userData.password = password;
        }

        let error;
        if (editingUser) {
            const { error: updateError } = await (supabase as any).from('user').update(userData).eq('user_id', editingUser.user_id);
            error = updateError;
        } else {
            const insertData = {
                name: userData.name!,
                username: userData.username!,
                password: userData.password!,
                role: userData.role!,
            };
            const { error: insertError } = await (supabase as any).from('user').insert([insertData]);
            error = insertError;
        }
        setIsLoading(false);

        if (error) {
            toast({ title: "Save Error", description: `Could not save user: ${error.message}`, variant: "destructive" });
        } else {
            toast({ title: "Success", description: `User ${editingUser ? 'updated' : 'created'} successfully.` });
            setIsAddUserDialogOpen(false);
            setIsEditUserDialogOpen(false);
            fetchUsers();
        }
    };
    
    const handleDeleteUser = async () => {
        if (!deletingUser || !supabase) return;
        setIsLoading(true);
        const { error } = await supabase.from('user').delete().eq('user_id', deletingUser.user_id);
        setIsLoading(false);

        if (error) {
            toast({ title: "Delete Error", description: `Could not delete user: ${error.message}`, variant: "destructive" });
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

    // Calculate user statistics
    const userStats = {
        total: users.length,
        admins: users.filter(u => u.role === 3).length,
        managers: users.filter(u => u.role === 2).length,
        staff: users.filter(u => u.role === 1).length,
    };

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-white text-slate-800 font-poppins">
                <div className="container mx-auto p-6 sm:p-8 lg:p-10 flex justify-center items-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }
    
    if (!user || (user.role !== 2 && user.role !== 3)) {
        return (
            <div className="min-h-screen bg-white text-slate-800 font-poppins">
                <div className="container mx-auto p-6 sm:p-8 lg:p-10">
                    {/* Header Section */}
                    <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 shadow-xl">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-white mb-2 font-poppins tracking-tight">
                                    Admin Panel
                                </h1>
                                <p className="flex items-center gap-3 text-white/90 text-lg font-medium">
                                    <Shield className="h-5 w-5 opacity-90" />
                                    Manage user accounts and roles
                                </p>
                            </div>
                        </div>
                    </div>

                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Access Denied</AlertTitle>
                        <AlertDescription>
                            You do not have administrator privileges to access this page. 
                            Only users with Admin (role = 3) or Branch Manager (role = 2) can access the admin panel.
                            {user && (
                                <div className="mt-2">
                                    <p>Your current role: {user.role === 0 ? 'Guest' : user.role === 1 ? 'Staff' : user.role === 2 ? 'Branch Manager' : user.role === 3 ? 'Admin' : 'Unknown'}</p>
                                    <p>Required role: Admin (3) or Branch Manager (2)</p>
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-800 font-poppins">
            <div className="container mx-auto p-6 sm:p-8 lg:p-10">
                {/* Header Section */}
                <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 flex items-center justify-between shadow-xl">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2 font-poppins tracking-tight">
                                Admin Panel
                            </h1>
                            <div className="flex items-center gap-6 text-white/90">
                                <p className="flex items-center gap-3 text-lg font-medium">
                                    <Shield className="h-5 w-5 opacity-90" />
                                    Manage user accounts and roles
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-white/90 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm text-sm">
                                        <Users className="w-4 h-4" />
                                        {userStats.total} total users
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button 
                                onClick={handleOpenAddDialog}
                                className="bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg active:scale-95"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add User
                            </Button>
                            <Button 
                                onClick={refreshData}
                                disabled={isLoading}
                                className="bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg active:scale-95"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>

                {/* User Statistics Cards */}
                <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Total Users</p>
                                <p className="text-2xl font-bold text-slate-800">{userStats.total}</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Administrators</p>
                                <p className="text-2xl font-bold text-red-600">{userStats.admins}</p>
                            </div>
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <Shield className="h-5 w-5 text-red-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Managers</p>
                                <p className="text-2xl font-bold text-purple-600">{userStats.managers}</p>
                            </div>
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Users className="h-5 w-5 text-purple-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Staff</p>
                                <p className="text-2xl font-bold text-blue-600">{userStats.staff}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {fetchError && (
                        <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{fetchError}</AlertDescription>
                        </Alert>
                    )}

                    <Dialog open={isAddUserDialogOpen || isEditUserDialogOpen} onOpenChange={isOpen => {
                        if (!isOpen) {
                            setIsAddUserDialogOpen(false);
                            setIsEditUserDialogOpen(false);
                        }
                    }}>
                        <DialogContent className="bg-white border-slate-200">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5 text-indigo-600" />
                                    {editingUser ? 'Edit User' : 'Add New User'}
                                </DialogTitle>
                                <DialogDescription>
                                {editingUser ? `Update details for ${editingUser.name}.` : 'Enter the details for the new user.'}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-700 font-medium">Full Name</Label>
                                    <Input 
                                        id="name" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        placeholder="John Doe"
                                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
                                    <Input 
                                        id="username" 
                                        value={username} 
                                        onChange={(e) => setUsername(e.target.value)} 
                                        placeholder="johndoe"
                                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                                    <div className="relative">
                                        <Input 
                                            id="password" 
                                            type={showPassword ? 'text' : 'password'} 
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)} 
                                            placeholder={editingUser ? "Leave blank to keep current password" : "Enter a strong password"}
                                            className="border-slate-300 focus:border-indigo-400 transition-all duration-300 pr-10"
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-slate-100 transition-all duration-300"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role" className="text-slate-700 font-medium">Role</Label>
                                    <Select value={String(role)} onValueChange={(v) => setRole(Number(v))}>
                                        <SelectTrigger className="border-slate-300 focus:border-indigo-400">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">Guest</SelectItem>
                                            <SelectItem value="1">Staff</SelectItem>
                                            <SelectItem value="2">Branch Manager</SelectItem>
                                            <SelectItem value="3">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" className="border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button 
                                    type="submit" 
                                    onClick={handleSubmit} 
                                    disabled={isLoading}
                                    className={buttonStyles.primary + " " + microAnimations.buttonHover}
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingUser ? 'Save Changes' : 'Create User'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
                        <AlertDialogContent className="bg-white border-slate-200">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                    Confirm Deletion
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete the user {deletingUser?.name}? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={handleDeleteUser} 
                                    disabled={isLoading} 
                                    className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <div className={`bg-white border border-slate-200 rounded-xl shadow-lg transition-all duration-300 ${microAnimations.cardHover}`}>
                        <DataTableWrapper
                            title="Registered Users"
                            columns={columns}
                            data={users.map(u => ({
                                ...u,
                                id: u.user_id,
                                password_display: '••••••••',
                                role_display: getRoleName(u.role),
                            }))}
                            onEdit={handleOpenEditDialog}
                            onDelete={handleOpenDeleteDialog}
                            renderCell={(item, columnKey, value) => {
                                if (columnKey === 'role_display') {
                                    const role = (item as User).role;
                                    if (role === 3) return <Badge variant="default" className="bg-red-600 hover:bg-red-700">Admin</Badge>
                                    if (role === 2) return <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">Branch Manager</Badge>
                                    if (role === 1) return <Badge variant="secondary" className="bg-blue-600 hover:bg-blue-700">Staff</Badge>
                                    return <Badge variant="outline">Guest</Badge>
                                }
                                if (columnKey === 'status') {
                                    const role = (item as User).role;
                                    if (role === 0) {
                                        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending Approval</Badge>
                                    } else if (role === 1) {
                                        return <Badge variant="secondary" className="text-blue-600">Active Staff</Badge>
                                    } else if (role === 2) {
                                        return <Badge variant="default" className="text-purple-600">Branch Manager</Badge>
                                    } else if (role === 3) {
                                        return <Badge variant="default" className="text-red-600">Administrator</Badge>
                                    }
                                }
                                return String(value);
                            }}
                        />
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                
                .font-poppins {
                    font-family: 'Poppins', sans-serif;
                }

                .ease-spring {
                    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
                }
            `}</style>
        </div>
    );
}