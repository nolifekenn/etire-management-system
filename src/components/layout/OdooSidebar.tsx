"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { MODULES, ROLE_HIERARCHY } from "@/components/layout/OdooAppSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * OdooSidebar — the narrow 48px icon-only left sidebar.
 *
 * On desktop (md+): fixed, always visible.
 * On mobile (<md):  hidden by default; slides in as an overlay drawer
 *                   when `mobileOpen` is true (controlled by OdooTopNav).
 */

interface OdooSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function OdooSidebar({ mobileOpen = false, onMobileClose }: OdooSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const userLevel = ROLE_HIERARCHY[user?.role ?? "cashier"] ?? 10;

  const accessible = MODULES.filter(
    (m) => (ROLE_HIERARCHY[m.minRole] ?? 0) <= userLevel
  );

  const navLinks = (
    <nav className="flex flex-col items-center gap-1 w-full px-1 pt-2">
      {accessible.map((mod) => {
        const isActive =
          pathname === mod.href || pathname.startsWith(mod.href + "/");

        return (
          <Link
            key={mod.href}
            href={mod.href}
            aria-label={mod.label}
            title={mod.label}
            onClick={() => onMobileClose?.()}
            className={cn(
              "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              isActive
                ? cn(mod.color, "text-white shadow-sm")
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <mod.icon className="h-5 w-5 shrink-0" />

            {/* Floating label on hover (CSS-only) */}
            <span
              className="
                pointer-events-none absolute left-full ml-3
                whitespace-nowrap rounded-md bg-foreground px-2 py-1
                text-xs font-medium text-background shadow-md
                opacity-0 translate-x-1
                group-hover:opacity-100 group-hover:translate-x-0
                transition-all duration-150 z-50
              "
            >
              {mod.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ── Desktop sidebar (md and up) ─────────────────────────────── */}
      <aside
        aria-label="Module navigation"
        className="
          hidden md:flex
          fixed left-0 top-[52px] bottom-0 z-20
          w-[52px] flex-col items-center
          border-r border-border bg-white py-2
          overflow-y-auto overflow-x-hidden
          scrollbar-none
        "
      >
        {navLinks}
      </aside>

      {/* ── Mobile slide-in drawer (below md) ───────────────────────── */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200 md:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Drawer panel */}
      <aside
        aria-label="Module navigation"
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-white shadow-2xl transition-transform duration-250 ease-in-out md:hidden",
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex h-[52px] items-center justify-between border-b border-border px-4 bg-[#714B67]">
          <span className="text-sm font-semibold text-white">Navigation</span>
          <button
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Module links — full width with labels on mobile */}
        <nav className="flex flex-col gap-1 p-3 overflow-y-auto flex-1">
          {accessible.map((mod) => {
            const isActive =
              pathname === mod.href || pathname.startsWith(mod.href + "/");

            return (
              <Link
                key={mod.href}
                href={mod.href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? cn(mod.color, "text-white")
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <mod.icon className="h-5 w-5 shrink-0" />
                {mod.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
