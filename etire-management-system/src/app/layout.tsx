"use client";

import React, { useEffect, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/SidebarNav';
import { AuthProvider } from '@/hooks/useAuth';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import './globals.css';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Enable real-time notification toasts
  useNotificationListener();

  // Debug log
  useEffect(() => {
    console.log("[AuthWrapper] State update:", { isLoading, hasUser: !!user, pathname });
  }, [isLoading, user, pathname]);

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
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
  }, [user, isLoading, pathname, router]);

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

  if (isLoading) {
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
        {/* Sidebar */}
        <SidebarNav />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
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