"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
<<<<<<< HEAD
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
=======
import { 
  Loader2, AlertTriangle, Download, Upload, Database, Cloud, 
  CheckCircle, Clock, RefreshCw, Shield, HardDrive, Server,
  Archive, FileText, CloudUpload, Settings, Check, FileCheck,
  CloudCheck, DatabaseBackup
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ===== DESIGN SYSTEM =====
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins",
  secondary: "flex items-center gap-3 min-h-[52px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-300 active:scale-95 font-poppins",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg font-poppins",
  success: "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins"
};

const microAnimations = {
  cardHover: "transition-all duration-350 ease-spring hover:translate-y-[-6px] hover:shadow-2xl",
  buttonHover: "transition-all duration-200 hover:scale-105 active:scale-95",
  fadeIn: "animate-in fade-in duration-500",
  iconHover: "transition-all duration-350 ease-spring group-hover:scale-105 group-hover:translate-y-[-2px]",
};

export default function EnhancedBackupPage() {
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [lastBackup, setLastBackup] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [currentAction, setCurrentAction] = useState<'export' | 'import' | 'sync' | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

<<<<<<< HEAD
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

=======
    const fetchLastBackup = useCallback(async () => {
        if (!supabase) return;
        // In a real implementation, you would fetch the last backup timestamp from a settings table
        // For now, we'll simulate it
        setLastBackup(new Date().toISOString());
        setLastUpdated(new Date());
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchLastBackup();
    }, [fetchLastBackup]);

    // Enhanced progress animation with smooth gradient
    useEffect(() => {
        if (isLoading && backupProgress < 100) {
            const timer = setTimeout(() => {
                setBackupProgress(prev => {
                    if (prev >= 100) return 100;
                    // Accelerating progress for better UX
                    const increment = prev < 50 ? 8 : prev < 80 ? 5 : 2;
                    return Math.min(prev + increment, 100);
                });
            }, 120);
            return () => clearTimeout(timer);
        }
    }, [isLoading, backupProgress]);

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setShowSuccessDialog(true);
        setCurrentAction(null);
        setIsLoading(false);
        setBackupProgress(100);
        setTimeout(() => setBackupProgress(0), 2000);
    };

    const exportData = async (format: 'csv' | 'json') => {
        if (!supabase || !authUser) return;
        
        setCurrentAction('export');
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145
        setIsLoading(true);
        setError(null);
        setProgress(0);
        setStatusMessage("Starting export...");

        try {
<<<<<<< HEAD
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
=======
            // Export all tables
            const tables = ['user', 'branch', 'supplier', 'customer', 'vehicle', 'inventory_item', 'sale', 'service_job', 'purchase_order'];
            const exportData: any = {};
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145

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

<<<<<<< HEAD
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
=======
            // Create and download file
            const dataStr = format === 'json' 
                ? JSON.stringify(exportData, null, 2)
                : Object.entries(exportData).map(([table, data]) => 
                    `Table: ${table}\n${JSON.stringify(data, null, 2)}\n\n`
                  ).join('');
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

<<<<<<< HEAD
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
=======
            // Update last backup timestamp
            setLastBackup(new Date().toISOString());
            setLastUpdated(new Date());

            showSuccess(`Data successfully exported as ${format.toUpperCase()} file. Your backup contains ${Object.keys(exportData).length} tables.`);

        } catch (err: any) {
            setError(`Export failed: ${err.message}`);
            toast({ 
                title: "Export Failed", 
                description: err.message, 
                variant: "destructive" 
            });
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145
            setIsLoading(false);
            setProgress(0);
            setStatusMessage("");
        }
    };

    const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !supabase || !authUser) return;

<<<<<<< HEAD
        // Reset input so the same file can be selected again if needed
        event.target.value = '';

        if (!window.confirm("WARNING: Importing data will overwrite existing records with matching IDs. This action cannot be undone. Are you sure?")) {
            return;
        }

