"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Wrench,
  Settings,
  Shield,
  Building2,
  Package,
  Users,
  Database,
  BarChart,
  Grid3x3,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AppModule {
  href: string;
  label: string;
  icon: React.ElementType;
  color: string;       // Tailwind bg color class for the icon tile
  minRole: "super_admin" | "branch_manager" | "staff" | "cashier";
}

const MODULES: AppModule[] = [
  { href: "/dashboard",  label: "Dashboard",    icon: LayoutDashboard, color: "bg-blue-500",    minRole: "cashier" },
  { href: "/inventory",  label: "Inventory",    icon: Boxes,           color: "bg-emerald-500", minRole: "staff" },
  { href: "/pos",        label: "POS",          icon: ShoppingCart,    color: "bg-orange-500",  minRole: "cashier" },
  { href: "/services",   label: "Services",     icon: Wrench,          color: "bg-yellow-500",  minRole: "staff" },
  { href: "/purchasing", label: "Purchasing",   icon: Package,         color: "bg-purple-500",  minRole: "staff" },
  { href: "/customers",  label: "Customers",    icon: Users,           color: "bg-pink-500",    minRole: "staff" },
  { href: "/reports",    label: "Reports",      icon: BarChart,        color: "bg-teal-500",    minRole: "branch_manager" },
  { href: "/branches",   label: "Branches",     icon: Building2,       color: "bg-indigo-500",  minRole: "branch_manager" },
  { href: "/backup",     label: "Backup",       icon: Database,        color: "bg-slate-500",   minRole: "branch_manager" },
  { href: "/settings",   label: "Settings",     icon: Settings,        color: "bg-gray-500",    minRole: "branch_manager" },
  { href: "/admin",      label: "Admin",        icon: Shield,          color: "bg-red-500",     minRole: "super_admin" },
];

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  branch_manager: 50,
  staff: 20,
  cashier: 10,
};

export function OdooAppSwitcher() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const userLevel = ROLE_HIERARCHY[user?.role ?? "cashier"] ?? 10;

  const accessible = MODULES.filter(
    (m) => (ROLE_HIERARCHY[m.minRole] ?? 0) <= userLevel
  );

  return (
    <div className="relative">
      {/* 9-dot trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="App Switcher"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
          open
            ? "bg-white/20 text-white"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        )}
      >
        {open ? <X className="h-5 w-5" /> : <Grid3x3 className="h-5 w-5" />}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* App grid */}
          <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-white shadow-xl p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Applications
            </p>
            <div className="grid grid-cols-3 gap-2">
              {accessible.map((mod) => {
                const isActive = pathname.startsWith(mod.href);
                return (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-colors",
                      isActive
                        ? "bg-primary/10 ring-1 ring-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg text-white",
                        mod.color
                      )}
                    >
                      <mod.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-foreground">
                      {mod.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { MODULES, ROLE_HIERARCHY };
