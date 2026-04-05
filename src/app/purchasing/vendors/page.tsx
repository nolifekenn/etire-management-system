"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Search, Building2, ArrowLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { listVendors, createVendor, updateVendor, deleteVendor, VendorInput } from "@/lib/actions/purchasing";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { validateShortText, validateLongText, validateEmail, validatePhone, validateUrl, type FieldError } from "@/lib/validation";

// ── TIN validator (9–12 numeric digits) ──────────────────────
function validateTIN(value: string): FieldError {
  if (!value || value.trim() === "") return null; // optional field
  const digitsOnly = value.replace(/[-\s]/g, "");
  if (!/^\d+$/.test(digitsOnly)) return "TIN must contain only numbers (and optional dashes)";
  if (digitsOnly.length < 9 || digitsOnly.length > 12) return "TIN must be 9–12 digits";
  return null;
}

// ── Payment term options ─────────────────────────────────────
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

function paymentTermLabel(value?: string) {
  if (!value) return "Immediate Payment";
  return PAYMENT_TERMS.find((p) => p.value === value)?.label ?? value;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Vendor {
  supplier_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  vat?: string;
  website?: string;
  payment_terms?: string;
  notes?: string;
  is_active: boolean;
}

const emptyForm: VendorInput = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  vat: "",
  website: "",
  payment_terms: "immediate",
  notes: "",
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const router  = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  // ── Role gate: only Managers & Super Admin ──────────────────
  const canAccessVendors = user?.role === "super_admin" || user?.role === "branch_manager";

  const [vendors, setVendors]       = useState<Vendor[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<Vendor | null>(null);
  const [form, setForm]             = useState<VendorInput>(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, FieldError>>({});

  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const res = await listVendors(q);
    if (res.error) {
      toast({ title: "Error loading vendors", description: res.error, variant: "destructive" });
    } else {
      setVendors(res.vendors as unknown as Vendor[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search, load]);

  if (user && !canAccessVendors) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive opacity-60" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Vendor management is restricted to Managers and Super Admins.
          Contact your manager if you need access.
        </p>
        <Button variant="outline" onClick={() => router.push("/purchasing")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchasing
        </Button>
      </div>
    );
  }

  // ── Dialog helpers ────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditing(v);
    setForm({
      name:           v.name,
      contact_person: v.contact_person ?? "",
      phone:          v.phone ?? "",
      email:          v.email ?? "",
      address:        v.address ?? "",
      city:           v.city ?? "",
      vat:            v.vat ?? "",
      website:        v.website ?? "",
      payment_terms:  v.payment_terms ?? "immediate",
      notes:          v.notes ?? "",
    });
    setFormErrors({});
    setDialogOpen(true);
  }

  function field(key: keyof VendorInput, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    // Live validation per field
    let err: FieldError = null;
    if (key === "name")           err = validateShortText(val, { label: "Vendor name",    required: true,  minLength: 2, maxLength: 100 });
    if (key === "contact_person") err = validateShortText(val, { label: "Contact person", required: false, minLength: 2, maxLength: 100 });
    if (key === "phone")          err = validatePhone(val,    { label: "Phone" });
    if (key === "email")          err = validateEmail(val,    { label: "Email" });
    if (key === "website")        err = validateUrl(val,      { label: "Website" });
    if (key === "city")           err = validateShortText(val, { label: "City",            required: false, minLength: 2, maxLength: 50  });
    if (key === "vat")            err = validateTIN(val);
    if (key === "address")        err = validateShortText(val, { label: "Address",          required: false, minLength: 2, maxLength: 200 });
    if (key === "notes")          err = validateLongText(val, { label: "Notes",             maxLength: 500 });
    setFormErrors((prev) => ({ ...prev, [key]: err }));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    // Run all validations
    const errors: Record<string, FieldError> = {
      name:           validateShortText(form.name ?? "",           { label: "Vendor name",    required: true,  minLength: 2, maxLength: 100 }),
      contact_person: validateShortText(form.contact_person ?? "", { label: "Contact person", required: false, minLength: 2, maxLength: 100 }),
      phone:          validatePhone(form.phone ?? "",               { label: "Phone" }),
      email:          validateEmail(form.email ?? "",               { label: "Email" }),
      website:        validateUrl(form.website ?? "",              { label: "Website" }),
      city:           validateShortText(form.city ?? "",           { label: "City",            required: false, minLength: 2, maxLength: 50  }),
      vat:            validateTIN(form.vat ?? ""),
      address:        validateShortText(form.address ?? "",        { label: "Address",          required: false, minLength: 2, maxLength: 200 }),
      notes:          validateLongText(form.notes ?? "",           { label: "Notes",             maxLength: 500 }),
    };
    setFormErrors(errors);
    const hasError = Object.values(errors).some(Boolean);
    if (hasError) return;

    setSaving(true);
    try {
      if (editing) {
        const res = await updateVendor(editing.supplier_id, form);
        if (res.error) { toast({ title: "Update failed", description: res.error, variant: "destructive" }); return; }
        toast({ title: "Vendor updated" });
      } else {
        const res = await createVendor(form);
        if (res.error) { toast({ title: "Create failed", description: res.error, variant: "destructive" }); return; }
        toast({ title: "Vendor created" });
      }
      setDialogOpen(false);
      load(search || undefined);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteVendor(deleteTarget.supplier_id);
      if (res.error) { toast({ title: "Delete failed", description: res.error, variant: "destructive" }); return; }
      toast({ title: "Vendor removed" });
      setDeleteTarget(null);
      load(search || undefined);
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-background min-h-screen">
      {/* Breadcrumb top bar */}
      <div className="border-b border-border bg-white px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.push("/purchasing")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-[#714B67] shrink-0" />
          <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => router.push("/purchasing")}>Purchasing</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm text-[#714B67]">Vendors</span>
        </div>
      </div>
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-[#714B67]" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Vendors</h1>
              <p className="text-sm text-muted-foreground">Manage suppliers used in purchase orders</p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="bg-[#714B67] hover:bg-[#5a3c53] text-white gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" /> New Vendor
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden bg-white">
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Contact Person</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Payment Terms</th>
                <th className="px-4 py-3 text-left font-medium">City</th>
                <th className="w-24 px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#714B67] mx-auto" />
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground text-sm">
                    No vendors found. Click &ldquo;New Vendor&rdquo; to add one.
                  </td>
                </tr>
              ) : vendors.map((v) => (
                <tr key={v.supplier_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.contact_person || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-50 text-[#714B67] border border-purple-200">
                      {paymentTermLabel(v.payment_terms)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{v.city || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(v)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit vendor"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(v)}
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove vendor"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="sm:hidden p-3 space-y-2">
            {loading ? (
              <div className="py-10 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#714B67] mx-auto" />
              </div>
            ) : vendors.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No vendors found. Click &ldquo;New Vendor&rdquo; to add one.</p>
            ) : vendors.map((v) => (
              <div key={v.supplier_id} className="rounded-lg border border-border p-3 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{v.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.contact_person || "—"}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-purple-50 text-[#714B67] border border-purple-200">
                    {paymentTermLabel(v.payment_terms)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <p>Phone: {v.phone || "—"}</p>
                  <p className="break-all">Email: {v.email || "—"}</p>
                  <p>City: {v.city || "—"}</p>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEdit(v)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit vendor"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(v)}
                    className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove vendor"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {!loading && vendors.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {vendors.length} vendor{vendors.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* ── Create / Edit Dialog ────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false); }}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Vendor" : "New Vendor"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Name — full width */}
            <div className="col-span-2 space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => field("name", e.target.value)}
                placeholder="Vendor name"
                maxLength={100}
                aria-invalid={!!formErrors.name}
                className={formErrors.name ? "border-red-400 focus-visible:ring-red-300" : ""}
              />
              {formErrors.name && <p className="text-xs text-red-500 flex items-center gap-1"><span aria-hidden>⚠</span> {formErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input
                value={form.contact_person}
                onChange={(e) => field("contact_person", e.target.value)}
                placeholder="Full name"
                maxLength={100}
                aria-invalid={!!formErrors.contact_person}
                className={formErrors.contact_person ? "border-red-400 focus-visible:ring-red-300" : ""}
              />
              {formErrors.contact_person && <p className="text-xs text-red-500 flex items-center gap-1"><span aria-hidden>⚠</span> {formErrors.contact_person}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => field("phone", e.target.value)}
                placeholder="+63 900 000 0000"
                aria-invalid={!!formErrors.phone}
                className={formErrors.phone ? "border-red-400 focus-visible:ring-red-300" : ""}
              />
              {formErrors.phone && <p className="text-xs text-red-500 flex items-center gap-1"><span aria-hidden>⚠</span> {formErrors.phone}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => field("email", e.target.value)}
                placeholder="vendor@example.com"
                aria-invalid={!!formErrors.email}
                className={formErrors.email ? "border-red-400 focus-visible:ring-red-300" : ""}
              />
              {formErrors.email && <p className="text-xs text-red-500 flex items-center gap-1"><span aria-hidden>⚠</span> {formErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(e) => field("website", e.target.value)}
                placeholder="https://..."
                aria-invalid={!!formErrors.website}
                className={formErrors.website ? "border-red-400 focus-visible:ring-red-300" : ""}
              />
              {formErrors.website && <p className="text-xs text-red-500 flex items-center gap-1"><span aria-hidden>⚠</span> {formErrors.website}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => field("city", e.target.value)}
                placeholder="City"
                maxLength={50}
                aria-invalid={!!formErrors.city}
                className={formErrors.city ? "border-red-400 focus-visible:ring-red-300" : ""}
              />
              {formErrors.city && <p className="text-xs text-red-500 flex items-center gap-1"><span aria-hidden>⚠</span> {formErrors.city}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>VAT / TIN</Label>
              <Input
                value={form.vat}
                onChange={(e) => field("vat", e.target.value)}
                placeholder="000-000-000-000"
                inputMode="numeric"
                maxLength={15}
                aria-invalid={!!formErrors.vat}
                className={formErrors.vat ? "border-red-400 focus-visible:ring-red-300" : ""}
              />
              {formErrors.vat && <p className="text-xs text-red-500 flex items-center gap-1"><span aria-hidden>⚠</span> {formErrors.vat}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Payment Terms</Label>
              <Select
                value={PAYMENT_TERMS.find((p) => p.value === form.payment_terms) ? form.payment_terms ?? "immediate" : "custom"}
                onValueChange={(v) => field("payment_terms", v === "custom" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Custom input shown when "custom" selected or value isn't in list */}
              {(!PAYMENT_TERMS.find((p) => p.value === form.payment_terms) || form.payment_terms === "custom") && (
                <Input
                  className="mt-1.5"
                  value={form.payment_terms === "custom" ? "" : (form.payment_terms ?? "")}
                  onChange={(e) => field("payment_terms", e.target.value)}
                  placeholder="Enter custom payment terms"
                />
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => field("address", e.target.value)}
                placeholder="Street address"
                maxLength={200}
                aria-invalid={!!formErrors.address}
                className={formErrors.address ? "border-red-400 focus-visible:ring-red-300" : ""}
              />
              {formErrors.address && <p className="text-xs text-red-500 flex items-center gap-1"><span aria-hidden>⚠</span> {formErrors.address}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => field("notes", e.target.value)}
                rows={2}
                className={`resize-none text-sm${formErrors.notes ? " border-red-400 focus-visible:ring-red-300" : ""}`}
                placeholder="Additional notes about this vendor..."
                maxLength={510}
              />
              <div className="flex items-center justify-between">
                {formErrors.notes
                  ? <p className="text-xs text-red-500 flex items-center gap-1"><span aria-hidden>⚠</span> {formErrors.notes}</p>
                  : <span />}
                <p className={`text-xs ${
                  (form.notes?.length ?? 0) > 500 ? "text-red-500 font-medium" :
                  (form.notes?.length ?? 0) > 425 ? "text-amber-500" : "text-muted-foreground"
                }`}>{form.notes?.length ?? 0}/500</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button
              className="bg-[#714B67] hover:bg-[#5a3c53] text-white gap-1.5"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong>?
              This vendor will no longer appear in the dropdown when creating purchase orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
