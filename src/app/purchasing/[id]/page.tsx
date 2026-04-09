"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Truck, Package, ChevronRight,
  Lock, X, ShoppingCart, CheckCircle, Clock, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AuditTrailPanel } from "@/components/AuditTrailPanel";
import { getPOWithDetails, transitionPO } from "@/lib/actions/purchasing";
import { getPurchaseOrderSmartButtons } from "@/lib/smartButtons";
import type { POState } from "@/lib/poUtils";
import { PO_STATE_LABELS, getNextPOStates } from "@/lib/poUtils";
import { ValidateReceiptModal } from "@/app/purchasing/components/ValidateReceiptModal";
import { POLinesTab } from "@/app/purchasing/components/POLinesTab";
import { POOtherInfoTab } from "@/app/purchasing/components/POOtherInfoTab";

// ── Types ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

// ── State bar ──────────────────────────────────────────────────────────────

const STATE_SEQUENCE: POState[] = ["draft", "sent", "purchase", "locked"];

const STATE_ICON: Record<string, React.ReactNode> = {
  draft:     <Clock     className="h-3.5 w-3.5" />,
  sent:      <Send      className="h-3.5 w-3.5" />,
  purchase:  <CheckCircle className="h-3.5 w-3.5" />,
  locked:    <Lock      className="h-3.5 w-3.5" />,
  cancelled: <X        className="h-3.5 w-3.5" />,
};

function StatusBar({
  current,
  allowedNext,
  onTransition,
  transitioning,
}: {
  current: string;
  allowedNext: POState[];
  onTransition: (next: POState) => void;
  transitioning: boolean;
}) {
  const currentIdx = STATE_SEQUENCE.indexOf(current as POState);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STATE_SEQUENCE.map((s, i) => {
        const isActive  = s === current;
        const isPast    = i < currentIdx;
        const isNext    = allowedNext.includes(s);

        return (
          <div key={s} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <button
              onClick={() => isNext && !transitioning && onTransition(s)}
              disabled={!isNext || transitioning}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                isActive  ? "bg-purple-600 text-white shadow-sm" :
                isPast    ? "bg-gray-100 text-gray-400" :
                isNext    ? "bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 cursor-pointer" :
                            "bg-gray-50 text-gray-300 cursor-default",
              ].join(" ")}
            >
              {STATE_ICON[s]}
              {PO_STATE_LABELS[s]}
            </button>
          </div>
        );
      })}
      {current === "cancelled" && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-red-100 text-red-600">
          <X className="h-3.5 w-3.5" /> Cancelled
        </span>
      )}
    </div>
  );
}

// ── Smart button ───────────────────────────────────────────────────────────

