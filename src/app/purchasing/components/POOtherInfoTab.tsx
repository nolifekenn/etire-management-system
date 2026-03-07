"use client";

import React from "react";
import { CalendarDays, MapPin, Phone, Mail, StickyNote } from "lucide-react";

type AnyRecord = Record<string, unknown>;

function str(val: unknown): string {
  if (val == null) return "";
  return String(val) || "";
}

function fmtDate(val: unknown): string {
  if (!val) return "";
  try {
    return new Date(String(val)).toLocaleDateString("en-PH", {
      weekday: "short", month: "long", day: "numeric", year: "numeric",
    });
  } catch {
    return String(val);
  }
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export function POOtherInfoTab({ po }: { po: AnyRecord }) {
  const supplier = po.supplier as AnyRecord | undefined;
  const branch   = po.branch   as AnyRecord | undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {/* Vendor info */}
      <div className="rounded-lg border border-border p-4 space-y-4 bg-white">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendor</p>
        <InfoRow icon={MapPin} label="Supplier" value={str(supplier?.name)} />
        <InfoRow icon={Phone}  label="Phone"    value={str(supplier?.phone)} />
        <InfoRow icon={Mail}   label="Email"    value={str(supplier?.email)} />
      </div>

      {/* Dates */}
      <div className="rounded-lg border border-border p-4 space-y-4 bg-white">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dates</p>
        <InfoRow icon={CalendarDays} label="Order Date"       value={fmtDate(po.order_date)} />
        <InfoRow icon={CalendarDays} label="Expected Arrival" value={fmtDate(po.expected_delivery_date)} />
        <InfoRow icon={CalendarDays} label="Created"          value={fmtDate(po.created_at)} />
      </div>

      {/* Destination */}
      <div className="rounded-lg border border-border p-4 space-y-4 bg-white">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination</p>
        <InfoRow icon={MapPin} label="Branch" value={str(branch?.name)} />
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border p-4 space-y-4 bg-white">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
        <InfoRow icon={StickyNote} label="Notes" value={str(po.notes)} />
      </div>
    </div>
  );
}
