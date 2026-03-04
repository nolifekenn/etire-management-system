"use client";

import { useState, useEffect } from "react";
import { Loader2, Truck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { validateReceipt } from "@/lib/actions/purchasing";

// ── Types ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

interface ValidateReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: AnyRecord;
  deliveries: AnyRecord[];
  userId: string;
  onValidated: () => void;
}

interface LineInput {
  delivery_item_id: string;
  item_id: string;
  item_name: string;
  quantity_ordered: number;
  quantity_received: number;
  quantity_damaged: number;
}

// ── Modal ──────────────────────────────────────────────────────────────────

export function ValidateReceiptModal({
  open, onOpenChange, po, deliveries, userId, onValidated,
}: ValidateReceiptModalProps) {
  const { toast } = useToast();
  const [saving,    setSaving]    = useState(false);
  const [receiptNotes, setReceiptNotes] = useState("");

  // Build line inputs from the first delivery (newest first) or fall back to PO lines
  const pendingDelivery = deliveries[0] ?? null;
  const deliveryId      = pendingDelivery ? String(pendingDelivery.delivery_id) : "";

  // Reinitialize line inputs whenever the modal opens or delivery data changes
  const [lineInputs, setLineInputs] = useState<LineInput[]>([]);

  useEffect(() => {
    if (!open) return;

    // Build a lookup map of PO lines: item_id → quantity ordered
    const poLines = (po.lines ?? []) as AnyRecord[];
    const quantityByItemId: Record<string, number> = {};
    for (const l of poLines) {
      const id = String((l.item as AnyRecord | null)?.item_id ?? l.item_id ?? "");
      if (id) quantityByItemId[id] = Number(l.quantity ?? 0);
    }

    // Use delivery items if available; fall back to PO lines
    const deliveryItems = (pendingDelivery?.items ?? []) as AnyRecord[];

    if (deliveryItems.length > 0) {
      setLineInputs(
        deliveryItems.map((di) => {
          const itemObj   = di.item as AnyRecord | null;
          const itemId    = String(itemObj?.item_id ?? di.item_id ?? "");
          const itemName  = String(itemObj?.name ?? di.item_name ?? "Unknown");
          const ordered   = quantityByItemId[itemId] ?? Number(di.quantity_received ?? 0);
          return {
            delivery_item_id: String(di.delivery_item_id ?? ""),
            item_id:          itemId,
            item_name:        itemName,
            quantity_ordered:  ordered,
            quantity_received: ordered,   // default to full quantity
            quantity_damaged:  0,
          };
        })
      );
    } else {
      // No delivery items yet — derive from PO lines directly
      setLineInputs(
        poLines.map((l) => {
          const itemObj  = l.item as AnyRecord | null;
          const itemId   = String(itemObj?.item_id ?? l.item_id ?? "");
          const itemName = String(itemObj?.name ?? l.item_name ?? "Unknown");
          const ordered  = Number(l.quantity ?? 0);
          return {
            delivery_item_id: "",
            item_id:          itemId,
            item_name:        itemName,
            quantity_ordered:  ordered,
            quantity_received: ordered,
            quantity_damaged:  0,
          };
        })
      );
    }
  }, [open, deliveries, po]); // eslint-disable-line react-hooks/exhaustive-deps

  function setLineField<K extends "quantity_received" | "quantity_damaged">(
    idx: number, key: K, val: number
  ) {
    setLineInputs((prev) =>
      prev.map((l, i) => i === idx ? { ...l, [key]: Math.max(0, val) } : l)
    );
  }

  async function handleSubmit() {
    if (!deliveryId) {
      toast({ title: "No delivery found", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Build unit_cost lookup from PO lines
      const poLines = (po.lines ?? []) as AnyRecord[];
      const costByItemId: Record<string, number> = {};
      for (const l of poLines) {
        const id = String((l.item as AnyRecord | null)?.item_id ?? l.item_id ?? "");
        if (id) costByItemId[id] = Number(l.unit_cost ?? 0);
      }

      const result = await validateReceipt({
        po_id:       String(po.po_id),
        delivery_id: deliveryId,
        user_id:     userId,
        branch_id:   String(po.branch_id ?? ""),
        lines:       lineInputs.map((l) => ({
          item_id:           l.item_id,
          quantity_received: l.quantity_received,
          quantity_damaged:  l.quantity_damaged,
          unit_cost:         costByItemId[l.item_id] ?? 0,
        })),
      });

      if (result.error) {
        toast({ title: "Failed to validate", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Receipt validated", description: "Stock updated successfully." });
        onValidated();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-600" />
            Validate Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <p className="text-sm text-muted-foreground">
            Enter quantities received for each product. Damaged units will be noted in stock.
          </p>

          {/* Lines table */}
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Product</th>
                  <th className="px-3 py-2 text-center font-medium w-24">Ordered</th>
                  <th className="px-3 py-2 text-center font-medium w-28">Received</th>
                  <th className="px-3 py-2 text-center font-medium w-28">Damaged</th>
                </tr>
              </thead>
              <tbody>
                {lineInputs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground text-xs">
                      No line items found for this delivery.
                    </td>
                  </tr>
                ) : (
                  lineInputs.map((line, idx) => (
                    <tr key={line.delivery_item_id || idx} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{line.item_name}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{line.quantity_ordered}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={line.quantity_ordered}
                          value={line.quantity_received}
                          onChange={(e) => setLineField(idx, "quantity_received", parseInt(e.target.value) || 0)}
                          className="h-8 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={line.quantity_received}
                          value={line.quantity_damaged}
                          onChange={(e) => setLineField(idx, "quantity_damaged", parseInt(e.target.value) || 0)}
                          className="h-8 text-center text-sm"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Receipt Notes</Label>
            <Textarea
              placeholder="Any notes about the delivery condition..."
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
            onClick={handleSubmit}
            disabled={saving || lineInputs.length === 0}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Validate & Update Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