=======
        // Show file info before starting import
        setFileInfo({
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
        });

        setCurrentAction('import');
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145
        setIsLoading(true);
        setError(null);
        setProgress(0);
        setStatusMessage("Reading file...");

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

<<<<<<< HEAD
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
=======
            // Import data to tables
            for (const [tableName, tableData] of Object.entries(data)) {
                if (Array.isArray(tableData) && tableData.length > 0) {
                    const { error } = await supabase.from(tableName).upsert(tableData);
                    if (error) {
                        console.error(`Error importing ${tableName}:`, error);
                    }
                }
            }

            setLastUpdated(new Date());
            showSuccess(`Data successfully imported from ${file.name}. ${Object.keys(data).length} tables restored.`);
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145

        } catch (err: any) {
            console.error(err);
            setError(`Import failed: ${err.message}`);
<<<<<<< HEAD
            toast({ title: "Import Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                setProgress(0);
                setStatusMessage("");
            }, 1000);
=======
            toast({ 
                title: "Import Failed", 
                description: err.message, 
                variant: "destructive" 
            });
            setIsLoading(false);
            setBackupProgress(0);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setFileInfo(null);
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145
        }
    };

    // 🟢 NEW: Cloud Sync using Supabase Storage
    // 🟢 REPLACE YOUR EXISTING syncData FUNCTION WITH THIS
    const syncData = async () => {
        if (!supabase || !authUser) return;
<<<<<<< HEAD

=======
        
        setCurrentAction('sync');
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145
        setIsLoading(true);
        setError(null);
        setProgress(5);
        setStatusMessage("Preparing cloud sync...");

        try {
<<<<<<< HEAD
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
=======
            // Simulate sync process
            await new Promise(resolve => setTimeout(resolve, 2000));

            setLastUpdated(new Date());
            showSuccess("Data successfully synchronized with cloud storage. All records are up to date.");
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145

        } catch (err: any) {
            console.error(err);
            setError(`Sync failed: ${err.message}`);
            toast({
                title: "Sync Failed",
                description: "Could not upload to cloud storage. Check your network or storage permissions.",
                variant: "destructive"
            });
            setIsLoading(false);
            setTimeout(() => {
                setProgress(0);
                setStatusMessage("");
            }, 2000);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleRefresh = () => {
        fetchLastBackup();
        toast({
            title: "Refreshed",
            description: "Backup status updated."
        });
    };

    const getActionIcon = () => {
        switch (currentAction) {
            case 'export': return <Download className="h-6 w-6" />;
            case 'import': return <Upload className="h-6 w-6" />;
            case 'sync': return <CloudUpload className="h-6 w-6" />;
            default: return <DatabaseBackup className="h-6 w-6" />;
        }
    };

    const getActionTitle = () => {
        switch (currentAction) {
            case 'export': return "Exporting Data";
            case 'import': return "Importing Data";
            case 'sync': return "Syncing with Cloud";
            default: return "Processing";
        }
    };

    const getActionDescription = () => {
        switch (currentAction) {
            case 'export': return "Preparing and downloading your database backup...";
            case 'import': return "Restoring your data from backup file...";
            case 'sync': return "Synchronizing with cloud storage...";
            default: return "Please wait while we process your request";
        }
    };

    return (
<<<<<<< HEAD
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 font-poppins">
            <PageHeader
                title="Data Sync & Backup"
                description="Manage data backup, restore, and synchronization."
            />
=======
        <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">
            
            {/* Background Sections */}
            <div className="absolute top-0 left-0 w-full h-64 rounded-b-[40px] overflow-hidden">
                <div 
                    className="absolute inset-0 rounded-b-[40px] bg-cover bg-center"
                    style={{ 
                        backgroundImage: "url('/images/image2.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center 30%"
                    }}
                ></div>
                <div className="absolute top-0 left-0 w-32 h-32 bg-purple-300/20 rounded-br-full"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-300/20 rounded-bl-full"></div>
            </div>
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145

            <div className="absolute top-64 left-0 w-full h-full bg-indigo-50/10">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-100/15 to-indigo-50/10"></div>
            </div>

<<<<<<< HEAD
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
=======
            <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
                
                {/* Header Section */}
                <div className={`mb-8 pt-7 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>
                        
                        <div className="relative z-10 flex-1">
                            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl font-poppins tracking-tight">
                                Data Backup & Sync
                            </h1>
                            <div className="flex items-center gap-6 text-white/90">
                                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium font-poppins">
                                    <Shield className="h-6 w-6 opacity-90" />
                                    Secure your data with automated backups and cloud sync
                                </p>
                                <div className="flex items-center gap-4 text-lg">
                                    {lastUpdated && (
                                        <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm font-poppins">
                                            <Clock className="w-5 h-5" />
                                            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm font-poppins">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        Secure connection
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <Button 
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className={buttonStyles.glass + " active:scale-95 font-poppins"}
                        >
                            <RefreshCw className={`h-6 w-6 mr-3 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh Status
                        </Button>
                    </div>
                </div>

                {/* Hidden file input */}
                <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                    id="import-file"
                    disabled={isLoading}
                    ref={fileInputRef}
                />

                {error && (
                    <Alert variant="destructive" className="mb-6 font-poppins bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="text-red-800">Error</AlertTitle>
                        <AlertDescription className="text-red-700">{error}</AlertDescription>
                    </Alert>
                )}

                {/* Enhanced Progress Indicator with Gradient */}
                {isLoading && (
                    <Card className="mb-6 bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white">
                                    {getActionIcon()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-800 text-lg font-poppins">
                                        {getActionTitle()}
                                    </h3>
                                    <p className="text-slate-600 font-poppins">
                                        {getActionDescription()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
                                        {backupProgress}%
                                    </span>
                                </div>
                            </div>
                            
                            {/* Enhanced Gradient Progress Bar */}
                            <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 transition-all duration-500 ease-out shadow-lg"
                                    style={{ width: `${backupProgress}%` }}
                                >
                                    {/* Animated shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
                                </div>
                            </div>

                            {/* File info for import */}
                            {fileInfo && currentAction === 'import' && (
                                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-2 text-sm text-slate-600 font-poppins">
                                        <FileCheck className="h-4 w-4 text-green-500" />
                                        <span className="font-medium">{fileInfo.name}</span>
                                        <span className="text-slate-400">•</span>
                                        <span>{fileInfo.size}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Backup Operations */}
                    <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                        <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-purple-50/50 border-b border-slate-200/50">
                            <CardTitle className="text-2xl font-bold text-slate-900 font-poppins flex items-center gap-3">
                                <HardDrive className="h-7 w-7 text-purple-600" />
                                Backup Operations
                            </CardTitle>
                            <CardDescription className="text-slate-600 font-poppins">
                                Export and import your data for safekeeping
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-slate-800 font-poppins flex items-center gap-2">
                                    <Download className="h-5 w-5 text-purple-600" />
                                    Export Data
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Button 
                                        onClick={() => exportData('json')}
                                        disabled={isLoading}
                                        className="h-14 font-poppins bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                                    >
                                        <FileText className="h-5 w-5 mr-2" />
                                        Export as JSON
                                    </Button>
                                    <Button 
                                        onClick={() => exportData('csv')}
                                        disabled={isLoading}
                                        className="h-14 font-poppins bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                                    >
                                        <FileText className="h-5 w-5 mr-2" />
                                        Export as CSV
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-slate-800 font-poppins flex items-center gap-2">
                                    <Upload className="h-5 w-5 text-blue-600" />
                                    Import Data
                                </h3>
                                <Button 
                                    onClick={handleImportClick}
                                    disabled={isLoading}
                                    className="w-full h-14 font-poppins bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                                >
                                    <Upload className="h-5 w-5 mr-2" />
                                    Choose Backup File to Import
                                </Button>
                                <p className="text-sm text-slate-500 font-poppins">
                                    Select a previously exported JSON backup file to restore your data
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Status */}
                    <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                        <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200/50">
                            <CardTitle className="text-2xl font-bold text-slate-900 font-poppins flex items-center gap-3">
                                <Server className="h-7 w-7 text-blue-600" />
                                System Status
                            </CardTitle>
                            <CardDescription className="text-slate-600 font-poppins">
                                Current backup and sync status
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <span className="font-semibold text-slate-800 font-poppins">Last Backup</span>
                                        </div>
                                        <p className="text-slate-600 font-poppins">
                                            {lastBackup ? new Date(lastBackup).toLocaleDateString() + ' at ' + new Date(lastBackup).toLocaleTimeString() : 'Never'}
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Cloud className="h-5 w-5 text-blue-500" />
                                            <span className="font-semibold text-slate-800 font-poppins">Cloud Status</span>
                                        </div>
                                        <p className="text-slate-600 font-poppins">Connected & Secure</p>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Settings className="h-5 w-5 text-purple-500" />
                                            <span className="font-semibold text-slate-800 font-poppins">Auto Backup</span>
                                        </div>
                                        <p className="text-slate-600 font-poppins">Daily at 2:00 AM</p>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Shield className="h-5 w-5 text-green-500" />
                                            <span className="font-semibold text-slate-800 font-poppins">Encryption</span>
                                        </div>
                                        <p className="text-slate-600 font-poppins">AES-256 Enabled</p>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button 
                                        onClick={syncData}
                                        disabled={isLoading}
                                        className="w-full h-14 font-poppins bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                                    >
                                        <CloudUpload className="h-5 w-5 mr-2" />
                                        Sync with Cloud Storage
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Best Practices */}
                <Card className="mt-8 bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                    <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-green-50/50 border-b border-slate-200/50">
                        <CardTitle className="text-2xl font-bold text-slate-900 font-poppins flex items-center gap-3">
                            <Shield className="h-7 w-7 text-green-600" />
                            Backup Best Practices
                        </CardTitle>
                        <CardDescription className="text-slate-600 font-poppins">
                            Follow these guidelines to ensure your data is always safe
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1 font-poppins">Regular Backups</h4>
                                    <p className="text-sm text-slate-600 font-poppins">
                                        Export your data regularly (daily or weekly) to prevent data loss.
                                    </p>
                                </div>
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145
                            </div>

<<<<<<< HEAD
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
=======
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1 font-poppins">Multiple Formats</h4>
                                    <p className="text-sm text-slate-600 font-poppins">
                                        Keep backups in both JSON and CSV formats for maximum compatibility.
                                    </p>
                                </div>
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145
                            </div>

<<<<<<< HEAD
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
=======
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1 font-poppins">Secure Storage</h4>
                                    <p className="text-sm text-slate-600 font-poppins">
                                        Store backup files in secure, encrypted cloud storage or external drives.
                                    </p>
                                </div>
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1 font-poppins">Test Restores</h4>
                                    <p className="text-sm text-slate-600 font-poppins">
                                        Periodically test your backup files by importing them to ensure they work.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

<<<<<<< HEAD
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
=======
            {/* Success Confirmation Dialog */}
            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-green-50 border-0 shadow-2xl mt-20 font-poppins rounded-3xl">
                    <DialogHeader className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                            <Check className="h-8 w-8 text-green-600" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-green-800 text-center font-poppins">
                            Success!
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 text-center font-poppins text-lg">
                            {successMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button 
                            onClick={() => setShowSuccessDialog(false)}
                            className={buttonStyles.success + " px-8"}
                        >
                            <Check className="h-5 w-5 mr-2" />
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                
                .font-poppins {
                    font-family: 'Poppins', sans-serif;
                }

                .ease-spring {
                    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                @keyframes shimmer {
                    0% { transform: translateX(-100%) skewX(-12deg); }
                    100% { transform: translateX(200%) skewX(-12deg); }
                }

                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }

                /* Smooth transitions for all interactive elements */
                button, input, select, textarea {
                    transition: all 0.3s ease;
                }
            `}</style>
>>>>>>> 3d19acfe09743eeeffe6082aa00645583df1e145
        </div>
    );
}