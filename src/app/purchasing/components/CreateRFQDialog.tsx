"use client";

import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2, UserPlus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { createRFQ, createVendor } from "@/lib/actions/purchasing";
import { supabase } from "@/lib/supabaseClient";
import { validateShortText, validateEmail, validatePhone, validateLongText, validateNumber, type FieldError } from "@/lib/validation";

// ── Payment term options (shared) ──────────────────────────────
const PAYMENT_TERMS = [
  { value: "immediate",  label: "Immediate Payment" },
  { value: "net7",       label: "Net 7 Days" },
  { value: "net15",      label: "Net 15 Days" },
  { value: "net30",      label: "Net 30 Days" },
  { value: "net45",      label: "Net 45 Days" },
  { value: "net60",      label: "Net 60 Days" },
  { value: "net90",      label: "Net 90 Days" },
  { value: "cod",        label: "Cash on Delivery" },
  { value: "cia",        label: "Cash in Advance" },
  { value: "custom",     label: "Custom…" },
];

// ── Types ──────────────────────────────────────────────────────────────────

interface LineItem {
  tempId: string;
  item_id: string | null;
  name: string;
  quantity: number;
  unit_cost: number;
}

interface SupplierRow { supplier_id: string; name: string }
interface BranchRow   { branch_id:   string; name: string }
interface ItemRow     { item_id: string; name: string; cost_price: number }

