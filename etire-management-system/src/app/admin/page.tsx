
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
import { Loader2, UserPlus, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/lib/types';


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
    
    // Debug logging
    console.log('AdminPage - User:', user);
    console.log('AdminPage - User role:', user?.role);
    
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
        if (user?.role === 2 || user?.role === 3) { // Fetch if admin or branch manager
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
        setPassword(''); // Clear password for security, only set on change
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
        // Note: branch_id is not part of the user table in this schema

        setIsLoading(true);

        const userData: Partial<User> = {
            name,
            username,
            role,
        };
        if (password) {
            userData.password = password; // Only include password if it was changed
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

    if (isAuthLoading) {
         return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    // Check if user has admin or branch manager role (role = 2 or 3)
    if (!user || (user.role !== 2 && user.role !== 3)) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PageHeader title="Admin Panel" />
                <Alert variant="destructive">
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
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageHeader title="Admin Panel" description="Manage user accounts and roles.">
                <Button size="sm" onClick={handleOpenAddDialog}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </PageHeader>

             {fetchError && (
                <Alert variant="destructive" className="mb-4">
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                        <DialogDescription>
                           {editingUser ? `Update details for ${editingUser.name}.` : 'Enter the details for the new user.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="johndoe"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                             <div className="relative">
                                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editingUser ? "Leave blank to keep current password" : "Enter a strong password"}/>
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={String(role)} onValueChange={(v) => setRole(Number(v))}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Guest</SelectItem>
                                    <SelectItem value="1">Staff</SelectItem>
                                    <SelectItem value="2">Branch Manager</SelectItem>
                                    <SelectItem value="3">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Branch selection removed - not part of user table in this schema */}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingUser ? 'Save Changes' : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the user {deletingUser?.name}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <DataTableWrapper
                title="Registered Users"
                columns={columns}
                data={users.map(u => ({
                    ...u,
                    id: u.user_id, // Map user_id to id for DataTableWrapper
                    password_display: '••••••••',
                    role_display: getRoleName(u.role),
                }))}
                onEdit={handleOpenEditDialog}
                onDelete={handleOpenDeleteDialog}
                renderCell={(item, columnKey, value) => {
                    if (columnKey === 'role_display') {
                        const role = (item as User).role;
                        if (role === 3) return <Badge variant="default" className="bg-red-600">Admin</Badge>
                        if (role === 2) return <Badge variant="default" className="bg-purple-600">Branch Manager</Badge>
                        if (role === 1) return <Badge variant="secondary" className="bg-blue-600">Staff</Badge>
                        return <Badge variant="outline">Guest</Badge>
                    }
                    // Branch display removed - not part of user table in this schema
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
    );
}
