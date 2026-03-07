"use client";

/**
 * AuditTrailPanel
 * ---------------
 * Odoo-style audit trail for a specific record.
 * Shows a unified timeline of:
 *   • chatter_message rows  (notes, state changes, system, activities)
 *   • audit_log rows        (INSERT / UPDATE / DELETE / custom actions)
 *
 * Both streams are merged and sorted by created_at descending.
 */

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, MessageSquare, Plus, Loader2,
  ArrowRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatterRow {
  kind: "chatter";
  id: string;
  message_type: "comment" | "state_change" | "system" | "activity_done";
  body: string;
  old_state: string | null;
  new_state: string | null;
  is_internal: boolean;
  created_at: string;
  author_name: string | null;
}

interface AuditRow {
  kind: "audit";
  id: string;
  action: string;
  table_name: string;
  record_number: string | null;
  new_values: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
  created_at: string;
  author_name: string | null;
  author_role: string | null;
}

type TimelineEntry = ChatterRow | AuditRow;

interface AuditTrailPanelProps {
  /** DB table name, e.g. 'purchase_order' */
  relatedTable: string;
  /** UUID of the record */
  relatedRecordId: string;
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Compute a human-readable label for an audit action */
function actionLabel(action: string): string {
  const map: Record<string, string> = {
    INSERT:           "Created",
    UPDATE:           "Updated",
    DELETE:           "Deleted",
    STATE_TRANSITION: "Status changed",
    VOID:             "Voided",
    VALIDATE_RECEIPT: "Receipt validated",
    CANCEL_JOB:       "Job cancelled",
    ADJUSTMENT:       "Stock adjusted",
    UPDATE_LINES:     "Lines updated",
    UPSERT_LINES:     "Lines updated",
  };
  return map[action] ?? action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Colour class for action badge */
function actionColor(action: string): string {
  if (["INSERT"].includes(action)) return "bg-green-100 text-green-700";
  if (["DELETE", "VOID", "CANCEL_JOB"].includes(action)) return "bg-red-100 text-red-700";
  if (["STATE_TRANSITION", "VALIDATE_RECEIPT"].includes(action)) return "bg-blue-100 text-blue-700";
  if (["UPDATE", "UPDATE_LINES", "UPSERT_LINES"].includes(action)) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

/** Render a field-level diff between old_values and new_values */
function renderVal(v: unknown): string {
  if (v === null || v === undefined) return "(cleared)";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function FieldDiff({ old_values, new_values }: { old_values: Record<string, unknown> | null; new_values: Record<string, unknown> | null }) {
  const allKeys = Array.from(new Set([
    ...Object.keys(old_values ?? {}),
    ...Object.keys(new_values ?? {}),
  ]));

  if (allKeys.length === 0) return null;

  const skipKeys = new Set(["updated_at", "created_at"]);
  const rows = allKeys.filter(k => !skipKeys.has(k)).map((key) => {
    const oldVal = old_values?.[key];
    const newVal = new_values?.[key];
    const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
    return { key, oldVal, newVal, changed };
  });

  const changed = rows.filter(r => r.changed);
  const unchanged = rows.filter(r => !r.changed);

  return (
    <div className="mt-2 space-y-1">
      {changed.map(({ key, oldVal, newVal }) => (
        <div key={key} className="flex flex-wrap items-center gap-1 text-xs">
          <span className="font-medium text-slate-700 capitalize">{key.replace(/_/g, " ")}:</span>
          {oldVal !== undefined && oldVal !== null && (
            <>
              <span className="line-through text-red-500 bg-red-50 rounded px-1">
                {renderVal(oldVal)}
              </span>
              <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
            </>
          )}
          <span className="text-green-700 bg-green-50 rounded px-1 font-medium">
            {renderVal(newVal)}
          </span>
        </div>
      ))}
      {unchanged.length > 0 && changed.length > 0 && (
        <p className="text-[10px] text-muted-foreground pt-1">
          {unchanged.length} field{unchanged.length > 1 ? "s" : ""} unchanged
        </p>
      )}
      {changed.length === 0 && unchanged.length > 0 && (
        <div className="space-y-0.5">
          {unchanged.map(({ key, newVal }) => (
            <div key={key} className="flex items-center gap-1 text-xs text-slate-500">
              <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>
              <span>{renderVal(newVal)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Audit entry card ───────────────────────────────────────────────────────

function AuditEntryCard({ entry }: { entry: AuditRow }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = (entry.new_values && Object.keys(entry.new_values).length > 0)
    || (entry.old_values && Object.keys(entry.old_values).length > 0);

  return (
    <div className="flex gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm">
      {/* Avatar */}
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarFallback className={cn("text-[10px]", entry.author_name ? "bg-indigo-100 text-indigo-700" : "bg-slate-200")}>
          {entry.author_name ? getInitials(entry.author_name) : <ClipboardList className="h-3.5 w-3.5" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground text-xs">
            {entry.author_name ?? "System"}
          </span>
          {entry.author_role && (
            <span className="text-[10px] text-slate-400">({entry.author_role})</span>
          )}
          <span className={cn(
            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            actionColor(entry.action)
          )}>
            {actionLabel(entry.action)}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap" title={formatAbsoluteTime(entry.created_at)}>
            {formatRelativeTime(entry.created_at)}
          </span>
        </div>

        {/* State change arrow */}
        {entry.action === "STATE_TRANSITION" && (() => {
          const from = entry.old_values?.state;
          const to   = entry.new_values?.state;
          if (!from || !to) return null;
          return (
            <div className="flex items-center gap-1 text-xs">
              <span className="line-through text-red-500">{String(from)}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="text-green-600 font-semibold">{String(to)}</span>
            </div>
          );
        })()}

        {/* Expand/collapse details */}
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-0.5 text-[10px] text-indigo-600 hover:text-indigo-800 transition-colors pt-0.5"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide details" : "Show details"}
          </button>
        )}

        {expanded && hasDetails && (
          <FieldDiff old_values={entry.old_values} new_values={entry.new_values} />
        )}
      </div>
    </div>
  );
}

// ── Chatter entry card ─────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; class: string }> = {
  comment:       { label: "Note",         class: "bg-blue-100 text-blue-700" },
  state_change:  { label: "State Change", class: "bg-slate-100 text-slate-600" },
  system:        { label: "System",       class: "bg-slate-100 text-slate-500" },
  activity_done: { label: "Activity",     class: "bg-amber-100 text-amber-700" },
};

function ChatterEntryCard({ entry }: { entry: ChatterRow }) {
  const badge = TYPE_BADGE[entry.message_type] ?? TYPE_BADGE.comment;
  const isSystem = entry.message_type === "state_change" || entry.message_type === "system";

  return (
    <div className={cn(
      "flex gap-3 rounded-lg border p-3 text-sm",
      isSystem ? "border-dashed border-slate-200 bg-slate-50" : "border-border bg-white"
    )}>
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarFallback className={cn("text-[10px]", entry.author_name ? "bg-violet-100 text-violet-700" : "bg-slate-200")}>
          {entry.author_name ? getInitials(entry.author_name) : <MessageSquare className="h-3.5 w-3.5" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground text-xs">
            {entry.author_name ?? "System"}
          </span>
          <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium", badge.class)}>
            {badge.label}
          </span>
          {!entry.is_internal && (
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700">
              Customer
            </span>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(entry.created_at)}
          </span>
        </div>

        {entry.message_type === "state_change" && entry.old_state && entry.new_state ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="line-through text-red-500">{entry.old_state}</span>
            <ArrowRight className="h-3 w-3 text-slate-400" />
            <span className="text-green-600 font-semibold">{entry.new_state}</span>
          </div>
        ) : (
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{entry.body}</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AuditTrailPanel({ relatedTable, relatedRecordId, className }: AuditTrailPanelProps) {
  const { user } = useAuth();
  const [timeline, setTimeline]   = useState<TimelineEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [noteText, setNoteText]   = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "notes" | "history">("all");

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch chatter messages
      const chatterRes = await fetch(
        `/api/chatter?table=${encodeURIComponent(relatedTable)}&id=${encodeURIComponent(relatedRecordId)}`
      );
      const chatterJson = chatterRes.ok ? await chatterRes.json() : { messages: [] };

      // Fetch audit_log for this record
      const { data: auditData } = await supabase
        .from("audit_log")
        .select(`
          log_id,
          action,
          table_name,
          record_id,
          record_number,
          new_values,
          old_values,
          created_at,
          user:user_id (
            name,
            role
          )
        `)
        .eq("record_id", relatedRecordId)
        .order("created_at", { ascending: false })
        .limit(100);

      // Normalise chatter messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chatterEntries: ChatterRow[] = (chatterJson.messages ?? []).map((m: any) => ({
        kind:         "chatter",
        id:           m.id,
        message_type: m.message_type,
        body:         m.body,
        old_state:    m.old_state ?? null,
        new_state:    m.new_state ?? null,
        is_internal:  m.is_internal,
        created_at:   m.created_at,
        author_name:  m.author_name ?? null,
      }));

      // Normalise audit_log rows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const auditEntries: AuditRow[] = (auditData ?? []).map((r: any) => ({
        kind:          "audit",
        id:            r.log_id,
        action:        r.action,
        table_name:    r.table_name,
        record_number: r.record_number ?? null,
        new_values:    r.new_values ?? null,
        old_values:    r.old_values ?? null,
        created_at:    r.created_at,
        author_name:   r.user?.name ?? null,
        author_role:   r.user?.role ?? null,
      }));

      // Merge and sort newest first
      const merged: TimelineEntry[] = [...chatterEntries, ...auditEntries].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTimeline(merged);
    } finally {
      setLoading(false);
    }
  }, [relatedTable, relatedRecordId]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const handleSubmit = async () => {
    if (!noteText.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/chatter", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:            "note",
          relatedTable,
          relatedRecordId,
          userId:          user.user_id,
          message:         noteText.trim(),
          isInternal,
        }),
      });
      if (res.ok) { setNoteText(""); await fetchTimeline(); }
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered view
  const filtered = timeline.filter((e) => {
    if (activeTab === "notes")   return e.kind === "chatter" && e.message_type === "comment";
    if (activeTab === "history") return e.kind === "audit" || (e.kind === "chatter" && e.message_type !== "comment");
    return true;
  });

  const noteCount    = timeline.filter(e => e.kind === "chatter" && e.message_type === "comment").length;
  const historyCount = timeline.filter(e => e.kind === "audit" || (e.kind === "chatter" && e.message_type !== "comment")).length;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header + tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Audit Trail</h3>
        </div>
        <div className="flex items-center gap-1">
          {(["all", "notes", "history"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-md capitalize transition-colors",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {tab}
              {tab === "notes"   && noteCount    > 0 && <span className="ml-1 text-[10px] opacity-70">({noteCount})</span>}
              {tab === "history" && historyCount > 0 && <span className="ml-1 text-[10px] opacity-70">({historyCount})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Note input (only on "all" and "notes" tabs) */}
      {activeTab !== "history" && (
        <div className="rounded-lg border border-border bg-white p-3 space-y-2">
          <Textarea
            placeholder="Add a note or internal message..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="resize-none text-sm text-foreground"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {(["Internal", "Customer"] as const).map((label) => {
                const isActive = label === "Internal" ? isInternal : !isInternal;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setIsInternal(label === "Internal")}
                    className={cn(
                      "text-xs px-2 py-1 rounded-md transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!noteText.trim() || submitting}
              className="gap-1.5"
            >
              {submitting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Plus className="h-3.5 w-3.5" />}
              Add Note
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) =>
            entry.kind === "audit"
              ? <AuditEntryCard   key={`audit-${entry.id}`}   entry={entry} />
              : <ChatterEntryCard key={`chatter-${entry.id}`} entry={entry} />
          )}
        </div>
      )}
    </div>
  );
}
