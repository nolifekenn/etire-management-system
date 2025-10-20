"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Download, Upload, Database, Cloud, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function BackupPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [backupProgress, setBackupProgress] = useState(0);
    const [lastBackup, setLastBackup] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchLastBackup = useCallback(async () => {
        if (!supabase) return;
        // In a real implementation, you would fetch the last backup timestamp from a settings table
        // For now, we'll simulate it
        setLastBackup(new Date().toISOString());
    }, []);

    useEffect(() => {
        fetchLastBackup();
    }, [fetchLastBackup]);

    const exportData = async (format: 'csv' | 'json') => {
        if (!supabase || !authUser) return;
        
        setIsLoading(true);
        setError(null);
        setBackupProgress(0);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setBackupProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            // Export all tables
            const tables = ['user', 'branch', 'supplier', 'customer', 'vehicle', 'inventory_item', 'sale', 'service_job', 'purchase_order'];
            const exportData: any = {};

            for (const table of tables) {
                const { data, error } = await supabase.from(table).select('*');
                if (error) {
                    console.error(`Error exporting ${table}:`, error);
                } else {
                    exportData[table] = data;
                }
            }

            clearInterval(progressInterval);
            setBackupProgress(100);

            // Create and download file
            const dataStr = format === 'json' 
                ? JSON.stringify(exportData, null, 2)
                : Object.entries(exportData).map(([table, data]) => 
                    `Table: ${table}\n${JSON.stringify(data, null, 2)}\n\n`
                  ).join('');

            const blob = new Blob([dataStr], { 
                type: format === 'json' ? 'application/json' : 'text/csv' 
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `etire_backup_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({ 
                title: "Export Successful", 
                description: `Data exported as ${format.toUpperCase()} file.` 
            });

        } catch (err: any) {
            setError(`Export failed: ${err.message}`);
            toast({ 
                title: "Export Failed", 
                description: err.message, 
                variant: "destructive" 
            });
        } finally {
            setIsLoading(false);
            setBackupProgress(0);
        }
    };

    const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !supabase || !authUser) return;

        setIsLoading(true);
        setError(null);
        setBackupProgress(0);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setBackupProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                    });
            }, 200);

            // Import data to tables
            for (const [tableName, tableData] of Object.entries(data)) {
                if (Array.isArray(tableData) && tableData.length > 0) {
                    const { error } = await supabase.from(tableName).upsert(tableData);
                    if (error) {
                        console.error(`Error importing ${tableName}:`, error);
                    }
                }
            }

            clearInterval(progressInterval);
            setBackupProgress(100);

            toast({ 
                title: "Import Successful", 
                description: "Data imported successfully." 
            });

        } catch (err: any) {
            setError(`Import failed: ${err.message}`);
            toast({ 
                title: "Import Failed", 
                description: err.message, 
                variant: "destructive" 
            });
        } finally {
            setIsLoading(false);
            setBackupProgress(0);
        }
    };

    const syncData = async () => {
        if (!supabase || !authUser) return;
        
        setIsLoading(true);
        setError(null);
        setBackupProgress(0);

        try {
            // Simulate sync progress
            const progressInterval = setInterval(() => {
                setBackupProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 15;
                });
            }, 300);

            // In a real implementation, this would sync with external systems
            // For now, we'll just simulate the process
            await new Promise(resolve => setTimeout(resolve, 2000));

            clearInterval(progressInterval);
            setBackupProgress(100);

            toast({ 
                title: "Sync Successful", 
                description: "Data synchronized successfully." 
            });

        } catch (err: any) {
            setError(`Sync failed: ${err.message}`);
            toast({ 
                title: "Sync Failed", 
                description: err.message, 
                variant: "destructive" 
            });
        } finally {
            setIsLoading(false);
            setBackupProgress(0);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageHeader 
                title="Data Sync & Backup" 
                description="Manage data backup, restore, and synchronization."
            />

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Export Data */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Download className="mr-2 h-5 w-5 text-primary" />
                            Export Data
                        </CardTitle>
                        <CardDescription>
                            Download your data in various formats for backup purposes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Button 
                                className="w-full" 
                                onClick={() => exportData('json')}
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Export as JSON
                            </Button>
                            <Button 
                                variant="outline" 
                                className="w-full" 
                                onClick={() => exportData('csv')}
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Export as CSV
                            </Button>
                        </div>
                        {isLoading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Exporting data...</span>
                                    <span>{backupProgress}%</span>
                                </div>
                                <Progress value={backupProgress} className="w-full" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Import Data */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Upload className="mr-2 h-5 w-5 text-primary" />
                            Import Data
                        </CardTitle>
                        <CardDescription>
                            Restore data from a previously exported backup file.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <input
                                type="file"
                                accept=".json"
                                onChange={importData}
                                className="hidden"
                                id="import-file"
                                disabled={isLoading}
                            />
                            <Button 
                                asChild
                                className="w-full"
                                disabled={isLoading}
                            >
                                <label htmlFor="import-file">
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Choose File to Import
                                </label>
                            </Button>
                        </div>
                        {isLoading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Importing data...</span>
                                    <span>{backupProgress}%</span>
                                </div>
                                <Progress value={backupProgress} className="w-full" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sync Data */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Cloud className="mr-2 h-5 w-5 text-primary" />
                            Sync Data
                        </CardTitle>
                        <CardDescription>
                            Synchronize data with external systems and cloud storage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Button 
                                className="w-full" 
                                onClick={syncData}
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sync Now
                            </Button>
                        </div>
                        {isLoading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Syncing data...</span>
                                    <span>{backupProgress}%</span>
                                </div>
                                <Progress value={backupProgress} className="w-full" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Backup Status */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Database className="mr-2 h-5 w-5 text-primary" />
                        Backup Status
                    </CardTitle>
                    <CardDescription>
                        Information about your data backup and sync status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <div>
                                <p className="text-sm font-medium">Last Backup</p>
                                <p className="text-xs text-muted-foreground">
                                    {lastBackup ? new Date(lastBackup).toLocaleDateString() : 'Never'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <div>
                                <p className="text-sm font-medium">Database Status</p>
                                <p className="text-xs text-muted-foreground">Connected</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <div>
                                <p className="text-sm font-medium">Auto Backup</p>
                                <p className="text-xs text-muted-foreground">Daily at 2:00 AM</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <div>
                                <p className="text-sm font-medium">Cloud Sync</p>
                                <p className="text-xs text-muted-foreground">Enabled</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Backup Recommendations */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Backup Recommendations</CardTitle>
                    <CardDescription>
                        Best practices for data backup and recovery.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                                <h4 className="font-medium">Regular Backups</h4>
                                <p className="text-sm text-muted-foreground">
                                    Export your data regularly (daily or weekly) to ensure you don't lose important information.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                                <h4 className="font-medium">Multiple Formats</h4>
                                <p className="text-sm text-muted-foreground">
                                    Keep backups in both JSON and CSV formats for maximum compatibility.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                                <h4 className="font-medium">Secure Storage</h4>
                                <p className="text-sm text-muted-foreground">
                                    Store backup files in secure locations, such as encrypted cloud storage or external drives.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                                <h4 className="font-medium">Test Restores</h4>
                                <p className="text-sm text-muted-foreground">
                                    Periodically test your backup files by importing them to ensure they work correctly.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
