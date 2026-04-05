"use client";

/**
 * /inventory/adjustments — Inventory Adjustments Page
 *
 * Displays all inventory items so a user can perform manual stock corrections
 * (cycle counts, scrap, data corrections).  Recent adjustment history is
 * shown below the product grid.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  PackageX,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
} from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Badge }   from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth }  from "@/hooks/useAuth";
import { listProducts, listAdjustments } from "@/lib/actions/inventory";
import { AdjustmentDialog } from "@/app/inventory/components/AdjustmentDialog";

// ── Types ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

const CATEGORY_COLORS: Record<string, string> = {
  tire:      "bg-blue-100   text-blue-800",
  tool:      "bg-amber-100  text-amber-800",
  accessory: "bg-purple-100 text-purple-800",
  service:   "bg-teal-100   text-teal-800",
};

const REASON_LABELS: Record<string, string> = {
  cycle_count: "Cycle Count",
  scrap:       "Scrap / Damaged",
  correction:  "Data Correction",
  other:       "Other",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function AdjustmentsPage() {
  const router    = useRouter();
  const { toast } = useToast();
  const { user, activeBranchId } = useAuth();

  // Products list state
  const [items,        setItems]       = useState<AnyRecord[]>([]);
  const [loadingItems, setLoadingItems]= useState(true);
  const [search,       setSearch]      = useState("");
  const [category,     setCategory]    = useState("all");

  // Adjustment dialog state
  const [adjOpen,      setAdjOpen]     = useState(false);
  const [adjItem,      setAdjItem]     = useState<AnyRecord | null>(null);

  // Recent adjustments history
  const [history,      setHistory]     = useState<AnyRecord[]>([]);
  const [loadingHist,  setLoadingHist] = useState(true);
  const [page,         setPage]        = useState(1);
  const [rowsPerPage,  setRowsPerPage] = useState(50);

  // ── Data loaders ────────────────────────────────────────────────────────

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const res = await listProducts({
        search:    search || undefined,
        category:  category !== "all" ? category : undefined,
        page:      1,
        page_size: 200,
      });
      setItems(res.items as AnyRecord[]);
    } catch {
      toast({ title: "Failed to load products", variant: "destructive" });
    } finally {
      setLoadingItems(false);
    }
  }, [search, category, toast]);

  const loadHistory = useCallback(async () => {
    setLoadingHist(true);
    try {
      const res = await listAdjustments(activeBranchId ?? undefined, 30);
      if (res.success) setHistory(res.rows as AnyRecord[]);
    } catch {
      // history is optional — fail silently
    } finally {
      setLoadingHist(false);
    }
  }, [activeBranchId]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { setPage(1); }, [search, category, items.length, rowsPerPage]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleOpenAdj = (item: AnyRecord) => {
    setAdjItem(item);
    setAdjOpen(true);
  };

  const handleAdjusted = () => {
    setAdjOpen(false);
    setAdjItem(null);
    loadItems();
    loadHistory();
    toast({ title: "Adjustment recorded" });
  };

  // ── Helpers ─────────────────────────────────────────────────────────────

  const stockBadge = (item: AnyRecord) => {
    const qty     = Number(item.stock_quantity);
    const reorder = Number(item.reorder_level ?? 5);
    if (qty === 0)     return <Badge className="inline-flex min-w-[7.5rem] justify-center gap-1 rounded-full border-red-200 bg-red-100 text-red-700"><PackageX className="h-3 w-3" />Out of Stock</Badge>;
    if (qty < reorder) return <Badge className="inline-flex min-w-[7.5rem] justify-center gap-1 rounded-full border-amber-200 bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3" />{qty} Low Stock</Badge>;
    return <Badge className="inline-flex min-w-[7.5rem] justify-center rounded-full border-green-200 bg-green-100 text-green-700">{qty} In Stock</Badge>;
  };

  const deltaIcon = (delta: number) => {
    if (delta > 0) return <ArrowUp   className="h-3.5 w-3.5 text-green-600 inline" />;
    if (delta < 0) return <ArrowDown className="h-3.5 w-3.5 text-red-600   inline" />;
    return              <Minus    className="h-3.5 w-3.5 text-slate-400 inline" />;
  };
  const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const pagedItems = items.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // ── Render ───────────────────────────────────────────────────────────────

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
            <span>Adjustments</span>
          </nav>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-teal-600" />
            Inventory Adjustments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Perform cycle counts and stock corrections for any product.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { loadItems(); loadHistory(); }}
          disabled={loadingItems}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingItems ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="h-8" onClick={() => router.push('/inventory/products')}>Products</Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => router.push('/inventory/adjustments')}>Adjustments</Button>
        <Button variant="ghost" size="sm" className="h-8" onClick={() => router.push('/inventory/forecast')}>Stock Forecast</Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-full sm:w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="tire">Tire</SelectItem>
            <SelectItem value="tool">Tool</SelectItem>
            <SelectItem value="accessory">Accessory</SelectItem>
            <SelectItem value="service">Service</SelectItem>
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

      {/* Product Table */}
      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="hidden sm:block overflow-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="sticky top-0 z-10 bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground w-2/5">Product</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">On Hand</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">Reorder Level</th>
              <th className="px-4 py-3 text-center text-xs uppercase tracking-wide font-semibold text-muted-foreground w-32">Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingItems ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-muted-foreground text-sm">
                  No products found
                </td>
              </tr>
            ) : pagedItems.map(item => (
              <tr key={String(item.item_id)} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{String(item.name)}</p>
                  {(Boolean(item.tire_brand) || Boolean(item.tire_size)) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[String((item.tire_brand as AnyRecord)?.name ?? ""), String((item.tire_size as AnyRecord)?.label ?? "")].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs ${CATEGORY_COLORS[String(item.category)] ?? "bg-gray-100 text-gray-800"}`}>
                    {String(item.category)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {stockBadge(item)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {String(item.reorder_level ?? 5)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAdj(item)}
                    className="h-7 text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                  >
                    <SlidersHorizontal className="h-3 w-3 mr-1" />
                    Adjust
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="sm:hidden p-3 space-y-3">
          {loadingItems ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">No products found</p>
          ) : (
            pagedItems.map(item => (
              <div key={String(item.item_id)} className="rounded-lg border border-border p-3 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground break-words">{String(item.name)}</p>
                    {(Boolean(item.tire_brand) || Boolean(item.tire_size)) && (
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">
                        {[String((item.tire_brand as AnyRecord)?.name ?? ""), String((item.tire_size as AnyRecord)?.label ?? "")].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <Badge className={`text-xs ${CATEGORY_COLORS[String(item.category)] ?? "bg-gray-100 text-gray-800"}`}>
                    {String(item.category)}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {stockBadge(item)}
                  <span className="text-xs text-muted-foreground">Reorder: {String(item.reorder_level ?? 5)}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAdj(item)}
                  className="h-8 text-xs border-teal-300 text-teal-700 hover:bg-teal-50 mt-3 w-full"
                >
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  Adjust
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Showing {items.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, items.length)} of {items.length}
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

      {/* Adjustment History */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Adjustment History
        </h2>

        {loadingHist ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading history…</span>
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No adjustments recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map(adj => {
              const lines = (adj.lines ?? []) as AnyRecord[];
              return (
                <div key={String(adj.adjustment_id)} className="rounded-lg border border-border p-4 bg-card">
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {REASON_LABELS[String(adj.reason)] ?? String(adj.reason)}
                      </Badge>
                      {adj.note != null && adj.note !== '' && <span className="text-xs text-muted-foreground">{String(adj.note)}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(String(adj.created_at)).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {lines.map(line => {
                      const delta = Number(line.delta);
                      const itemName = (line.item as AnyRecord)?.name ?? line.item_id;
                      return (
                        <div key={String(line.adj_line_id)} className="flex items-center gap-3 text-sm">
                          <span className="text-foreground flex-1">{String(itemName)}</span>
                          <span className="text-muted-foreground text-xs">
                            {String(line.quantity_before)} → {String(line.quantity_after)}
                          </span>
                          <span className={`text-xs font-medium flex items-center gap-0.5 ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-slate-400"}`}>
                            {deltaIcon(delta)}
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Adjustment Dialog */}
      {adjItem && (
        <AdjustmentDialog
          open={adjOpen}
          onOpenChange={open => { if (!open) { setAdjOpen(false); setAdjItem(null); } }}
          itemId={String(adjItem.item_id)}
          currentQty={Number(adjItem.stock_quantity)}
          branchId={String(adjItem.branch_id ?? activeBranchId ?? "")}
          userId={String(user?.user_id ?? "")}
          onAdjusted={handleAdjusted}
        />
      )}
    </div>
  );
}
