"use client";
/**
 * src/app/services/list/page.tsx
 *
 * Services List View  High-density data table with group-by and filtering.
 * Navigate to /services for the Kanban view, /services/[id] for each job.
 *
 * Responsive changes:
 * - Header search and controls wrap on small screens.
 * - Table view shown on sm+ screens with overflow-x-auto to prevent column bleed.
 * - Mechanic column hidden below md breakpoint to reduce crowding.
 * - Mobile cards (stacked) shown on xs screens for touch-friendly interaction.
 * - State filter chips scroll horizontally instead of wrapping.
 * - Group headers remain interactive on mobile.
 */

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Input }   from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth }  from "@/hooks/useAuth";
import {
  Columns, Search, RefreshCw, ChevronRight, ChevronDown, ChevronUp,
  Loader2, PlusCircle, Wrench, AlertCircle,
  ArrowUpDown, Flame, ArrowUp, Minus, TrendingDown,
} from "lucide-react";
import { listServiceJobs, type ServiceJobRow,
} from "@/lib/actions/services";
import { type ServiceState, SERVICE_STATE_LABELS, SERVICE_STATE_COLORS } from "@/lib/serviceUtils";
import { cn } from "@/lib/utils";
import { NewJobDialog } from "@/app/services/components/NewJobDialog";

//  Group-by options

type GroupBy = "none" | "state" | "priority" | "mechanic";
type SortKey  = "job_date" | "job_number" | "customer_name" | "priority" | "total_amount";
type SortDir  = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
const STATE_ORDER_MAP: Record<string, number> = {
  quotation: 0, confirmed: 1, in_progress: 2, quality_check: 3,
  completed: 4, invoiced: 5, cancelled: 6,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high:   "bg-orange-100 text-orange-700",
  normal: "bg-gray-100 text-gray-600",
  low:    "bg-sky-100 text-sky-700",
};

const PRIORITY_ICONS: Record<string, React.ElementType> = {
  urgent: Flame, high: ArrowUp, normal: Minus, low: TrendingDown,
};

// Badge chip state filter config (service-specific)
const STATE_FILTERS: { value: ServiceState | "all"; label: string; activeClass: string }[] = [
  { value: "all",           label: "All",          activeClass: "bg-gray-800 text-white border-gray-800"          },
  { value: "quotation",     label: "Draft",         activeClass: "bg-gray-200 text-gray-800 border-gray-300"       },
  { value: "confirmed",     label: "Confirmed",     activeClass: "bg-blue-100 text-blue-800 border-blue-300"       },
  { value: "in_progress",   label: "In Progress",   activeClass: "bg-amber-100 text-amber-800 border-amber-300"    },
  { value: "quality_check", label: "QC",            activeClass: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "completed",     label: "Done",          activeClass: "bg-green-100 text-green-800 border-green-300"    },
  { value: "invoiced",      label: "Invoiced",      activeClass: "bg-teal-100 text-teal-800 border-teal-300"       },
  { value: "cancelled",     label: "Cancelled",     activeClass: "bg-red-100 text-red-800 border-red-300"          },
];

//  Sort helpers

