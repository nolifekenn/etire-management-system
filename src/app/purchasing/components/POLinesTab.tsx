"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { upsertPOLines } from "@/lib/actions/purchasing";
import { useToast } from "@/hooks/use-toast";
import { validateNumber, type FieldError } from "@/lib/validation";

type AnyRecord = Record<string, unknown>;

interface EditLine {
  tempId:    string;
  po_item_id?: string;
  item_id:   string | null;
  name:      string;
  quantity:  number;
  unit_cost: number;
}

interface POLinesTabProps {
  po:         AnyRecord;
  onRefresh?: () => void;
}

function fmt(v: unknown) {
  return `₱${Number(v ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export function POLinesTab({ po, onRefresh }: POLinesTabProps) {
  const poState   = String(po.state ?? po.status ?? "");
  const isDraft   = poState === "draft";

  const rawLines  = (po.lines ?? []) as AnyRecord[];

  // ── Read-only view ──────────────────────────────────────────────────────
  if (!isDraft) {
    if (rawLines.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">No products on this order.</p>
        </div>
      );
    }

    const total = rawLines.reduce(
      (s, l) => s + (Number(l.total_cost) || Number(l.unit_cost) * Number(l.quantity)),
      0
    );

    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Product</th>
              <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">Brand / Size</th>
              <th className="px-4 py-2.5 text-center font-medium w-20">Qty</th>
              <th className="px-4 py-2.5 text-right font-medium w-28">Unit Cost</th>
              <th className="px-4 py-2.5 text-right font-medium w-28">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rawLines.map((line, i) => {
              const item     = line.item as AnyRecord | null;
              const itemName = String(item?.name ?? line.name ?? `Line ${i + 1}`);
              const brand    = (item?.brand ?? item?.tire_brand) as AnyRecord | null;
              const size     = (item?.size  ?? item?.tire_size)  as AnyRecord | null;
              const qty      = Number(line.quantity ?? 0);
              const unitCost = Number(line.unit_cost ?? 0);
              const subtotal = Number(line.total_cost ?? qty * unitCost);
              return (
                <tr key={String(line.po_item_id ?? i)} className="border-b border-border last:border-0 hover:bg-accent/20">
                  <td className="px-4 py-3 font-medium text-foreground">{itemName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                    {brand?.name ? String(brand.name) : ""}
                    {size?.label ? ` · ${String(size.label)}` : ""}
                    {!brand?.name && !size?.label && "—"}
                  </td>
                  <td className="px-4 py-3 text-center">{qty}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmt(unitCost)}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-border">
              <td colSpan={4} className="px-4 py-2.5 text-right text-xs text-muted-foreground font-medium">Order Total</td>
              <td className="px-4 py-2.5 text-right font-bold text-purple-700">{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  // ── Editable draft view ─────────────────────────────────────────────────
  return <DraftEditor po={po} rawLines={rawLines} onRefresh={onRefresh} />;
}

// ── Draft editor (extracted to keep parent hook rules clean) ────────────────

function DraftEditor({
  po,
  rawLines,
  onRefresh,
}: {
  po: AnyRecord;
  rawLines: AnyRecord[];
  onRefresh?: () => void;
}) {
  const { toast } = useToast();
  const [rows,   setRows]   = useState<EditLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<number, { qty?: FieldError; cost?: FieldError }>>({});

  // Seed rows from loaded data
  useEffect(() => {
    setRows(
      rawLines
        .filter(l => !l.deleted_at)
        .map((l, i) => {
          const item = l.item as AnyRecord | null;
          return {
            tempId:    String(l.po_item_id ?? i),
            po_item_id: String(l.po_item_id ?? ""),
            item_id:   String(l.item_id ?? item?.item_id ?? "") || null,
            name:      String(item?.name ?? l.name ?? ""),
            quantity:  Number(l.quantity ?? 1),
            unit_cost: Number(l.unit_cost ?? 0),
          };
        })
    );
  }, [rawLines]);

  const update = (idx: number, patch: Partial<EditLine>) =>
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

  const addRow = () =>
    setRows(prev => [
      ...prev,
      { tempId: `new-${Date.now()}`, po_item_id: undefined, item_id: null, name: "", quantity: 1, unit_cost: 0 },
    ]);

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const errs: typeof errors = {};
    rows.forEach((r, idx) => {
      const qtyErr  = validateNumber(String(r.quantity),  { label: "Qty",       required: true, min: 1, integer: true });
      const costErr = validateNumber(String(r.unit_cost), { label: "Unit cost", required: true, min: 0 });
      if (qtyErr || costErr) errs[idx] = { qty: qtyErr, cost: costErr };
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const input = rows.map(r => ({
      item_id:   r.item_id || r.item_id,
      quantity:  r.quantity,
      unit_cost: r.unit_cost,
    }));

    const result = await upsertPOLines(String(po.po_id), input as { item_id: string; quantity: number; unit_cost: number }[]);
    setSaving(false);

    if (result.success) {
      toast({ title: "Order lines saved" });
      onRefresh?.();
    } else {
      toast({ title: "Save failed", description: result.error, variant: "destructive" });
    }
  };

  const grandTotal = rows.reduce((s, r) => s + r.quantity * r.unit_cost, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Edit quantities and unit costs. Changes are not saved until you click <strong>Save Lines</strong>.
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#714B67] hover:bg-[#5a3c53] text-white">
          {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-1" />Save Lines</>}
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2.5 text-left font-medium">Product</th>
              <th className="px-3 py-2.5 text-center font-medium w-24">Qty</th>
              <th className="px-3 py-2.5 text-right font-medium w-32">Unit Cost (₱)</th>
              <th className="px-3 py-2.5 text-right font-medium w-28">Subtotal</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No lines yet — add a product below.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row.tempId} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <Input
                    value={row.name}
                    onChange={e => update(idx, { name: e.target.value })}
                    placeholder="Product name"
                    className="h-8 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <div>
                    <Input
                      type="number" min="1" value={row.quantity}
                      onChange={e => {
                        const v = Math.max(1, parseInt(e.target.value) || 1);
                        update(idx, { quantity: v });
                        setErrors(p => ({ ...p, [idx]: { ...p[idx], qty: validateNumber(String(v), { label: "Qty", required: true, min: 1, integer: true }) } }));
                      }}
                      aria-invalid={!!errors[idx]?.qty}
                      className={`h-8 text-sm text-center${errors[idx]?.qty ? " border-red-400" : ""}`}
                    />
                    {errors[idx]?.qty && <p className="text-[10px] text-red-500">⚠ {errors[idx].qty}</p>}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div>
                    <Input
                      type="number" min="0" step="0.01" value={row.unit_cost}
                      onChange={e => {
                        const v = parseFloat(e.target.value) || 0;
                        update(idx, { unit_cost: v });
                        setErrors(p => ({ ...p, [idx]: { ...p[idx], cost: validateNumber(String(v), { label: "Cost", required: true, min: 0 }) } }));
                      }}
                      aria-invalid={!!errors[idx]?.cost}
                      className={`h-8 text-sm text-right${errors[idx]?.cost ? " border-red-400" : ""}`}
                    />
                    {errors[idx]?.cost && <p className="text-[10px] text-red-500">⚠ {errors[idx].cost}</p>}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-medium text-sm">
                  {fmt(row.quantity * row.unit_cost)}
                </td>
                <td className="px-3 py-2 text-center">
                  <Button
                    size="icon" variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                    onClick={() => removeRow(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-border">
              <td className="px-3 py-2.5">
                <Button
                  size="sm" variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={addRow}
                >
                  <Plus className="h-3 w-3" /> Add Line
                </Button>
              </td>
              <td colSpan={2} className="px-3 py-2.5 text-right text-xs text-muted-foreground font-medium">Order Total</td>
              <td className="px-3 py-2.5 text-right font-bold text-purple-700">{fmt(grandTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

