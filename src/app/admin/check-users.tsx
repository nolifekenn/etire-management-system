"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, RefreshCw, User } from 'lucide-react';

export default function CheckUsers() {
    const [users, setUsers] = useState<Record<string, unknown>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastCheck, setLastCheck] = useState<Date | null>(null);

    const checkUsers = async () => {
        if (!supabase) {
            setError('Supabase client not available');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('Checking users in database...');
            
            // First, let's try a simple count query
            const { count, error: countError } = await supabase
                .from('user')
                .select('*', { count: 'exact', head: true });

            if (countError) {
                console.error('Count error:', countError);
                setError(`Count error: ${countError.message}`);
                return;
            }

            console.log('User count:', count);

            // Now fetch actual users
            const { data, error: fetchError } = await supabase
                .from('user')
                .select('*')
                .order('name', { ascending: true });

            if (fetchError) {
                console.error('Fetch error:', fetchError);
                setError(`Fetch error: ${fetchError.message}`);
                setUsers([]);
            } else {
                console.log('Users fetched:', data);
                setUsers(data || []);
                setLastCheck(new Date());
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            setError(`Unexpected error: ${err}`);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkUsers();
    }, []);

    const getRoleName = (_roleId: number) => {
        if (roleId === 3) return 'Admin';
        if (roleId === 2) return 'Branch Manager';
        if (roleId === 1) return 'Staff';
        return 'Guest';
    };

    const getRoleBadge = (roleId: number) => {
        if (roleId === 3) return <Badge variant="default" className="bg-red-600">Admin</Badge>;
        if (roleId === 2) return <Badge variant="default" className="bg-purple-600">Branch Manager</Badge>;
        if (roleId === 1) return <Badge variant="secondary" className="bg-blue-600">Staff</Badge>;
        return <Badge variant="outline">Guest</Badge>;
    };

    return (
        <div className="container mx-auto p-4 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Database Users Check
                    </CardTitle>
                    <CardDescription>
                        Check if users exist in the database and can be fetched
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <Button onClick={checkUsers} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Check Users
                                </>
                            )}
                        </Button>
                        {lastCheck && (
                            <p className="text-sm text-gray-500">
                                Last checked: {lastCheck.toLocaleTimeString()}
                            </p>
                        )}
                    </div>

                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Users found: {users.length}</span>
                        </div>
                        
                        {users.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-sm text-gray-600">User list:</p>
                                <div className="grid gap-2">
                                    {users.map((user) => (
                                        <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-gray-500">@{user.username}</p>
                                                <p className="text-xs text-gray-400">ID: {user.user_id}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getRoleBadge(user.role)}
                                                <span className="text-xs text-gray-500">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>No Users Found</AlertTitle>
                                <AlertDescription>
                                    The user table appears to be empty. This could mean:
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>No users have been created yet</li>
                                        <li>Users were created in a different table</li>
                                        <li>There&apos;s still a database connection issue</li>
                                    </ul>
                                    <p className="mt-2 text-sm">
                                        Try creating a user through the registration form or check if users exist in a different table.
                                    </p>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