function sortJobs(jobs: ServiceJobRow[], key: SortKey, dir: SortDir): ServiceJobRow[] {
  return [...jobs].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "job_date":      cmp = new Date(a.job_date).getTime() - new Date(b.job_date).getTime(); break;
      case "job_number":    cmp = (a.job_number ?? "").localeCompare(b.job_number ?? ""); break;
      case "customer_name": cmp = (a.customer_name ?? "").localeCompare(b.customer_name ?? ""); break;
      case "priority":      cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
      case "total_amount":  cmp = a.total_amount - b.total_amount; break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

//  Table row (desktop)

function JobRow({ job, onClick }: { job: ServiceJobRow; onClick: () => void }) {
  const PriorityIcon = PRIORITY_ICONS[job.priority] ?? Minus;

  return (
    <tr
      onClick={onClick}
      className="hover:bg-blue-50/60 cursor-pointer transition-colors border-b border-gray-100 group"
    >
      <td className="px-3 py-2 font-mono text-xs text-primary font-semibold whitespace-nowrap">
        {job.job_number ?? ""}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
          SERVICE_STATE_COLORS[job.state]
        )}>
          {SERVICE_STATE_LABELS[job.state]}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-gray-800 max-w-[200px]">
        <span className="line-clamp-1">{job.job_description}</span>
      </td>
      <td className="px-3 py-2 text-sm text-gray-700 max-w-[140px]">
        <span className="block truncate">
          {job.customer_name ?? <span className="text-muted-foreground italic text-xs">No customer</span>}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-xs text-gray-700 whitespace-nowrap">
        {job.plate_number ?? ""}
      </td>
      {/* Mechanic hidden on smaller screens to prevent column bleed */}
      <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap hidden md:table-cell">
        {job.mechanic_name ?? <span className="text-muted-foreground">Unassigned</span>}
      </td>
      <td className="px-3 py-2 text-center whitespace-nowrap">
        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", PRIORITY_COLORS[job.priority])}>
          <PriorityIcon className="h-2.5 w-2.5" />
          {job.priority}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
        {new Date(job.job_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium text-gray-800 whitespace-nowrap">
        {job.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
      </td>
      <td className="px-3 py-2 text-center">
        <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 mx-auto transition-opacity" />
      </td>
    </tr>
  );
}

//  Mobile card (stacked) view

function MobileJobCard({ job, onClick }: { job: ServiceJobRow; onClick: () => void }) {
  const PriorityIcon = PRIORITY_ICONS[job.priority] ?? Minus;
  return (
    <div onClick={onClick} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-pointer transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-primary">{job.job_number ?? ""}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", SERVICE_STATE_COLORS[job.state])}>
              {SERVICE_STATE_LABELS[job.state]}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-800 line-clamp-2">{job.job_description}</div>
          <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-3">
            <div>{job.customer_name}</div>
            <div className="font-mono">{job.plate_number}</div>
            <div>{job.mechanic_name ?? "Unassigned"}</div>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-semibold", PRIORITY_COLORS[job.priority])}>
            <PriorityIcon className="h-3 w-3" />
            <span className="uppercase text-[11px]">{job.priority}</span>
          </div>
          <div className="text-sm font-semibold text-gray-800 mt-3">
            {job.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
}

//  Group section header

function GroupHeader({
  label, count, expanded, onToggle,
}: { label: string; count: number; expanded: boolean; onToggle: () => void }) {
  return (
    <tr
      className="bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
      onClick={onToggle}
    >
      <td colSpan={10} className="px-3 py-2">
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
          <span className="text-xs font-semibold text-gray-700">{label}</span>
          <span className="text-xs text-muted-foreground bg-white px-1.5 py-0.5 rounded-full border border-gray-200">
            {count}
          </span>
        </div>
      </td>
    </tr>
  );
}

//  Sortable column header

function SortableHeader({
  label, field, sortKey, sortDir, onSort,
}: { label: string; field: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (f: SortKey) => void }) {
  const active = sortKey === field;
  return (
    <th
      className="text-left px-3 py-2 font-semibold text-xs text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-nowrap select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active
          ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
          : <ArrowUpDown className="h-3 w-3 text-gray-300" />}
      </div>
    </th>
  );
}

//  Main Page

export default function ServicesListPage() {
  const router         = useRouter();
  const { user }       = useAuth();
  const { toast }      = useToast();

  const [jobs,    setJobs]   = useState<ServiceJobRow[]>([]);
  const [loading, setLoading]= useState(true);
  const [search,  setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<ServiceState | "all">("all");
  const [groupBy, setGroupBy]= useState<GroupBy>("state");
  const [sortKey, setSortKey]= useState<SortKey>("job_date");
  const [sortDir, setSortDir]= useState<SortDir>("desc");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [error, setError]    = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const branchId = user?.branch_id ?? "";

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listServiceJobs({
        branch_id: branchId || undefined,
        state:     stateFilter,
        page_size: 500,
      });
      if (!result.success) setError(result.error ?? "Load failed");
      else setJobs(result.jobs);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [branchId, stateFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Sort + search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? jobs.filter(j =>
          (j.job_number ?? "").toLowerCase().includes(q) ||
          (j.customer_name ?? "").toLowerCase().includes(q) ||
          (j.plate_number  ?? "").toLowerCase().includes(q) ||
          j.job_description.toLowerCase().includes(q) ||
          (j.mechanic_name ?? "").toLowerCase().includes(q)
        )
      : jobs;
    return sortJobs(base, sortKey, sortDir);
  }, [jobs, search, sortKey, sortDir]);

  // Group-by logic
  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All Jobs", jobs: filtered }];

    const map = new Map<string, ServiceJobRow[]>();
    for (const j of filtered) {
      let key = "";
      if (groupBy === "state")    key = j.state;
      if (groupBy === "priority") key = j.priority;
      if (groupBy === "mechanic") key = j.mechanic_name ?? "Unassigned";

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(j);
    }

    // Sort groups
    const entries = Array.from(map.entries()).map(([key, jobs]) => ({
      key,
      label: groupBy === "state"
        ? SERVICE_STATE_LABELS[key as ServiceState] ?? key
        : key.charAt(0).toUpperCase() + key.slice(1),
      jobs,
    }));

    if (groupBy === "state") {
      entries.sort((a, b) => (STATE_ORDER_MAP[a.key] ?? 99) - (STATE_ORDER_MAP[b.key] ?? 99));
    } else if (groupBy === "priority") {
      entries.sort((a, b) => (PRIORITY_ORDER[a.key] ?? 99) - (PRIORITY_ORDER[b.key] ?? 99));
    }

    return entries;
  }, [filtered, groupBy]);

  const toggleGroup = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSort = (field: SortKey) => {
    if (sortKey === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(field); setSortDir("asc"); }
  };

  const totalShown = filtered.length;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/*  Header  */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Wrench className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Workshop · List View</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{totalShown} jobs</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search job number, customer, plate"
              className="pl-8 h-8 text-sm w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Group by */}
          <div className="w-full sm:w-auto">
            <Select value={groupBy} onValueChange={(v: GroupBy) => setGroupBy(v)}>
              <SelectTrigger className="h-8 w-full sm:w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="state">Group by Status</SelectItem>
                <SelectItem value="priority">Group by Priority</SelectItem>
                <SelectItem value="mechanic">Group by Mechanic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="h-8 gap-1.5 text-sm" onClick={() => router.push("/services")}>
            <Columns className="h-4 w-4" />
            <span className="hidden sm:inline">Kanban</span>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchJobs}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">New Job</span>
          </Button>
        </div>
      </header>

      {/*
        State filter chips — overflow-x-auto + scrollbar-none lets chips scroll
        horizontally on narrow screens without wrapping or overflowing the layout.
      */}
      <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-1.5 shrink-0 overflow-x-auto scrollbar-none">
        {STATE_FILTERS.map(({ value, label, activeClass }) => {
          const count = value === "all" ? jobs.length : jobs.filter(j => j.state === value).length;
          const isActive = stateFilter === value;
          return (
            <button
              key={value}
              onClick={() => setStateFilter(value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap flex-shrink-0",
                isActive
                  ? activeClass
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
              )}
            >
              {label}
              <span className={cn(
                "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                isActive ? "bg-white/30" : "bg-gray-100 text-gray-500"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/*  Error  */}
      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/*  Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/*
              Desktop/table view (sm+).
              overflow-x-auto here ensures the table scrolls horizontally
              instead of columns bleeding into each other.
            */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <SortableHeader label="Job #"      field="job_number"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600 w-24 whitespace-nowrap">Status</th>
                    <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600 min-w-[160px]">Description</th>
                    <SortableHeader label="Customer"   field="customer_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600 w-20 whitespace-nowrap">Plate</th>
                    {/* Mechanic column hidden below md to reduce crowding */}
                    <th className="text-left px-3 py-2 font-semibold text-xs text-gray-600 w-28 whitespace-nowrap hidden md:table-cell">Mechanic</th>
                    <SortableHeader label="Priority"   field="priority"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Date"       field="job_date"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Total"      field="total_amount"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                        No service jobs found.
                      </td>
                    </tr>
                  ) : groupBy === "none" ? (
                    filtered.map(j => (
                      <JobRow key={j.job_id} job={j} onClick={() => router.push(`/services/${j.job_id}`)} />
                    ))
                  ) : (
                    grouped.map(group => (
                      <Fragment key={group.key}>
                        <GroupHeader
                          key={`gh-${group.key}`}
                          label={group.label}
                          count={group.jobs.length}
                          expanded={!collapsed.has(group.key)}
                          onToggle={() => toggleGroup(group.key)}
                        />
                        {!collapsed.has(group.key) && group.jobs.map(j => (
                          <JobRow key={j.job_id} job={j} onClick={() => router.push(`/services/${j.job_id}`)} />
                        ))}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards (xs) */}
            <div className="sm:hidden p-3 space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">No service jobs found.</div>
              ) : groupBy === "none" ? (
                filtered.map(j => (
                  <MobileJobCard key={j.job_id} job={j} onClick={() => router.push(`/services/${j.job_id}`)} />
                ))
              ) : (
                grouped.map(group => (
                  <div key={`mg-${group.key}`} className="space-y-2">
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full flex items-center justify-between bg-gray-100 px-3 py-2 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{group.label}</span>
                        <span className="text-xs text-muted-foreground bg-white px-1.5 py-0.5 rounded-full border border-gray-200">
                          {group.jobs.length}
                        </span>
                      </div>
                      <span>{collapsed.has(group.key) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                    </button>
                    {!collapsed.has(group.key) && (
                      <div className="space-y-2">
                        {group.jobs.map(j => (
                          <MobileJobCard key={j.job_id} job={j} onClick={() => router.push(`/services/${j.job_id}`)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer summary */}
          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-muted-foreground gap-2">
            <span>Showing <strong>{totalShown}</strong> jobs</span>
            <span>
              Total value: <strong>
                {filtered.reduce((a, j) => a + j.total_amount, 0)
                  .toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* New Job Dialog */}
      <NewJobDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={jobId => { setNewOpen(false); router.push(`/services/${jobId}`); }}
        branchId={branchId}
        userId={user?.user_id ?? ""}
      />
    </div>
  );
}
