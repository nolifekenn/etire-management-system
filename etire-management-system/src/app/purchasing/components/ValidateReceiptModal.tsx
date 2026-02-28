"use client";

import { useState } from "react";
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
  item_name: string;
  po_item_id: string;
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

  // Build line inputs from the first pending delivery
  const pendingDelivery = deliveries.find((d) => d.status !== "done") ?? deliveries[0];
  const deliveryId      = pendingDelivery ? String(pendingDelivery.delivery_id) : "";

  const rawItems = (pendingDelivery?.items ?? (po.lines ?? [])) as AnyRecord[];

  const [lineInputs, setLineInputs] = useState<LineInput[]>(() =>
    rawItems.map((item) => ({
      delivery_item_id: String(item.delivery_item_id ?? item.po_item_id ?? ""),
      item_name:        String((item.item as AnyRecord | null)?.name ?? item.name ?? "Unknown"),
      po_item_id:       String(item.po_item_id ?? ""),
      quantity_ordered: Number(item.quantity ?? item.quantity_ordered ?? 0),
      quantity_received: Number(item.quantity ?? item.quantity_ordered ?? 0),
      quantity_damaged:  0,
    }))
  );

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
      const result = await validateReceipt({
        po_id:       String(po.po_id),
        delivery_id: deliveryId,
        user_id:     userId,
        branch_id:   String(po.branch_id ?? ""),
        lines:      lineInputs.map((l) => ({
          item_id:           String((rawItems.find((ri) => ri.po_item_id === l.po_item_id) as AnyRecord)?.item_id ?? ""),
          quantity_received: l.quantity_received,
          quantity_damaged:  l.quantity_damaged,
          unit_cost:         0,
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
