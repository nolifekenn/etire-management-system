"use client";

/**
 * /inventory/products/[id]  — Odoo 19-style Product Form View
 *
 * Layout mirrors Odoo product form:
 *  • Breadcrumb + action buttons (Edit / Save + Discard, Adjustment)
 *  • Smart Buttons (On Hand, Moves, Sold, Received)
 *  • Two main tabs: General Information | Inventory
 *  • Chatter panel below tabs
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  SlidersHorizontal,
  Loader2,
  PackageCheck,
  ShoppingCart,
  ArrowLeftRight,
  Package,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Badge }    from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast }  from "@/hooks/use-toast";
import { useAuth }   from "@/hooks/useAuth";
import {
  getProductWithDetails,
  getInventorySmartButtons,
  upsertProduct,
  archiveProduct,
} from "@/lib/actions/inventory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AuditTrailPanel }      from "@/components/AuditTrailPanel";
import { AdjustmentDialog }  from "@/app/inventory/components/AdjustmentDialog";
import { SecureVoidModal } from "@/components/SecureVoidModal";
import { validateShortText, validateNumber, type FieldError } from "@/lib/validation";

// ── Types ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

interface SmartBtn {
  label:  string;
  value:  number | string;
  href?:  string;
  icon:   string;
  color:  string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ArrowLeftRight: ArrowLeftRight,
  PackageCheck:   PackageCheck,
  ShoppingCart:   ShoppingCart,
  Package:        Package,
};

const CATEGORY_COLORS: Record<string, string> = {
  tire:      "bg-blue-100   text-blue-800",
  tool:      "bg-amber-100  text-amber-800",
  accessory: "bg-purple-100 text-purple-800",
  service:   "bg-teal-100   text-teal-800",
};

const MOVE_TYPE_COLORS: Record<string, string> = {
  receipt:    "text-green-600",
  sale:       "text-orange-600",
  adjustment: "text-blue-600",
};

function str(val: unknown): string {
  if (val == null) return "";
  return String(val);
}

function fmt(n: unknown): string {
  return Number(n).toLocaleString("en-PH", {
    style: "currency", currency: "PHP", minimumFractionDigits: 2,
  });
}

function fmtDate(val: unknown): string {
  if (!val) return "—";
  try {
    return new Date(String(val)).toLocaleDateString("en-PH", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return String(val);
  }
}

// ── Smart Button Component ─────────────────────────────────────────────────

function SmartButton({ btn, onClick }: { btn: SmartBtn; onClick: () => void }) {
  const Icon = ICON_MAP[btn.icon] ?? Package;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg border border-border
                 bg-card hover:bg-muted transition-colors text-center min-w-[80px]"
    >
      <Icon className={`h-4 w-4 ${btn.color}`} />
      <span className="text-lg font-bold text-foreground leading-none">{btn.value}</span>
      <span className="text-xs text-muted-foreground">{btn.label}</span>
    </button>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ProductFormPage() {
  const params = useParams<{ id: string | string[] }>();
  const itemId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const router = useRouter();
  const { toast } = useToast();
  const { user, activeBranchId } = useAuth();

  const [product,     setProduct]     = useState<AnyRecord | null>(null);
  const [moves,       setMoves]       = useState<AnyRecord[]>([]);
  const [smartBtns,   setSmartBtns]   = useState<SmartBtn[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [showAdjust,  setShowAdjust]  = useState(false);

  // Validation state
  const [nameError,      setNameError]      = useState<FieldError>(null);
  const [salePriceError, setSalePriceError] = useState<FieldError>(null);
  const [costPriceError, setCostPriceError] = useState<FieldError>(null);
  const [reorderError,   setReorderError]   = useState<FieldError>(null);

  // Editable fields
  const [editName,     setEditName]     = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editVehicle,  setEditVehicle]  = useState("");
  const [editSalePrice,setEditSalePrice]= useState("");
  const [editCostPrice,setEditCostPrice]= useState("");
  const [editReorder,  setEditReorder]  = useState("");

  // Tire-specific edit fields
  const [tireBrands,    setTireBrands]    = useState<{ id: string; label: string }[]>([]);
  const [tireSizes,     setTireSizes]     = useState<{ id: string; label: string }[]>([]);
  const [editBrandId,   setEditBrandId]   = useState("none");
  const [editSizeId,    setEditSizeId]    = useState("none");
  const [editTirePattern, setEditTirePattern] = useState("");
  const [editPlyRating,   setEditPlyRating]   = useState("");
  const [addingBrand,   setAddingBrand]   = useState(false);
  const [addingSize,    setAddingSize]    = useState(false);
  const [newBrandValue, setNewBrandValue] = useState("");
  const [newSizeValue,  setNewSizeValue]  = useState("");

  // Archive
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving,   setArchiving]   = useState(false);
  const [archiveAuthOpen, setArchiveAuthOpen] = useState(false);

  const load = useCallback(async () => {
    if (!itemId) {
      setLoading(false);
      toast({ title: "Invalid product link", variant: "destructive" });
      router.push("/inventory/products");
      return;
    }

    setLoading(true);
    try {
      const detailRes = await getProductWithDetails(itemId);

      if (!detailRes.success || !detailRes.product) {
        toast({ title: "Product not found", variant: "destructive" });
        router.push("/inventory/products");
        return;
      }

      let btnRes: SmartBtn[] = [];
      try {
        btnRes = (await getInventorySmartButtons(itemId)) as SmartBtn[];
      } catch {
        btnRes = [];
      }

      setProduct(detailRes.product);
      setMoves(detailRes.moves ?? []);
      setSmartBtns(btnRes);

      // Seed edit fields
      const p = detailRes.product;
      setEditName(str(p.name));
      setEditCategory(str(p.category));
      setEditVehicle(str(p.vehicle_type));
      setEditSalePrice(str(p.sale_price));
      setEditCostPrice(str(p.cost_price));
      setEditReorder(str(p.reorder_level));
      setEditBrandId(str(p.brand_id) || "none");
      setEditSizeId(str(p.size_id) || "none");
      setEditTirePattern(str(p.tire_pattern));
      setEditPlyRating(p.ply_rating != null ? str(p.ply_rating) : "");

      // Load tire lookups (idempotent — only if not yet loaded)
      fetch("/api/lookups/tire")
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (!json) return;
          setTireBrands((json.brands ?? []).map((b: { brand_id: string; name: string }) => ({ id: b.brand_id, label: b.name })));
          setTireSizes((json.sizes ?? []).map((s: { size_id: string; label: string }) => ({ id: s.size_id, label: s.label })));
        })
        .catch(() => {});
    } catch {
      toast({ title: "Failed to load product", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [itemId, router, toast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!product) return;

    const isTireEdit = editCategory === "tire";
    const selectedBrand = tireBrands.find((brand) => brand.id === editBrandId)?.label?.trim() ?? "";
    const selectedSize = tireSizes.find((size) => size.id === editSizeId)?.label?.trim() ?? "";
    const composedTireName = [selectedBrand, selectedSize].filter(Boolean).join(" ").trim();
    const finalName = isTireEdit && composedTireName ? composedTireName : editName.trim();

    // Validate name before saving
    const nameErr     = validateShortText(finalName,     { label: "Product name",  minLength: 2, maxLength: 150 });
    const saleErr     = validateNumber(editSalePrice,    { label: "Sale price",    required: false, min: 0 });
    const costErr     = validateNumber(editCostPrice,    { label: "Cost price",    required: false, min: 0 });
    const reorderErr  = validateNumber(editReorder,      { label: "Reorder level", required: true,  min: 0, integer: true });

    setNameError(nameErr);
    setSalePriceError(saleErr);
    setCostPriceError(costErr);
    setReorderError(reorderErr);
    if (nameErr || saleErr || costErr || reorderErr) return;

    setSaving(true);
    try {
      const result = await upsertProduct({
        item_id:      itemId,
        branch_id:    str(product.branch_id),
        supplier_id:  str(product.supplier_id) || undefined,
        name:         finalName,
        category:     editCategory as "tire" | "tool" | "accessory" | "service",
        vehicle_type: editVehicle as "car" | "motor" | "truck",
        sale_price:   Number(editSalePrice),
        cost_price:   Number(editCostPrice),
        reorder_level:Number(editReorder),
        ...(isTireEdit && editBrandId !== "none" ? { brand_id: editBrandId } : { brand_id: undefined }),
        ...(isTireEdit && editSizeId  !== "none" ? { size_id: editSizeId   } : { size_id: undefined }),
        tire_pattern: isTireEdit ? (editTirePattern.trim() || undefined) : undefined,
        ply_rating:   isTireEdit && editPlyRating ? Number(editPlyRating) : undefined,
      });

      if (!result.success) throw new Error(result.error);

      toast({ title: "Product saved" });
      setEditing(false);
      load();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!product) return;
    setEditName(str(product.name));
    setEditCategory(str(product.category));
    setEditVehicle(str(product.vehicle_type));
    setEditSalePrice(str(product.sale_price));
    setEditCostPrice(str(product.cost_price));
    setEditReorder(str(product.reorder_level));
    setEditBrandId(str(product.brand_id) || "none");
    setEditSizeId(str(product.size_id) || "none");
    setEditTirePattern(str(product.tire_pattern));
    setEditPlyRating(product.ply_rating != null ? str(product.ply_rating) : "");
    setAddingBrand(false); setAddingSize(false);
    setNewBrandValue(""); setNewSizeValue("");
    setEditing(false);
    setNameError(null);
    setSalePriceError(null);
    setCostPriceError(null);
    setReorderError(null);
  };

  const isTireEdit = editCategory === "tire";

  const handleAddLookup = async (type: "brand" | "size") => {
    const value = (type === "brand" ? newBrandValue : newSizeValue).trim();
    if (!value) return;
    try {
      const res = await fetch("/api/lookups/tire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: `Failed to add ${type}`, description: json.error, variant: "destructive" });
        return;
      }
      if (type === "brand") {
        const entry = { id: json.brand_id, label: json.name };
        setTireBrands(prev => [...prev, entry].sort((a, b) => a.label.localeCompare(b.label)));
        setEditBrandId(json.brand_id);
        setNewBrandValue(""); setAddingBrand(false);
      } else {
        const entry = { id: json.size_id, label: json.label };
        setTireSizes(prev => [...prev, entry].sort((a, b) => a.label.localeCompare(b.label)));
        setEditSizeId(json.size_id);
        setNewSizeValue(""); setAddingSize(false);
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const result = await archiveProduct(itemId);
      if (!result.success) throw new Error(result.error);
      toast({ title: "Product archived", description: "The product has been removed from active inventory." });
      router.push("/inventory/products");
    } catch (err) {
      toast({
        title: "Archive failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
      setArchiveOpen(false);
    }
  };

  const requestArchive = () => {
    if (user?.role === "super_admin" || user?.role === "branch_manager") {
      setArchiveOpen(true);
      return;
    }
    setArchiveAuthOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) return null;

  const supplier = product.supplier as AnyRecord | undefined;
  const branch   = product.branch   as AnyRecord | undefined;
  const qty      = Number(product.stock_quantity ?? 0);
  const reorder  = Number(product.reorder_level ?? 5);
  const isLow    = qty < reorder;
  const isOut    = qty === 0;

  return (
    <div className="flex flex-col gap-0 h-full overflow-hidden">

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => router.push("/inventory/products")}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Products
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-foreground truncate max-w-[200px]">
            {str(product.name)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-[#714B67] hover:bg-[#5a3c53] text-white"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</>
                  : <><Save className="h-4 w-4 mr-1" />Save</>
                }
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdjust(true)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Adjust
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(true);
                  setNameError(null);
                  setSalePriceError(null);
                  setCostPriceError(null);
                  setReorderError(null);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={requestArchive}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Main content (scrollable) ────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

          {/* Product title + stock badge */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {editing ? (
                  <div className="space-y-1">
                    <Input
                      value={editName}
                      onChange={e => {
                        setEditName(e.target.value);
                        setNameError(validateShortText(e.target.value, { label: "Product name", minLength: 2, maxLength: 150 }));
                      }}
                      onBlur={() => setNameError(validateShortText(editName, { label: "Product name", minLength: 2, maxLength: 150 }))}
                      maxLength={150}
                      aria-invalid={!!nameError}
                      aria-describedby={nameError ? "pf-name-error" : undefined}
                      className={`text-2xl font-bold h-auto py-0 border-0 border-b rounded-none focus-visible:ring-0 px-0 ${
                        nameError ? "border-red-400" : "border-border"
                      }`}
                    />
                    {nameError && (
                      <p id="pf-name-error" className="text-xs text-red-500 flex items-center gap-1 font-normal">
                        <span aria-hidden>⚠</span> {nameError}
                      </p>
                    )}
                    <p className={`text-xs text-right font-normal ${
                      editName.trim().length > 130 ? "text-amber-500" : "text-muted-foreground"
                    }`}>
                      {editName.trim().length}/150
                    </p>
                  </div>
                ) : str(product.name)}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={CATEGORY_COLORS[str(product.category)] ?? "bg-gray-100 text-gray-800"}>
                  {str(product.category)}
                </Badge>
                {Boolean(product.vehicle_type) && (
                  <Badge variant="outline">{str(product.vehicle_type)}</Badge>
                )}
                {isOut  && <Badge className="bg-red-100 text-red-700">Out of Stock</Badge>}
                {isLow && !isOut && <Badge className="bg-amber-100 text-amber-700">Low Stock</Badge>}
              </div>
            </div>

            {/* On Hand count — prominent */}
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">On Hand</p>
              <p className={`text-4xl font-bold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"}`}>
                {qty}
              </p>
              <p className="text-xs text-muted-foreground">units</p>
            </div>
          </div>

          {/* Smart Buttons */}
          {smartBtns.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {smartBtns.map(btn => (
                <SmartButton
                  key={btn.label}
                  btn={btn}
                  onClick={() => btn.href ? router.push(btn.href) : undefined}
                />
              ))}
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General Information</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="moves">Product Moves</TabsTrigger>
            </TabsList>

            {/* ── General Information ─────────────────────────────────── */}
            <TabsContent value="general" className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Left: core fields */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pricing &amp; Classification
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Sale Price (₱)</Label>
                      {editing ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editSalePrice}
                            onChange={e => {
                              setEditSalePrice(e.target.value);
                              setSalePriceError(validateNumber(e.target.value, { label: "Sale price", required: false, min: 0 }));
                            }}
                            aria-invalid={!!salePriceError}
                            className={salePriceError ? "border-red-400 focus-visible:ring-red-300" : ""}
                          />
                          {salePriceError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <span aria-hidden>⚠</span> {salePriceError}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm font-medium">{fmt(product.sale_price)}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label>Cost Price (₱)</Label>
                      {editing ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editCostPrice}
                            onChange={e => {
                              setEditCostPrice(e.target.value);
                              setCostPriceError(validateNumber(e.target.value, { label: "Cost price", required: false, min: 0 }));
                            }}
                            aria-invalid={!!costPriceError}
                            className={costPriceError ? "border-red-400 focus-visible:ring-red-300" : ""}
                          />
                          {costPriceError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <span aria-hidden>⚠</span> {costPriceError}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm font-medium">{fmt(product.cost_price)}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Category</Label>
                      {editing ? (
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tire">Tire</SelectItem>
                            <SelectItem value="tool">Tool</SelectItem>
                            <SelectItem value="accessory">Accessory</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">{str(product.category)}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label>Vehicle Type</Label>
                      {editing ? (
                        <Select value={editVehicle} onValueChange={setEditVehicle}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="car">Car</SelectItem>
                            <SelectItem value="motor">Motorcycle</SelectItem>
                            <SelectItem value="truck">Truck</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">{str(product.vehicle_type) || "—"}</p>
                      )}
                    </div>
                  </div>

                  {/* ── Tire-specific fields (edit only) ──────────────────── */}
                  {editing && isTireEdit && (
                    <div className="space-y-4 border-t border-border pt-4">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tire Attributes</h3>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Brand */}
                        <div className="space-y-1">
                          <Label>Brand</Label>
                          {addingBrand ? (
                            <div className="flex gap-1">
                              <Input
                                autoFocus
                                placeholder="e.g. Bridgestone"
                                value={newBrandValue}
                                onChange={e => setNewBrandValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleAddLookup("brand");
                                  if (e.key === "Escape") { setAddingBrand(false); setNewBrandValue(""); }
                                }}
                                className="h-9 text-sm"
                              />
                              <Button size="sm" variant="outline" className="h-9 px-2" onClick={() => handleAddLookup("brand")}>
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-9 px-2 text-xs" onClick={() => { setAddingBrand(false); setNewBrandValue(""); }}>✕</Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Select value={editBrandId} onValueChange={setEditBrandId}>
                                <SelectTrigger className="flex-1 h-9 text-sm"><SelectValue placeholder="Select brand" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">— None —</SelectItem>
                                  {tireBrands.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="outline" className="h-9 px-2 shrink-0" title="Add new brand" onClick={() => setAddingBrand(true)}>
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Size */}
                        <div className="space-y-1">
                          <Label>Size</Label>
                          {addingSize ? (
                            <div className="flex gap-1">
                              <Input
                                autoFocus
                                placeholder="e.g. 185/65R15"
                                value={newSizeValue}
                                onChange={e => setNewSizeValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleAddLookup("size");
                                  if (e.key === "Escape") { setAddingSize(false); setNewSizeValue(""); }
                                }}
                                className="h-9 text-sm"
                              />
                              <Button size="sm" variant="outline" className="h-9 px-2" onClick={() => handleAddLookup("size")}>
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-9 px-2 text-xs" onClick={() => { setAddingSize(false); setNewSizeValue(""); }}>✕</Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Select value={editSizeId} onValueChange={setEditSizeId}>
                                <SelectTrigger className="flex-1 h-9 text-sm"><SelectValue placeholder="Select size" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">— None —</SelectItem>
                                  {tireSizes.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="outline" className="h-9 px-2 shrink-0" title="Add new size" onClick={() => setAddingSize(true)}>
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Tire Pattern */}
                        <div className="space-y-1">
                          <Label htmlFor="ef-pattern">Tire Pattern <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                          <Input
                            id="ef-pattern"
                            value={editTirePattern}
                            onChange={e => setEditTirePattern(e.target.value)}
                            placeholder="e.g. Ecopia, Dueler, HT"
                            maxLength={80}
                          />
                        </div>

                        {/* Ply Rating */}
                        <div className="space-y-1">
                          <Label htmlFor="ef-ply">Ply Rating <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                          <Input
                            id="ef-ply"
                            type="number"
                            min="1"
                            max="30"
                            step="1"
                            value={editPlyRating}
                            onChange={e => setEditPlyRating(e.target.value)}
                            placeholder="e.g. 4, 6, 8, 10"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: supplier / branch */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Sourcing
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Supplier</p>
                      <p className="text-sm font-medium">{str(supplier?.name) || "—"}</p>
                      {Boolean(supplier?.phone) && <p className="text-xs text-muted-foreground">{str(supplier?.phone)}</p>}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Branch</p>
                      <p className="text-sm font-medium">{str(branch?.name) || "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm">{fmtDate(product.created_at)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm">{fmtDate(product.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Inventory ───────────────────────────────────────────── */}
            <TabsContent value="inventory" className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="rounded-lg border border-border p-4 space-y-4 bg-white">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Stock Rules
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Reorder Level (units)</Label>
                      {editing ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            value={editReorder}
                            onChange={e => {
                              setEditReorder(e.target.value);
                              setReorderError(validateNumber(e.target.value, { label: "Reorder level", required: true, min: 0, integer: true }));
                            }}
                            aria-invalid={!!reorderError}
                            className={reorderError ? "border-red-400 focus-visible:ring-red-300" : ""}
                          />
                          {reorderError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <span aria-hidden>⚠</span> {reorderError}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm font-medium">{str(product.reorder_level)}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        A low-stock alert is triggered when quantity falls below this threshold.
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Current Status</p>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"}`}>
                          {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ({qty} on hand, threshold {reorder})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-4 bg-white">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Product Attributes
                  </h3>
                  <div className="space-y-2">
                    {Boolean(product.brand_id) && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Brand</p>
                        <p className="text-sm">{str((product.tire_brand as AnyRecord)?.name) || str(product.brand_id)}</p>
                      </div>
                    )}
                    {Boolean(product.size_id) && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Size</p>
                        <p className="text-sm">{str((product.tire_size as AnyRecord)?.label) || str(product.size_id)}</p>
                      </div>
                    )}
                    {Boolean(product.tire_pattern) && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Tire Pattern</p>
                        <p className="text-sm">{str(product.tire_pattern)}</p>
                      </div>
                    )}
                    {product.ply_rating != null && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Ply Rating</p>
                        <p className="text-sm">{str(product.ply_rating)}</p>
                      </div>
                    )}
                    {!product.brand_id && !product.size_id && !product.tire_pattern && product.ply_rating == null && (
                      <p className="text-sm text-muted-foreground">No additional attributes</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Product Moves ────────────────────────────────────────── */}
            <TabsContent value="moves" className="mt-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moves.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                          No moves recorded yet
                        </td>
                      </tr>
                    ) : (
                      moves.map((m, idx) => (
                        <tr key={idx} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(m.date)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`capitalize text-xs font-medium ${MOVE_TYPE_COLORS[str(m.move_type)] ?? ""}`}>
                              {str(m.move_type)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-foreground">{str(m.ref)}</td>
                          <td className={`px-4 py-2.5 text-right font-mono font-semibold ${
                            Number(m.qty_number) > 0 ? "text-green-600" :
                            Number(m.qty_number) < 0 ? "text-red-600" : "text-foreground"
                          }`}>
                            {str(m.qty)}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{str(m.notes) || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>

          {/* Chatter */}
          <div className="border-t border-border pt-4">
            <AuditTrailPanel
              relatedTable="inventory_item"
              relatedRecordId={itemId}
            />
          </div>
        </div>
      </div>

      {/* Adjustment Dialog */}
      <AdjustmentDialog
        open={showAdjust}
        onOpenChange={setShowAdjust}
        itemId={itemId}
        currentQty={qty}
        branchId={str(product.branch_id) || activeBranchId || ""}
        userId={user?.user_id ?? ""}
        onAdjusted={load}
      />

      <SecureVoidModal
        isOpen={archiveAuthOpen}
        onClose={() => setArchiveAuthOpen(false)}
        onAuthorized={() => setArchiveOpen(true)}
        requiredBranchId={str(product.branch_id) || activeBranchId || undefined}
        actionDescription="This product can only be archived by a manager from the product's branch."
      />

      {/* Archive Confirmation */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Archive Product?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{str(product.name)}</strong> will be marked as archived and hidden from all
              inventory lists, the POS, and reports. Its transaction history will be preserved.
              This action can be undone by a database admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {archiving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Archiving…</> : "Archive Product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
