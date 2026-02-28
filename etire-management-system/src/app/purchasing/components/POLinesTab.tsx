"use client";

import { Package } from "lucide-react";

type AnyRecord = Record<string, unknown>;

interface POLinesTabProps {
  po: AnyRecord;
  onRefresh?: () => void;
}

function fmt(v: unknown) {
  return `₱${Number(v ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export function POLinesTab({ po }: POLinesTabProps) {
  const lines = (po.lines ?? []) as AnyRecord[];

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-8 w-8 opacity-30 mb-2" />
        <p className="text-sm">No products on this order.</p>
      </div>
    );
  }

  const total = lines.reduce((s, l) => s + (Number(l.total_cost) || Number(l.unit_cost) * Number(l.quantity)), 0);

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
          {lines.map((line, i) => {
            const item     = line.item as AnyRecord | null;
            const itemName = String(item?.name ?? line.name ?? `Line ${i + 1}`);
            const brand    = item?.tire_brand as AnyRecord | null;
            const size     = item?.tire_size  as AnyRecord | null;
            const qty      = Number(line.quantity ?? 0);
            const unitCost = Number(line.unit_cost ?? 0);
            const subtotal = Number(line.total_cost ?? qty * unitCost);

            return (
              <tr key={String(line.po_item_id ?? i)} className="border-b border-border last:border-0 hover:bg-accent/20">
                <td className="px-4 py-3 font-medium text-foreground">{itemName}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                  {brand?.name ? `${String(brand.name)}` : ""}
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
            <td colSpan={4} className="px-4 py-2.5 text-right text-xs text-muted-foreground font-medium">
              Order Total
            </td>
            <td className="px-4 py-2.5 text-right font-bold text-purple-700">
              {fmt(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
