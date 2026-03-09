"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Wrench,
  Settings,
  LifeBuoy,
  Shield,
  LogOut,
  Building2,
  Package,
  Users,
  Database,
  BarChart,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserRole } from '@/lib/types';
import { ROLE_NAMES } from '@/hooks/useRoleAccess';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  'super_admin': 100,
  'branch_manager': 50,
  'staff': 20,
  'cashier': 10,
};

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 'cashier' as UserRole },
  { href: '/inventory', label: 'Inventory', icon: Boxes, minRole: 'staff' as UserRole },
  { href: '/pos', label: 'POS', icon: ShoppingCart, minRole: 'cashier' as UserRole },
  { href: '/services', label: 'Service Jobs', icon: Wrench, minRole: 'staff' as UserRole },
  { href: '/branches', label: 'Branches', icon: Building2, minRole: 'branch_manager' as UserRole },
  { href: '/purchasing', label: 'Purchasing', icon: Package, minRole: 'staff' as UserRole },
  { href: '/customers', label: 'Customers', icon: Users, minRole: 'staff' as UserRole },
  { href: '/reports', label: 'Reports', icon: BarChart, minRole: 'branch_manager' as UserRole },
  { href: '/backup', label: 'Backup', icon: Database, minRole: 'branch_manager' as UserRole },
];

interface SidebarNavProps {
  forceExpanded?: boolean;
}

export function SidebarNav({ forceExpanded = false }: SidebarNavProps) {
  const pathname = usePathname();
  const { user, logout, activeBranchId, setActiveBranchId } = useAuth();
  const [branches, setBranches] = useState<{ branch_id: string; name: string }[]>([]);
  const [isCollapsedState, setIsCollapsedState] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const isCollapsed = forceExpanded ? false : isCollapsedState;

  // RBAC Logic
  const checkAccess = (href: string, userRole: UserRole) => {
    if (!userRole) return false;
    if (userRole === 'super_admin') return true;
    if (userRole === 'branch_manager') return href !== '/admin';
    if (userRole === 'staff') {
      const allowed = ['/dashboard', '/inventory', '/pos', '/services', '/customers', '/purchasing'];
      return allowed.includes(href);
    }
    if (userRole === 'cashier') {
      const allowed = ['/dashboard', '/pos', '/customers'];
      return allowed.includes(href);
    }
    return false;
  };

  const hasMinRole = (userRole: UserRole, minRole: UserRole): boolean => {
    return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
  };

  // Load collapsed state
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsedState(savedState === 'true');
    }
  }, []);

  // Broadcast collapse state
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebarCollapse', { detail: { isCollapsed } }));
  }, [isCollapsed]);

  // Fetch branches for admin
  const fetchBranches = useCallback(async () => {
    if (!supabase || !user || user.role !== 'super_admin') return;

    const { data, error } = await supabase
      .from('branch')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (!error) {
      setBranches(data || []);
    }
  }, [user]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleBranchSwitch = (branchId: string) => {
    if (!supabase || !user || user.role !== 'super_admin') return;
    setActiveBranchId(branchId);
  };

  const toggleSidebar = () => {
    const newState = !isCollapsedState;
    setIsCollapsedState(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const handleLogout = () => {
    logout();
    setIsLogoutDialogOpen(false);
  };

  // Get user initials for avatar
  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div
        className={`
          flex flex-col h-full
          bg-white border-r border-border
          transition-all duration-200
          ${forceExpanded ? 'w-full' : (isCollapsed ? 'w-16' : 'w-60')}
        `}
      >
        {/* Header */}
        <SidebarHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {isCollapsed ? (
              <button
                onClick={toggleSidebar}
                className="w-full flex justify-center p-2 hover:bg-accent rounded-md transition-colors"
                title="Expand sidebar"
              >
                <Menu className="h-5 w-5 text-muted-foreground" />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                    <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">eTire System</h2>
                    <p className="text-xs text-muted-foreground">Management</p>
                  </div>
                </div>
                {!forceExpanded && (
                  <button
                    onClick={toggleSidebar}
                    className="p-1.5 hover:bg-accent rounded-md transition-colors"
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Branch Switcher */}
          {!isCollapsed && user?.role === 'super_admin' && branches.length > 0 && (
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Branch
              </label>
              <Select value={activeBranchId || ''} onValueChange={handleBranchSwitch}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.branch_id} value={branch.branch_id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="p-2 flex-1 overflow-y-auto">
          <SidebarMenu>
            {navItems.map((item) => {
              const hasAccess = user && hasMinRole(user.role, item.minRole);
              if (!hasAccess) return null;

              const isAllowed = user ? checkAccess(item.href, user.role) : false;
              const active = pathname === item.href;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={isCollapsed ? item.label : undefined}
                    className={!isAllowed ? 'opacity-50 pointer-events-none' : ''}
                  >
                    <Link
                      href={isAllowed ? item.href : '#'}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                        ${active
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-foreground hover:bg-accent'
                        }
                        ${isCollapsed ? 'justify-center' : ''}
                      `}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}

            {/* Admin Link */}
            {user && user.role === 'super_admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin'}
                  tooltip={isCollapsed ? 'Admin' : undefined}
                >
                  <Link
                    href="/admin"
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                      ${pathname === '/admin'
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-foreground hover:bg-accent'
                      }
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Shield className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span>Admin</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>

        {/* Footer */}
        <SidebarSeparator />
        <SidebarFooter className="p-2">
          {!isCollapsed ? (
            <>
              {/* User Profile */}
              <div className="flex items-center gap-3 p-2 rounded-md bg-accent/50 mb-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name ?? 'Loading...'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.role ? ROLE_NAMES[user.role] : 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Footer Links */}
              {user && ['super_admin', 'branch_manager'].includes(user.role) && (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start ${pathname === '/settings' ? 'bg-accent' : ''}`}
                  >
                    <Link href="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start ${pathname === '/support' ? 'bg-accent' : ''}`}
                  >
                    <Link href="/support" className="flex items-center gap-2">
                      <LifeBuoy className="h-4 w-4" />
                      <span>Support</span>
                    </Link>
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setIsLogoutDialogOpen(true)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <>
              {/* Collapsed Footer */}
              <div className="flex justify-center mb-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              {user && ['super_admin', 'branch_manager'].includes(user.role) && (
                <>
                  <Button asChild variant="ghost" size="icon" className="w-full" title="Settings">
                    <Link href="/settings">
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" className="w-full" title="Support">
                    <Link href="/support">
                      <LifeBuoy className="h-4 w-4" />
                    </Link>
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setIsLogoutDialogOpen(true)}
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </SidebarFooter>
      </div>

      {/* Logout Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 p-3 bg-accent rounded-md">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.username}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
