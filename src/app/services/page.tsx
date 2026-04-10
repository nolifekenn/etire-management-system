"use client";
/**
 * src/app/services/page.tsx
 *
 * Workshop Kanban Board  Default Services Route
 *
 * Columns: Draft Quotation | Confirmed | In Progress | Quality Check | Done
 * Each card links to /services/[id] for the full Form View.
 * List view available at /services/list.
 *
 * Responsive changes:
 * - Header elements wrap and search expands on small screens.
 * - Kanban columns stack vertically on xs (mobile) and become horizontal on sm+.
 * - Column widths constrained on sm+ and full-width on mobile.
 * - Column card scroll height reduced on mobile.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Input }     from "@/components/ui/input";
import { useToast }  from "@/hooks/use-toast";
import { useAuth }   from "@/hooks/useAuth";
import {
  Wrench, PlusCircle, RefreshCw, LayoutList, Search,
  Loader2, ChevronRight, AlertCircle, Flame,
  ArrowUp, Minus, TrendingDown, User, Car, Package,
} from "lucide-react";
import {
  listServiceJobs,
  type ServiceJobRow,
} from "@/lib/actions/services";
import { NewJobDialog } from "@/app/services/components/NewJobDialog";
import { type ServiceState, SERVICE_STATE_LABELS, SERVICE_STATE_COLORS } from "@/lib/serviceUtils";
import { supabase } from "@/lib/supabaseClient";

//  Kanban column config 

const KANBAN_COLUMNS: { state: ServiceState; label: string; color: string; dot: string }[] = [
  { state: "quotation",     label: "Draft Quotation", color: "border-t-gray-400",   dot: "bg-gray-400"   },
  { state: "confirmed",     label: "Confirmed",       color: "border-t-blue-500",   dot: "bg-blue-500"   },
  { state: "in_progress",   label: "In Progress",     color: "border-t-amber-500",  dot: "bg-amber-500"  },
  { state: "quality_check", label: "Quality Check",   color: "border-t-purple-500", dot: "bg-purple-500" },
  { state: "completed",     label: "Done",            color: "border-t-green-500",  dot: "bg-green-500"  },
];

//  Priority badge helper 

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent",  icon: Flame,       class: "bg-red-100 text-red-700 border-red-200"       },
  high:   { label: "High",    icon: ArrowUp,     class: "bg-orange-100 text-orange-700 border-orange-200" },
  normal: { label: "Normal",  icon: Minus,       class: "bg-gray-100 text-gray-600 border-gray-200"    },
  low:    { label: "Low",     icon: TrendingDown,class: "bg-sky-100 text-sky-700 border-sky-200"       },
} as const;

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[(priority as keyof typeof PRIORITY_CONFIG)] ?? PRIORITY_CONFIG.normal;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.class}`}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

//  Kanban card 

function KanbanCard({ job, onClick }: { job: ServiceJobRow; onClick: () => void }) {
  const descSnippet = job.job_description.length > 70
    ? job.job_description.slice(0, 70) + "…"
    : job.job_description;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer transition-all group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono font-semibold text-primary">
          {job.job_number ?? "SRV-"}
        </span>
        <PriorityBadge priority={job.priority} />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-800 font-medium leading-snug mb-2">{descSnippet}</p>

      {/* Meta chips */}
      <div className="space-y-1">
        {job.customer_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{job.customer_name}</span>
          </div>
        )}
        {job.plate_number && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Car className="h-3 w-3 shrink-0" />
            <span className="font-mono">{job.plate_number}</span>
            {job.vehicle_make && (
              <span className="text-gray-400 truncate">
                {job.vehicle_make} {job.vehicle_model}
              </span>
            )}
          </div>
        )}
        {job.mechanic_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wrench className="h-3 w-3 shrink-0" />
            <span className="truncate">{job.mechanic_name}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Package className="h-3 w-3" />
          <span>{job.items_count} item{job.items_count !== 1 ? "s" : ""}</span>
        </div>
        <div className="text-[11px] font-semibold text-gray-700">
          {job.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Open indicator */}
      <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-3.5 w-3.5 text-primary" />
      </div>
    </div>
  );
}

