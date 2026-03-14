"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusCircle, Search, RefreshCw, Package, SlidersHorizontal, X, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { listPOs } from "@/lib/actions/purchasing";
import type { POState } from "@/lib/poUtils";
import { CreateRFQDialog } from "@/app/purchasing/components/CreateRFQDialog";

//  State badge 

const STATE_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft RFQ",      cls: "bg-gray-100 text-gray-600 border-gray-200" },
  sent:      { label: "RFQ Sent",       cls: "bg-blue-100 text-blue-700 border-blue-200" },
  purchase:  { label: "Purchase Order", cls: "bg-green-100 text-green-700 border-green-200" },
  locked:    { label: "Locked",         cls: "bg-purple-100 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelled",      cls: "bg-red-100 text-red-600 border-red-200" },
  pending:   { label: "Pending",        cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  approved:  { label: "Approved",       cls: "bg-green-100 text-green-700 border-green-200" },
  ordered:   { label: "Ordered",        cls: "bg-blue-100 text-blue-700 border-blue-200" },
  delivered: { label: "Delivered",      cls: "bg-purple-100 text-purple-700 border-purple-200" },
};

function StateBadge({ state }: { state: string }) {
  const cfg = STATE_BADGE[state] ?? { label: state, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

//  Formatters 

function fmt(amount: number | null | undefined) {
  return `${(amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function fmtDate(val: unknown) {
  if (!val) return "";
  return new Date(String(val)).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

//  Constants 

const PAGE_SIZE = 25;

const STATE_FILTERS = [
  { value: "all",       label: "All Orders" },
  { value: "draft",     label: "Draft RFQ" },
  { value: "sent",      label: "RFQ Sent" },
  { value: "purchase",  label: "Purchase Order" },
  { value: "locked",    label: "Locked" },
  { value: "cancelled", label: "Cancelled" },
];

//  Page 

export default function PurchasingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [orders, setOrders]           = useState<Record<string, unknown>[]>([]);
  const [count, setCount]             = useState(0);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [loading, setLoading]         = useState(true);
  const [createOpen, setCreateOpen]   = useState(false);
  const canCreatePO = user?.role === "super_admin" || user?.role === "branch_manager";

  const handleOpenCreate = () => {
    if (!canCreatePO) {
      toast({
        title: "Manager approval required",
        description: "You are not permitted to create purchase orders. Only a manager can do this.",
        variant: "destructive",
      });
      return;
    }
    setCreateOpen(true);
  };

  //  Fetch 

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPOs({
        branchId: user?.role !== "super_admin" ? user?.branch_id ?? undefined : undefined,
        state:    stateFilter !== "all" ? (stateFilter as POState) : undefined,
        search:   search.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setOrders(result.data as Record<string, unknown>[]);
      setCount(result.count);
    } catch {
      toast({ title: "Error", description: "Failed to load purchase orders.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, stateFilter, search, page, toast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [stateFilter, search]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  //  Summary stats 

  const draftCount    = orders.filter(o => ["draft","pending"].includes(String(o.state ?? o.status))).length;
  const purchaseCount = orders.filter(o => ["purchase","approved","ordered"].includes(String(o.state ?? o.status))).length;
  const totalAmt      = orders
    .filter(o => !["cancelled", "canceled", "rejected"].includes(String(o.state ?? o.status)))
    .reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="border-b border-border bg-white px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Package className="h-5 w-5 text-purple-600 shrink-0" />
        <h1 className="text-base font-semibold text-foreground">Purchase Orders</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleOpenCreate}
          >
            <PlusCircle className="h-4 w-4" />
            New
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-[#714B67] border-[#714B67] hover:bg-purple-50" asChild>
            <Link href="/purchasing/vendors">
              <Building2 className="h-4 w-4" />
              Vendors
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchOrders} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-5">

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Orders",    value: count,              sub: "all statuses" },
            { label: "Draft / Pending", value: draftCount,         sub: "awaiting confirmation" },
            { label: "Confirmed POs",   value: purchaseCount,      sub: "in progress" },
            { label: "Page Value",      value: `${fmt(totalAmt)}`, sub: "current page" },
          ].map((s) => (
            <Card key={s.label} className="shadow-none border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search PO number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="h-8 text-sm w-44">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATE_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="ml-auto text-xs text-muted-foreground">{count} record{count !== 1 ? "s" : ""}</p>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Reference</th>
                <th className="text-left px-4 py-2.5 font-medium">Vendor</th>
                <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Branch</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Order Date</th>
                <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Expected Arrival</th>
                <th className="text-right px-4 py-2.5 font-medium">Total</th>
                <th className="text-center px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">No purchase orders found.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={handleOpenCreate}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create your first RFQ
                    </Button>
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const supplier  = po.supplier as { name?: string } | null;
                  const branch    = po.branch   as { name?: string } | null;
                  const stateVal  = String(po.state ?? po.status ?? "draft");
                  return (
                    <tr
                      key={String(po.po_id)}
                      className="border-b border-border last:border-0 hover:bg-accent/40 cursor-pointer transition-colors"
                      onClick={() => router.push(`/purchasing/${po.po_id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-purple-700 text-xs">
                          {String(po.po_number ?? "")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[160px] truncate">
                        {supplier?.name ?? ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {branch?.name ?? ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {fmtDate(po.order_date)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {po.expected_delivery_date
                          ? fmtDate(po.expected_delivery_date)
                          : <span className="text-xs text-muted-foreground/50">Not set</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {fmt(po.total_amount as number)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StateBadge state={stateVal} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog */}
      <CreateRFQDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (open) {
            handleOpenCreate();
            return;
          }
          setCreateOpen(false);
        }}
        onCreated={(poId) => {
          setCreateOpen(false);
          router.push(`/purchasing/${poId}`);
        }}
      />
    </div>
  );
}
