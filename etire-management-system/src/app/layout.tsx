"use client";

import React, { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/SidebarNav';
import { AuthProvider } from '@/hooks/useAuth';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, Menu, X } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import './globals.css';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Enable real-time notification toasts
  useNotificationListener();

  // Mark as hydrated after initial render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Debug log
  useEffect(() => {
    console.log("[AuthWrapper] State update:", { isLoading, hasUser: !!user, pathname, isHydrated });
  }, [isLoading, user, pathname, isHydrated]);

  useEffect(() => {
    // Don't redirect until hydrated and loading is complete
    if (!isHydrated || isLoading) {
      return;
    }

    if (!user && pathname !== '/login') {
      console.log("[AuthWrapper] Redirecting to /login");
      router.push('/login');
      return;
    }

    if (user) {
      // Handle role-based redirects
      if (user.role === 0 && pathname !== '/guest-access') {
        // Guest users should only see the guest access page
        router.push('/guest-access');
        return;
      }

      if (user.role !== 0 && pathname === '/guest-access') {
        // Non-guest users shouldn't see guest access page
        router.push('/dashboard');
        return;
      }
    }
  }, [user, isLoading, pathname, router, isHydrated]);

  useEffect(() => {
    // Listen for sidebar collapse events
    const handleSidebarCollapse = (event: CustomEvent) => {
      setIsCollapsed(event.detail.isCollapsed);
    };

    window.addEventListener('sidebarCollapse', handleSidebarCollapse as EventListener);

    // Load initial state from localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }

    return () => {
      window.removeEventListener('sidebarCollapse', handleSidebarCollapse as EventListener);
    };
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

  // Show loading during hydration or auth loading
  if (!isHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return null; // Will redirect to login
  }

  // Routes that don't need the sidebar
  if (pathname === '/login' || pathname === '/guest-access') {
    return <>{children}</>;
  }

  // Routes with sidebar
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-gray-50">
        {/* Mobile Header Bar */}
        <div className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">eTire Manager</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar - hidden on mobile by default, shown when isMobileSidebarOpen */}
        <div className={`
          fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
          <SidebarNav />
        </div>

        {/* Main Content - add top padding on mobile for header */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
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
        <AuthProvider>
          <AuthWrapper>
            {children}
          </AuthWrapper>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}