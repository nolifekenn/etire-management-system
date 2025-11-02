"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Wrench,
  FileText,
  Settings,
  LifeBuoy,
  Shield,
  LogOut,
  Building2,
  Package,
  Users,
  Bell,
  Database,
  ChevronLeft,
  ChevronRight,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredRole: 1 },
  { href: '/inventory', label: 'Inventory', icon: Boxes, requiredRole: 1 },
  { href: '/pos', label: 'POS', icon: ShoppingCart, requiredRole: 1 },
  { href: '/services', label: 'Service Mgt', icon: Wrench, requiredRole: 1 },
  { href: '/branches', label: 'Branches', icon: Building2, requiredRole: 1 },
  { href: '/purchasing', label: 'Purchasing', icon: Package, requiredRole: 1 },
  { href: '/customers', label: 'Customers', icon: Users, requiredRole: 1 },
  { href: '/notifications', label: 'Notifications', icon: Bell, requiredRole: 1 },
  { href: '/backup', label: 'Backup', icon: Database, requiredRole: 1 },
];

const adminNavItems = [
    { href: '/admin', label: 'Admin', icon: Shield, requiredRole: 2 }
]

export function SidebarNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [currentBranch, setCurrentBranch] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Debug logging
  console.log('SidebarNav - User:', user);
  console.log('SidebarNav - User role:', user?.role);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  // Broadcast collapse state changes to parent layout
  useEffect(() => {
    // Dispatch custom event when collapse state changes
    window.dispatchEvent(new CustomEvent('sidebarCollapse', { 
      detail: { isCollapsed } 
    }));
  }, [isCollapsed]);

  // Fetch branches for admin branch switching
  const fetchBranches = useCallback(async () => {
    if (!supabase || !user || user.role !== 3) return; // Only for admins
    
    const { data, error } = await supabase
      .from('branch')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching branches:', error);
    } else {
      setBranches(data || []);
      // Set current branch to user's assigned branch or first branch
      const userBranch = data?.find(b => b.branch_id === user.branch_id);
      setCurrentBranch(userBranch || data?.[0] || null);
    }
  }, [user]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleBranchSwitch = async (branchId: string) => {
    if (!supabase || !user || user.role !== 3) return; // Only for admins
    
    const selectedBranch = branches.find(b => b.branch_id === branchId);
    if (selectedBranch) {
      setCurrentBranch(selectedBranch);
      // Store current branch in localStorage for persistence
      localStorage.setItem('currentBranch', JSON.stringify(selectedBranch));
    }
  };

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  return (
    <div
      className={`
        flex flex-col h-full
        bg-white text-gray-700
        shadow-lg border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
      style={{
        width: isCollapsed ? '4rem' : '16rem',
        minWidth: isCollapsed ? '4rem' : '16rem',
        maxWidth: isCollapsed ? '4rem' : '16rem',
      }}
    >
      <SidebarHeader className="p-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between gap-3">
          {isCollapsed ? (
            <button 
              onClick={toggleSidebar}
              className="flex items-center justify-center w-full cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20 rounded-md p-2"
              title="Expand sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-red-600 flex-shrink-0">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2v-2zm0 4h2v6h-2v-6z"/>
              </svg>
            </button>
          ) : (
            <>
              <button 
                onClick={toggleSidebar}
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20 rounded-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-red-600 flex-shrink-0">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2v-2zm0 4h2v6h-2v-6z"/>
                </svg>
                <div className="flex flex-col">
                  <h2 className="text-lg font-semibold text-gray-900">eTire Manager</h2>
                  <p className="text-xs text-gray-600">Q.R T&V Shop</p>
                </div>
              </button>
              <button
                onClick={toggleSidebar}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
            </>
          )}
        </div>
        
        {/* Branch Switcher for Admins */}
        {!isCollapsed && user && user.role === 3 && branches.length > 0 && (
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-600 mb-2 block">
              Current Branch
            </label>
            <Select 
              value={currentBranch?.branch_id || ''} 
              onValueChange={handleBranchSwitch}
            >
              <SelectTrigger className="w-full bg-white border border-gray-200 rounded-md text-sm hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-50">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent className="bg-white">
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
      <SidebarContent className="p-2 overflow-y-auto flex-1 bg-white">
        <SidebarMenu>
          {navItems.map((item) => {
            const hasAccess = user && user.role >= item.requiredRole;
            if (!hasAccess) return null;
            const active = pathname === item.href;
            
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={isCollapsed ? item.label : undefined}
                >
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2 transition-colors text-sm rounded-md
                      ${active ? 'bg-[#991B1B] text-white font-medium' : 'bg-white text-gray-800 hover:bg-[#FEF2F2] hover:text-[#991B1B]'}
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#991B1B]/20
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-gray-500 group-hover:text-[#991B1B]'} transition-colors`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {/* Admin Navigation */}
          {user && (user.role === 2 || user.role === 3) && (
            <SidebarMenuItem key="/admin">
              <SidebarMenuButton
                asChild
                isActive={pathname === '/admin'}
                tooltip={isCollapsed ? "Admin Panel - Manage users and roles" : undefined}
              >
                <Link
                  href="/admin"
                  className={`group flex items-center gap-3 px-3 py-2 transition-colors text-sm rounded-md
                    ${pathname === '/admin' ? 'bg-[#991B1B] text-white font-medium' : 'bg-white text-gray-800 hover:bg-[#FEF2F2] hover:text-[#991B1B]'}
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#991B1B]/20
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? "Admin" : undefined}
                >
                  <Shield className={`w-5 h-5 flex-shrink-0 ${pathname === '/admin' ? 'text-white' : 'text-gray-500 group-hover:text-[#991B1B]'}`} />
                  {!isCollapsed && <span>Admin</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          
          {/* Debug info for development */}
          {!isCollapsed && process.env.NODE_ENV === 'development' && user && (
            <SidebarMenuItem key="debug">
              <div className="px-3 py-2 text-xs text-slate-400">
                Debug: Role {user.role} ({user.role === 3 ? 'Admin' : user.role === 2 ? 'Branch Manager' : user.role === 1 ? 'Staff' : 'Guest'})
              </div>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator className="border-gray-100" />
      <SidebarFooter className="p-4 flex flex-col gap-2 bg-white border-t border-gray-100">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-1 ring-gray-100 bg-white flex-shrink-0">
                <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="person avatar" />
                <AvatarFallback>{user?.name?.charAt(0) ?? 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name ?? 'Loading...'}</p>
                <p className="text-xs text-gray-600 truncate">{user?.username ?? ''}</p>
              </div>
            </div>
            <Button asChild variant="ghost" className="w-full justify-start hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20">
              <Link href="/settings" className="group flex items-center gap-2 w-full text-gray-700">
                <Settings className="mr-2 h-4 w-4 text-gray-500 group-hover:text-red-700" /> Settings
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20">
              <Link href="/support" className="group flex items-center gap-2 w-full text-gray-700">
                <LifeBuoy className="mr-2 h-4 w-4 text-gray-500 group-hover:text-red-700" /> Support
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4 text-gray-500 group-hover:text-red-700" /> Logout
            </Button>
          </>
        ) : (
          <>
            <div className="flex justify-center w-full">
              <Avatar className="h-10 w-10 ring-1 ring-gray-100 bg-white">
                <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="person avatar" />
                <AvatarFallback>{user?.name?.charAt(0) ?? 'U'}</AvatarFallback>
              </Avatar>
            </div>
            <Button asChild variant="ghost" className="w-full justify-center hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20 p-2" title="Settings">
              <Link href="/settings" className="group flex items-center justify-center w-full text-gray-700">
                <Settings className="h-4 w-4 text-gray-500 group-hover:text-red-700" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-center hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20 p-2" title="Support">
              <Link href="/support" className="group flex items-center justify-center w-full text-gray-700">
                <LifeBuoy className="h-4 w-4 text-gray-500 group-hover:text-red-700" />
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-center hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20 p-2" onClick={logout} title="Logout">
                <LogOut className="h-4 w-4 text-gray-500 group-hover:text-red-700" />
            </Button>
          </>
        )}
      </SidebarFooter>
    </div>
  );
}