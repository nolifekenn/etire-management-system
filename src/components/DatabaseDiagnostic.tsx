"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function DatabaseDiagnostic() {
    const [diagnostics, setDiagnostics] = useState<Record<string, unknown>>({});
    const [isLoading, setIsLoading] = useState(false);

    const runDiagnostics = async () => {
        setIsLoading(true);
        const results: Record<string, unknown> = {};

        // Check environment variables
        results.envVars = {
            supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
            key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Not set'
        };

        // Check Supabase client
        results.supabaseClient = {
            available: !!supabase,
            type: supabase ? typeof supabase : 'null'
        };

        if (supabase) {
            try {
                // Test connection with a simple query
                const { data: connectionTest, error: connectionError } = await supabase
                    .from('users')
                    .select('count')
                    .limit(1);
                
                results.connectionTest = {
                    success: !connectionError,
                    error: connectionError?.message || null,
                    data: connectionTest
                };

                // Try to query users table
                const { data: usersData, error: usersError } = await supabase
                    .from('user')
                    .select('*')
                    .limit(5);
                
                results.usersTable = {
                    success: !usersError,
                    error: usersError?.message || null,
                    count: usersData?.length || 0,
                    data: usersData
                };

                // Try to query user table (singular)
                const { data: userData, error: userError } = await supabase
                    .from('user')
                    .select('*')
                    .limit(5);
                
                results.userTable = {
                    success: !userError,
                    error: userError?.message || null,
                    count: userData?.length || 0,
                    data: userData
                };

                // List all tables
                const { data: tablesData, error: tablesError } = await supabase
                    .rpc('get_table_names');
                
                results.tables = {
                    success: !tablesError,
                    error: tablesError?.message || null,
                    data: tablesData
                };

            } catch (error) {
                results.generalError = error;
            }
        }

        setDiagnostics(results);
        setIsLoading(false);
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    const getStatusIcon = (success: boolean) => {
        return success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />;
    };

    const getStatusBadge = (success: boolean) => {
        return success ? 
            <Badge variant="default" className="bg-green-600">Success</Badge> : 
            <Badge variant="destructive">Error</Badge>;
    };

    return (
        <div className="container mx-auto p-4 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Database Diagnostic Tool</CardTitle>
                    <CardDescription>Check database connection and table availability</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={runDiagnostics} disabled={isLoading}>
                        {isLoading ? 'Running Diagnostics...' : 'Run Diagnostics'}
                    </Button>
                </CardContent>
            </Card>

            {diagnostics.envVars && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(diagnostics.envVars.supabaseUrl && diagnostics.envVars.supabaseKey)}
                            Environment Variables
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p>Supabase URL: {diagnostics.envVars.supabaseUrl ? 'Set' : 'Missing'}</p>
                            <p>Supabase Key: {diagnostics.envVars.supabaseKey ? 'Set' : 'Missing'}</p>
                            <p>URL Value: {diagnostics.envVars.url}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {diagnostics.supabaseClient && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(diagnostics.supabaseClient.available)}
                            Supabase Client
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p>Available: {diagnostics.supabaseClient.available ? 'Yes' : 'No'}</p>
                            <p>Type: {diagnostics.supabaseClient.type}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {diagnostics.connectionTest && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(diagnostics.connectionTest.success)}
                            Connection Test
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getStatusBadge(diagnostics.connectionTest.success)}
                            {diagnostics.connectionTest.error && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Connection Error</AlertTitle>
                                    <AlertDescription>{diagnostics.connectionTest.error}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {diagnostics.usersTable && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(diagnostics.usersTable.success)}
                            Users Table (plural)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getStatusBadge(diagnostics.usersTable.success)}
                            <p>Records found: {diagnostics.usersTable.count}</p>
                            {diagnostics.usersTable.error && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Query Error</AlertTitle>
                                    <AlertDescription>{diagnostics.usersTable.error}</AlertDescription>
                                </Alert>
                            )}
                            {diagnostics.usersTable.data && diagnostics.usersTable.data.length > 0 && (
                                <div>
                                    <p className="font-medium">Sample data:</p>
                                    <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                                        {JSON.stringify(diagnostics.usersTable.data, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {diagnostics.userTable && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(diagnostics.userTable.success)}
                            User Table (singular)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getStatusBadge(diagnostics.userTable.success)}
                            <p>Records found: {diagnostics.userTable.count}</p>
                            {diagnostics.userTable.error && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Query Error</AlertTitle>
                                    <AlertDescription>{diagnostics.userTable.error}</AlertDescription>
                                </Alert>
                            )}
                            {diagnostics.userTable.data && diagnostics.userTable.data.length > 0 && (
                                <div>
                                    <p className="font-medium">Sample data:</p>
                                    <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                                        {JSON.stringify(diagnostics.userTable.data, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {diagnostics.generalError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>General Error</AlertTitle>
                    <AlertDescription>
                        {diagnostics.generalError.toString()}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
