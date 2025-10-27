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
                // Test 3: Basic connection with a simple query
                console.log('Testing basic connection...');
                const { data: connectionData, error: connectionError } = await supabase
                    .from('user')
                    .select('count')
                    .limit(1);
                
                testResults.basicConnection = {
                    success: !connectionError,
                    error: connectionError?.message || null,
                    data: connectionData
                };

                // Test 4: Try to fetch actual users
                console.log('Testing user fetch...');
                const { data: usersData, error: usersError } = await supabase
                    .from('user')
                    .select('user_id, name, username, role')
                    .limit(3);
                
                testResults.userFetch = {
                    success: !usersError,
                    error: usersError?.message || null,
                    count: usersData?.length || 0,
                    data: usersData
                };

                // Test 5: Check if the old 'user' table exists (should fail)
                console.log('Testing old table name...');
                const { data: oldTableData, error: oldTableError } = await supabase
                    .from('user')
                    .select('count')
                    .limit(1);
                
                testResults.oldTableTest = {
                    success: !oldTableError,
                    error: oldTableError?.message || null,
                    data: oldTableData
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
                    <CardDescription>Test database connection and identify issues</CardDescription>
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
                            <p>Supabase URL: {results.envVars.supabaseUrl ? 'Set' : 'Missing'}</p>
                            <p>Supabase Key: {results.envVars.supabaseKey ? 'Set' : 'Missing'}</p>
                            <p>URL: {results.envVars.urlValue}</p>
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
                        <div className="space-y-2">
                            <p>Available: {results.supabaseClient.available ? 'Yes' : 'No'}</p>
                            <p>Type: {results.supabaseClient.type}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {results.basicConnection && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(results.basicConnection.success)}
                            Basic Connection Test
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
                            User Fetch Test
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getStatusBadge(results.userFetch.success)}
                            <p>Users found: {results.userFetch.count}</p>
                            {results.userFetch.error && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>User Fetch Error</AlertTitle>
                                    <AlertDescription>{results.userFetch.error}</AlertDescription>
                                </Alert>
                            )}
                            {results.userFetch.data && results.userFetch.data.length > 0 && (
                                <div>
                                    <p className="font-medium">Sample users:</p>
                                    <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                                        {JSON.stringify(results.userFetch.data, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {results.oldTableTest && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(!results.oldTableTest.success)}
                            Old Table Name Test
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Badge variant={!results.oldTableTest.success ? "default" : "destructive"} 
                                   className={!results.oldTableTest.success ? "bg-green-600" : ""}>
                                {!results.oldTableTest.success ? 'Correctly Failed' : 'Unexpectedly Succeeded'}
                            </Badge>
                            <p>Testing old 'user' table (should fail):</p>
                            {results.oldTableTest.error && (
                                <p className="text-sm text-gray-600">Error: {results.oldTableTest.error}</p>
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
