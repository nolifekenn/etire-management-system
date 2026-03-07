"use client";

/**
 * Audit Logs — Global viewer
 * --------------------------
 * Odoo-inspired: filterable by date range, action type, module/table, user.
 * Each row is expandable to show field-level old → new diffs.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Loader2, Search, ChevronDown, ChevronUp,
  RefreshCw, ArrowRight, ClipboardList, Filter,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditLog {
  log_id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  record_number: string | null;
  new_values: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
  created_at: string;
  ip_address: string | null;
  user?: { name: string | null; username: string | null; role: string | null } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const ACTION_COLORS: Record<string, string> = {
  INSERT:           "bg-green-100 text-green-700 border-green-200",
  UPDATE:           "bg-amber-100 text-amber-700 border-amber-200",
  DELETE:           "bg-red-100 text-red-700 border-red-200",
  VOID:             "bg-red-100 text-red-700 border-red-200",
  CANCEL_JOB:       "bg-red-100 text-red-700 border-red-200",
  STATE_TRANSITION: "bg-blue-100 text-blue-700 border-blue-200",
  VALIDATE_RECEIPT: "bg-blue-100 text-blue-700 border-blue-200",
  ADJUSTMENT:       "bg-purple-100 text-purple-700 border-purple-200",
  UPDATE_LINES:     "bg-amber-100 text-amber-700 border-amber-200",
  UPSERT_LINES:     "bg-amber-100 text-amber-700 border-amber-200",
};

function actionColor(action: string) {
  return ACTION_COLORS[action] ?? "bg-slate-100 text-slate-700 border-slate-200";
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    INSERT:           "Created",
    UPDATE:           "Updated",
    DELETE:           "Deleted",
    STATE_TRANSITION: "Status Changed",
    VOID:             "Voided",
    VALIDATE_RECEIPT: "Receipt Validated",
    CANCEL_JOB:       "Job Cancelled",
    ADJUSTMENT:       "Stock Adjusted",
    UPDATE_LINES:     "Lines Updated",
    UPSERT_LINES:     "Lines Updated",
  };
  return map[action] ?? action.replace(/_/g, " ");
}

function tableLabel(table: string) {
  const map: Record<string, string> = {
    purchase_order:    "Purchasing",
    sale:              "Sales",
    service_job:       "Services",
    service_job_item:  "Services",
    inventory_item:    "Inventory",
    supplier:          "Purchasing",
    branch:            "Branches",
    customer:          "Customers",
    vehicle:           "Vehicles",
  };
  return map[table] ?? table.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Field diff ─────────────────────────────────────────────────────────────

function FieldDiff({ old_values, new_values }: {
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}) {
  const allKeys = Array.from(new Set([
    ...Object.keys(old_values ?? {}),
    ...Object.keys(new_values ?? {}),
  ])).filter(k => !["updated_at", "created_at"].includes(k));

  if (allKeys.length === 0) return <p className="text-xs text-muted-foreground italic">No field details recorded.</p>;

  const rows = allKeys.map(key => {
    const oldVal = old_values?.[key];
    const newVal = new_values?.[key];
    return { key, oldVal, newVal, changed: JSON.stringify(oldVal) !== JSON.stringify(newVal) };
  });

  const changed   = rows.filter(r => r.changed);
  const unchanged = rows.filter(r => !r.changed);

  return (
    <div className="space-y-2">
      {changed.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Changed fields</p>
          <div className="space-y-1">
            {changed.map(({ key, oldVal, newVal }) => (
              <div key={key} className="flex flex-wrap items-baseline gap-1 text-xs">
                <span className="font-semibold text-slate-700 capitalize min-w-[80px]">{key.replace(/_/g, " ")}:</span>
                {oldVal !== undefined && oldVal !== null && (
                  <>
                    <span className="line-through text-red-600 bg-red-50 rounded px-1.5 py-0.5">
                      {String(typeof oldVal === "object" ? JSON.stringify(oldVal) : oldVal)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0 self-center" />
                  </>
                )}
                <span className="text-green-700 bg-green-50 rounded px-1.5 py-0.5 font-medium">
                  {newVal === null || newVal === undefined
                    ? "(cleared)"
                    : String(typeof newVal === "object" ? JSON.stringify(newVal) : newVal)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {unchanged.length > 0 && (
        <details className="group">
          <summary className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none group-open:text-slate-600">
            {unchanged.length} unchanged field{unchanged.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-1 space-y-0.5">
            {unchanged.map(({ key, newVal }) => (
              <div key={key} className="flex items-baseline gap-1 text-xs text-slate-500">
                <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>
                <span>{typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal ?? "—")}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── Row component ──────────────────────────────────────────────────────────

function AuditLogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = (log.new_values && Object.keys(log.new_values).length > 0)
    || (log.old_values && Object.keys(log.old_values).length > 0);

  return (
    <div className={cn("border-b border-border last:border-0 transition-colors", expanded ? "bg-slate-50" : "hover:bg-slate-50/60")}>
      <div
        className={cn("grid grid-cols-[140px_160px_130px_150px_1fr_36px] gap-3 items-center px-4 py-3 text-sm", hasDetails && "cursor-pointer")}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <span className="text-xs text-slate-500 font-mono tabular-nums">{formatDate(log.created_at)}</span>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-slate-800 truncate text-xs">{log.user?.name ?? "System"}</span>
          <span className="text-[10px] text-slate-400 truncate">{log.user?.role ?? "—"}</span>
        </div>
        <Badge className={cn("border text-[10px] w-fit px-2 py-0.5 font-medium", actionColor(log.action))}>
          {actionLabel(log.action)}
        </Badge>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-slate-700">{tableLabel(log.table_name)}</span>
          <span className="text-[10px] font-mono text-slate-400 truncate">{log.table_name}</span>
        </div>
        <span className="text-xs text-slate-500 truncate">
          {log.record_number ?? log.record_id?.slice(0, 8) ?? "—"}
        </span>
        {hasDetails ? (
          <button type="button" className="flex items-center justify-center h-7 w-7 rounded hover:bg-slate-200 transition-colors ml-auto">
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
          </button>
        ) : <span />}
      </div>
      {expanded && hasDetails && (
        <div className="px-4 pb-4 pt-0 pl-[172px] border-t border-dashed border-slate-200">
          <FieldDiff old_values={log.old_values} new_values={log.new_values} />
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

const ALL_ACTIONS = [
  "INSERT", "UPDATE", "DELETE", "STATE_TRANSITION", "VOID",
  "VALIDATE_RECEIPT", "CANCEL_JOB", "ADJUSTMENT", "UPDATE_LINES", "UPSERT_LINES",
];

export default function AuditLogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [logs, setLogs]                   = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [searchTerm, setSearchTerm]       = useState("");
  const [actionFilter, setActionFilter]   = useState<string[]>([]);
  const [tableFilter, setTableFilter]     = useState("");
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");
  const [page, setPage]                   = useState(0);
  const [showFilters, setShowFilters]     = useState(false);
  const PAGE_SIZE = 50;

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== "super_admin" && user.role !== "branch_manager")) {
        toast({ title: "Access Denied", description: "You do not have permission to view audit logs.", variant: "destructive" });
        router.push("/dashboard");
      } else {
        fetchLogs();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from("audit_log")
        .select(`
          log_id, user_id, action, table_name,
          record_id, record_number,
          new_values, old_values,
          created_at, ip_address,
          user:user_id (
            name, username, role
          )
        `)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo)   query = query.lte("created_at", `${dateTo}T23:59:59`);
      if (tableFilter) query = query.eq("table_name", tableFilter);
      if (actionFilter.length === 1) query = query.eq("action", actionFilter[0]);

      const { data, error } = await query;
      if (error) throw error;

      let result = (data ?? []) as AuditLog[];
      if (actionFilter.length > 1) result = result.filter(r => actionFilter.includes(r.action));

      setLogs(result);
      setPage(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: `Failed to load audit logs: ${message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, tableFilter, actionFilter, toast]);

  const filtered = logs.filter(log => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.table_name.toLowerCase().includes(q) ||
      (log.user?.name?.toLowerCase().includes(q) ?? false) ||
      (log.record_number?.toLowerCase().includes(q) ?? false) ||
      (log.new_values ? JSON.stringify(log.new_values).toLowerCase().includes(q) : false)
    );
  });

  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const uniqueTables = Array.from(new Set(logs.map(l => l.table_name))).sort();

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <h1 className="text-xl font-semibold text-foreground">Audit Logs</h1>
            {!isLoading && (
              <Badge variant="secondary" className="text-xs">{filtered.length.toLocaleString()} entries</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading} className="gap-1.5">
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">From date</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="h-9 rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">To date</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="h-9 rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Module / Table</label>
                  <select value={tableFilter} onChange={e => setTableFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">All modules</option>
                    {uniqueTables.map(t => <option key={t} value={t}>{tableLabel(t)} ({t})</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Action type</label>
                  <select value={actionFilter.length === 1 ? actionFilter[0] : ""}
                    onChange={e => setActionFilter(e.target.value ? [e.target.value] : [])}
                    className="h-9 rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">All actions</option>
                    {ALL_ACTIONS.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={fetchLogs} disabled={isLoading}>Apply filters</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setDateFrom(""); setDateTo(""); setTableFilter(""); setActionFilter([]);
                  setTimeout(fetchLogs, 0);
                }}>Clear</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by user, action, module, or record number..."
            className="pl-9 bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {/* Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[140px_160px_130px_150px_1fr_36px] gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
            {["Timestamp", "User", "Action", "Module", "Record", ""].map((h, i) => (
              <span key={i} className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : paginated.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No audit entries found.{searchTerm && " Try clearing the search."}
            </div>
          ) : (
            <div>{paginated.map(log => <AuditLogRow key={log.log_id} log={log} />)}</div>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
