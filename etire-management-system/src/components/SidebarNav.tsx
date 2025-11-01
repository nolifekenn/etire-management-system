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

  // Debug logging
  console.log('SidebarNav - User:', user);
  console.log('SidebarNav - User role:', user?.role);

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

  return (
    <div
      className="
        flex flex-col h-full min-h-0
        bg-white text-gray-700
        shadow-sm border border-gray-300 rounded-md
        transition-colors
      "
    >
      <SidebarHeader className="p-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-red-600">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2v-2zm0 4h2v6h-2v-6z"/>
          </svg>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900">eTire Manager</h2>
            <p className="text-xs text-gray-600">Q.R T&V Shop</p>
          </div>
        </div>
        
        {/* Branch Switcher for Admins */}
        {user && user.role === 3 && branches.length > 0 && (
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
                  tooltip={item.label}
                >
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2 transition-colors text-sm
                      ${active ? 'bg-[#991B1B] text-white font-medium' : 'bg-white text-gray-800 hover:bg-[#FEF2F2] hover:text-[#991B1B]'}
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#991B1B]/20
                    `}
                  >
                    <item.icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500 group-hover:text-[#991B1B]'} transition-colors`} />
                    <span>{item.label}</span>
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
                tooltip="Admin Panel - Manage users and roles"
              >
                <Link
                  href="/admin"
                  className={`group flex items-center gap-3 px-3 py-2 transition-colors text-sm 
                    ${pathname === '/admin' ? 'bg-[#991B1B] text-white font-medium' : 'bg-white text-gray-800 hover:bg-[#FEF2F2] hover:text-[#991B1B]'}
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#991B1B]/20
                  `}
                >
                  <Shield className={`w-5 h-5 ${pathname === '/admin' ? 'text-white' : 'text-gray-500 group-hover:text-[#991B1B]'}`} />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          
          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && user && (
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
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-1 ring-gray-100 bg-white">
            <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="person avatar" />
            <AvatarFallback>{user?.name?.charAt(0) ?? 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-900">{user?.name ?? 'Loading...'}</p>
            <p className="text-xs text-gray-600">{user?.username ?? ''}</p>
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
      </SidebarFooter>
    </div>
  );
}
