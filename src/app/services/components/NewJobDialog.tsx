"use client";
/**
 * src/app/services/components/NewJobDialog.tsx
 *
 * Redesigned "New Service Job" dialog.
 *
 * Key design changes:
 *  - Job description is AUTO-GENERATED from the selected service/catalog lines.
 *  - User picks one or more services/parts from the catalog (pre-set prices).
 *  - Multiple services per job in one transaction.
 *  - Optional freeform "Notes" field.
 *
 * Radix UI Note: SelectItem does not allow empty-string values.
 * Optional selects use sentinel "__none__" and convert back on update.
 */

import { useState, useEffect, useRef } from "react";
import { Button }    from "@/components/ui/button";
import { Label }     from "@/components/ui/label";
import { Input }     from "@/components/ui/input";
import { Textarea }  from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Wrench, User, Car, Clock, Package,
  Plus, Trash2, ChevronDown, PenLine,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { validateShortText, validateLongText, validateNumber, type FieldError } from "@/lib/validation";
import {
  createServiceJob,
  getServiceFormOptions,
  getVehiclesByCustomer,
  type CreateServiceJobInput,
  type ServiceFormCustomer,
  type ServiceFormMechanic,
  type ServiceFormVehicle,
} from "@/lib/actions/services";

const NONE   = "__none__";
const toVal  = (v: string) => (v === NONE ? "" : v);
const toSel  = (v: string) => (v === ""   ? NONE : v);

interface ServiceLine {
  id:         string;
  item_id:    string | null;
  name:       string;
  category:   string;
  qty:        number;
  unit_price: number;
}

const CATEGORY_BADGE: Record<string, string> = {
  service:   "bg-blue-100 text-blue-700",
  tire:      "bg-green-100 text-green-700",
  accessory: "bg-amber-100 text-amber-700",
  tool:      "bg-gray-100 text-gray-600",
};

const PRESET_SERVICES: { name: string; category: string; unit_price: number }[] = [
  { name: "Tire Installation (per tire)",  category: "service", unit_price: 150  },
  { name: "Tire Rotation",                 category: "service", unit_price: 200  },
  { name: "Wheel Balancing (per wheel)",   category: "service", unit_price: 150  },
  { name: "Four-Wheel Alignment",          category: "service", unit_price: 800  },
  { name: "Flat Tire Repair (Patch)",      category: "service", unit_price: 150  },
  { name: "Flat Tire Repair (Plug)",       category: "service", unit_price: 100  },
  { name: "Nitrogen Inflation (per tire)", category: "service", unit_price: 80   },
  { name: "TPMS Sensor Service",           category: "service", unit_price: 350  },
  { name: "Valve Stem Replacement",        category: "service", unit_price: 80   },
  { name: "Tire Disposal Fee (per tire)",  category: "service", unit_price: 50   },
  { name: "Visual Inspection",             category: "service", unit_price: 0    },
  { name: "Emergency Road Service Call",   category: "service", unit_price: 500  },
];

interface ServicePickerProps {
  onSelect: (item: { name: string; category: string; unit_price: number }) => void;
}

