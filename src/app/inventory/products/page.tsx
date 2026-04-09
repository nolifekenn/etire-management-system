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

import { useEffect, useState, useCallback, Fragment } from "react";
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
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  Tag,
  Truck,
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Types ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

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

const DEFAULT_ROWS_PER_PAGE = 50;
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50] as const;

// ── Component ──────────────────────────────────────────────────────────────

export default function ProductListPage() {
  const router      = useRouter();
  const params      = useSearchParams();
  const { toast }   = useToast();

  const [items, setItems]           = useState<AnyRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_ROWS_PER_PAGE);
  const [loading, setLoading]       = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  // Filters
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState<string>("all");
  const [filter,   setFilter]   = useState<string>(params.get("filter") ?? "all");

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await listProducts({
        search:       search || undefined,
        category:     category !== "all" ? category : undefined,
        low_stock:    filter === "low_stock",
        out_of_stock: filter === "out_of_stock",
        page:         p,
        page_size:    rowsPerPage,
      });

      const rows = res.items as AnyRecord[];

      setItems(rows);
      setTotal(res.total);
    } catch {
      toast({ title: "Failed to load products", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, category, filter, rowsPerPage, toast]);

  useEffect(() => { setPage(1); load(1); }, [search, category, filter, rowsPerPage, load]);
  useEffect(() => { load(page); }, [page, load]);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  const stockBadge = (item: AnyRecord) => {
    const qty    = Number(item.stock_quantity);
    const reorder = Number(item.reorder_level ?? 5);
    if (qty === 0)       return <Badge className="inline-flex min-w-[7.5rem] justify-center rounded-full border-red-200 bg-red-100 text-red-700">Out of Stock</Badge>;
    if (qty < reorder)   return <Badge className="inline-flex min-w-[7.5rem] justify-center rounded-full border-amber-200 bg-amber-100 text-amber-700">{qty} Low Stock</Badge>;
    return <Badge className="inline-flex min-w-[7.5rem] justify-center rounded-full border-green-200 bg-green-100 text-green-700">{qty} In Stock</Badge>;
  };

  const fmt = (n: unknown) =>
    Number(n).toLocaleString("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });

  const BRAND_COLOR: [number, number, number] = [113, 75, 103];

  const getStockStatus = (item: AnyRecord): 'out' | 'low' | 'ok' => {
    const qty = Number(item.stock_quantity);
    const reorder = Number(item.reorder_level ?? 5);
    if (qty === 0) return 'out';
    if (qty < reorder) return 'low';
    return 'ok';
  };

  const handleExportPDF = async () => {
    toast({ title: "Preparing PDF…", description: "Fetching all products, please wait." });

    let allItems: AnyRecord[] = [];
    try {
      const res = await listProducts({
        search:       search || undefined,
        category:     category !== 'all' ? category : undefined,
        low_stock:    filter === 'low_stock',
        out_of_stock: filter === 'out_of_stock',
        page:         1,
        page_size:    9999,
      });
      allItems = res.items as AnyRecord[];
    } catch {
      toast({ title: "Failed to fetch products", variant: "destructive" });
      return;
    }

    if (allItems.length === 0) {
      toast({ title: "No Data", description: "No products to export.", variant: "destructive" });
      return;
    }

    // Sort: out of stock first → low stock → in stock, then by name
    const statusOrder = { out: 0, low: 1, ok: 2 };
    const sorted = [...allItems].sort((a, b) => {
      const sa = statusOrder[getStockStatus(a)];
      const sb = statusOrder[getStockStatus(b)];
      if (sa !== sb) return sa - sb;
      return String(a.name).localeCompare(String(b.name));
    });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Header
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('eTire MIS', 14, 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Inventory Products — Stock Level Report', 14, 16);
    doc.text(today, pageW - 14, 16, { align: 'right' });
    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.5);
    doc.line(0, 22, pageW, 22);

    // Summary
    const outCount  = sorted.filter(i => getStockStatus(i) === 'out').length;
    const lowCount  = sorted.filter(i => getStockStatus(i) === 'low').length;
    const okCount   = sorted.filter(i => getStockStatus(i) === 'ok').length;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Total: ${sorted.length}   Out of Stock: ${outCount}   Low Stock: ${lowCount}   In Stock: ${okCount}`,
      14, 29
    );

    const fmtNum = (n: unknown) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const tableBody = sorted.map(item => {
      const brandName = (item.tire_brand as AnyRecord)?.name;
      const sizeName  = (item.tire_size  as AnyRecord)?.label;
      const subtitle  = [brandName, sizeName].filter(Boolean).join(' / ');
      const nameStr   = subtitle ? `${String(item.name)}\n${subtitle}` : String(item.name);
      const catStr    = String(item.category ?? '');
      const vehStr    = item.vehicle_type ? (VEHICLE_LABELS[String(item.vehicle_type)] ?? String(item.vehicle_type)) : '-';
      const saleStr   = fmtNum(item.sale_price);
      const costStr   = fmtNum(item.cost_price);
      const qtyStr    = String(item.stock_quantity ?? 0);
      const reorderStr = String(item.reorder_level ?? 5);
      const status    = getStockStatus(item);
      const statusStr = status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock';
      return [nameStr, catStr, vehStr, saleStr, costStr, qtyStr, reorderStr, statusStr];
    });

    autoTable(doc, {
      startY: 33,
      head: [['Product', 'Category', 'Vehicle', 'Sale Price', 'Cost', 'On Hand', 'Reorder', 'Status']],
      body: tableBody,
      foot: [[
        { content: `Total: ${sorted.length} product(s)`, colSpan: 5, styles: { halign: 'left', fontStyle: 'bold' } },
        { content: `Out: ${outCount}  Low: ${lowCount}  OK: ${okCount}`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }
      ]],
      headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [251, 248, 252] },
      footStyles: { fillColor: [240, 235, 245], textColor: [60, 40, 55], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 65 },
        1: { cellWidth: 25 },
        2: { cellWidth: 22 },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 28 },
      },
      styles: { fontSize: 8, cellPadding: 2.5 },
      didParseCell: (data: Parameters<NonNullable<Parameters<typeof autoTable>[1]['didParseCell']>>[0]) => {
        if (data.section === 'body' && data.column.index === 7) {
          const val = data.cell.raw as string;
          if (val === 'Out of Stock') {
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Low Stock') {
            data.cell.styles.textColor = [146, 64, 14];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [22, 101, 52];
          }
        }
        // Highlight entire row for critical items
        if (data.section === 'body') {
          const rowData = data.row.raw as string[];
          const statusCell = rowData[7];
          if (statusCell === 'Out of Stock') {
            data.cell.styles.fillColor = [254, 242, 242];
          } else if (statusCell === 'Low Stock') {
            data.cell.styles.fillColor = [255, 251, 235];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    const datePart = new Date().toISOString().split('T')[0];
    doc.save(`inventory-stock-report-${datePart}.pdf`);
    toast({ title: "PDF Exported!", description: `${sorted.length} products saved as PDF.` });
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <nav className="text-xs text-muted-foreground mb-1">
            <button onClick={() => router.push("/inventory")} className="hover:no-underline">Inventory</button>
            <span className="mx-1">/</span>
            <span>Products</span>
          </nav>
          <h1 className="text-xl font-bold text-foreground">Products</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="sm"
            className="border-[#714B67] text-[#714B67] hover:bg-[#714B67] hover:text-white w-full sm:w-auto"
          >
            <FileText className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-[#714B67] hover:bg-[#5a3c53] text-white w-full sm:w-auto"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Product
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="h-8" onClick={() => router.push('/inventory/products')}>Products</Button>
        <Button variant="ghost" size="sm" className="h-8" onClick={() => router.push('/inventory/adjustments')}>Adjustments</Button>
        <Button variant="ghost" size="sm" className="h-8" onClick={() => router.push('/inventory/forecast')}>Stock Forecast</Button>
      </div>

      {/* Toolbar: search + filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
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
          <SelectTrigger className="h-9 w-full sm:w-[140px]">
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
          <SelectTrigger className="h-9 w-full sm:w-[150px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-full sm:w-auto sm:ml-auto shrink-0">
          <Select value={String(rowsPerPage)} onValueChange={(value) => setRowsPerPage(Number(value))}>
            <SelectTrigger className="h-9 w-full sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROWS_PER_PAGE_OPTIONS.map(option => (
                <SelectItem key={option} value={String(option)}>Show: {option} items</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filter badges */}
      {(filter !== "all" || category !== "all") && (
        <div className="flex items-center gap-2 -mt-2 flex-wrap">
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
      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="hidden sm:block overflow-x-auto overflow-y-visible">
        <table className="w-full text-sm min-w-[920px]">
          <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground w-1/3">Product</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground">Vehicle</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">Sale Price</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">Cost</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground">On Hand</th>
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
                const itemId    = String(item.item_id);
                const brandName = (item.tire_brand as AnyRecord)?.name as string | undefined;
                const sizeName  = (item.tire_size  as AnyRecord)?.label as string | undefined;
                const subtitle  = [brandName, sizeName].filter(Boolean).join(" · ");
                const isExpanded = expandedId === itemId;
                const branchName   = (item.branch   as AnyRecord)?.name as string | undefined;
                const supplierName = (item.supplier as AnyRecord)?.name as string | undefined;

                return (
                  <Fragment key={itemId}>
                    {/* Main row */}
                    <tr
                      key={itemId}
                      onClick={() => setExpandedId(prev => prev === itemId ? null : itemId)}
                      className={`border-t border-border hover:bg-muted/40 cursor-pointer transition-colors ${isExpanded ? "bg-muted/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isExpanded
                            ? <ChevronUp   className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <div>
                            <p className="font-medium text-foreground">{String(item.name)}</p>
                            {subtitle && (
                              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                            )}
                          </div>
                        </div>
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

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr key={`${itemId}-detail`} className="bg-muted/20 border-t border-dashed border-border">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            {/* Product info */}
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" /> Product Info
                              </p>
                              <div className="space-y-1">
                                {!!(item.sku as string) && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">SKU</span>
                                    <span className="font-mono font-medium">{item.sku as string}</span>
                                  </div>
                                )}
                                {brandName && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Brand</span>
                                    <span className="font-medium">{brandName}</span>
                                  </div>
                                )}
                                {sizeName && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Size</span>
                                    <span className="font-medium">{sizeName}</span>
                                  </div>
                                )}
                                {(item.tire_pattern as string) && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Pattern</span>
                                    <span>{item.tire_pattern as string}</span>
                                  </div>
                                )}
                                {(item.ply_rating as string) && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ply Rating</span>
                                    <span>{item.ply_rating as string}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Pricing */}
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <Tag className="h-3.5 w-3.5" /> Pricing
                              </p>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Sale Price</span>
                                  <span className="font-semibold text-foreground">{fmt(item.sale_price)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Cost Price</span>
                                  <span>{fmt(item.cost_price)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Margin</span>
                                  <span className={Number(item.sale_price) > Number(item.cost_price) ? "text-green-600 font-medium" : "text-red-500"}>
                                    {fmt(Number(item.sale_price) - Number(item.cost_price))}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Stock */}
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" /> Stock
                              </p>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">On Hand</span>
                                  <span className="font-semibold">{String(item.stock_quantity ?? 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Reorder Level</span>
                                  <span>{String(item.reorder_level ?? 5)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status</span>
                                  {stockBadge(item)}
                                </div>
                              </div>
                            </div>

                            {/* Logistics */}
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <Truck className="h-3.5 w-3.5" /> Logistics
                              </p>
                              <div className="space-y-1">
                                {branchName && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Branch</span>
                                    <span>{branchName}</span>
                                  </div>
                                )}
                                {supplierName && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Supplier</span>
                                    <span>{supplierName}</span>
                                  </div>
                                )}
                                {(item.vehicle_type as string) && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Vehicle</span>
                                    <span>{VEHICLE_LABELS[item.vehicle_type as string] ?? (item.vehicle_type as string)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Category</span>
                                  <Badge className={`text-xs ${CATEGORY_COLORS[String(item.category)] ?? "bg-gray-100 text-gray-800"}`}>
                                    {String(item.category)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-end border-t border-border pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/inventory/products/${itemId}`);
                              }}
                            >
                              Open Edit / Archive
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        <div className="sm:hidden p-3 space-y-3">
          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">No products found</p>
          ) : (
            items.map(item => {
              const itemId = String(item.item_id);
              const brandName = (item.tire_brand as AnyRecord)?.name as string | undefined;
              const sizeName = (item.tire_size as AnyRecord)?.label as string | undefined;
              const subtitle = [brandName, sizeName].filter(Boolean).join(" · ");
              const isExpanded = expandedId === itemId;
              return (
                <div key={itemId} className="rounded-lg border border-border p-3 bg-card">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedId(prev => prev === itemId ? null : itemId)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground break-words">{String(item.name)}</p>
                        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 break-words">{subtitle}</p>}
                      </div>
                      <Badge className={`text-xs ${CATEGORY_COLORS[String(item.category)] ?? "bg-gray-100 text-gray-800"}`}>
                        {String(item.category)}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-muted-foreground">Vehicle</p><p className="font-medium">{item.vehicle_type ? VEHICLE_LABELS[String(item.vehicle_type)] ?? String(item.vehicle_type) : "—"}</p></div>
                      <div className="text-right"><p className="text-muted-foreground">On Hand</p><div className="inline-block mt-0.5">{stockBadge(item)}</div></div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 border-t border-border pt-3 text-xs space-y-2">
                      <div className="flex justify-between"><span className="text-muted-foreground">Sale Price</span><span className="font-medium">{fmt(item.sale_price)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Cost</span><span>{fmt(item.cost_price)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Reorder</span><span>{String(item.reorder_level ?? 5)}</span></div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-1"
                        onClick={() => router.push(`/inventory/products/${itemId}`)}
                      >
                        Open Edit / Archive
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-muted-foreground border-t border-border pt-3">
        <span>
          {loading ? 'Loading...' : `Showing ${total === 0 ? 0 : (page - 1) * rowsPerPage + 1}-${(page - 1) * rowsPerPage + items.length} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs">Page {page} of {totalPages}</span>
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
