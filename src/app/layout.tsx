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
import { UserRole } from '@/lib/types';
import './globals.css';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  // Enable real-time notification toasts
  useNotificationListener();

  const isPublicRoute = (path: string) => path === '/login' || path === '/guest-access';

  const canAccessPath = (role: UserRole, path: string) => {
    if (role === 'super_admin') return true;

    const allowedPrefixesByRole: Record<UserRole, string[]> = {
      super_admin: ['/'],
      branch_manager: [
        '/',
        '/dashboard',
        '/inventory',
        '/pos',
        '/services',
        '/customers',
        '/purchasing',
        '/reports',
        '/branches',
        '/backup',
        '/settings',
        '/admin',
        '/sales',
        '/receipt',
      ],
      staff: [
        '/',
        '/dashboard',
        '/inventory',
        '/pos',
        '/services',
        '/customers',
        '/purchasing',
        '/receipt',
      ],
      cashier: [
        '/',
        '/dashboard',
        '/pos',
        '/customers',
        '/receipt',
      ],
      mechanic: [
        '/',
        '/dashboard',
        '/services',
        '/receipt',
      ],
    };

    const allowedPrefixes = allowedPrefixesByRole[role] ?? [];
    return allowedPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
  };

  // Auto-logout on inactivity (30 min) and max session age (24 hours)
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_MS = 30 * 60 * 1000;
    const MAX_SESSION_MS = 24 * 60 * 60 * 1000;
    const sessionUserKey = 'etire_session_user_id';
    const sessionStartKey = 'etire_session_started_at';
    const lastActivityKey = 'etire_last_activity';

    const now = Date.now();
    const storedUserId = localStorage.getItem(sessionUserKey);
    if (!storedUserId || storedUserId !== user.user_id) {
      localStorage.setItem(sessionUserKey, user.user_id);
      localStorage.setItem(sessionStartKey, String(now));
      localStorage.setItem(lastActivityKey, String(now));
    } else {
      if (!localStorage.getItem(sessionStartKey)) {
        localStorage.setItem(sessionStartKey, String(now));
      }
      if (!localStorage.getItem(lastActivityKey)) {
        localStorage.setItem(lastActivityKey, String(now));
      }
    }

    let checkInterval: NodeJS.Timeout;

    const resetTimer = () => {
      localStorage.setItem(lastActivityKey, String(Date.now()));
    };

    const checkExpiry = async () => {
      const startAt = Number(localStorage.getItem(sessionStartKey) || 0);
      const lastActivity = Number(localStorage.getItem(lastActivityKey) || 0);
      const current = Date.now();

      if (startAt && current - startAt >= MAX_SESSION_MS) {
        await logout();
        router.replace('/login');
        return;
      }

      if (lastActivity && current - lastActivity >= INACTIVITY_MS) {
        const confirmed = window.confirm("Your session has expired due to inactivity. Press OK to return to login.");
        if (confirmed) {
          await logout();
          router.replace('/login');
        } else {
          resetTimer();
        }
      }
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    resetTimer();

    checkInterval = setInterval(checkExpiry, 60 * 1000);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      clearInterval(checkInterval);
    };
  }, [user, router, logout]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Auth redirect logic
  useEffect(() => {
    if (!isHydrated || isLoading) return;

    if (!user && !isPublicRoute(pathname)) {
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

    if (user && !isPublicRoute(pathname)) {
      const allowed = canAccessPath(user.role, pathname);
      if (!allowed) {
        router.replace('/dashboard');
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

  if (!user && !isPublicRoute(pathname)) {
    return null; // Will redirect
  }

  if (user && !isPublicRoute(pathname) && !canAccessPath(user.role, pathname)) {
    return null; // Will redirect
  }

  // Public / auth routes — no shell
  if (isPublicRoute(pathname)) {
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
