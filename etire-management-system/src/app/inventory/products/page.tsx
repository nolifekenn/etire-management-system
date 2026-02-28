"use client";

/**
 * /inventory/products — Odoo 19-style Product List View
 *
 * High-density data table of inventory_item master data.
 * • Columns:  SKU / Name, Category, Vehicle Type, Sale Price, Cost, On Hand
 * • Filters:  search, category, low stock, out of stock
 * • Group by: category | vehicle_type
 * • Row click navigates to /inventory/products/[id] (Form View)
 * • "New" button opens CreateProductDialog
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  PackageX,
  Filter,
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
import { listProducts } from "@/lib/actions/inventory";
import { CreateProductDialog } from "@/app/inventory/components/CreateProductDialog";

// ── Types ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

type CategoryType = "tire" | "tool" | "accessory" | "service";

const CATEGORY_COLORS: Record<string, string> = {
  tire:      "bg-blue-100   text-blue-800",
  tool:      "bg-amber-100  text-amber-800",
  accessory: "bg-purple-100 text-purple-800",
  service:   "bg-teal-100   text-teal-800",
};

const VEHICLE_LABELS: Record<string, string> = {
  car:   "Car",
  motor: "Motorcycle",
  truck: "Truck",
};

const PAGE_SIZE = 50;

// ── Component ──────────────────────────────────────────────────────────────

export default function ProductListPage() {
  const router      = useRouter();
  const params      = useSearchParams();
  const { toast }   = useToast();

  const [items, setItems]           = useState<AnyRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Filters
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState<string>("all");
  const [filter,   setFilter]   = useState<string>(params.get("filter") ?? "all");

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await listProducts({
        search:    search || undefined,
        category:  category !== "all" ? category : undefined,
        low_stock: filter === "low_stock",
        page:      p,
        page_size: PAGE_SIZE,
      });

      let rows = res.items as AnyRecord[];

      // Client-side filter for out_of_stock (stock_quantity === 0)
      if (filter === "out_of_stock") {
        rows = rows.filter(i => Number(i.stock_quantity) === 0);
      }

      setItems(rows);
      setTotal(res.total);
    } catch {
      toast({ title: "Failed to load products", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, category, filter, page]);

  useEffect(() => { load(1); setPage(1); }, [search, category, filter]);
  useEffect(() => { load(page); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stockBadge = (item: AnyRecord) => {
    const qty    = Number(item.stock_quantity);
    const reorder = Number(item.reorder_level ?? 5);
    if (qty === 0)       return <Badge className="bg-red-100 text-red-700 border-red-200">Out of Stock</Badge>;
    if (qty < reorder)   return <Badge className="bg-amber-100 text-amber-700 border-amber-200">{qty} ▼</Badge>;
    return <span className="text-sm font-medium text-foreground">{qty}</span>;
  };

  const fmt = (n: unknown) =>
    Number(n).toLocaleString("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <nav className="text-xs text-muted-foreground mb-1">
            <button onClick={() => router.push("/inventory")} className="hover:underline">Inventory</button>
            <span className="mx-1">/</span>
            <span>Products</span>
          </nav>
          <h1 className="text-xl font-bold text-foreground">Products</h1>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[#714B67] hover:bg-[#5a3c53] text-white"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Product
        </Button>
      </div>

      {/* Toolbar: search + filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-[140px]">
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

        {/* Stock filter */}
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-[150px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active filter badges */}
      {(filter !== "all" || category !== "all") && (
        <div className="flex items-center gap-2 -mt-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {filter === "low_stock" && (
            <Badge className="bg-amber-100 text-amber-800 gap-1 cursor-pointer" onClick={() => setFilter("all")}>
              <AlertTriangle className="h-3 w-3" />Low Stock
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          {filter === "out_of_stock" && (
            <Badge className="bg-red-100 text-red-800 gap-1 cursor-pointer" onClick={() => setFilter("all")}>
              <PackageX className="h-3 w-3" />Out of Stock
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          {category !== "all" && (
            <Badge className={`${CATEGORY_COLORS[category] ?? ""} gap-1 cursor-pointer`} onClick={() => setCategory("all")}>
              {category}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-1/3">Product</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Sale Price</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cost</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">On Hand</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-muted-foreground text-sm">
                  No products found
                </td>
              </tr>
            ) : (
              items.map(item => {
                const brandName = (item.tire_brand as AnyRecord)?.name;
                const sizeName  = (item.tire_size  as AnyRecord)?.label;
                const subtitle  = [brandName, sizeName].filter(Boolean).join(" · ");

                return (
                  <tr
                    key={String(item.item_id)}
                    onClick={() => router.push(`/inventory/products/${item.item_id}`)}
                    className="border-t border-border hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{String(item.name)}</p>
                      {subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${CATEGORY_COLORS[String(item.category)] ?? "bg-gray-100 text-gray-800"}`}>
                        {String(item.category)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.vehicle_type ? VEHICLE_LABELS[String(item.vehicle_type)] ?? String(item.vehicle_type) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {fmt(item.sale_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {fmt(item.cost_price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {stockBadge(item)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {loading ? "Loading…" : `${items.length} of ${total} products`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs">Page {page} / {totalPages}</span>
          <Button
            variant="outline" size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create Product Dialog */}
      <CreateProductDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={itemId => {
          setShowCreate(false);
          router.push(`/inventory/products/${itemId}`);
        }}
      />
    </div>
  );
}
