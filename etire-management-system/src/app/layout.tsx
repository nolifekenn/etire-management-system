"use client";

import React, { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { AuthProvider } from '@/hooks/useAuth';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { OdooTopNav } from '@/components/layout/OdooTopNav';
import { OdooSidebar } from '@/components/layout/OdooSidebar';
import './globals.css';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  // Enable real-time notification toasts
  useNotificationListener();

  // Auto-logout on inactivity (30 min)
  useEffect(() => {
    if (!user) return;

    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const confirmed = window.confirm("Your session has expired. Press OK to return to login.");
        if (confirmed) {
          await fetch("/api/logout");
          router.replace("/login");
        }
      }, 30 * 60 * 1000);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      clearTimeout(timeout);
    };
  }, [user, router]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Auth redirect logic
  useEffect(() => {
    if (!isHydrated || isLoading) return;

    if (!user && pathname !== '/login') {
      router.push('/login');
      return;
    }

    if (user && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [user, isLoading, pathname, router, isHydrated]);

  // Show spinner during hydration / auth loading
  if (!isHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return null; // Will redirect
  }

  // Public / auth routes — no shell
  if (pathname === '/login' || pathname === '/guest-access') {
    return <>{children}</>;
  }

  // ── Odoo 19 Shell ──────────────────────────────────────────────────────────
  // Layout:
  //
  //  ┌──────────── Top Nav (52px, fixed) ───────────────────────────────┐
  //  ├──────┬──────────────────────────────────────────────────────────┤
  //  │ Icon │                                                            │
  //  │ Side │            Main Content Area                              │
  //  │ bar  │         (scrollable, fills remaining space)               │
  //  │ 52px │                                                            │
  //  └──────┴──────────────────────────────────────────────────────────┘
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f5f5]">
      {/* Fixed top navigation bar */}
      <OdooTopNav />

      {/* Fixed left icon sidebar */}
      <OdooSidebar />

      {/* Main scrollable content — offset for fixed top nav + left sidebar */}
      <main
        className="
          absolute inset-0
          top-[52px] left-[52px]
          overflow-x-hidden overflow-y-auto
          bg-[#f5f5f5]
        "
      >
        {children}
      </main>
    </div>
  );
}



export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <GlobalErrorBoundary>
          <AuthProvider>
            <AuthWrapper>
              {children}
            </AuthWrapper>
            <Toaster />
          </AuthProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}