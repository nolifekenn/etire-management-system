"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, AlertTriangle, Download, Upload, Database,
  CheckCircle, Clock, RefreshCw, Shield, HardDrive, Server,
  CloudUpload, FileJson, FileSpreadsheet, CalendarClock,
  FolderOpen, FileText, Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TABLE_DEPENDENCY_ORDER } from "@/lib/backupTables";
import { supabase } from "@/lib/supabaseClient";

// ── Auto-backup schedule ───────────────────────────────────────────────────
const AUTO_BACKUP_HOURS = [10, 17]; // 10:00 AM and 5:00 PM

function getNextBackupTime(): Date {
  const now = new Date();
  const candidates = AUTO_BACKUP_HOURS.map((h) => {
    const d = new Date(now);
    d.setHours(h, 0, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  });
  return candidates.reduce((a, b) => (a < b ? a : b));
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Running…";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${h}h ${m}m ${s}s`;
}

function fmtSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface BackupFile {
  name: string;
  id?: string;
  metadata?: { size?: number; mimetype?: string };
  created_at?: string;
  updated_at?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function BackupPage() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const [isLoading, setIsLoading]           = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [statusMessage, setStatusMessage]   = useState("");
  const [currentAction, setCurrentAction]   = useState<"export" | "import" | "cloud" | null>(null);
  const [error, setError]                   = useState<string | null>(null);

  const [lastBackup, setLastBackup]         = useState<string | null>(null);
  const [countdown, setCountdown]           = useState<string>("");
  const [nextTime, setNextTime]             = useState<Date | null>(null);

  const [bucketFiles, setBucketFiles]       = useState<BackupFile[]>([]);
  const [loadingFiles, setLoadingFiles]     = useState(false);

  const [successMsg, setSuccessMsg]         = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Confirmation dialog
  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [pendingAction, setPendingAction]   = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle]     = useState("");
  const [confirmDesc, setConfirmDesc]       = useState("");

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const autoBackupRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── First mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("etire_last_backup");
    if (stored) setLastBackup(stored);
    loadBucketFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown ticker ──────────────────────────────────────────────────
  useEffect(() => {
    const next = getNextBackupTime();
    setNextTime(next);
    const tick = setInterval(() => {
      const remaining = next.getTime() - Date.now();
      setCountdown(remaining > 0 ? formatCountdown(remaining) : "Running…");
    }, 1_000);
    return () => clearInterval(tick);
  }, [lastBackup]);

  // ── Auto-backup scheduler ─────────────────────────────────────────────
  useEffect(() => {
    function scheduleNext() {
      const next = getNextBackupTime();
      const delay = next.getTime() - Date.now();
      autoBackupRef.current = setTimeout(() => {
        runCloudBackup(true);
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => { if (autoBackupRef.current) clearTimeout(autoBackupRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Progress animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading && backupProgress < 95) {
      const t = setTimeout(() => {
        setBackupProgress((p) => Math.min(p + (p < 50 ? 8 : p < 80 ? 5 : 2), 95));
      }, 120);
      return () => clearTimeout(t);
    }
  }, [isLoading, backupProgress]);

  // ── Helpers ────────────────────────────────────────────────────────────

  function askConfirm(title: string, desc: string, action: () => void) {
    setConfirmTitle(title);
    setConfirmDesc(desc);
    setPendingAction(() => action);
    setConfirmOpen(true);
  }

  function finishSuccess(msg: string) {
    setSuccessMsg(msg);
    setShowSuccessDialog(true);
    setCurrentAction(null);
    setIsLoading(false);
    setBackupProgress(100);
    setTimeout(() => { setBackupProgress(0); setStatusMessage(""); }, 2000);
  }

  function failAction(msg: string) {
    setError(msg);
    toast({ title: "Error", description: msg, variant: "destructive" });
    setIsLoading(false);
    setBackupProgress(0);
    setStatusMessage("");
  }

  // ── Load bucket files ─────────────────────────────────────────────────
  const loadBucketFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch("/api/backup/list");
      if (res.ok) {
        const files: BackupFile[] = (await res.json()).files ?? [];
        setBucketFiles(files);
        // Derive last backup time from the most recent file in the bucket
        const mostRecent = files
          .map(f => f.created_at ?? f.updated_at ?? null)
          .filter(Boolean)
          .sort()
          .at(-1);
        if (mostRecent) {
          setLastBackup(mostRecent);
          localStorage.setItem("etire_last_backup", mostRecent);
        }
      }
    } catch { /* silent */ }
    setLoadingFiles(false);
  }, []);

  // ── Convert JSON → CSV ───────────────────────────────────────────────
  function toCSV(data: Record<string, unknown>[]): string {
    if (!data.length) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row).map((v) => {
        if (v === null || v === undefined) return "";
        if (typeof v === "object") return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
        const s = String(v);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    ).join("\n");
    return `${headers}\n${rows}`;
  }

  // ── Export (download) ─────────────────────────────────────────────────
  async function exportData(format: "json" | "csv") {
    if (!authUser) return;
    setCurrentAction("export");
    setIsLoading(true);
    setError(null);
    setBackupProgress(5);
    setStatusMessage("Fetching data from server…");

    try {
      const res = await fetch("/api/backup/export");
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Export failed");
      const payload = await res.json();
      const tables = payload.tables ?? {};

      setStatusMessage("Preparing download…");
      setBackupProgress(85);

      const exportPayload = {
        meta: { version: "1.0", exported_at: new Date().toISOString(), exported_by: authUser.name },
        tables,
      };

      let blob: Blob;
      let filename: string;

      if (format === "json") {
        blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
        filename = `etire_backup_${new Date().toISOString().split("T")[0]}.json`;
      } else {
        let csv = "";
        for (const t of TABLE_DEPENDENCY_ORDER) {
          const rows = tables[t];
          if (rows?.length) {
            csv += `\n\n--- TABLE: ${t.toUpperCase()} ---\n`;
            csv += toCSV(rows as Record<string, unknown>[]);
          }
        }
        blob = new Blob([csv], { type: "text/csv" });
        filename = `etire_export_${new Date().toISOString().split("T")[0]}.csv`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      setLastBackup(now);
      localStorage.setItem("etire_last_backup", now);
      finishSuccess(`${format.toUpperCase()} backup downloaded — ${payload.tableCount} tables exported.`);
    } catch (e: unknown) {
      failAction((e as Error).message);
    }
  }

  // ── Import (restore) ──────────────────────────────────────────────────
  async function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !authUser) return;
    askConfirm(
      "Restore from Backup",
      `Importing "${file.name}" will overwrite existing records with matching IDs. This cannot be undone.`,
      () => doImport(file)
    );
  }

  async function doImport(file: File) {
    setCurrentAction("import");
    setIsLoading(true);
    setError(null);
    setBackupProgress(5);
    setStatusMessage("Reading file…");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.tables || !parsed.meta) throw new Error("Invalid backup file — missing 'tables' or 'meta'.");

      setStatusMessage("Uploading to server…");
      setBackupProgress(40);

      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, data: parsed }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Import failed");
      const result = await res.json();
      // Audit log: backup restore
      if (authUser && supabase) {
        await supabase.from('audit_log').insert({
          user_id: authUser.user_id,
          action: 'UPDATE',
          table_name: 'backup_restore',
          record_id: null,
          old_values: null,
          new_values: { fileName: file.name, restoredTables: result.restoredTables ?? Object.keys(parsed.tables).length },
          record_number: file.name,
        });
      }
      finishSuccess(`Restored from ${file.name}. ${result.restoredTables ?? Object.keys(parsed.tables).length} tables restored.`);
    } catch (e: unknown) {
      failAction((e as Error).message);
    }
  }

  // ── Cloud backup ──────────────────────────────────────────────────────
  async function runCloudBackup(silent = false) {
    if (!authUser) return;
    setCurrentAction("cloud");
    setIsLoading(true);
    setError(null);
    setBackupProgress(15);
    setStatusMessage("Uploading to Supabase Storage…");

    try {
      const res = await fetch("/api/backup/sync", { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Cloud backup failed");
      const result = await res.json();
      // Audit log: cloud backup
      if (authUser && supabase) {
        await supabase.from('audit_log').insert({
          user_id: authUser.user_id,
          action: 'INSERT',
          table_name: 'backup_cloud',
          record_id: null,
          old_values: null,
          new_values: { fileName: result.fileName, triggered_by: authUser.name },
          record_number: result.fileName ?? null,
        });
      }

      const now = new Date().toISOString();
      setLastBackup(now);
      localStorage.setItem("etire_last_backup", now);
      await loadBucketFiles();

      if (silent) {
        toast({ title: "Automatic backup complete", description: result.fileName });
        setIsLoading(false); setBackupProgress(0); setStatusMessage(""); setCurrentAction(null);
      } else {
        finishSuccess(`Backup uploaded to Supabase Storage: ${result.fileName}`);
      }
    } catch (e: unknown) {
      if (!silent) failAction((e as Error).message);
      else { console.error("[auto-backup]", (e as Error).message); setIsLoading(false); setBackupProgress(0); setStatusMessage(""); setCurrentAction(null); }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-background min-h-screen">
      <div className="flex flex-col gap-6 p-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-[#714B67]" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Data Backup &amp; Sync</h1>
              <p className="text-sm text-muted-foreground">Manage database backups and Supabase cloud storage</p>
            </div>
          </div>
          <Button
            variant="outline" size="sm"
            className="gap-2"
            onClick={() => { loadBucketFiles(); toast({ title: "Refreshed" }); }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress bar */}
        {isLoading && (
          <Card className="border border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2.5 rounded-lg bg-[#714B67] text-white">
                  {currentAction === "export" ? <Download className="h-5 w-5" /> :
                   currentAction === "import" ? <Upload className="h-5 w-5" /> :
                   <CloudUpload className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {currentAction === "export" ? "Exporting Data" :
                     currentAction === "import" ? "Restoring Data" : "Uploading to Cloud"}
                  </p>
                  <p className="text-xs text-muted-foreground">{statusMessage}</p>
                </div>
                <span className="text-sm font-bold text-[#714B67]">{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Backup Operations ─────────────────────────────────────── */}
          <Card className="rounded-lg border border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-[#714B67]" />
                Backup Operations
              </CardTitle>
              <CardDescription className="text-xs">Export, cloud sync, and restore data</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">

              {/* Export */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Export &amp; Download
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => askConfirm(
                      "Export JSON Backup",
                      "This will export all data as a JSON backup file and download it to your device.",
                      () => exportData("json")
                    )}
                    disabled={isLoading}
                    className="bg-[#714B67] hover:bg-[#5a3c53] text-white gap-1.5 h-10"
                  >
                    <FileJson className="h-4 w-4" /> JSON
                  </Button>
                  <Button
                    onClick={() => askConfirm(
                      "Export CSV Report",
                      "This will export all data as CSV files and download them to your device.",
                      () => exportData("csv")
                    )}
                    disabled={isLoading}
                    variant="outline"
                    className="gap-1.5 h-10"
                  >
                    <FileSpreadsheet className="h-4 w-4" /> CSV
                  </Button>
                </div>
              </div>

              {/* Cloud Backup */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CloudUpload className="h-3.5 w-3.5" /> Cloud Backup
                </p>
                <Button
                  onClick={() => askConfirm(
                    "Upload to Supabase Storage",
                    "This will create a full JSON backup and upload it to the 'backups' bucket in your Supabase Storage.",
                    () => runCloudBackup(false)
                  )}
                  disabled={isLoading}
                  className="w-full bg-[#714B67] hover:bg-[#5a3c53] text-white gap-2 h-10"
                >
                  <CloudUpload className="h-4 w-4" />
                  Backup to Cloud Now
                </Button>
              </div>

              {/* Restore */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Restore from File
                </p>
                <input ref={fileInputRef} type="file" accept=".json" onChange={importData} className="hidden" />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full gap-2 h-10"
                >
                  <Upload className="h-4 w-4" />
                  Choose Backup File
                </Button>
                <p className="text-xs text-muted-foreground">JSON files only. Overwrites matching records.</p>
              </div>

            </CardContent>
          </Card>

          {/* ── System Status ─────────────────────────────────────────── */}
          <Card className="rounded-lg border border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-[#714B67]" />
                System Status
              </CardTitle>
              <CardDescription className="text-xs">Schedule and health overview</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">

              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Last Backup</span>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {lastBackup
                    ? new Date(lastBackup).toLocaleString("en-PH", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "numeric", minute: "2-digit", hour12: true,
                      })
                    : "No backup recorded yet"}
                </p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-[#714B67]" />
                  <span className="text-sm font-medium">Automatic Backup</span>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  Daily at <strong>10:00 AM</strong> and <strong>5:00 PM</strong>
                </p>
                {countdown && (
                  <p className="text-xs text-[#714B67] font-medium pl-6">
                    Next run in: {countdown}
                    {nextTime && (
                      <span className="text-muted-foreground font-normal">
                        {" "}({nextTime.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true })})
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Storage Target</span>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  Supabase Storage — <code className="text-xs bg-muted px-1 py-0.5 rounded">backups</code> bucket
                </p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Formats</span>
                </div>
                <p className="text-sm text-muted-foreground pl-6">JSON (full restore) + CSV (reporting)</p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Page Updated</span>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true })}
                </p>
              </div>

            </CardContent>
          </Card>

          {/* ── Best Practices ────────────────────────────────────────── */}
          <Card className="rounded-lg border border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#714B67]" />
                Best Practices
              </CardTitle>
              <CardDescription className="text-xs">Keep your data safe</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {[
                { color: "text-green-500", title: "Regular Backups", desc: "Export daily or weekly to prevent data loss." },
                { color: "text-blue-500",  title: "Multiple Formats", desc: "Keep both JSON (restore) and CSV (reporting)." },
                { color: "text-[#714B67]", title: "Cloud + Local",   desc: "Store a cloud copy AND a local downloaded copy." },
                { color: "text-orange-500", title: "Test Restores",  desc: "Periodically import a backup to verify it works." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-2.5">
                  <CheckCircle className={`h-4 w-4 shrink-0 mt-0.5 ${item.color}`} />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Cloud Backup Files (bucket list) ──────────────────────────── */}
        <Card className="rounded-lg border border-border">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[#714B67]" />
                <div>
                  <CardTitle className="text-base font-semibold">Cloud Backup Files</CardTitle>
                  <CardDescription className="text-xs">Files stored in Supabase Storage &mdash; <code className="text-xs bg-muted px-1 py-0.5 rounded">backups</code> bucket</CardDescription>
                </div>
              </div>
              <Button
                variant="outline" size="sm"
                onClick={loadBucketFiles}
                disabled={loadingFiles}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingFiles ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingFiles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-[#714B67]" />
              </div>
            ) : bucketFiles.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No backup files found in the storage bucket.
                <br />
                <span className="text-xs">Click &ldquo;Backup to Cloud Now&rdquo; to create the first one.</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">File Name</th>
                    <th className="px-4 py-2.5 text-left font-medium">Size</th>
                    <th className="px-4 py-2.5 text-left font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {bucketFiles.map((f) => (
                    <tr key={f.id ?? f.name} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4 text-[#714B67] shrink-0" />
                          <span className="font-mono text-xs">{f.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {fmtSize(f.metadata?.size)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {f.created_at
                          ? new Date(f.created_at).toLocaleString("en-PH", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "numeric", minute: "2-digit", hour12: true,
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Confirmation Dialog ────────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={(v) => { if (!v) { setConfirmOpen(false); setPendingAction(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {confirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmOpen(false); setPendingAction(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#714B67] hover:bg-[#5a3c53] text-white"
              onClick={() => {
                setConfirmOpen(false);
                pendingAction?.();
                setPendingAction(null);
              }}
            >
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Success Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-green-100 mb-3">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <DialogTitle className="text-center">Done!</DialogTitle>
            <DialogDescription className="text-center">{successMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              className="bg-[#714B67] hover:bg-[#5a3c53] text-white gap-1.5"
              onClick={() => setShowSuccessDialog(false)}
            >
              <Check className="h-4 w-4" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
