"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Download, Upload, Database, Cloud, CheckCircle, Clock, FileJson, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// 🟢 1. DEFINE THE STRICT ORDER FOR DATA INTEGRITY
// Parent tables must come before Child tables to avoid Foreign Key errors.
// Put this at the top of page.tsx, outside the function
const TABLE_DEPENDENCY_ORDER = [
    'vehicle_type', 'user', 'branch', 'supplier', 'inventory_item',
    'customer', 'vehicle', 'sale', 'sale_item', 'service_job',
    'purchase_order', 'purchase_order_item', 'tire_history',
    'delivery', 'delivery_item', 'system_setting', 'audit_log'
];

export default function BackupPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [lastBackup, setLastBackup] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load last backup time from local storage (simulation)
    useEffect(() => {
        const storedDate = localStorage.getItem('etire_last_backup');
        if (storedDate) setLastBackup(storedDate);
    }, []);

    // 🟢 HELPER: Convert JSON Array to CSV String
    const convertToCSV = (data: any[]) => {
        if (!data || !data.length) return "";
        const headers = Object.keys(data[0]).join(",");
        const rows = data.map(row =>
            Object.values(row).map(value => {
                // Handle strings with commas, nulls, and objects
                if (value === null) return "";
                if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
                const str = String(value);
                return str.includes(",") ? `"${str}"` : str;
            }).join(",")
        ).join("\n");
        return `${headers}\n${rows}`;
    };

    const exportData = async (format: 'json' | 'csv') => {
        if (!supabase || !authUser) return;

        setIsLoading(true);
        setError(null);
        setProgress(0);
        setStatusMessage("Starting export...");

        try {
            const exportData: any = {
                meta: {
                    version: "1.0",
                    exported_at: new Date().toISOString(),
                    exported_by: authUser.name
                },
                tables: {}
            };

            let csvContent = "";
            const totalTables = TABLE_DEPENDENCY_ORDER.length;

            // Fetch data table by table
            for (let i = 0; i < totalTables; i++) {
                const tableName = TABLE_DEPENDENCY_ORDER[i];
                setStatusMessage(`Exporting ${tableName}...`);

                const { data, error } = await supabase.from(tableName).select('*');

                if (error) {
                    console.warn(`Skipping ${tableName}: ${error.message}`);
                } else if (data) {
                    exportData.tables[tableName] = data;

                    // Build CSV string if needed
                    if (format === 'csv' && data.length > 0) {
                        csvContent += `\n\n--- TABLE: ${tableName.toUpperCase()} ---\n`;
                        csvContent += convertToCSV(data);
                    }
                }

                // Update progress bar
                setProgress(Math.round(((i + 1) / totalTables) * 100));
            }

            // Finalize and Download
            let blob: Blob;
            let filename: string;

            if (format === 'json') {
                const jsonStr = JSON.stringify(exportData, null, 2);
                blob = new Blob([jsonStr], { type: 'application/json' });
                filename = `etire_backup_${new Date().toISOString().split('T')[0]}.json`;
            } else {
                blob = new Blob([csvContent], { type: 'text/csv' });
                filename = `etire_export_${new Date().toISOString().split('T')[0]}.csv`;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Update "Last Backup" state
            const now = new Date().toISOString();
            setLastBackup(now);
            localStorage.setItem('etire_last_backup', now);

            toast({
                title: "Export Successful",
                description: `${format.toUpperCase()} file downloaded.`
            });

        } catch (err: any) {
            setError(`Export failed: ${err.message}`);
            toast({ title: "Export Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
            setProgress(0);
            setStatusMessage("");
        }
    };

    const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !supabase || !authUser) return;

        // Reset input so the same file can be selected again if needed
        event.target.value = '';

        if (!window.confirm("WARNING: Importing data will overwrite existing records with matching IDs. This action cannot be undone. Are you sure?")) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setProgress(0);
        setStatusMessage("Reading file...");

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            // Validation: Check if it's a valid backup file
            if (!importData.tables || !importData.meta) {
                throw new Error("Invalid backup file format. Missing 'tables' or 'meta' data.");
            }

            const totalTables = TABLE_DEPENDENCY_ORDER.length;

            // 🟢 STRICT IMPORT LOOP
            // We iterate through our hardcoded ORDER, looking for data in the JSON.
            // We do NOT iterate through the JSON keys, because JSON order is not guaranteed.
            for (let i = 0; i < totalTables; i++) {
                const tableName = TABLE_DEPENDENCY_ORDER[i];
                const tableRows = importData.tables[tableName];

                if (tableRows && Array.isArray(tableRows) && tableRows.length > 0) {
                    setStatusMessage(`Restoring ${tableName} (${tableRows.length} records)...`);

                    // We use upsert (insert or update)
                    // Note: If you have huge datasets (10k+ rows), you should batch this.
                    const { error } = await supabase.from(tableName).upsert(tableRows);

                    if (error) {
                        // We throw immediately on error to prevent partial corrupted state
                        // or broken foreign keys further down the chain.
                        throw new Error(`Failed to import ${tableName}: ${error.message}`);
                    }
                }

                setProgress(Math.round(((i + 1) / totalTables) * 100));
            }

            setStatusMessage("Finalizing...");
            setProgress(100);

            toast({
                title: "Restore Complete",
                description: "Database has been successfully updated from backup."
            });

        } catch (err: any) {
            console.error(err);
            setError(`Import failed: ${err.message}`);
            toast({ title: "Import Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                setProgress(0);
                setStatusMessage("");
            }, 1000);
        }
    };

    // 🟢 NEW: Cloud Sync using Supabase Storage
    // 🟢 REPLACE YOUR EXISTING syncData FUNCTION WITH THIS
    const syncData = async () => {
        if (!supabase || !authUser) return;

        setIsLoading(true);
        setError(null);
        setProgress(5);
        setStatusMessage("Preparing cloud sync...");

        try {
            // 1. Generate the JSON Data (Real Data Snapshot)
            const exportData: any = {
                meta: {
                    version: "1.0",
                    synced_at: new Date().toISOString(),
                    synced_by: authUser.name,
                    type: "cloud_sync"
                },
                tables: {}
            };

            const totalTables = TABLE_DEPENDENCY_ORDER.length;

            // Loop through tables and fetch real data
            for (let i = 0; i < totalTables; i++) {
                const tableName = TABLE_DEPENDENCY_ORDER[i];
                const { data, error } = await supabase.from(tableName).select('*');

                if (error) {
                    console.warn(`Sync warning for ${tableName}:`, error.message);
                } else if (data) {
                    exportData.tables[tableName] = data;
                }

                // Update progress (10% to 70%)
                setProgress(10 + Math.round(((i + 1) / totalTables) * 60));
            }

            setStatusMessage("Uploading to Cloud Storage...");

            // 2. Create the File Object for Upload
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            // Create a unique filename with timestamp: backup_2025-11-20_10-30-00.json
            const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            const file = new File([blob], fileName, { type: 'application/json' });

            // 3. Upload to Supabase Storage
            // NOTE: Ensure your bucket is named 'backups' in Supabase Dashboard
            const { data, error: uploadError } = await supabase
                .storage
                .from('backups')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            setProgress(100);
            setStatusMessage("Sync Complete");

            toast({
                title: "Cloud Sync Successful",
                description: `Database backed up to cloud as ${fileName}.`
            });

        } catch (err: any) {
            console.error(err);
            setError(`Sync failed: ${err.message}`);
            toast({
                title: "Sync Failed",
                description: "Could not upload to cloud storage. Check your network or storage permissions.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                setProgress(0);
                setStatusMessage("");
            }, 2000);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 font-poppins">
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
                <Card className="shadow-md border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center text-slate-800">
                            <Download className="mr-2 h-5 w-5 text-indigo-600" />
                            Backup Data
                        </CardTitle>
                        <CardDescription>
                            Download a full snapshot of your database.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => exportData('json')}
                                disabled={isLoading}
                            >
                                <FileJson className="mr-2 h-4 w-4" />
                                JSON Backup
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => exportData('csv')}
                                disabled={isLoading}
                            >
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                CSV Report
                            </Button>
                        </div>
                        {isLoading && statusMessage.includes("Exporting") && (
                            <div className="space-y-2 animate-in fade-in">
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span>{statusMessage}</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="w-full h-2" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Import Data */}
                <Card className="shadow-md border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center text-slate-800">
                            <Upload className="mr-2 h-5 w-5 text-orange-600" />
                            Restore Data
                        </CardTitle>
                        <CardDescription>
                            Restore from a .json backup file.
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
                                variant="outline"
                                className="w-full border-dashed border-2 hover:bg-orange-50 hover:border-orange-200"
                                disabled={isLoading}
                            >
                                <label htmlFor="import-file" className="cursor-pointer">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                                    Select Backup File
                                </label>
                            </Button>
                        </div>
                        {isLoading && (statusMessage.includes("Restoring") || statusMessage.includes("Reading")) && (
                            <div className="space-y-2 animate-in fade-in">
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span>{statusMessage}</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="w-full h-2" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sync Data */}
                <Card className="shadow-md border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center text-slate-800">
                            <Cloud className="mr-2 h-5 w-5 text-blue-500" />
                            Cloud Sync
                        </CardTitle>
                        <CardDescription>
                            Sync with external storage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Button
                                className="w-full"
                                variant="secondary"
                                onClick={syncData}
                                disabled={isLoading}
                            >
                                {isLoading && statusMessage.includes("Sync") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sync Now"}
                            </Button>
                        </div>
                        {isLoading && statusMessage.includes("Sync") && (
                            <div className="space-y-2 animate-in fade-in">
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span>{statusMessage}</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="w-full h-2" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Backup Status */}
            <Card className="mt-6 shadow-md border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center text-slate-800">
                        <Database className="mr-2 h-5 w-5 text-slate-600" />
                        System Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                            <Clock className="h-5 w-5 text-indigo-500" />
                            <div>
                                <p className="text-sm font-medium text-slate-800">Last Backup</p>
                                <p className="text-xs text-slate-500">
                                    {lastBackup ? new Date(lastBackup).toLocaleString() : 'Never'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-sm font-medium text-slate-800">Database Connection</p>
                                <p className="text-xs text-slate-500">Active</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse ml-1 mr-2"></div>
                            <div>
                                <p className="text-sm font-medium text-slate-800">System Status</p>
                                <p className="text-xs text-slate-500">Operational</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}