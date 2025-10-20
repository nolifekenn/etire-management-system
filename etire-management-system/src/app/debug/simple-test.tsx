"use client";

import { useState, useEffect } from 'react';
import { supabaseSimple } from '@/lib/supabaseClientSimple';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function SimpleTest() {
    const [results, setResults] = useState<any>({});
    const [isLoading, setIsLoading] = useState(false);

    const runSimpleTest = async () => {
        setIsLoading(true);
        const testResults: any = {};

        // Test with untyped client
        testResults.simpleClient = {
            available: !!supabaseSimple,
            type: supabaseSimple ? typeof supabaseSimple : 'null'
        };

        if (supabaseSimple) {
            try {
                // Test 1: Try to fetch users with untyped client
                console.log('Testing with untyped client...');
                const { data: usersData, error: usersError } = await supabaseSimple
                    .from('user')
                    .select('*')
                    .limit(3);
                
                testResults.userFetch = {
                    success: !usersError,
                    error: usersError?.message || null,
                    count: usersData?.length || 0,
                    data: usersData
                };

                // Test 2: Try to fetch from old table name
                console.log('Testing old table name with untyped client...');
                const { data: oldData, error: oldError } = await supabaseSimple
                    .from('user')
                    .select('*')
                    .limit(1);
                
                testResults.oldTableTest = {
                    success: !oldError,
                    error: oldError?.message || null,
                    data: oldData
                };

                // Test 3: List all tables (if possible)
                try {
                    const { data: tablesData, error: tablesError } = await supabaseSimple
                        .rpc('get_table_names');
                    
                    testResults.tablesTest = {
                        success: !tablesError,
                        error: tablesError?.message || null,
                        data: tablesData
                    };
                } catch (rpcError) {
                    testResults.tablesTest = {
                        success: false,
                        error: 'RPC function not available',
                        data: null
                    };
                }

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
        runSimpleTest();
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
                    <CardTitle>Simple Database Test (Untyped)</CardTitle>
                    <CardDescription>Test database connection without TypeScript types</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={runSimpleTest} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Run Simple Test
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {results.simpleClient && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(results.simpleClient.available)}
                            Simple Client
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p>Available: {results.simpleClient.available ? 'Yes' : 'No'}</p>
                            <p>Type: {results.simpleClient.type}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {results.userFetch && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(results.userFetch.success)}
                            User Fetch (Untyped)
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
                            Old Table Test (Untyped)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Badge variant={!results.oldTableTest.success ? "default" : "destructive"} 
                                   className={!results.oldTableTest.success ? "bg-green-600" : ""}>
                                {!results.oldTableTest.success ? 'Correctly Failed' : 'Unexpectedly Succeeded'}
                            </Badge>
                            <p>Testing old 'user' table:</p>
                            {results.oldTableTest.error && (
                                <p className="text-sm text-gray-600">Error: {results.oldTableTest.error}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {results.tablesTest && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(results.tablesTest.success)}
                            Tables List Test
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getStatusBadge(results.tablesTest.success)}
                            {results.tablesTest.error && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Tables Error</AlertTitle>
                                    <AlertDescription>{results.tablesTest.error}</AlertDescription>
                                </Alert>
                            )}
                            {results.tablesTest.data && (
                                <div>
                                    <p className="font-medium">Available tables:</p>
                                    <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                                        {JSON.stringify(results.tablesTest.data, null, 2)}
                                    </pre>
                                </div>
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
