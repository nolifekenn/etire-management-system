"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function ConnectionTest() {
    const [results, setResults] = useState<any>({});
    const [isLoading, setIsLoading] = useState(false);

    const runConnectionTest = async () => {
        setIsLoading(true);
        const testResults: any = {};

        // Test 1: Environment variables
        testResults.envVars = {
            supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
            keyValue: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Not set'
        };

        // Test 2: Supabase client
        testResults.supabaseClient = {
            available: !!supabase,
            type: supabase ? typeof supabase : 'null'
        };

        if (supabase) {
            try {
                // Test 3: Basic connection with system_settings
                console.log('Testing basic connection...');
                const { data: settingsData, error: settingsError } = await supabase
                    .from('system_settings')
                    .select('*')
                    .limit(1);
                
                testResults.basicConnection = {
                    success: !settingsError,
                    error: settingsError?.message || null,
                    data: settingsData
                };

                // Test 4: Try to fetch users from correct table
                console.log('Testing users table...');
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('user_id, username, full_name, role')
                    .limit(3);
                
                testResults.userFetch = {
                    success: !usersError,
                    error: usersError?.message || null,
                    count: usersData?.length || 0,
                    data: usersData
                };

                // Test 5: Try to fetch branches
                console.log('Testing branches table...');
                const { data: branchesData, error: branchesError } = await supabase
                    .from('branches')
                    .select('branch_id, branch_name, is_active')
                    .limit(3);
                
                testResults.branchesFetch = {
                    success: !branchesError,
                    error: branchesError?.message || null,
                    count: branchesData?.length || 0,
                    data: branchesData
                };

                // Test 6: Try to fetch inventory
                console.log('Testing inventory table...');
                const { data: inventoryData, error: inventoryError } = await supabase
                    .from('inventory')
                    .select('item_id, item_name, quantity')
                    .limit(3);
                
                testResults.inventoryFetch = {
                    success: !inventoryError,
                    error: inventoryError?.message || null,
                    count: inventoryData?.length || 0,
                    data: inventoryData
                };

            } catch (error) {
                testResults.generalError = {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                };
            }
        }

        setResults(testResults);
        setIsLoading(false);
    };

    useEffect(() => {
        runConnectionTest();
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
                    <CardTitle>Database Connection Diagnostic</CardTitle>
                    <CardDescription>Test database connection and core tables</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={runConnectionTest} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Run Connection Test
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {results.envVars && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(results.envVars.supabaseUrl && results.envVars.supabaseKey)}
                            Environment Variables
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p>Supabase URL: {results.envVars.supabaseUrl ? '✅ Set' : '❌ Missing'}</p>
                            <p>Supabase Key: {results.envVars.supabaseKey ? '✅ Set' : '❌ Missing'}</p>
                            <p className="text-xs text-muted-foreground">URL: {results.envVars.urlValue}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {results.supabaseClient && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(results.supabaseClient.available)}
                            Supabase Client
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Available: {results.supabaseClient.available ? '✅ Yes' : '❌ No'}</p>
                    </CardContent>
                </Card>
            )}

            {results.basicConnection && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(results.basicConnection.success)}
                            Basic Connection (system_settings)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getStatusBadge(results.basicConnection.success)}
                            {results.basicConnection.error && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Connection Error</AlertTitle>
                                    <AlertDescription>{results.basicConnection.error}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {results.userFetch && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(results.userFetch.success)}
                            Users Table
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getStatusBadge(results.userFetch.success)}
                            <p>Records found: {results.userFetch.count}</p>
                            {results.userFetch.error && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Users Table Error</AlertTitle>
                                    <AlertDescription>{results.userFetch.error}</AlertDescription>
                                </Alert>
                            )}
                            {results.userFetch.data && results.userFetch.data.length > 0 && (
                                <details>
                                    <summary className="cursor-pointer font-medium">View sample data</summary>
                                    <pre className="bg-muted p-2 rounded text-xs overflow-auto mt-2">
                                        {JSON.stringify(results.userFetch.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {results.branchesFetch && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(results.branchesFetch.success)}
                            Branches Table
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getStatusBadge(results.branchesFetch.success)}
                            <p>Records found: {results.branchesFetch.count}</p>
                            {results.branchesFetch.error && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Branches Table Error</AlertTitle>
                                    <AlertDescription>{results.branchesFetch.error}</AlertDescription>
                                </Alert>
                            )}
                            {results.branchesFetch.data && results.branchesFetch.data.length > 0 && (
                                <details>
                                    <summary className="cursor-pointer font-medium">View sample data</summary>
                                    <pre className="bg-muted p-2 rounded text-xs overflow-auto mt-2">
                                        {JSON.stringify(results.branchesFetch.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {results.inventoryFetch && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(results.inventoryFetch.success)}
                            Inventory Table
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getStatusBadge(results.inventoryFetch.success)}
                            <p>Records found: {results.inventoryFetch.count}</p>
                            {results.inventoryFetch.error && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Inventory Table Error</AlertTitle>
                                    <AlertDescription>{results.inventoryFetch.error}</AlertDescription>
                                </Alert>
                            )}
                            {results.inventoryFetch.data && results.inventoryFetch.data.length > 0 && (
                                <details>
                                    <summary className="cursor-pointer font-medium">View sample data</summary>
                                    <pre className="bg-muted p-2 rounded text-xs overflow-auto mt-2">
                                        {JSON.stringify(results.inventoryFetch.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {results.generalError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>General Error</AlertTitle>
                    <AlertDescription>
                        <p>{results.generalError.message}</p>
                        {results.generalError.stack && (
                            <details className="mt-2">
                                <summary className="cursor-pointer">Stack trace</summary>
                                <pre className="text-xs mt-1 overflow-auto">
                                    {results.generalError.stack}
                                </pre>
                            </details>
                        )}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
