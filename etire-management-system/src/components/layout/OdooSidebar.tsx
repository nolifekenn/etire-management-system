"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES, ROLE_HIERARCHY } from "@/components/layout/OdooAppSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * OdooSidebar — the narrow 48px icon-only left sidebar.
 *
 * Mirrors Odoo 19's left application nav bar:
 *  - One icon per accessible module
 *  - Active module is highlighted
 *  - Hover shows a floating label tooltip
 *  - No text labels (icon only) to maximise content area
 */
export function OdooSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const userLevel = ROLE_HIERARCHY[user?.role ?? "cashier"] ?? 10;

  const accessible = MODULES.filter(
    (m) => (ROLE_HIERARCHY[m.minRole] ?? 0) <= userLevel
  );

  return (
    <aside
      aria-label="Module navigation"
      className="
        fixed left-0 top-[52px] bottom-0 z-20
        flex w-[52px] flex-col items-center
        border-r border-border bg-white py-2
        overflow-y-auto overflow-x-hidden
        scrollbar-none
      "
    >
      <nav className="flex flex-col items-center gap-1 w-full">
        {accessible.map((mod) => {
          const isActive =
            pathname === mod.href || pathname.startsWith(mod.href + "/");

          return (
            <Link
              key={mod.href}
              href={mod.href}
              aria-label={mod.label}
              title={mod.label}           /* native browser tooltip — no JS overhead */
              className={cn(
                "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? cn(mod.color, "text-white shadow-sm")
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <mod.icon className="h-5 w-5 shrink-0" />

              {/* Floating label on hover (CSS-only, no state) */}
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
    </aside>
  );
}
