"use client";

/**
 * /inventory/forecast — Stock Demand Forecast Page
 *
 * Reads view_stock_forecast (DB view) to display demand-based criticality,
 * days of stock remaining, suggested reorder levels, and reorder flags.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  PackageX,
  TrendingUp,
  PackageCheck,
  Filter,
  ArrowUpCircle,
  Clock,
} from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input }   from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth }  from "@/hooks/useAuth";
import { getStockForecast, type StockForecastRow } from "@/lib/actions/inventory";

// ── Criticality config ──────────────────────────────────────────────────────

const CRIT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  OUT_OF_STOCK: { label: "Out of Stock", color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    icon: PackageX       },
  CRITICAL:     { label: "Critical",     color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: AlertTriangle  },
  LOW:          { label: "Low",          color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  icon: AlertTriangle  },
  MODERATE:     { label: "Moderate",     color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", icon: Clock          },
  HEALTHY:      { label: "Healthy",      color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  icon: PackageCheck   },
  NO_DEMAND:    { label: "No Demand",    color: "text-slate-500",  bg: "bg-slate-50",  border: "border-slate-200",  icon: TrendingUp     },
};

const CRIT_ALL_KEYS = ["all", "OUT_OF_STOCK", "CRITICAL", "LOW", "MODERATE", "HEALTHY", "NO_DEMAND"];

const CATEGORY_COLORS: Record<string, string> = {
  tire:      "bg-blue-100 text-blue-800",
  tool:      "bg-amber-100 text-amber-800",
  accessory: "bg-purple-100 text-purple-800",
  service:   "bg-teal-100 text-teal-800",
};

// ── Component ───────────────────────────────────────────────────────────────

export default function ForecastPage() {
  const router    = useRouter();
  const { toast } = useToast();
  const { activeBranchId } = useAuth();

  const [rows,    setRows]    = useState<StockForecastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [crit,    setCrit]    = useState("all");
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStockForecast(
        activeBranchId ?? undefined,
        crit !== "all" ? crit : undefined,
      );
      if (!res.success && res.error) {
        toast({ title: "Forecast data unavailable", description: res.error, variant: "destructive" });
      }
      setRows(res.rows);
    } catch {
      toast({ title: "Failed to load forecast", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeBranchId, crit, toast]);

  useEffect(() => { load(); }, [load]);

  // Client-side search filter
  const displayed = rows.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(() => { setPage(1); }, [search, crit, displayed.length, rowsPerPage]);

  // Summary counts
  const counts = CRIT_ALL_KEYS.slice(1).reduce<Record<string, number>>((acc, k) => {
    acc[k] = rows.filter(r => r.criticality === k).length;
    return acc;
  }, {});

  const fmtDays = (d: number) => d >= 9999 ? "∞" : `${d}d`;
  const fmtQty  = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  const totalPages = Math.max(1, Math.ceil(displayed.length / rowsPerPage));
  const pagedDisplayed = displayed.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <nav className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <button onClick={() => router.push("/inventory")} className="flex items-center gap-1 hover:no-underline">
              <ChevronLeft className="h-3 w-3" />Inventory
            </button>
            <span>/</span>
            <span>Stock Forecast</span>
          </nav>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-indigo-600" />
            Stock Demand Forecast
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Demand-based criticality, days remaining, and suggested reorder levels.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="w-full sm:w-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="h-8" onClick={() => router.push('/inventory/products')}>Products</Button>
        <Button variant="ghost" size="sm" className="h-8" onClick={() => router.push('/inventory/adjustments')}>Adjustments</Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => router.push('/inventory/forecast')}>Stock Forecast</Button>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CRIT_ALL_KEYS.slice(1).map(k => {
            const cfg  = CRIT_CONFIG[k];
            const Icon = cfg.icon;
            const n    = counts[k] ?? 0;
            return (
              <button
                key={k}
                onClick={() => setCrit(crit === k ? "all" : k)}
                className={`text-left rounded-xl border-2 p-3 transition-all hover:shadow-md ${
                  crit === k ? `${cfg.bg} ${cfg.border}` : "bg-card border-border hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  <span className="text-xs text-muted-foreground">{cfg.label}</span>
                </div>
                <p className={`text-2xl font-bold ${crit === k ? cfg.color : "text-foreground"}`}>{n}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by product name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={crit} onValueChange={setCrit}>
          <SelectTrigger className="h-9 w-full sm:w-[175px]">
            <SelectValue placeholder="Criticality" />
          </SelectTrigger>
          <SelectContent>
            {CRIT_ALL_KEYS.map(k => (
              <SelectItem key={k} value={k}>
                {k === "all" ? "All Criticalities" : CRIT_CONFIG[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-full sm:w-auto sm:ml-auto shrink-0">
          <Select value={String(rowsPerPage)} onValueChange={(value) => setRowsPerPage(Number(value))}>
            <SelectTrigger className="h-9 w-full sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Show: 5 items</SelectItem>
              <SelectItem value="10">Show: 10 items</SelectItem>
              <SelectItem value="20">Show: 20 items</SelectItem>
              <SelectItem value="50">Show: 50 items</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="hidden sm:block overflow-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground w-1/3">Product</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground">Criticality</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">On Hand</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">Days Left</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">Daily Demand</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">Sold 30d</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">Sold 90d</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">Reorder Level</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">Suggested</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-muted-foreground text-sm">
                  {rows.length === 0
                    ? "No forecast data available. Make sure the view_stock_forecast view has been applied to your database."
                    : "No items match the current filter."}
                </td>
              </tr>
            ) : pagedDisplayed.map(row => {
              const cfg  = CRIT_CONFIG[row.criticality] ?? CRIT_CONFIG.HEALTHY;
              const Icon = cfg.icon;
              const reorderFlag = row.reorder_level_needs_update && row.suggested_reorder_level > row.current_reorder_level;

              return (
                <tr
                  key={row.item_id}
                  onClick={() => router.push(`/inventory/products/${row.item_id}`)}
                  className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  {/* Product */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <Badge className={`mt-0.5 text-xs ${CATEGORY_COLORS[row.category] ?? "bg-gray-100 text-gray-800"}`}>
                      {row.category}
                    </Badge>
                  </td>

                  {/* Criticality badge */}
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`${cfg.bg} ${cfg.color} ${cfg.border} gap-1 text-xs`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </td>

                  {/* On hand */}
                  <td className="px-4 py-3 text-right font-medium">
                    {row.stock_quantity}
                  </td>

                  {/* Days remaining */}
                  <td className={`px-4 py-3 text-right font-semibold ${
                    row.days_of_stock_remaining <= 3  ? "text-red-600" :
                    row.days_of_stock_remaining <= 7  ? "text-orange-600" :
                    row.days_of_stock_remaining <= 14 ? "text-amber-600" :
                    "text-green-600"
                  }`}>
                    {fmtDays(row.days_of_stock_remaining)}
                  </td>

                  {/* Daily demand */}
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {fmtQty(row.blended_daily_demand)}
                  </td>

                  {/* Sold 30d */}
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {row.units_sold_30d}
                  </td>

                  {/* Sold 90d */}
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {row.units_sold_90d}
                  </td>

                  {/* Current reorder level */}
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {row.current_reorder_level}
                  </td>

                  {/* Suggested reorder level */}
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium flex items-center justify-end gap-1 ${reorderFlag ? "text-amber-600" : "text-muted-foreground"}`}>
                      {reorderFlag && <ArrowUpCircle className="h-3.5 w-3.5" />}
                      {row.suggested_reorder_level}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <div className="sm:hidden p-3 space-y-3">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : displayed.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">
              {rows.length === 0
                ? "No forecast data available."
                : "No items match the current filter."}
            </p>
          ) : (
            pagedDisplayed.map(row => {
              const cfg = CRIT_CONFIG[row.criticality] ?? CRIT_CONFIG.HEALTHY;
              const Icon = cfg.icon;
              const reorderFlag = row.reorder_level_needs_update && row.suggested_reorder_level > row.current_reorder_level;
              return (
                <button
                  key={row.item_id}
                  onClick={() => router.push(`/inventory/products/${row.item_id}`)}
                  className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground break-words">{row.name}</p>
                      <Badge className={`mt-1 text-xs ${CATEGORY_COLORS[row.category] ?? "bg-gray-100 text-gray-800"}`}>{row.category}</Badge>
                    </div>
                    <Badge variant="outline" className={`${cfg.bg} ${cfg.color} ${cfg.border} gap-1 text-xs`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-muted-foreground">On Hand</p><p className="font-medium">{row.stock_quantity}</p></div>
                    <div className="text-right"><p className="text-muted-foreground">Days Left</p><p className="font-semibold">{fmtDays(row.days_of_stock_remaining)}</p></div>
                    <div><p className="text-muted-foreground">Daily Demand</p><p className="font-medium">{fmtQty(row.blended_daily_demand)}</p></div>
                    <div className="text-right"><p className="text-muted-foreground">Suggested</p><p className={`font-medium ${reorderFlag ? "text-amber-600" : "text-foreground"}`}>{row.suggested_reorder_level}</p></div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Showing {displayed.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, displayed.length)} of {displayed.length}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      {!loading && displayed.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-4">
          <span className="font-medium text-foreground">Legend:</span>
          {CRIT_ALL_KEYS.slice(1).map(k => {
            const cfg  = CRIT_CONFIG[k];
            const Icon = cfg.icon;
            return (
              <span key={k} className="flex items-center gap-1">
                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                <span className={cfg.color}>{cfg.label}</span>
              </span>
            );
          })}
          <span className="flex items-center gap-1 ml-4">
            <ArrowUpCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Suggested &gt; current reorder level</span>
          </span>
        </div>
      )}
    </div>
  );
}
