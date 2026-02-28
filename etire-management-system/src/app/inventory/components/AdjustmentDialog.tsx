"use client";

/**
 * AdjustmentDialog — performs a manual inventory adjustment (cycle count / scrap)
 * for one product.
 */

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAdjustment } from "@/lib/actions/inventory";
import { validateLongText, validateNumber, type FieldError } from "@/lib/validation";

interface Props {
  open:           boolean;
  onOpenChange:   (o: boolean) => void;
  itemId:         string;
  currentQty:     number;
  branchId:       string;
  userId:         string;
  onAdjusted:     () => void;
}

type Reason = "cycle_count" | "scrap" | "correction" | "other";

const REASON_LABELS: Record<Reason, string> = {
  cycle_count: "Cycle Count",
  scrap:       "Scrap / Damaged",
  correction:  "Data Correction",
  other:       "Other",
};

export function AdjustmentDialog({
  open, onOpenChange, itemId, currentQty, branchId, userId, onAdjusted,
}: Props) {
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [reason,     setReason]     = useState<Reason>("cycle_count");
  const [counted,    setCounted]    = useState(String(currentQty));
  const [note,       setNote]       = useState("");

  // Validation
  const [noteError,    setNoteError]    = useState<FieldError>(null);
  const [countedError, setCountedError] = useState<FieldError>(null);

  const NOTE_MAX = 500;

  const handleNoteChange = (value: string) => {
    setNote(value);
    setNoteError(validateLongText(value, { label: "Note", maxLength: NOTE_MAX }));
  };

  const handleCountedChange = (value: string) => {
    setCounted(value);
    setCountedError(validateNumber(value, { label: "Counted quantity", required: true, min: 0, integer: true }));
  };

  const delta = Number(counted) - currentQty;

  const handleSubmit = async () => {
    const countedErr = validateNumber(counted, { label: "Counted quantity", required: true, min: 0, integer: true });
    const noteErr    = validateLongText(note, { label: "Note", maxLength: NOTE_MAX });
    setCountedError(countedErr);
    setNoteError(noteErr);
    if (countedErr || noteErr) return;

    const qty = Number(counted);

    setSubmitting(true);
    try {
      const result = await createAdjustment({
        branch_id: branchId,
        user_id:   userId,
        reason,
        note:      note || undefined,
        lines: [{ item_id: itemId, quantity_counted: qty, note: note || undefined }],
      });

      if (!result.success) throw new Error(result.error ?? "Adjustment failed");

      toast({ title: "Inventory adjusted successfully" });
      onAdjusted();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Adjustment failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inventory Adjustment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="text-muted-foreground">Current quantity on hand</p>
            <p className="text-xl font-bold text-foreground">{currentQty}</p>
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={v => setReason(v as Reason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(REASON_LABELS) as Reason[]).map(r => (
                  <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Counted Qty */}
          <div className="space-y-1">
            <Label htmlFor="adj-qty">Counted Quantity <span className="text-red-500">*</span></Label>
            <Input
              id="adj-qty"
              type="number"
              min="0"
              value={counted}
              onChange={e => handleCountedChange(e.target.value)}
              aria-invalid={!!countedError}
              aria-describedby={countedError ? "adj-qty-error" : undefined}
              className={countedError ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            {countedError ? (
              <p id="adj-qty-error" className="text-xs text-red-500 flex items-center gap-1">
                <span aria-hidden>⚠</span> {countedError}
              </p>
            ) : counted !== "" && (
              <p className={`text-xs font-medium ${
                delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground"
              }`}>
                Adjustment: {delta > 0 ? `+${delta}` : delta} units
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1">
            <Label htmlFor="adj-note">Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              id="adj-note"
              rows={2}
              value={note}
              onChange={e => handleNoteChange(e.target.value)}
              placeholder="Reason for adjustment…"
              maxLength={NOTE_MAX + 10} /* allow a little over so error triggers */
              aria-invalid={!!noteError}
              aria-describedby={noteError ? "adj-note-error" : undefined}
              className={noteError ? "border-red-400 focus-visible:ring-red-300" : ""}
            />
            <div className="flex items-center justify-between">
              {noteError ? (
                <p id="adj-note-error" className="text-xs text-red-500 flex items-center gap-1">
                  <span aria-hidden>⚠</span> {noteError}
                </p>
              ) : (
                <span />
              )}
              <p className={`text-xs ${
                note.length > NOTE_MAX ? "text-red-500 font-medium" :
                note.length > NOTE_MAX * 0.85 ? "text-amber-500" :
                "text-muted-foreground"
              }`}>
                {note.length}/{NOTE_MAX}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={submitting || delta === 0}
            className="bg-[#714B67] hover:bg-[#5a3c53] text-white"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
