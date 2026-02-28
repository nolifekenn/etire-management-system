"use client";
/**
 * src/app/services/[id]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Service Job Form View — Odoo-style split-pane layout
 *
 * Layout:
 *   ┌─ Header status bar + action buttons ──────────────────────┐
 *   │  Smart Buttons row                                        │
 *   ├─ Main tabs (left ~65%) ─────────┬─ Chatter (right ~35%) ─┤
 *   │  Parts & Labor                  │  chatter_messages        │
 *   │  Vehicle Information            │                          │
 *   │  Diagnostics / Notes            │                          │
 *   └─────────────────────────────────┴──────────────────────────┘
 */

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useParams }  from "next/navigation";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Textarea }  from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger }    from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle }    from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast }  from "@/hooks/use-toast";
import { useAuth }   from "@/hooks/useAuth";
import { validateShortText, validateLongText, type FieldError } from "@/lib/validation";
import { ChatterPanel } from "@/components/ChatterPanel";
import {
  ArrowLeft, Wrench, User, Car, Package, MessageSquare, History,
  ArrowLeftRight, Loader2, Plus, Trash2, Save, CheckCircle2,
  AlertCircle, Edit3, RefreshCw, Clock, Calendar, Search,
  Flame, ArrowUp, Minus, TrendingDown, Printer,
} from "lucide-react";
import {
  getServiceJobDetail, updateServiceJobInfo, upsertServiceJobItems,
  transitionServiceJob, cancelServiceJob, getServiceSmartButtons,
  getServiceFormOptions, getVehiclesByCustomer, searchCatalogItems,
  type ServiceJobRow, type ServiceJobItemRow,
  type ServiceJobLineInput, type SmartButtonData,
  type ServiceFormCustomer, type ServiceFormMechanic, type ServiceFormVehicle,
  type CatalogItemOption,
} from "@/lib/actions/services";
import { type ServiceState, SERVICE_STATE_LABELS, getNextServiceStates } from "@/lib/serviceUtils";
import { cn } from "@/lib/utils";
import {
  generateServiceReceiptHtml, printReceipt,
  type ServiceReceiptData, type ServiceReceiptLine,
} from "@/lib/receiptGenerator";

// ── State bar config ─────────────────────────────────────────────────────────

const STATE_ORDER: ServiceState[] = [
  "quotation", "confirmed", "in_progress", "quality_check", "completed", "invoiced",
];

