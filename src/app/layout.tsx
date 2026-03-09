"use client";

import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { OdooTopNav } from '@/components/layout/OdooTopNav';
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
      // Save the current path in sessionStorage so we can return after login
      if (typeof window !== 'undefined') {
        const fullPath = pathname + window.location.search;
        sessionStorage.setItem('etire_intended_path', fullPath);
      }
      router.push('/login');
      return;
    }

    if (user && pathname === '/login') {
      // Restore the intended path if one was saved, otherwise role-based default
      const intended = typeof window !== 'undefined'
        ? sessionStorage.getItem('etire_intended_path')
        : null;
      if (intended && intended.startsWith('/') && !intended.startsWith('//')) {
        sessionStorage.removeItem('etire_intended_path');
        router.push(intended);
      } else {
        router.push('/dashboard');
      }
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
  //  ├──────────┬────────────────────────────────────────────────────── ┤
  //  │ Icon     │                                                        │
  //  │ Sidebar  │          Main Content Area                             │
  //  │ 52px     │       (scrollable, fills remaining space)              │
  //  │ (md+)    │                                                        │
  //  └──────────┴────────────────────────────────────────────────────── ┘
  //
  //  On mobile: sidebar is a slide-in drawer; main is full-width.
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f5f5]">
      {/* Fixed top navigation bar */}
      <OdooTopNav />

      {/* Main scrollable content — offset top by nav bar (52px) */}
      <main
        className="
          absolute inset-0
          top-[52px]
          left-0
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
      <head>
        {/* Proper viewport for mobile — enables responsive scaling + notch/safe-area insets */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
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