interface CreateRFQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (poId: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function CreateRFQDialog({ open, onOpenChange, onCreated }: CreateRFQDialogProps) {
  const { user }  = useAuth();
  const { toast } = useToast();

  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [branches,  setBranches]  = useState<BranchRow[]>([]);
  const [items,     setItems]     = useState<ItemRow[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const [supplierId, setSupplierId]   = useState("");
  const [branchId,   setBranchId]     = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes,      setNotes]        = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ tempId: "1", item_id: null, name: "", quantity: 1, unit_cost: 0 }]);
  const [saving, setSaving] = useState(false);

  // Validation state
  const [notesError,  setNotesError]  = useState<FieldError>(null);
  const [lineErrors,  setLineErrors]  = useState<Record<string, {name?: FieldError; quantity?: FieldError; unit_cost?: FieldError}>>({});
  const [quickErrors, setQuickErrors] = useState<{name?: FieldError; phone?: FieldError; email?: FieldError}>({});

  // Quick-add vendor
  const [quickVendorOpen, setQuickVendorOpen] = useState(false);
  const [quickName,  setQuickName]  = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPayTerms, setQuickPayTerms] = useState("immediate");
  const [quickPayCustom, setQuickPayCustom] = useState("");
  const [savingVendor, setSavingVendor] = useState(false);

  // ── Load lookups when dialog opens ──────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoadingLookups(true);
    const [sRes, bRes, iRes] = await Promise.all([
        supabase!.from("supplier").select("supplier_id, name").eq("is_active", true).is("deleted_at", null).order("name"),
        supabase!.from("branch").select("branch_id, name").eq("is_active", true).is("deleted_at", null).order("name"),
        supabase!.from("inventory_item").select("item_id, name, cost_price").is("deleted_at", null).order("name"),
      ]);
      if (cancelled) return;
      if (sRes.data) setSuppliers(sRes.data as SupplierRow[]);
      if (bRes.data) setBranches(bRes.data as BranchRow[]);
      if (iRes.data) setItems(iRes.data as ItemRow[]);

      // Pre-select branch for non-super_admin
      if (bRes.data && user?.role !== "super_admin") {
        const authUser = user as { branch_id?: string };
        if (authUser.branch_id) setBranchId(authUser.branch_id);
      }
      setLoadingLookups(false);
    })();

    return () => { cancelled = true; };
  }, [open, user]);

  // ── Reset on close ────────────────────────────────────────────────────

  function reset() {
    setSupplierId(""); setBranchId(""); setExpectedDate(""); setNotes("");
    setLines([{ tempId: "1", item_id: null, name: "", quantity: 1, unit_cost: 0 }]);
    setNotesError(null);
    setLineErrors({});
  }

  function resetQuickVendor() {
    setQuickVendorOpen(false);
    setQuickName(""); setQuickPhone(""); setQuickEmail("");
    setQuickPayTerms("immediate"); setQuickPayCustom("");
    setQuickErrors({});
  }

  async function handleQuickAddVendor() {
    const errs: typeof quickErrors = {
      name:  validateShortText(quickName,  { label: "Vendor name", required: true,  minLength: 2, maxLength: 100 }),
      phone: validatePhone(quickPhone,    { label: "Phone" }),
      email: validateEmail(quickEmail,    { label: "Email" }),
    };
    setQuickErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    const paymentTerms = quickPayTerms === "custom" ? quickPayCustom.trim() || "custom" : quickPayTerms;
    setSavingVendor(true);
    try {
      const res = await createVendor({ name: quickName.trim(), phone: quickPhone || undefined, email: quickEmail || undefined, payment_terms: paymentTerms });
      if (res.error) {
        toast({ title: "Failed to create vendor", description: res.error, variant: "destructive" });
        return;
      }
      const newVendor = res.vendor as { supplier_id: string; name: string };
      setSuppliers((prev) => [...prev, { supplier_id: newVendor.supplier_id, name: newVendor.name }].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierId(newVendor.supplier_id);
      toast({ title: "Vendor created", description: `${newVendor.name} added and selected.` });
      resetQuickVendor();
    } finally {
      setSavingVendor(false);
    }
  }

  // ── Line helpers ────────────────────────────────────────────────────────

  function addLine() {
    setLines((prev) => [...prev, { tempId: String(Date.now()), item_id: null, name: "", quantity: 1, unit_cost: 0 }]);
  }

  function removeLine(tempId: string) {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
  }

  function updateLine<K extends keyof LineItem>(tempId: string, key: K, val: LineItem[K]) {
    setLines((prev) => prev.map((l) => l.tempId === tempId ? { ...l, [key]: val } : l));
    // Live validate
    if (key === "name") {
      const err = validateShortText(val as string, { label: "Product name", required: true, minLength: 2, maxLength: 150 });
      setLineErrors((prev) => ({ ...prev, [tempId]: { ...prev[tempId], name: err } }));
    }
    if (key === "quantity") {
      const err = validateNumber(val as number, { label: "Quantity", required: true, min: 1, integer: true });
      setLineErrors((prev) => ({ ...prev, [tempId]: { ...prev[tempId], quantity: err } }));
    }
    if (key === "unit_cost") {
      const err = validateNumber(val as number, { label: "Unit cost", required: false, min: 0 });
      setLineErrors((prev) => ({ ...prev, [tempId]: { ...prev[tempId], unit_cost: err } }));
    }
  }

  function selectItem(tempId: string, itemId: string) {
    const duplicateExists = lines.some((line) => line.tempId !== tempId && line.item_id === itemId);
    if (duplicateExists) {
      toast({
        title: "Duplicate product",
        description: "This product is already added in the order lines.",
        variant: "destructive",
      });
      return;
    }

    const found = items.find((i) => i.item_id === itemId);
    if (!found) return;
    setLines((prev) => prev.map((l) =>
      l.tempId === tempId
        ? { ...l, item_id: itemId, name: found.name, unit_cost: found.cost_price }
        : l
    ));
  }

  const orderTotal = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!supplierId || !branchId) {
      toast({ title: "Required fields missing", description: "Select supplier and branch.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Not signed in", variant: "destructive" });
      return;
    }

    // Validate notes
    const notesErr = validateLongText(notes, { label: "Notes", maxLength: 500 });
    setNotesError(notesErr);

    // Validate all line items
    const newLineErrors: typeof lineErrors = {};
    let lineHasError = false;
    for (const line of lines) {
      const nameErr = line.item_id === null
        ? validateShortText(line.name, { label: "Product name", required: true, minLength: 2, maxLength: 150 })
        : null;
      const qtyErr  = validateNumber(line.quantity,  { label: "Quantity",  required: true,  min: 1, integer: true });
      const costErr = validateNumber(line.unit_cost, { label: "Unit cost", required: false, min: 0 });
      if (nameErr || qtyErr || costErr) lineHasError = true;
      newLineErrors[line.tempId] = { name: nameErr ?? undefined, quantity: qtyErr ?? undefined, unit_cost: costErr ?? undefined };
    }
    setLineErrors(newLineErrors);

    if (notesErr || lineHasError) return;

    const validLines = lines.filter((l) => l.name.trim() && l.quantity > 0);
    if (validLines.length === 0) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }

    const selectedItemIds = validLines
      .map((line) => line.item_id)
      .filter((itemId): itemId is string => Boolean(itemId));
    const duplicateSelectedItems = new Set<string>();
    for (const itemId of selectedItemIds) {
      if (duplicateSelectedItems.has(itemId)) {
        toast({
          title: "Duplicate product",
          description: "Remove duplicate products before saving this RFQ.",
          variant: "destructive",
        });
        return;
      }
      duplicateSelectedItems.add(itemId);
    }

    setSaving(true);
    try {
      const result = await createRFQ({
        supplier_id:            supplierId,
        branch_id:              branchId,
        user_id:                (user as { user_id?: string }).user_id ?? "",
        expected_delivery_date: expectedDate || undefined,
        payment_method:         "cash",
        notes:                  notes || undefined,
        lines: validLines.map((l) => ({
          item_id:   l.item_id ?? "",
          quantity:  l.quantity,
          unit_cost: l.unit_cost,
        })),
      });

      if (result.error) {
        toast({ title: "Failed to create RFQ", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "RFQ created", description: `${result.poNumber} saved as Draft.` });
        reset();
        onCreated(result.poId!);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-semibold">New Request for Quotation</DialogTitle>
          <DialogDescription>Fill in supplier, branch, and line items.</DialogDescription>
        </DialogHeader>

        {loadingLookups ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Vendor <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => <SelectItem key={s.supplier_id} value={s.supplier_id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-9 w-9 border-dashed text-[#714B67] hover:bg-purple-50"
                    onClick={() => setQuickVendorOpen(true)}
                    title="Quick-add new vendor"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Branch <span className="text-destructive">*</span></Label>
                <Select value={branchId} onValueChange={setBranchId} disabled={user?.role !== "super_admin"}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.branch_id} value={b.branch_id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Expected Arrival Date</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-48"
              />
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Order Lines</Label>
                <Button variant="outline" size="sm" onClick={addLine} className="h-7 gap-1 text-xs">
                  <PlusCircle className="h-3.5 w-3.5" /> Add Line
                </Button>
              </div>

              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-border text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium w-[46%]">Product</th>
                      <th className="px-3 py-2 text-center font-medium w-20">Qty</th>
                      <th className="px-3 py-2 text-right font-medium w-28">Unit Cost</th>
                      <th className="px-3 py-2 text-right font-medium w-28">Subtotal</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.tempId} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 align-top min-w-0">
                          <Select
                            value={line.item_id ?? "__custom__"}
                            onValueChange={(v) => {
                              if (v === "__custom__") { updateLine(line.tempId, "item_id", null); }
                              else { selectItem(line.tempId, v); }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-full min-w-0">
                              <SelectValue placeholder="Choose product..." />
                            </SelectTrigger>
                            <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                              <SelectItem value="__custom__">— Custom item —</SelectItem>
                              {items
                                .filter((i) => i.item_id === line.item_id || !lines.some((l) => l.tempId !== line.tempId && l.item_id === i.item_id))
                                .map((i) => (
                                  <SelectItem key={i.item_id} value={i.item_id}>{i.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {line.item_id === null && (
                            <>
                              <Input
                                className={`mt-1 h-7 text-xs${
                                  lineErrors[line.tempId]?.name ? " border-red-400 focus-visible:ring-red-300" : ""
                                }`}
                                placeholder="Custom product name"
                                value={line.name}
                                maxLength={150}
                                onChange={(e) => updateLine(line.tempId, "name", e.target.value)}
                              />
                              {lineErrors[line.tempId]?.name && (
                                <p className="text-xs text-red-500 mt-0.5">⚠ {lineErrors[line.tempId]?.name}</p>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(line.tempId, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                            className={`h-8 text-xs text-center${
                              lineErrors[line.tempId]?.quantity ? " border-red-400" : ""
                            }`}
                          />
                          {lineErrors[line.tempId]?.quantity && (
                            <p className="text-xs text-red-500 mt-0.5">⚠ {lineErrors[line.tempId]?.quantity}</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unit_cost}
                            onChange={(e) => updateLine(line.tempId, "unit_cost", parseFloat(e.target.value) || 0)}
                            className={`h-8 text-xs text-right${
                              lineErrors[line.tempId]?.unit_cost ? " border-red-400" : ""
                            }`}
                          />
                          {lineErrors[line.tempId]?.unit_cost && (
                            <p className="text-xs text-red-500 mt-0.5">⚠ {lineErrors[line.tempId]?.unit_cost}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-medium">
                          ₱{(line.quantity * line.unit_cost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => removeLine(line.tempId)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            disabled={lines.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-border">
                      <td colSpan={3} className="px-3 py-2 text-xs text-right text-muted-foreground font-medium">Order Total</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-purple-700">
                        ₱{orderTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes / Instructions</Label>
              <Textarea
                placeholder="Special delivery instructions, payment terms, etc."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesError(validateLongText(e.target.value, { label: "Notes", maxLength: 500 }));
                }}
                rows={2}
                maxLength={510}
                className={`resize-none text-sm${notesError ? " border-red-400 focus-visible:ring-red-300" : ""}`}
              />
              <div className="flex items-center justify-between">
                {notesError
                  ? <p className="text-xs text-red-500 flex items-center gap-1"><span aria-hidden>⚠</span> {notesError}</p>
                  : <span />}
                <p className={`text-xs ${
                  notes.length > 500 ? "text-red-500 font-medium" :
                  notes.length > 425 ? "text-amber-500" : "text-muted-foreground"
                }`}>{notes.length}/500</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            onClick={handleSubmit}
            disabled={saving || loadingLookups}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save as Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* ── Quick-Add Vendor Dialog ─────────────────────────────────────── */}
    <Dialog open={quickVendorOpen} onOpenChange={(v) => { if (!v) resetQuickVendor(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Quick-Add Vendor</DialogTitle>
          <DialogDescription>Add a new vendor and automatically select them in the form.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input
              value={quickName}
              onChange={(e) => {
                setQuickName(e.target.value);
                setQuickErrors((p) => ({
                  ...p,
                  name: validateShortText(e.target.value, { label: "Vendor name", required: true, minLength: 2, maxLength: 100 }),
                }));
              }}
              placeholder="Vendor name"
              maxLength={100}
              autoFocus
              aria-invalid={!!quickErrors.name}
              className={quickErrors.name ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            {quickErrors.name && <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5"><span aria-hidden>⚠</span> {quickErrors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={quickPhone}
              onChange={(e) => {
                setQuickPhone(e.target.value);
                setQuickErrors((p) => ({ ...p, phone: validatePhone(e.target.value, { label: "Phone" }) }));
              }}
              placeholder="+63 900 000 0000"
              aria-invalid={!!quickErrors.phone}
              className={quickErrors.phone ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            {quickErrors.phone && <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5"><span aria-hidden>⚠</span> {quickErrors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={quickEmail}
              onChange={(e) => {
                setQuickEmail(e.target.value);
                setQuickErrors((p) => ({ ...p, email: validateEmail(e.target.value, { label: "Email" }) }));
              }}
              placeholder="vendor@example.com"
              aria-invalid={!!quickErrors.email}
              className={quickErrors.email ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            {quickErrors.email && <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5"><span aria-hidden>⚠</span> {quickErrors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Payment Terms</Label>
            <Select value={quickPayTerms} onValueChange={setQuickPayTerms}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {quickPayTerms === "custom" && (
              <Input
                className="mt-1.5"
                value={quickPayCustom}
                onChange={(e) => setQuickPayCustom(e.target.value)}
                placeholder="Enter custom payment terms"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetQuickVendor} disabled={savingVendor}>
            Cancel
          </Button>
          <Button
            className="bg-[#714B67] hover:bg-[#5a3c53] text-white gap-1.5"
            onClick={handleQuickAddVendor}
            disabled={savingVendor}
          >
            {savingVendor && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