function StateStatusBar({ current }: { current: ServiceState }) {
  if (current === "cancelled") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm font-semibold text-red-700">Cancelled</span>
      </div>
    );
  }

  const currentIdx = STATE_ORDER.indexOf(current);

  return (
    <div className="flex items-center gap-1">
      {STATE_ORDER.map((s, idx) => {
        const isDone    = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const colorCls  = isCurrent
          ? "bg-primary text-primary-foreground"
          : isDone
          ? "bg-green-500 text-white"
          : "bg-gray-100 text-gray-400";

        return (
          <div key={s} className="flex items-center">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              colorCls
            )}>
              {SERVICE_STATE_LABELS[s]}
            </span>
            {idx < STATE_ORDER.length - 1 && (
              <div className={cn("h-0.5 w-4 mx-0.5", isDone ? "bg-green-400" : "bg-gray-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Smart button row ─────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Package:        Package,
  MessageSquare:  MessageSquare,
  ArrowLeftRight: ArrowLeftRight,
  History:        History,
};

function SmartButton({ btn, onClick }: { btn: SmartButtonData; onClick?: () => void }) {
  const Icon = ICON_MAP[btn.icon] ?? Package;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5",
        "hover:bg-gray-50 hover:border-primary/40 transition-colors text-left",
        onClick ? "cursor-pointer" : "cursor-default"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", btn.color)} />
      <div>
        <p className="text-lg font-bold leading-none text-gray-900">{btn.value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{btn.label}</p>
      </div>
    </button>
  );
}

// ── Catalog Item Picker Dialog ───────────────────────────────────────────────

interface CatalogPickerDialogProps {
  open:          boolean;
  onClose:       () => void;
  vehicleTypeId?: string;
  onSelect:      (item: CatalogItemOption) => void;
}

const CATALOG_CATEGORY_ORDER: Record<string, number> = {
  service: 0, tire: 1, accessory: 2, tool: 3,
};

function CatalogPickerDialog({ open, onClose, vehicleTypeId, onSelect }: CatalogPickerDialogProps) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<CatalogItemOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await searchCatalogItems(query, vehicleTypeId);
      if (res.success) {
        const sorted = [...res.items].sort(
          (a, b) => (CATALOG_CATEGORY_ORDER[a.category] ?? 9) - (CATALOG_CATEGORY_ORDER[b.category] ?? 9)
        );
        setResults(sorted);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, vehicleTypeId]);

  const handleSelect = (item: CatalogItemOption) => {
    onSelect(item);
    onClose();
  };

  const CATEGORY_BADGES: Record<string, string> = {
    service:   "bg-blue-100 text-blue-700",
    tire:      "bg-green-100 text-green-700",
    accessory: "bg-amber-100 text-amber-700",
    tool:      "bg-gray-100 text-gray-700",
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Add from Catalog
          </DialogTitle>
          <DialogDescription>
            Search services, tires, or parts with pre-set prices.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search by name or SKU…"
            className="pl-8"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Searching…</span>
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {query ? "No catalog items match your search." : "Type to search the catalog."}
            </p>
          ) : (
            results.map(item => (
              <button
                key={item.item_id}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50/70 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize",
                    CATEGORY_BADGES[item.category] ?? "bg-gray-100 text-gray-600"
                  )}>
                    {item.category}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    {item.sku && (
                      <p className="text-[10px] text-muted-foreground font-mono">{item.sku}</p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-800 ml-4">
                  ₱{item.sale_price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Parts & Labor table ──────────────────────────────────────────────────────

interface LineItemsTableProps {
  items:          ServiceJobItemRow[];
  editable:       boolean;
  onChange:       (items: ServiceJobItemRow[]) => void;
  vehicleTypeId?: string;
}

function LineItemsTable({ items, editable, onChange, vehicleTypeId }: LineItemsTableProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);

  const addRow = () => {
    const newRow: ServiceJobItemRow = {
      service_job_item_id: `_new_${Date.now()}`,
      job_id:              "",
      item_id:             null,
      quantity:            1,
      price_at_service:    0,
      created_at:          new Date().toISOString(),
      item_name:           "",
      item_category:       "service",
      item_sku:            null,
    };
    onChange([...items, newRow]);
  };

  const addFromCatalog = (ci: CatalogItemOption) => {
    const newRow: ServiceJobItemRow = {
      service_job_item_id: `_new_${Date.now()}`,
      job_id:              "",
      item_id:             ci.item_id,
      quantity:            1,
      price_at_service:    ci.sale_price,
      created_at:          new Date().toISOString(),
      item_name:           ci.name,
      item_category:       ci.category,
      item_sku:            ci.sku,
    };
    onChange([...items, newRow]);
  };

  const updateRow = (idx: number, field: string, value: string | number) => {
    const updated = items.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    onChange(updated);
  };

  const removeRow = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((acc, i) => acc + i.price_at_service * i.quantity, 0);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Description / Part</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Category</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-16">Qty</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Unit Price (₱)</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Subtotal (₱)</th>
              {editable && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={editable ? 6 : 5} className="text-center py-8 text-muted-foreground text-xs">
                  No parts or labor lines yet.{editable ? " Click \"Add Line\" to start." : ""}
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr key={row.service_job_item_id} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5">
                    {editable ? (
                      <Input
                        value={row.item_name ?? ""}
                        onChange={e => updateRow(idx, "item_name", e.target.value)}
                        className="h-7 text-sm border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none"
                        placeholder="Part name or service description"
                      />
                    ) : (
                      <span>{row.item_name ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {editable ? (
                      <Select
                        value={row.item_category ?? "service"}
                        onValueChange={v => updateRow(idx, "item_category", v)}>
                        <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-0 focus:ring-0 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="tire">Tire</SelectItem>
                          <SelectItem value="accessory">Accessory</SelectItem>
                          <SelectItem value="tool">Tool</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {row.item_category ?? "service"}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {editable ? (
                      <Input
                        type="number" min={1}
                        value={row.quantity}
                        onChange={e => updateRow(idx, "quantity", Number(e.target.value))}
                        className="h-7 text-sm text-right border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none w-14"
                      />
                    ) : row.quantity}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {editable ? (
                      <Input
                        type="number" min={0} step={0.01}
                        value={row.price_at_service}
                        onChange={e => updateRow(idx, "price_at_service", parseFloat(e.target.value) || 0)}
                        className="h-7 text-sm text-right border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none w-24"
                      />
                    ) : row.price_at_service.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium text-gray-800">
                    ₱{(row.price_at_service * row.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                  {editable && (
                    <td className="px-2 py-1.5 text-center">
                      <Button variant="ghost" size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeRow(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        {editable && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={addRow}>
              <Plus className="h-3.5 w-3.5" />
              Add Line
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-primary hover:text-primary" onClick={() => setCatalogOpen(true)}>
              <Package className="h-3.5 w-3.5" />
              Add from Catalog
            </Button>
          </div>
        )}
        <div className="ml-auto text-sm font-semibold text-gray-800">
          Total: ₱{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </div>
      </div>

      {editable && (
        <CatalogPickerDialog
          open={catalogOpen}
          onClose={() => setCatalogOpen(false)}
          vehicleTypeId={vehicleTypeId}
          onSelect={addFromCatalog}
        />
      )}
    </div>
  );
}

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_ICONS: Record<string, React.ElementType> = {
  urgent: Flame, high: ArrowUp, normal: Minus, low: TrendingDown,
};
const PRIORITY_CLASSES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high:   "bg-orange-100 text-orange-700",
  normal: "bg-gray-100 text-gray-600",
  low:    "bg-sky-100 text-sky-700",
};

// ── Transition button labels ──────────────────────────────────────────────────

const TRANSITION_LABELS: Partial<Record<ServiceState, string>> = {
  confirmed:     "Confirm Job",
  in_progress:   "Start Service",
  quality_check: "Send to QC",
  completed:     "Mark as Done",
  invoiced:      "Mark Invoiced",
  cancelled:     "Cancel Job",
  quotation:     "Reopen to Draft",
};

// ── Main Form View ────────────────────────────────────────────────────────────

export default function ServiceFormPage() {
  const params    = useParams();
  const router    = useRouter();
  const { user }  = useAuth();
  const { toast } = useToast();

  const jobId = params.id as string;

  const [job,       setJob]       = useState<ServiceJobRow | null>(null);
  const [items,     setItems]     = useState<ServiceJobItemRow[]>([]);
  const [smartBtns, setSmartBtns] = useState<SmartButtonData[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [activeTab, setActiveTab] = useState("parts");

  // Editable form state — basic
  const [formDesc,     setFormDesc]     = useState("");
  const [formNotes,    setFormNotes]    = useState("");
  const [formDiag,     setFormDiag]     = useState("");
  const [formPriority, setFormPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [editItems,    setEditItems]    = useState<ServiceJobItemRow[]>([]);

  // Validation errors for editable fields
  const [formDescError,  setFormDescError]  = useState<FieldError>(null);
  const [formNotesError, setFormNotesError] = useState<FieldError>(null);
  const [formDiagError,  setFormDiagError]  = useState<FieldError>(null);

  // Editable form state — relational fields
  const [formCustomerId,    setFormCustomerId]    = useState<string>("");
  const [formVehicleId,     setFormVehicleId]     = useState<string>("");
  const [formVehicleTypeId, setFormVehicleTypeId] = useState<string>("");
  const [formMechanicId,    setFormMechanicId]    = useState<string>("");
  const [formEstCompletion, setFormEstCompletion] = useState<string>("");

  // Reference data for dropdowns
  const [formCustomers,  setFormCustomers]  = useState<ServiceFormCustomer[]>([]);
  const [formMechanics,  setFormMechanics]  = useState<ServiceFormMechanic[]>([]);
  const [formVehicles,   setFormVehicles]   = useState<ServiceFormVehicle[]>([]);
  const [formVehTypes,   setFormVehTypes]   = useState<{ value: string; label: string }[]>([]);
  const [loadingOpts,    setLoadingOpts]    = useState(false);

  // Dialog state
  const [cancelOpen,       setCancelOpen]       = useState(false);
  const [cancelReason,     setCancelReason]     = useState("");
  const [transitionTarget, setTransitionTarget] = useState<ServiceState | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isPending, startTransition] = useTransition();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchJob = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getServiceJobDetail(jobId);
      if (!result.success || !result.data) {
        toast({ title: "Not found", description: result.error ?? "Job not found", variant: "destructive" });
        router.push("/services");
        return;
      }
      const { job: j, items: its } = result.data;
      setJob(j);
      setItems(its);
      setFormDesc(j.job_description);
      setFormNotes(j.notes ?? "");
      setFormDiag(j.diagnostics ?? "");
      setFormPriority(j.priority as "low" | "normal" | "high" | "urgent");
      setFormCustomerId(j.customer_id ?? "");
      setFormVehicleId(j.vehicle_id ?? "");
      setFormVehicleTypeId(j.vehicle_type_id ?? "");
      setFormMechanicId(j.mechanic_id ?? "");
      setFormEstCompletion(j.estimated_completion ? new Date(j.estimated_completion).toISOString().slice(0, 16) : "");
      setEditItems(its);

      const btns = await getServiceSmartButtons(jobId, j.customer_id);
      setSmartBtns(btns);
    } finally {
      setLoading(false);
    }
  }, [jobId, router, toast]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  // Load dropdown options when entering edit mode
  useEffect(() => {
    if (!editMode) return;
    setLoadingOpts(true);
    getServiceFormOptions(job?.branch_id)
      .then(opts => {
        setFormCustomers(opts.customers);
        setFormMechanics(opts.mechanics);
        setFormVehTypes([...opts.vehicleTypes]);
        // Also load vehicles for the current customer
        if (formCustomerId) {
          return getVehiclesByCustomer(formCustomerId).then(setFormVehicles);
        }
      })
      .finally(() => setLoadingOpts(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  // Reload vehicles when customer changes in edit mode
  useEffect(() => {
    if (!editMode || !formCustomerId) { setFormVehicles([]); return; }
    getVehiclesByCustomer(formCustomerId).then(setFormVehicles);
  }, [formCustomerId, editMode]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!job) return;

    // Inline validation
    const descErr  = validateShortText(formDesc,  { label: 'Job description', required: true,  minLength: 2,  maxLength: 200 });
    const notesErr = validateLongText (formNotes, { label: 'Internal notes',  maxLength: 500 });
    const diagErr  = validateLongText (formDiag,  { label: 'Diagnostics',     maxLength: 1000 });
    setFormDescError(descErr);
    setFormNotesError(notesErr);
    setFormDiagError(diagErr);
    if (descErr || notesErr || diagErr) return;

    setSaving(true);
    try {
      const infoResult = await updateServiceJobInfo(jobId, {
        job_description:      formDesc,
        notes:                formNotes     || undefined,
        diagnostics:          formDiag      || undefined,
        priority:             formPriority,
        customer_id:          formCustomerId    || undefined,
        vehicle_id:           formVehicleId     || undefined,
        vehicle_type_id:      formVehicleTypeId || undefined,
        mechanic_id:          formMechanicId    || undefined,
        estimated_completion: formEstCompletion || undefined,
      });
      if (!infoResult.success) {
        toast({ title: "Save failed", description: infoResult.error ?? "", variant: "destructive" });
        return;
      }

      const lines: ServiceJobLineInput[] = editItems.map(i => ({
        service_job_item_id: i.service_job_item_id.startsWith("_new_") ? undefined : i.service_job_item_id,
        item_id:             i.item_id ?? undefined,
        quantity:            i.quantity,
        price_at_service:    i.price_at_service,
      }));
      const itemResult = await upsertServiceJobItems(jobId, lines);
      if (!itemResult.success) {
        toast({ title: "Items save failed", description: itemResult.error ?? "", variant: "destructive" });
        return;
      }

      toast({ title: "Changes saved" });
      setEditMode(false);
      await fetchJob();
    } finally {
      setSaving(false);
    }
  };

  // ── Transition ─────────────────────────────────────────────────────────────

  const handleTransitionClick = (nextState: ServiceState) => {
    if (nextState === "cancelled") { setCancelOpen(true); return; }
    setTransitionTarget(nextState);
  };

  const confirmTransition = async () => {
    if (!transitionTarget || !user) return;
    setSaving(true);
    try {
      const result = await transitionServiceJob(jobId, transitionTarget, user.user_id);
      if (!result.success) {
        toast({ title: "Transition failed", description: result.error ?? "", variant: "destructive" });
      } else {
        toast({ title: `Job moved to ${SERVICE_STATE_LABELS[transitionTarget]}` });
        await fetchJob();
      }
    } finally {
      setSaving(false);
      setTransitionTarget(null);
    }
  };

  const confirmCancel = async () => {
    if (!cancelReason.trim() || !user) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const result = await cancelServiceJob(jobId, user.user_id, cancelReason);
      if (!result.success) {
        toast({ title: "Cancel failed", description: result.error ?? "", variant: "destructive" });
      } else {
        toast({ title: "Job cancelled" });
        setCancelOpen(false);
        setCancelReason("");
        await fetchJob();
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Print Invoice ──────────────────────────────────────────────────────────

  const handlePrintInvoice = () => {
    if (!job) return;
    const receiptLines: ServiceReceiptLine[] = items.map(it => ({
      name:       it.item_name ?? "Service",
      quantity:   it.quantity,
      unit_price: it.price_at_service,
    }));
    const receiptData: ServiceReceiptData = {
      job_number:     job.job_number ?? job.job_id.slice(0, 8).toUpperCase(),
      job_date:       job.job_date,
      branch_name:    job.branch_name ?? "eTire Workshop",
      customer_name:  job.customer_name ?? undefined,
      plate_number:   job.plate_number ?? undefined,
      vehicle_make:   job.vehicle_make ?? undefined,
      vehicle_model:  job.vehicle_model ?? undefined,
      vehicle_year:   job.vehicle_year ?? undefined,
      mechanic_name:  job.mechanic_name ?? undefined,
      lines:          receiptLines.length > 0 ? receiptLines : [{ name: job.job_description, quantity: 1, unit_price: job.total_amount }],
      total_amount:   job.total_amount,
      notes:          job.notes ?? undefined,
    };
    const html = generateServiceReceiptHtml(receiptData);
    printReceipt(html);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) return null;

  const nextStates   = getNextServiceStates(job.state);
  const canEdit      = !["completed", "invoiced", "cancelled"].includes(job.state);
  const PriorityIcon = PRIORITY_ICONS[job.priority] ?? Minus;

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2"
              onClick={() => router.push("/services")}>
              <ArrowLeft className="h-4 w-4" />
              Workshop
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-gray-900">{job.job_number ?? "New Job"}</h1>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1",
                PRIORITY_CLASSES[job.priority])}>
                <PriorityIcon className="h-3 w-3" />
                {job.priority}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchJob}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>

            {["completed", "invoiced"].includes(job.state) && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrintInvoice}>
                <Printer className="h-4 w-4" />
                Print Invoice
              </Button>
            )}

            {canEdit && !editMode && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditMode(true)}>
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
            )}

            {editMode && (
              <>
                <Button variant="outline" size="sm"
                  onClick={() => {
                    setEditMode(false);
                    setEditItems(items);
                    setFormCustomerId(job.customer_id ?? "");
                    setFormVehicleId(job.vehicle_id ?? "");
                    setFormVehicleTypeId(job.vehicle_type_id ?? "");
                    setFormMechanicId(job.mechanic_id ?? "");
                    setFormEstCompletion(job.estimated_completion ? new Date(job.estimated_completion).toISOString().slice(0, 16) : "");
                  }}>
                  Discard
                </Button>
                <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
              </>
            )}

            {!editMode && nextStates.filter(s => s !== "cancelled").map(ns => (
              <Button key={ns} size="sm" className="gap-1.5"
                disabled={saving} onClick={() => handleTransitionClick(ns)}>
                <CheckCircle2 className="h-4 w-4" />
                {TRANSITION_LABELS[ns] ?? SERVICE_STATE_LABELS[ns]}
              </Button>
            ))}

            {!editMode && nextStates.includes("cancelled") && job.state !== "cancelled" && (
              <Button variant="destructive" size="sm"
                disabled={saving} onClick={() => setCancelOpen(true)}>
                Cancel Job
              </Button>
            )}
          </div>
        </div>

        <StateStatusBar current={job.state} />
      </header>

      {/* ── Smart Buttons ── */}
      {smartBtns.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-3 shrink-0 overflow-x-auto">
          {smartBtns.map(btn => (
            <SmartButton
              key={btn.label}
              btn={btn}
              onClick={btn.href ? () => router.push(btn.href!) : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 flex gap-4 p-6 overflow-hidden min-h-0">

        {/* Left: Tabs */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="w-full justify-start rounded-none border-b border-gray-200 bg-transparent h-auto p-0 shrink-0">
              <TabsTrigger value="parts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-sm">
                <Package className="h-4 w-4 mr-1.5" />
                Parts & Labor
              </TabsTrigger>
              <TabsTrigger value="vehicle"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-sm">
                <Car className="h-4 w-4 mr-1.5" />
                Vehicle Info
              </TabsTrigger>
              <TabsTrigger value="notes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-sm">
                <Edit3 className="h-4 w-4 mr-1.5" />
                Diagnostics & Notes
              </TabsTrigger>
            </TabsList>

            {/* Parts & Labor */}
            <TabsContent value="parts" className="flex-1 overflow-y-auto mt-4">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    Parts & Labor Lines
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="mb-4 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Job Description</Label>
                    {editMode ? (
                      <div>
                        <Textarea
                          value={formDesc}
                          onChange={e => {
                            setFormDesc(e.target.value);
                            setFormDescError(validateShortText(e.target.value, { label: 'Job description', required: true, minLength: 2, maxLength: 200 }));
                          }}
                          rows={2}
                          maxLength={200}
                          aria-invalid={!!formDescError}
                          className={`text-sm${formDescError ? ' border-red-400 focus-visible:ring-red-300' : ''}`}
                        />
                        <div className="flex justify-between mt-0.5">
                          {formDescError
                            ? <p className="text-xs text-red-500">⚠ {formDescError}</p>
                            : <span />}
                          <p className={`text-xs ${
                            formDesc.length > 200 ? 'text-red-500 font-medium' :
                            formDesc.length > 170 ? 'text-amber-500' : 'text-muted-foreground'
                          }`}>{formDesc.length}/200</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-800 border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                        {job.job_description}
                      </p>
                    )}
                  </div>
                  <LineItemsTable
                    items={editMode ? editItems : items}
                    editable={editMode}
                    onChange={setEditItems}
                    vehicleTypeId={job?.vehicle_type_id ?? undefined}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vehicle Info */}
            <TabsContent value="vehicle" className="flex-1 overflow-y-auto mt-4">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    Vehicle & Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {editMode && loadingOpts ? (
                    <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading options…
                    </div>
                  ) : editMode ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Customer */}
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" />Customer</Label>
                        <select
                          value={formCustomerId}
                          onChange={e => { setFormCustomerId(e.target.value); setFormVehicleId(""); }}
                          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">— None —</option>
                          {formCustomers.map(c => (
                            <option key={c.customer_id} value={c.customer_id}>
                              {c.name}{c.phone ? ` · ${c.phone}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Vehicle */}
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><Car className="h-3 w-3" />Vehicle (Plate)</Label>
                        <select
                          value={formVehicleId}
                          onChange={e => setFormVehicleId(e.target.value)}
                          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          disabled={!formCustomerId}
                        >
                          <option value="">— None —</option>
                          {formVehicles.map(v => (
                            <option key={v.vehicle_id} value={v.vehicle_id}>
                              {v.plate_number}{v.make ? ` · ${v.make}` : ""}{v.model ? ` ${v.model}` : ""}
                            </option>
                          ))}
                        </select>
                        {!formCustomerId && <p className="text-xs text-muted-foreground">Select a customer first</p>}
                      </div>

                      {/* Vehicle Type */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Vehicle Type</Label>
                        <select
                          value={formVehicleTypeId}
                          onChange={e => setFormVehicleTypeId(e.target.value)}
                          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">— None —</option>
                          {formVehTypes.map(vt => (
                            <option key={vt.value} value={vt.value}>{vt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Mechanic */}
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><Wrench className="h-3 w-3" />Assigned Mechanic</Label>
                        <select
                          value={formMechanicId}
                          onChange={e => setFormMechanicId(e.target.value)}
                          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">— Unassigned —</option>
                          {formMechanics.map(m => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.name} ({m.role.replace("_", " ")})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Estimated Completion */}
                      <div className="space-y-1.5 col-span-full sm:col-span-1">
                        <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />Estimated Completion</Label>
                        <Input
                          type="datetime-local"
                          value={formEstCompletion}
                          onChange={e => setFormEstCompletion(e.target.value)}
                          className="text-sm"
                        />
                      </div>

                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField label="Customer"         value={job.customer_name}  icon={<User className="h-3.5 w-3.5" />} />
                      <InfoField label="Plate Number"     value={job.plate_number}   icon={<Car className="h-3.5 w-3.5" />} mono />
                      <InfoField label="Make"             value={job.vehicle_make} />
                      <InfoField label="Model"            value={job.vehicle_model} />
                      <InfoField label="Year"             value={job.vehicle_year?.toString()} />
                      <InfoField label="Assigned Mechanic" value={job.mechanic_name} icon={<Wrench className="h-3.5 w-3.5" />} />
                      <InfoField label="Branch"           value={job.branch_name} />
                      <InfoField
                        label="Job Date"
                        value={new Date(job.job_date).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                        icon={<Calendar className="h-3.5 w-3.5" />}
                      />
                      {job.estimated_completion && (
                        <InfoField
                          label="Est. Completion"
                          value={new Date(job.estimated_completion).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                          icon={<Clock className="h-3.5 w-3.5" />}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Diagnostics & Notes */}
            <TabsContent value="notes" className="flex-1 overflow-y-auto mt-4">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-purple-600" />
                    Mechanic Observations & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Diagnostics / Findings</Label>
                    {editMode ? (
                      <div>
                        <Textarea
                          placeholder="Describe findings and recommended actions…"
                          rows={5} value={formDiag}
                          onChange={e => {
                            setFormDiag(e.target.value);
                            setFormDiagError(validateLongText(e.target.value, { label: 'Diagnostics', maxLength: 1000 }));
                          }}
                          maxLength={1010}
                          aria-invalid={!!formDiagError}
                          className={`text-sm${formDiagError ? ' border-red-400 focus-visible:ring-red-300' : ''}`}
                        />
                        <div className="flex justify-between mt-0.5">
                          {formDiagError
                            ? <p className="text-xs text-red-500">⚠ {formDiagError}</p>
                            : <span />}
                          <p className={`text-xs ${
                            formDiag.length > 1000 ? 'text-red-500 font-medium' :
                            formDiag.length > 850 ? 'text-amber-500' : 'text-muted-foreground'
                          }`}>{formDiag.length}/1000</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-800 border border-gray-200 rounded-md px-3 py-2 bg-gray-50 min-h-[100px] whitespace-pre-wrap">
                        {job.diagnostics || <span className="text-muted-foreground italic">No diagnostics recorded.</span>}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Internal Notes</Label>
                    {editMode ? (
                      <div>
                        <Textarea
                          placeholder="Internal notes visible to staff only…"
                          rows={4} value={formNotes}
                          onChange={e => {
                            setFormNotes(e.target.value);
                            setFormNotesError(validateLongText(e.target.value, { label: 'Internal notes', maxLength: 500 }));
                          }}
                          maxLength={510}
                          aria-invalid={!!formNotesError}
                          className={`text-sm${formNotesError ? ' border-red-400 focus-visible:ring-red-300' : ''}`}
                        />
                        <div className="flex justify-between mt-0.5">
                          {formNotesError
                            ? <p className="text-xs text-red-500">⚠ {formNotesError}</p>
                            : <span />}
                          <p className={`text-xs ${
                            formNotes.length > 500 ? 'text-red-500 font-medium' :
                            formNotes.length > 425 ? 'text-amber-500' : 'text-muted-foreground'
                          }`}>{formNotes.length}/500</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-800 border border-gray-200 rounded-md px-3 py-2 bg-gray-50 min-h-[80px] whitespace-pre-wrap">
                        {job.notes || <span className="text-muted-foreground italic">No notes.</span>}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Priority</Label>
                    {editMode ? (
                      <Select value={formPriority}
                        onValueChange={(v: "low" | "normal" | "high" | "urgent") => setFormPriority(v)}>
                        <SelectTrigger className="w-40 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium",
                        PRIORITY_CLASSES[job.priority]
                      )}>
                        <PriorityIcon className="h-3 w-3" />
                        {job.priority}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Chatter */}
        <div className="w-80 shrink-0 flex flex-col min-h-0">
          <ChatterPanel
            relatedTable="service_job"
            relatedRecordId={jobId}
            className="flex-1 min-h-0"
          />
        </div>
      </div>

      {/* ── Cancel Dialog ── */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Cancel Service Job
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel job <strong>{job.job_number}</strong>. Provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Cancellation reason (required)…"
              rows={3} value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelReason("")}>Keep Job</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmCancel}
              disabled={saving || !cancelReason.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Transition Confirm Dialog ── */}
      {transitionTarget && transitionTarget !== "cancelled" && (
        <AlertDialog open={!!transitionTarget} onOpenChange={() => setTransitionTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {transitionTarget === "completed"
                  ? "⚠️ Mark as Done & Consume Stock?"
                  : `Confirm: ${SERVICE_STATE_LABELS[transitionTarget]}`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {transitionTarget === "completed"
                  ? "This will move the job to Done and generate inventory deduction moves for all physical parts. This action cannot be undone."
                  : `Move job ${job.job_number} to "${SERVICE_STATE_LABELS[transitionTarget]}"?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go Back</AlertDialogCancel>
              <AlertDialogAction onClick={confirmTransition} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {TRANSITION_LABELS[transitionTarget] ?? "Proceed"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ── Helper: read-only info field ──────────────────────────────────────────────

function InfoField({
  label, value, icon, mono = false,
}: { label: string; value?: string | null; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <div className="flex items-center gap-1.5 text-sm text-gray-800">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className={mono ? "font-mono" : ""}>
          {value ?? <span className="text-muted-foreground italic text-xs">—</span>}
        </span>
      </div>
    </div>
  );
}
