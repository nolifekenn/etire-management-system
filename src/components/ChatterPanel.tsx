"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Plus, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatterMessage } from "@/lib/chatter";
import { useAuth } from "@/hooks/useAuth";

// ── Props ──────────────────────────────────────────────────────────────────

interface ChatterPanelProps {
  /** Database table name, e.g. 'purchase_order' */
  relatedTable:    string;
  /** UUID of the record */
  relatedRecordId: string;
  className?:      string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(isoString).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

// ── Type badge colours ─────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; class: string }> = {
  comment:       { label: "Note",         class: "bg-blue-100 text-blue-700" },
  state_change:  { label: "State Change", class: "bg-gray-100 text-gray-600" },
  system:        { label: "System",       class: "bg-gray-100 text-gray-500" },
  activity_done: { label: "Activity",     class: "bg-amber-100 text-amber-700" },
};

// ── Component ──────────────────────────────────────────────────────────────

export function ChatterPanel({ relatedTable, relatedRecordId, className }: ChatterPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages]   = useState<ChatterMessage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [noteText, setNoteText]   = useState("");
  const [isInternal, setIsInternal] = useState(true);

  // Fetch chatter
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/chatter?table=${encodeURIComponent(relatedTable)}&id=${encodeURIComponent(relatedRecordId)}`
      );
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [relatedTable, relatedRecordId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Submit a note
  const handleSubmit = async () => {
    if (!noteText.trim() || !user) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/chatter", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:              "note",
          relatedTable,
          relatedRecordId,
          userId:            user.user_id,
          message:           noteText.trim(),
          isInternal,
        }),
      });

      if (res.ok) {
        setNoteText("");
        await fetchMessages();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Chatter</h3>
        {!loading && (
          <Badge variant="secondary" className="text-xs">
            {messages.length}
          </Badge>
        )}
      </div>

      {/* Note input */}
      <div className="rounded-lg border border-border bg-white p-3 space-y-2">
        <Textarea
          placeholder="Add a note or internal message..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
          className="resize-none text-sm text-foreground"
        />
        <div className="flex items-center justify-between gap-2">
          {/* Internal / Customer toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsInternal(true)}
              className={cn(
                "text-xs px-2 py-1 rounded-md transition-colors",
                isInternal
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              Internal
            </button>
            <button
              type="button"
              onClick={() => setIsInternal(false)}
              className={cn(
                "text-xs px-2 py-1 rounded-md transition-colors",
                !isInternal
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              Customer
            </button>
          </div>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!noteText.trim() || submitting}
            className="gap-1.5"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add Note
          </Button>
        </div>
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No messages yet.
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const badge = TYPE_BADGE[msg.message_type] ?? TYPE_BADGE.comment;
            const isSystemLog = msg.message_type === "state_change" || msg.message_type === "system";

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 rounded-lg p-3 text-sm",
                  isSystemLog ? "bg-gray-50 border border-dashed border-border" : "bg-white border border-border"
                )}
              >
                {/* Avatar */}
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] bg-muted">
                    {msg.author_name ? getInitials(msg.author_name) : "SYS"}
                  </AvatarFallback>
                </Avatar>

                {/* Body */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-xs">
                      {msg.author_name ?? "System"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        badge.class
                      )}
                    >
                      {badge.label}
                    </span>
                    {!msg.is_internal && (
                      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700">
                        Customer
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(msg.created_at)}
                    </span>
                  </div>

                  {/* State change diff */}
                  {msg.message_type === "state_change" && msg.old_state && msg.new_state ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="line-through text-red-500">{msg.old_state}</span>
                      {" → "}
                      <span className="text-green-600 font-medium">{msg.new_state}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {msg.body}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
