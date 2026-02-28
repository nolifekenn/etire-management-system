"use client";

/**
 * CreateProductDialog — dialog for creating a new inventory_item from the Product List View.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast }  from "@/hooks/use-toast";
import { useAuth }   from "@/hooks/useAuth";
import { supabase }  from "@/lib/supabaseClient";
import { upsertProduct } from "@/lib/actions/inventory";
import { validateShortText, validateNumber, type FieldError } from "@/lib/validation";

interface Props {
  open:         boolean;
  onOpenChange: (o: boolean) => void;
  onCreated:    (itemId: string) => void;
}

type AnyRecord = Record<string, unknown>;

export function CreateProductDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const { user, activeBranchId } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [branches,   setBranches]   = useState<AnyRecord[]>([]);
  const [suppliers,  setSuppliers]  = useState<AnyRecord[]>([]);

  // Validation state
  const [nameError,       setNameError]       = useState<FieldError>(null);
  const [nameTouched,     setNameTouched]     = useState(false);
  const [salePriceError,  setSalePriceError]  = useState<FieldError>(null);
  const [costPriceError,  setCostPriceError]  = useState<FieldError>(null);
  const [reorderError,    setReorderError]    = useState<FieldError>(null);

  // Form state
  const [name,        setName]       = useState("");
  const [category,    setCategory]   = useState<string>("tire");
  const [vehicleType, setVehicleType]= useState<string>("car");
  const [salePrice,   setSalePrice]  = useState("");
  const [costPrice,   setCostPrice]  = useState("");
  const [reorderLevel,setReorderLevel] = useState("5");
  const [supplierId,  setSupplierId] = useState<string>("none");
  const [branchId,    setBranchId]   = useState<string>("");

  // Reset validation when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setNameError(null);
      setNameTouched(false);
      setSalePriceError(null);
      setCostPriceError(null);
      setReorderError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: b }, { data: s }] = await Promise.all([
        supabase.from("branch").select("branch_id, name").is("deleted_at", null).order("name"),
        supabase.from("supplier").select("supplier_id, name").is("deleted_at", null).order("name"),
      ]);
      setBranches((b ?? []) as AnyRecord[]);
      setSuppliers((s ?? []) as AnyRecord[]);
      setBranchId(activeBranchId ?? (b?.[0] as AnyRecord | undefined)?.branch_id as string ?? "");
    })();
  }, [open, activeBranchId]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (nameTouched) {
      setNameError(validateShortText(value, { label: "Product name", minLength: 2, maxLength: 150 }));
    }
  };

  const handleNameBlur = () => {
    setNameTouched(true);
    setNameError(validateShortText(name, { label: "Product name", minLength: 2, maxLength: 150 }));
  };

  const handleSubmit = async () => {
    // Run all validations on submit
    const nameErr    = validateShortText(name,        { label: "Product name",  minLength: 2, maxLength: 150 });
    const saleErr    = validateNumber(salePrice,      { label: "Sale price",    required: false, min: 0 });
    const costErr    = validateNumber(costPrice,      { label: "Cost price",    required: false, min: 0 });
    const reorderErr = validateNumber(reorderLevel,   { label: "Reorder level", required: true,  min: 0, integer: true });

    setNameError(nameErr);
    setSalePriceError(saleErr);
    setCostPriceError(costErr);
    setReorderError(reorderErr);
    setNameTouched(true);

    if (nameErr || saleErr || costErr || reorderErr) return;
    if (!branchId) return toast({ title: "Branch is required", variant: "destructive" });

    setSubmitting(true);
    try {
      const result = await upsertProduct({
        branch_id:    branchId,
        supplier_id:  (supplierId && supplierId !== "none") ? supplierId : undefined,
        name:         name.trim(),
        category:     category as "tire" | "tool" | "accessory" | "service",
        vehicle_type: vehicleType as "car" | "motor" | "truck",
        sale_price:   Number(salePrice)   || 0,
        cost_price:   Number(costPrice)   || 0,
        reorder_level:Number(reorderLevel)|| 5,
      });

      if (!result.success) throw new Error(result.error);

      toast({ title: "Product created successfully" });
      onCreated(result.itemId!);
    } catch (err) {
      toast({
        title: "Failed to create product",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Product</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Name */}
          <div className="col-span-2 space-y-1">
            <Label htmlFor="cp-name">Product Name <span className="text-red-500">*</span></Label>
            <Input
              id="cp-name"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="e.g. Bridgestone Ecopia 185/65R15"
              maxLength={150}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "cp-name-error" : undefined}
              className={nameError ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            {nameError && (
              <p id="cp-name-error" className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                <span aria-hidden>⚠</span> {nameError}
              </p>
            )}
            <p className={`text-xs text-right ${
              name.trim().length > 130 ? "text-amber-500" : "text-muted-foreground"
            }`}>
              {name.trim().length}/150
            </p>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tire">Tire</SelectItem>
                <SelectItem value="tool">Tool</SelectItem>
                <SelectItem value="accessory">Accessory</SelectItem>
                <SelectItem value="service">Service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle Type */}
          <div className="space-y-1">
            <Label>Vehicle Type</Label>
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motor">Motorcycle</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sale Price */}
          <div className="space-y-1">
            <Label htmlFor="cp-sale">Sale Price (₱)</Label>
            <Input
              id="cp-sale"
              type="number"
              min="0"
              step="0.01"
              value={salePrice}
              onChange={e => {
                setSalePrice(e.target.value);
                setSalePriceError(validateNumber(e.target.value, { label: "Sale price", required: false, min: 0 }));
              }}
              placeholder="0.00"
              aria-invalid={!!salePriceError}
              className={salePriceError ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            {salePriceError && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5"><span aria-hidden>⚠</span> {salePriceError}</p>
            )}
          </div>

          {/* Cost Price */}
          <div className="space-y-1">
            <Label htmlFor="cp-cost">Cost Price (₱)</Label>
            <Input
              id="cp-cost"
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={e => {
                setCostPrice(e.target.value);
                setCostPriceError(validateNumber(e.target.value, { label: "Cost price", required: false, min: 0 }));
              }}
              placeholder="0.00"
              aria-invalid={!!costPriceError}
              className={costPriceError ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            {costPriceError && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5"><span aria-hidden>⚠</span> {costPriceError}</p>
            )}
          </div>

          {/* Reorder Level */}
          <div className="space-y-1">
            <Label htmlFor="cp-reorder">Reorder Level</Label>
            <Input
              id="cp-reorder"
              type="number"
              min="0"
              value={reorderLevel}
              onChange={e => {
                setReorderLevel(e.target.value);
                setReorderError(validateNumber(e.target.value, { label: "Reorder level", required: true, min: 0, integer: true }));
              }}
              aria-invalid={!!reorderError}
              className={reorderError ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            {reorderError && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5"><span aria-hidden>⚠</span> {reorderError}</p>
            )}
          </div>

          {/* Branch */}
          <div className="space-y-1">
            <Label>Branch <span className="text-red-500">*</span></Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {branches.map(b => (
                  <SelectItem key={String(b.branch_id)} value={String(b.branch_id)}>
                    {String(b.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier */}
          <div className="col-span-2 space-y-1">
            <Label>Supplier (optional)</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={String(s.supplier_id)} value={String(s.supplier_id)}>
                    {String(s.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#714B67] hover:bg-[#5a3c53] text-white"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