//  Kanban column 

function KanbanColumn({
  state, label, dot, colorClass, jobs, onCardClick,
}: {
  state:       ServiceState;
  label:       string;
  dot:         string;
  colorClass:  string;
  jobs:        ServiceJobRow[];
  onCardClick: (job: ServiceJobRow) => void;
}) {
  return (
    <div className={`flex flex-col w-full sm:min-w-[240px] sm:max-w-[280px] flex-1 bg-gray-50 rounded-xl ${colorClass} border border-gray-200`}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-white rounded-t-xl">
        <span className={`h-2 w-2 rounded-full ${dot} shrink-0`} />
        <span className="text-sm font-semibold text-gray-800 flex-1">{label}</span>
        <span className="text-xs font-bold text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-full">
          {jobs.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto max-h-[60vh] sm:max-h-[calc(100vh-220px)]">
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No jobs
          </div>
        ) : (
          jobs.map(job => (
            <KanbanCard key={job.job_id} job={job} onClick={() => onCardClick(job)} />
          ))
        )}
      </div>
    </div>
  );
}

//  Main Page 

export default function ServicesKanbanPage() {
  const router               = useRouter();
  const { user, activeBranchId } = useAuth();
  const { toast }            = useToast();
  const [jobs,     setJobs]  = useState<ServiceJobRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [newOpen,  setNewOpen]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const branchId = activeBranchId ?? "";
  const userId   = user?.user_id   ?? "";

  //  Fetch all active jobs 

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listServiceJobs({
        branch_id: branchId || undefined,
        page_size: 200,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to load jobs");
      } else {
        setJobs(result.jobs);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  //  Search filter 

  const filteredJobs = search.trim()
    ? jobs.filter(j => {
        const q = search.toLowerCase();
        return (
          (j.job_number ?? "").toLowerCase().includes(q) ||
          (j.customer_name ?? "").toLowerCase().includes(q) ||
          (j.plate_number  ?? "").toLowerCase().includes(q) ||
          j.job_description.toLowerCase().includes(q)
        );
      })
    : jobs;

  //  Group by column 

  const columnJobs = (state: ServiceState) =>
    filteredJobs.filter(j => j.state === state);

  const totalActive = jobs.filter(
    j => j.state !== 'invoiced' && j.state !== 'completed' && j.state !== 'cancelled'
  ).length;

  //  Handlers 

  const handleCardClick = (job: ServiceJobRow) => {
    router.push(`/services/${job.job_id}`);
  };

  const handleJobCreated = (jobId: string) => {
    setNewOpen(false);
    router.push(`/services/${jobId}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/*  Top bar  */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">Workshop</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{totalActive} active jobs</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search jobs, plates, customers"
              className="pl-8 h-8 text-sm w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => router.push("/services/list")}>
            <LayoutList className="h-4 w-4" />
            List View
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={fetchJobs} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            New Job
          </Button>
        </div>
      </header>

      {/*  Error banner  */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/*  Kanban body  */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <main className="flex-1 overflow-auto p-6">
          {/* 
            On mobile: stack columns vertically.
            On sm+ screens: row of columns with horizontal scrolling if needed.
          */}
          <div className="flex flex-col sm:flex-row gap-4 min-h-full">
            {KANBAN_COLUMNS.map(col => (
              <div key={col.state} className="w-full sm:w-auto">
                <KanbanColumn
                  state={col.state}
                  label={col.label}
                  dot={col.dot}
                  colorClass={col.color}
                  jobs={columnJobs(col.state)}
                  onCardClick={handleCardClick}
                />
              </div>
            ))}
          </div>
        </main>
      )}

      {/*  New Job Dialog  */}
      <NewJobDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={handleJobCreated}
        branchId={branchId}
        userId={userId}
      />
    </div>
  );
}