function SmartButton({ label, value, color, onClick }: { label: string; value: string | number; color?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex flex-col items-center justify-center rounded-lg border px-4 py-2 min-w-[80px]",
        "hover:bg-accent/50 transition-colors text-center",
        color ?? "border-border bg-white",
      ].join(" ")}
    >
      <span className="text-base font-bold text-foreground">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function POFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: poId } = use(params);
  const router  = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [po, setPO]               = useState<AnyRecord | null>(null);
  const [smartBtns, setSmartBtns] = useState<{ label: string; value: string | number; href?: string; color?: string }[]>([]);
  const [loading, setLoading]     = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lines");

  // ── Load PO ──────────────────────────────────────────────────────────────

  const loadPO = useCallback(async () => {
    setLoading(true);
    try {
      const [poResult, btns] = await Promise.all([
        getPOWithDetails(poId),
        getPurchaseOrderSmartButtons(poId),
      ]);
      if (poResult.error || !poResult.data) {
        toast({ title: "Error", description: poResult.error ?? "PO not found.", variant: "destructive" });
        setPO(null);
      } else {
        setPO(poResult.data as AnyRecord);
      }
      setSmartBtns(btns);
    } catch {
      toast({ title: "Error", description: "Failed to load purchase order.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [poId, toast]);

  useEffect(() => { loadPO(); }, [loadPO]);

  // ── Transition ────────────────────────────────────────────────────────────

  const handleTransition = useCallback(async (nextState: POState) => {
    if (!user) return;
    setTransitioning(true);
    try {
      const result = await transitionPO(poId, nextState, (user as { user_id?: string }).user_id ?? "");
      if (result.error) {
        toast({ title: "Transition failed", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Status updated", description: `PO moved to ${PO_STATE_LABELS[nextState]}.` });
        await loadPO();
      }
    } finally {
      setTransitioning(false);
    }
  }, [user, poId, toast, loadPO]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const currentState  = String(po?.state ?? po?.status ?? "draft");
  const allowedNext   = getNextPOStates(currentState as POState);
  const supplier      = po?.supplier as { name?: string; phone?: string; email?: string } | null;
  const branch        = po?.branch   as { name?: string } | null;
  const lines         = (po?.lines ?? []) as AnyRecord[];
  const deliveries    = (po?.deliveries ?? []) as AnyRecord[];

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Package className="h-12 w-12 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">Purchase order not found.</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Breadcrumb / top header ──────────────────────────────────────── */}
      <div className="border-b border-border bg-white px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-10 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.push("/purchasing")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 min-w-0">
          <ShoppingCart className="h-4 w-4 text-purple-600 shrink-0" />
          <span className="text-xs text-muted-foreground">Purchasing</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="font-mono font-semibold text-purple-700 text-sm truncate">
            {String(po.po_number ?? poId)}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadPO} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Content scroll area ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

          {/* ── Status bar ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <StatusBar
                current={currentState}
                allowedNext={allowedNext}
                onTransition={handleTransition}
                transitioning={transitioning}
              />

              {/* Cancel / Retract button — only visible when cancellation is allowed */}
              {allowedNext.includes("cancelled" as POState) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 shrink-0"
                  disabled={transitioning}
                  onClick={() => {
                    if (window.confirm(`Cancel ${String(po.po_number ?? "this PO")}? This cannot be undone.`)) {
                      handleTransition("cancelled" as POState);
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                  Cancel RFQ
                </Button>
              )}
            </div>

            {/* PO headline */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {String(po.po_number ?? "Draft")}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {supplier?.name ?? "No vendor"} · {branch?.name ?? "No branch"}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-bold text-foreground">
                  ₱{Number(po.total_amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">{lines.length} line{lines.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          {/* ── Smart buttons ───────────────────────────────────────────── */}
          {smartBtns.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              {smartBtns.map((btn) => (
                <SmartButton
                  key={btn.label}
                  label={btn.label}
                  value={btn.value}
                  color={btn.color}
                  onClick={btn.href ? () => router.push(btn.href!) : undefined}
                />
              ))}
              {/* Receipts quick-action */}
              {currentState === "purchase" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => setReceiptOpen(true)}
                >
                  <Truck className="h-4 w-4" />
                  Validate Receipt
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* ── Tabs + Chatter ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main tabs */}
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-9 w-full justify-start overflow-x-auto">
                  <TabsTrigger value="lines"      className="text-xs px-4">Products</TabsTrigger>
                  <TabsTrigger value="other-info" className="text-xs px-4">Other Info</TabsTrigger>
                </TabsList>

                <TabsContent value="lines" className="mt-4">
                  <POLinesTab po={po} onRefresh={loadPO} />
                </TabsContent>

                <TabsContent value="other-info" className="mt-4">
                  <POOtherInfoTab po={po} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Chatter panel */}
            <div className="lg:col-span-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Activity</p>
              <AuditTrailPanel relatedTable="purchase_order" relatedRecordId={poId} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Receipt modal ────────────────────────────────────────────────── */}
      <ValidateReceiptModal
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        po={po}
        deliveries={deliveries}
        userId={(user as { user_id?: string })?.user_id ?? ""}
        onValidated={() => { setReceiptOpen(false); loadPO(); }}
      />
    </div>
  );
}
