"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import {
  BranchService,
  UserService,
  InventoryService,
  CustomerService,
  SupplierService
} from '@/lib/db/services';

export default function SimpleTest() {
    const [results, setResults] = useState<any>({});
    const [isLoading, setIsLoading] = useState(false);

    const runServiceTest = async () => {
        setIsLoading(true);
        const testResults: any = {};

        try {
            // Test BranchService
            const branches = await BranchService.getAll();
            testResults.branches = {
                success: true,
                count: branches.length,
                data: branches.slice(0, 2)
            };
        } catch (error: any) {
            testResults.branches = {
                success: false,
                error: error.message
            };
        }

        try {
            // Test UserService
            const users = await UserService.getAll();
            testResults.users = {
                success: true,
                count: users.length,
                data: users.slice(0, 2)
            };
        } catch (error: any) {
            testResults.users = {
                success: false,
                error: error.message
            };
        }

        try {
            // Test InventoryService
            const inventory = await InventoryService.getAll();
            testResults.inventory = {
                success: true,
                count: inventory.length,
                data: inventory.slice(0, 2)
            };
        } catch (error: any) {
            testResults.inventory = {
                success: false,
                error: error.message
            };
        }

        try {
            // Test CustomerService
            const customers = await CustomerService.getAll();
            testResults.customers = {
                success: true,
                count: customers.length,
                data: customers.slice(0, 2)
            };
        } catch (error: any) {
            testResults.customers = {
                success: false,
                error: error.message
            };
        }

        try {
            // Test SupplierService
            const suppliers = await SupplierService.getAll();
            testResults.suppliers = {
                success: true,
                count: suppliers.length,
                data: suppliers.slice(0, 2)
            };
        } catch (error: any) {
            testResults.suppliers = {
                success: false,
                error: error.message
            };
        }

        setResults(testResults);
        setIsLoading(false);
    };

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
                    <CardTitle>Database Service Layer Test</CardTitle>
                    <CardDescription>Test all database service functions</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={runServiceTest} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Testing Services...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Test Service Layer
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {Object.entries(results).map(([key, value]: [string, any]) => (
                <Card key={key}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(value.success)}
                            {key.charAt(0).toUpperCase() + key.slice(1)} Service
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getStatusBadge(value.success)}
                            {value.success && <p>Records found: {value.count}</p>}
                            {value.error && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{value.error}</AlertDescription>
                                </Alert>
                            )}
                            {value.data && value.data.length > 0 && (
                                <details>
                                    <summary className="cursor-pointer font-medium">View sample data</summary>
                                    <pre className="bg-muted p-2 rounded text-xs overflow-auto mt-2">
                                        {JSON.stringify(value.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}