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
import { useToast } from "@/hooks/use-toast";
import {
    Loader2, AlertTriangle, Download, Upload, Database, Cloud,
    CheckCircle, Clock, RefreshCw, Shield, HardDrive, Server,
    Archive, FileText, CloudUpload, Settings, Check, FileCheck,
    CloudCheck, DatabaseBackup, FileJson, FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TABLE_DEPENDENCY_ORDER } from '@/lib/backupTables';

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
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [backupProgress, setBackupProgress] = useState(0);
    const [lastBackup, setLastBackup] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [currentAction, setCurrentAction] = useState<'export' | 'import' | 'sync' | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState("");
    const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load last backup time from local storage (from leader's version)
    useEffect(() => {
        const storedDate = localStorage.getItem('etire_last_backup');
        if (storedDate) setLastBackup(storedDate);
        setLastUpdated(new Date());
        setMounted(true);
    }, []);

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
        setTimeout(() => {
            setBackupProgress(0);
            setStatusMessage("");
        }, 2000);
    };

    // 🟢 HELPER: Convert JSON Array to CSV String (from leader's version)
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

    // 🟢 ENHANCED EXPORT FUNCTION (from leader's version with our UI)
    const exportData = async (format: 'json' | 'csv') => {
        if (!authUser) return;

        setCurrentAction('export');
        setIsLoading(true);
        setError(null);
        setBackupProgress(5);
        setStatusMessage("Requesting secure export...");

        try {
            const response = await fetch(`/api/backup/export`);
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || 'Failed to export backup data.');
            }

            const serverPayload = await response.json();
            const tables = serverPayload.tables || {};
            const exportedTables = serverPayload.tableCount ?? Object.keys(tables).length;

            setStatusMessage("Preparing download package...");
            setBackupProgress(85);

            const exportPayload = {
                meta: {
                    version: "1.0",
                    exported_at: new Date().toISOString(),
                    exported_by: authUser.name
                },
                tables
            };

            let blob: Blob;
            let filename: string;

            if (format === 'json') {
                blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
                filename = `etire_backup_${new Date().toISOString().split('T')[0]}.json`;
            } else {
                let csvContent = "";
                for (const tableName of TABLE_DEPENDENCY_ORDER) {
                    const tableRows = tables[tableName];
                    if (tableRows && tableRows.length > 0) {
                        csvContent += `\n\n--- TABLE: ${tableName.toUpperCase()} ---\n`;
                        csvContent += convertToCSV(tableRows);
                    }
                }
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

            const now = new Date().toISOString();
            setLastBackup(now);
            localStorage.setItem('etire_last_backup', now);
            setLastUpdated(new Date());

            showSuccess(`${format.toUpperCase()} backup downloaded successfully. ${exportedTables} tables exported.`);

        } catch (err: any) {
            setError(`Export failed: ${err.message}`);
            toast({
                title: "Export Failed",
                description: err.message,
                variant: "destructive"
            });
            setIsLoading(false);
            setBackupProgress(0);
            setStatusMessage("");
        }
    };

    // 🟢 ENHANCED IMPORT FUNCTION (from leader's version with our UI)
    const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !supabase || !authUser) return;

        // Show file info before starting import
        setFileInfo({
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
        });

        // Reset input so the same file can be selected again if needed
        event.target.value = '';

        if (!window.confirm("WARNING: Importing data will overwrite existing records with matching IDs. This action cannot be undone. Are you sure?")) {
            setFileInfo(null);
            return;
        }

        setCurrentAction('import');
        setIsLoading(true);
        setError(null);
        setBackupProgress(0);
        setStatusMessage("Reading file...");

        try {
            const text = await file.text();
            const parsedBackup = JSON.parse(text);

            if (!parsedBackup.tables || !parsedBackup.meta) {
                throw new Error("Invalid backup file format. Missing 'tables' or 'meta' data.");
            }

            setStatusMessage("Uploading backup to server...");
            setBackupProgress(35);

            const response = await fetch('/api/backup/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    data: parsedBackup
                })
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || 'Failed to import backup data.');
            }

            const result = await response.json();

            setStatusMessage("Finalizing...");
            setBackupProgress(100);

            setLastUpdated(new Date());
            showSuccess(`Data successfully imported from ${file.name}. ${result.restoredTables ?? Object.keys(parsedBackup.tables).length} tables restored.`);

        } catch (err: any) {
            console.error(err);
            setError(`Import failed: ${err.message}`);
            toast({
                title: "Import Failed",
                description: err.message,
                variant: "destructive"
            });
            setIsLoading(false);
            setBackupProgress(0);
            setStatusMessage("");
        } finally {
            setFileInfo(null);
        }
    };

    // 🟢 ENHANCED SYNC FUNCTION (from leader's version with our UI)
    const syncData = async () => {
        if (!authUser) return;

        setCurrentAction('sync');
        setIsLoading(true);
        setError(null);
        setBackupProgress(15);
        setStatusMessage("Requesting secure sync...");

        try {
            const response = await fetch('/api/backup/sync', { method: 'POST' });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || 'Failed to sync backup data.');
            }

            const result = await response.json();

            setBackupProgress(100);
            setStatusMessage("Sync Complete");

            setLastUpdated(new Date());
            showSuccess(`Cloud sync successful! Database backed up to cloud as ${result.fileName}.`);

        } catch (err: any) {
            console.error(err);
            setError(`Sync failed: ${err.message}`);
            toast({
                title: "Sync Failed",
                description: "Could not upload to cloud storage. Check your network or storage permissions.",
                variant: "destructive"
            });
            setIsLoading(false);
            setBackupProgress(0);
            setStatusMessage("");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleRefresh = () => {
        const storedDate = localStorage.getItem('etire_last_backup');
        if (storedDate) setLastBackup(storedDate);
        setLastUpdated(new Date());
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
        return statusMessage || "Please wait while we process your request...";
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="w-full px-3 py-4">

                {/* Compact Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold text-foreground">
                            Data Backup & Sync
                        </h1>
                        {lastUpdated && (
                            <span className="text-sm text-muted-foreground hidden sm:inline">
                                <Clock className="inline h-3.5 w-3.5 mr-1" />
                                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                        )}
                    </div>
                    <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
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
                                        <FileJson className="h-5 w-5 mr-2" />
                                        JSON Backup
                                    </Button>
                                    <Button
                                        onClick={() => exportData('csv')}
                                        disabled={isLoading}
                                        className="h-14 font-poppins bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                                    >
                                        <FileSpreadsheet className="h-5 w-5 mr-2" />
                                        CSV Report
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-slate-800 font-poppins flex items-center gap-2">
                                    <Upload className="h-5 w-5 text-blue-600" />
                                    Restore Data
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
                            </div>

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
                            </div>

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
        </div>
    );
}