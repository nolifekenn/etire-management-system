/* ────────────────────────────────────────────────────────────────────────────
 * src/app/error.tsx
 * Next.js App Router Global Error Boundary
 *
 * Triggered automatically by Next.js when an unhandled error occurs inside
 * any segment below the root layout. The `reset()` callback re-renders
 * that segment without a full page reload.
 *
 * Styled to match the existing eTire / Odoo-inspired UI kit:
 *   • shadcn/ui Card + Button
 *   • Tailwind utilities
 *   • Lucide icons
 * ──────────────────────────────────────────────────────────────────────────── */
"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle, RefreshCw, Home, ArrowLeft, Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Props ─────────────────────────────────────────────────────────────────────

interface ErrorPageProps {
  error:  Error & { digest?: string };
  reset: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GlobalError({ error, reset }: ErrorPageProps) {
  // Log to console (and any production error-tracking service you add later)
  useEffect(() => {
    console.error("[eTire Error Boundary]", error);
    // TODO: send to Sentry / Datadog / LogRocket:
    // captureException(error);
  }, [error]);

  // Friendly message mapping for common Next.js / server-action errors
  const friendlyMessage = (() => {
    const msg = error?.message?.toLowerCase() ?? "";
    if (msg.includes("fetch") || msg.includes("network"))
      return "A network request failed. Check your internet connection and try again.";
    if (msg.includes("supabase") || msg.includes("postgrest") || msg.includes("pgrst"))
      return "A database error occurred. Our team has been notified.";
    if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("jwt"))
      return "Your session has expired. Please log in again.";
    if (msg.includes("chunk") || msg.includes("hydrat"))
      return "The page failed to load correctly. Refreshing usually resolves this.";
    return "Something unexpected went wrong. Please try again or return to the Dashboard.";
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-4">

        {/* ── Odoo-style error card ─────────────────────────────────── */}
        <Card className="shadow-xl border-destructive/20">

          <CardHeader className="pb-4 text-center space-y-4">
            {/* Animated warning icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5 animate-in zoom-in duration-300">
              <AlertTriangle className="h-9 w-9 text-destructive" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">Oops — Something went wrong</h1>
              <p className="text-sm text-muted-foreground">{friendlyMessage}</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Error digest / ID (for support reference) */}
            {error.digest && (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Error reference</span>
                <Badge variant="outline" className="font-mono text-[11px] px-2">{error.digest}</Badge>
              </div>
            )}

            {/* Technical details — collapsed in production, visible in dev */}
            {process.env.NODE_ENV !== "production" && error.message && (
              <details className="rounded-md border border-destructive/20 bg-destructive/5 text-xs">
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 font-medium text-destructive select-none">
                  <Bug className="h-3.5 w-3.5" />
                  Technical details (dev only)
                </summary>
                <pre className="overflow-x-auto px-3 pb-3 pt-1 font-mono text-destructive/80 leading-relaxed whitespace-pre-wrap break-all">
                  {error.stack ?? error.message}
                </pre>
              </details>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2 sm:flex-row pt-2">
            {/* Primary: try again in the same segment */}
            <Button
              onClick={reset}
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>

            {/* Secondary: go back */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>

            {/* Tertiary: safe landing page */}
            <Button variant="ghost" className="w-full gap-2" asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* ── Support hint ───────────────────────────────────────────── */}
        <p className="text-center text-xs text-muted-foreground">
          If this keeps happening, contact your system administrator
          {error.digest && (
            <> and mention error code <span className="font-mono font-medium">{error.digest}</span></>
          )}.
        </p>

      </div>
    </div>
  );
}