function ServicePickerPopover({ onSelect }: ServicePickerProps) {
  const [open,          setOpen]          = useState(false);
  const [showCustom,    setShowCustom]    = useState(false);
  const [customName,    setCustomName]    = useState("");
  const [customPrice,   setCustomPrice]   = useState("");
  const [customNameErr, setCustomNameErr] = useState<FieldError>(null);
  const [customPriceErr,setCustomPriceErr]= useState<FieldError>(null);
  const customNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCustom && customNameRef.current) customNameRef.current.focus();
  }, [showCustom]);

  const addPreset = (svc: { name: string; category: string; unit_price: number }) => {
    onSelect(svc);
    setOpen(false);
  };

  const addCustom = () => {
    const name  = customName.trim();
    const price = parseFloat(customPrice);
    const nErr  = validateShortText(name,             { label: 'Service name', required: true, minLength: 2, maxLength: 100 });
    const pErr  = validateNumber   (isNaN(price) ? '' : String(price), { label: 'Price', required: false, min: 0 });
    setCustomNameErr(nErr);
    setCustomPriceErr(pErr);
    if (nErr || pErr) return;
    onSelect({ name, category: "service", unit_price: isNaN(price) ? 0 : price });
    setCustomName("");
    setCustomPrice("");
    setCustomNameErr(null);
    setCustomPriceErr(null);
    setShowCustom(false);
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
    setShowCustom(false);
    setCustomName("");
    setCustomPrice("");
    setCustomNameErr(null);
    setCustomPriceErr(null);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 h-8 text-primary hover:text-primary border-dashed"
        onClick={() => setOpen(v => !v)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Service
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white rounded-xl border border-gray-200 shadow-xl">
          <div className="p-2 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Select a Service
            </p>
          </div>

          {/* Preset list */}
          <div className="max-h-56 overflow-y-auto">
            {PRESET_SERVICES.map((svc, i) => (
              <button
                key={i}
                type="button"
                onClick={() => addPreset(svc)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 transition-colors text-left gap-2"
              >
                <span className="text-sm text-gray-800">{svc.name}</span>
                <span className="shrink-0 text-xs font-semibold text-gray-600">
                  {svc.unit_price === 0 ? "Free" : `P${svc.unit_price.toLocaleString("en-PH")}`}
                </span>
              </button>
            ))}
          </div>

          {/* Custom section */}
          <div className="border-t border-gray-100">
            {!showCustom ? (
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-blue-50 transition-colors"
              >
                <PenLine className="h-3.5 w-3.5" />
                Custom job...
              </button>
            ) : (
              <div className="p-2 space-y-2">
                <div>
                  <Input
                    ref={customNameRef}
                    placeholder="Service / job name"
                    value={customName}
                    onChange={e => { setCustomName(e.target.value); setCustomNameErr(validateShortText(e.target.value, { label: 'Service name', required: true, minLength: 2, maxLength: 100 })); }}
                    onKeyDown={e => e.key === "Enter" && addCustom()}
                    maxLength={100}
                    aria-invalid={!!customNameErr}
                    className={`h-7 text-sm${customNameErr ? ' border-red-400' : ''}`}
                  />
                  {customNameErr && <p className="text-[10px] text-red-500 mt-0.5">⚠ {customNameErr}</p>}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Price (₱)"
                      value={customPrice}
                      onChange={e => { setCustomPrice(e.target.value); setCustomPriceErr(validateNumber(e.target.value, { label: 'Price', required: false, min: 0 })); }}
                      onKeyDown={e => e.key === "Enter" && addCustom()}
                      aria-invalid={!!customPriceErr}
                      className={`h-7 text-sm${customPriceErr ? ' border-red-400' : ''}`}
                    />
                    {customPriceErr && <p className="text-[10px] text-red-500 mt-0.5">⚠ {customPriceErr}</p>}
                  </div>
                  <Button type="button" size="sm" className="h-7 px-3" onClick={addCustom} disabled={!customName.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-2 border-t border-gray-100">
            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-gray-700 py-0.5"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export interface NewJobDialogProps {
  open:      boolean;
  onClose:   () => void;
  onCreated: (jobId: string) => void;
  branchId:  string;
  userId:    string;
}

export function NewJobDialog({ open, onClose, onCreated, branchId, userId }: NewJobDialogProps) {
  const { toast } = useToast();

  const [customerId,    setCustomerId]    = useState("");
  const [vehicleId,     setVehicleId]     = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [mechanicId,    setMechanicId]    = useState("");
  const [priority,      setPriority]      = useState<"low"|"normal"|"high"|"urgent">("normal");
  const [estCompletion, setEstCompletion] = useState("");
  const [notes,         setNotes]         = useState("");
  const [lines,         setLines]         = useState<ServiceLine[]>([]);

  const [saving,      setSaving]      = useState(false);
  const [loadingOpts, setLoadingOpts] = useState(false);
  const [notesError,  setNotesError]  = useState<FieldError>(null);

  const [customers, setCustomers] = useState<ServiceFormCustomer[]>([]);
  const [mechanics, setMechanics] = useState<ServiceFormMechanic[]>([]);
  const [vehicles,  setVehicles]  = useState<ServiceFormVehicle[]>([]);
  const [vehTypes,  setVehTypes]  = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoadingOpts(true);
    getServiceFormOptions(branchId || undefined)
      .then(opts => {
        setCustomers(opts.customers);
        setMechanics(opts.mechanics);
        setVehTypes([...opts.vehicleTypes]);
      })
      .finally(() => setLoadingOpts(false));
  }, [open, branchId]);

  useEffect(() => {
    setVehicleId("");
    setVehicleTypeId("");
    if (!customerId) { setVehicles([]); return; }
    getVehiclesByCustomer(customerId).then(setVehicles);
  }, [customerId]);

  useEffect(() => {
    if (!vehicleId) return;
    const veh = vehicles.find(v => v.vehicle_id === vehicleId);
    if (veh?.vehicle_type_id) setVehicleTypeId(veh.vehicle_type_id);
  }, [vehicleId, vehicles]);

  const resetForm = () => {
    setCustomerId(""); setVehicleId(""); setVehicleTypeId("");
    setMechanicId(""); setPriority("normal"); setEstCompletion(""); setNotes("");
    setLines([]); setVehicles([]);
    setNotesError(null);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const addLine = (item: { item_id: string | null; name: string; category: string; unit_price: number }) => {
    setLines(prev => [...prev, {
      id:         `_new_${Date.now()}_${Math.random()}`,
      item_id:    item.item_id,
      name:       item.name,
      category:   item.category,
      qty:        1,
      unit_price: item.unit_price,
    }]);
  };

  const updateLine = (id: string, field: "qty" | "unit_price", value: number) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));

  const duplicateLine = (id: string) => {
    const orig = lines.find(l => l.id === id);
    if (!orig) return;
    setLines(prev => [...prev, {
      ...orig,
      id:  `_new_${Date.now()}_${Math.random()}`,
      qty: 1,
    }]);
  };

  const subtotal = lines.reduce((acc, l) => acc + l.qty * l.unit_price, 0);
  const autoDesc = lines.length > 0 ? lines.map(l => l.name).join(" / ") : "";

  const handleCreate = async () => {
    if (lines.length === 0) {
      toast({ title: "Add at least one service", variant: "destructive" });
      return;
    }
    const nErr = validateLongText(notes, { label: 'Notes', maxLength: 500 });
    setNotesError(nErr);
    if (nErr) return;
    setSaving(true);
    try {
      const input: CreateServiceJobInput = {
        branch_id:            branchId,
        user_id:              userId,
        job_description:      autoDesc,
        priority,
        customer_id:          customerId    || undefined,
        vehicle_id:           vehicleId     || undefined,
        vehicle_type_id:      vehicleTypeId || undefined,
        mechanic_id:          mechanicId    || undefined,
        estimated_completion: estCompletion || undefined,
        notes:                notes.trim()  || undefined,
        lines: lines.map(l => ({
          item_id:          l.item_id ?? undefined,
          quantity:         l.qty,
          price_at_service: l.unit_price,
        })),
      };
      const result = await createServiceJob(input);
      if (!result.success) {
        toast({ title: "Error", description: result.error ?? "Create failed", variant: "destructive" });
      } else {
        toast({ title: `Job created: ${result.job_number}` });
        resetForm();
        onCreated(result.job_id!);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            New Service Job
          </DialogTitle>
          <DialogDescription>
            Select the services to perform, assign a vehicle and mechanic, then create.
          </DialogDescription>
        </DialogHeader>

        {loadingOpts ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <div className="space-y-5 py-1">

            {/* Assignment */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Vehicle &amp; Assignment
              </p>
              <div className="grid grid-cols-2 gap-3">

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" />Customer</Label>
                  <Select value={toSel(customerId)} onValueChange={v => setCustomerId(toVal(v))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Walk-in" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>-- Walk-in --</SelectItem>
                      {customers.map(c => (
                        <SelectItem key={c.customer_id} value={c.customer_id}>
                          {c.name}{c.phone ? ` / ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Car className="h-3 w-3" />Vehicle</Label>
                  <Select value={toSel(vehicleId)} onValueChange={v => setVehicleId(toVal(v))} disabled={!customerId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={customerId ? "Select" : "Select customer first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>-- None --</SelectItem>
                      {vehicles.map(v => (
                        <SelectItem key={v.vehicle_id} value={v.vehicle_id}>
                          {v.plate_number}{v.make ? ` / ${v.make}` : ""}{v.model ? ` ${v.model}` : ""}{v.year ? ` (${v.year})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    Vehicle Type
                    {vehicleId && <span className="ml-1 text-muted-foreground font-normal">(auto-set by vehicle)</span>}
                  </Label>
                  <Select value={toSel(vehicleTypeId)} onValueChange={v => setVehicleTypeId(toVal(v))} disabled={!!vehicleId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>-- None --</SelectItem>
                      {vehTypes.map(vt => (
                        <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Wrench className="h-3 w-3" />Mechanic</Label>
                  <Select value={toSel(mechanicId)} onValueChange={v => setMechanicId(toVal(v))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>-- Unassigned --</SelectItem>
                      {mechanics.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Priority</Label>
                  <Select value={priority} onValueChange={(v: "low"|"normal"|"high"|"urgent") => setPriority(v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />Est. Completion</Label>
                  <Input type="datetime-local" className="h-8 text-sm" value={estCompletion} onChange={e => setEstCompletion(e.target.value)} />
                </div>

              </div>
            </div>

            {/* Services */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Services <span className="text-red-500">*</span>
              </p>

              {lines.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg py-6 text-center">
                  <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No services added yet.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Click &ldquo;Add Service&rdquo; to select from the catalog.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-3 py-1.5 text-xs font-medium text-gray-600">Service / Part</th>
                        <th className="text-right px-3 py-1.5 text-xs font-medium text-gray-600 w-14">Qty</th>
                        <th className="text-right px-3 py-1.5 text-xs font-medium text-gray-600 w-28">Unit Price</th>
                        <th className="text-right px-3 py-1.5 text-xs font-medium text-gray-600 w-28">Subtotal</th>
                          <th className="w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map(line => (
                        <tr key={line.id} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize",
                                CATEGORY_BADGE[line.category] ?? "bg-gray-100 text-gray-600"
                              )}>
                                {line.category}
                              </span>
                              <span className="text-sm font-medium text-gray-900">{line.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Input
                              type="number" min={1}
                              value={line.qty}
                              onChange={e => updateLine(line.id, "qty", Math.max(1, Number(e.target.value)))}
                              className="h-6 w-14 text-xs text-right border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Input
                              type="number" min={0} step={0.01}
                              value={line.unit_price}
                              onChange={e => updateLine(line.id, "unit_price", parseFloat(e.target.value) || 0)}
                              className="h-6 w-24 text-xs text-right border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-800">
                            P{(line.qty * line.unit_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <div className="flex items-center gap-0.5 justify-center">
                              <Button type="button" variant="ghost" size="icon"
                                className="h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => duplicateLine(line.id)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon"
                                className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeLine(line.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <ServicePickerPopover onSelect={line => addLine({ item_id: null, name: line.name, category: line.category, unit_price: line.unit_price })} />
                {lines.length > 0 && (
                  <div className="text-sm font-semibold text-gray-800">
                    Total: P{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                placeholder="Customer instructions, special remarks..."
                rows={2}
                value={notes}
                onChange={e => {
                  setNotes(e.target.value);
                  setNotesError(validateLongText(e.target.value, { label: 'Notes', maxLength: 500 }));
                }}
                maxLength={510}
                aria-invalid={!!notesError}
                className={`text-sm${notesError ? ' border-red-400 focus-visible:ring-red-300' : ''}`}
              />
              <div className="flex justify-between">
                {notesError
                  ? <p className="text-xs text-red-500">⚠ {notesError}</p>
                  : <span />}
                <p className={`text-xs ${
                  notes.length > 500 ? 'text-red-500 font-medium' :
                  notes.length > 425 ? 'text-amber-500' : 'text-muted-foreground'
                }`}>{notes.length}/500</p>
              </div>
            </div>

          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || loadingOpts || lines.length === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Job{lines.length > 0 ? ` (${lines.length} service${lines.length > 1 ? "s" : ""})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
