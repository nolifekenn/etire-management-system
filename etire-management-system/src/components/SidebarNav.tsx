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
  TrendingUp,
  BarChart,
  DollarSign,
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
  { href: '/service-jobs', label: 'Service Jobs', icon: Wrench, requiredRole: 1 },
  { href: '/branches', label: 'Branches', icon: Building2, requiredRole: 1 },
  { href: '/purchasing', label: 'Purchasing', icon: Package, requiredRole: 1 },
  { href: '/customers', label: 'Customers', icon: Users, requiredRole: 1 },
  { href: '/notifications', label: 'Notifications', icon: Bell, requiredRole: 1 },
  { href: '/reports', label: 'Reports', icon: BarChart, requiredRole: 1 },
  { href: '/backup', label: 'Backup', icon: Database, requiredRole: 1 },
];

const adminNavItems = [
    { href: '/admin', label: 'Admin', icon: Shield, requiredRole: 2 }
]

// Add interface for user with branch_id
interface UserWithBranch {
  user_id: string;
  name: string;
  username: string;
  role: number;
  branch_id?: string;
}

export function SidebarNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [currentBranch, setCurrentBranch] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Updated color system with purple/blue focus
  const colors = {
    primary: {
      gradient: 'bg-gradient-to-r from-purple-500 to-blue-500',
      solid: 'bg-purple-600',
      hover: 'hover:bg-purple-700',
      text: 'text-white',
      border: 'border-purple-600'
    },
    secondary: {
      background: 'bg-transparent',
      hover: 'hover:bg-white/30',
      text: 'text-gray-700',
      border: 'border-white/30'
    },
    active: {
      background: 'bg-gradient-to-r from-purple-500 to-blue-500',
      text: 'text-white',
      icon: 'text-white',
      shadow: 'shadow-lg shadow-purple-200/50'
    },
    inactive: {
      background: 'bg-transparent',
      text: 'text-gray-700',
      icon: 'text-gray-600',
      hover: {
        background: 'hover:bg-white/30',
        text: 'hover:text-purple-600',
        icon: 'hover:text-purple-600'
      }
    }
  };

  // Icon color categories updated with purple/blue theme
  const iconCategories = {
    dashboard: { background: 'rgba(168, 85, 247, 0.1)', icon: '#a855f7' },
    inventory: { background: 'rgba(59, 130, 246, 0.1)', icon: '#3b82f6' },
    sales: { background: 'rgba(139, 92, 246, 0.1)', icon: '#8b5cf6' },
    service: { background: 'rgba(16, 185, 129, 0.1)', icon: '#10b981' },
    analytics: { background: 'rgba(99, 102, 241, 0.1)', icon: '#6366f1' },
    customers: { background: 'rgba(168, 85, 247, 0.1)', icon: '#a855f7' },
    branches: { background: 'rgba(59, 130, 246, 0.1)', icon: '#3b82f6' },
    notifications: { background: 'rgba(139, 92, 246, 0.1)', icon: '#8b5cf6' },
    admin: { background: 'rgba(99, 102, 241, 0.1)', icon: '#6366f1' }
  };

  // Micro-animations matching dashboard
  const microAnimations = {
    cardHover: "transition-all duration-350 ease-spring hover:translate-y-[-2px]",
    buttonHover: "transition-all duration-200 hover:scale-105 active:scale-95",
    iconHover: "transition-all duration-350 ease-spring group-hover:scale-110",
    linkHover: "transition-all duration-300 ease-in-out"
  };

  const springEasing = "cubic-bezier(0.34, 1.56, 0.64, 1)";

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
    window.dispatchEvent(new CustomEvent('sidebarCollapse', { 
      detail: { isCollapsed } 
    }));
  }, [isCollapsed]);

  // Fetch branches for admin branch switching - FIXED
  const fetchBranches = useCallback(async () => {
    if (!supabase || !user || user.role !== 3) return;
    
    const { data, error } = await supabase
      .from('branch')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching branches:', error);
    } else {
      setBranches(data || []);
      // FIX: Use type assertion for branch_id
      const userWithBranch = user as UserWithBranch;
      const userBranch = data?.find(b => b.branch_id === userWithBranch.branch_id);
      setCurrentBranch(userBranch || data?.[0] || null);
    }
  }, [user]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleBranchSwitch = async (branchId: string) => {
    if (!supabase || !user || user.role !== 3) return;
    
    const selectedBranch = branches.find(b => b.branch_id === branchId);
    if (selectedBranch) {
      setCurrentBranch(selectedBranch);
      localStorage.setItem('currentBranch', JSON.stringify(selectedBranch));
    }
  };

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  // Get icon color based on category
  const getIconColor = (itemLabel: string) => {
    const categoryMap: { [key: string]: string } = {
      'Dashboard': 'dashboard',
      'Inventory': 'inventory',
      'POS': 'sales',
      'Service Jobs': 'service',
      'Branches': 'branches',
      'Purchasing': 'inventory',
      'Customers': 'customers',
      'Notifications': 'notifications',
      'Reports': 'analytics',
      'Backup': 'analytics',
      'Admin': 'admin'
    };
    
    return iconCategories[categoryMap[itemLabel] as keyof typeof iconCategories] || iconCategories.dashboard;
  };

  return (
    <div
      className={`
        flex flex-col h-full
        bg-white/40 backdrop-blur-2xl text-gray-700
        shadow-xl shadow-purple-100/50 border-r border-white/30
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
        font-poppins
      `}
      style={{
        width: isCollapsed ? '5rem' : '16rem',
        minWidth: isCollapsed ? '5rem' : '16rem',
        maxWidth: isCollapsed ? '5rem' : '16rem',
      }}
    >
      {/* Enhanced Sidebar Header with glassmorphism */}
      <SidebarHeader className="p-6 bg-white/60 backdrop-blur-sm border-b border-white/30">
        <div className="flex items-center justify-between gap-3">
          {isCollapsed ? (
            <button 
              onClick={toggleSidebar}
              className="flex items-center justify-center w-full cursor-pointer hover:opacity-90 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-xl p-2"
              title="Expand sidebar"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
            </button>
          ) : (
            <>
              <button 
                onClick={toggleSidebar}
                className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-xl p-2 -ml-2"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
                  <LayoutDashboard className="h-7 w-7 text-white" />
                </div>
                <div className="flex flex-col text-left">
                  <h2 className="text-xl font-bold text-gray-800 tracking-tight">eTire Manager</h2>
                  <p className="text-sm text-gray-600 font-medium">Q.R T&V Shop</p>
                </div>
              </button>
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-white/30 rounded-xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
            </>
          )}
        </div>
        
        {/* Enhanced Branch Switcher for Admins */}
        {!isCollapsed && user && user.role === 3 && branches.length > 0 && (
          <div className="mt-6">
            <label className="text-sm font-semibold text-gray-700 mb-3 block">
              Current Branch
            </label>
            <Select 
              value={currentBranch?.branch_id || ''} 
              onValueChange={handleBranchSwitch}
            >
              <SelectTrigger className="w-full bg-white/60 backdrop-blur-md border border-white/30 text-gray-700 rounded-xl text-sm hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent className="bg-white/80 backdrop-blur-md border border-white/30 rounded-xl shadow-xl">
                {branches.map((branch) => (
                  <SelectItem 
                    key={branch.branch_id} 
                    value={branch.branch_id}
                    className="focus:bg-purple-50 focus:text-purple-700 rounded-lg"
                  >
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      {/* Enhanced Sidebar Content with glassmorphism */}
      <SidebarContent className="p-3 overflow-y-auto flex-1 bg-transparent">
        <SidebarMenu>
          {navItems.map((item) => {
            const hasAccess = user && user.role >= item.requiredRole;
            if (!hasAccess) return null;
            const active = pathname === item.href;
            const iconColor = getIconColor(item.label);
            
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={isCollapsed ? item.label : undefined}
                >
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 px-4 py-3 transition-all duration-300 text-sm rounded-xl
                      ${active 
                        ? `${colors.active.background} text-white font-semibold ${colors.active.shadow}` 
                        : 'bg-transparent text-gray-700 hover:bg-white/30 hover:text-purple-600 border border-transparent'
                      }
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                      ${microAnimations.cardHover}
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                    title={isCollapsed ? item.label : undefined}
                    style={{ transitionTimingFunction: springEasing }}
                  >
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        active 
                          ? 'bg-white/20' 
                          : 'bg-white/50 group-hover:bg-white/70'
                      } ${microAnimations.iconHover}`}
                      style={{ 
                        backgroundColor: active ? 'rgba(255,255,255,0.2)' : iconColor.background,
                        transitionTimingFunction: springEasing
                      }}
                    >
                      <item.icon 
                        className="w-5 h-5 flex-shrink-0"
                        style={{ 
                          color: active ? 'white' : iconColor.icon
                        }}
                      />
                    </div>
                    {!isCollapsed && (
                      <span className="font-medium tracking-wide">{item.label}</span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {/* Enhanced Admin Navigation */}
          {user && (user.role === 2 || user.role === 3) && (
            <SidebarMenuItem key="/admin">
              <SidebarMenuButton
                asChild
                isActive={pathname === '/admin'}
                tooltip={isCollapsed ? "Admin Panel" : undefined}
              >
                <Link
                  href="/admin"
                  className={`group flex items-center gap-3 px-4 py-3 transition-all duration-300 text-sm rounded-xl
                    ${pathname === '/admin' 
                      ? `${colors.active.background} text-white font-semibold ${colors.active.shadow}` 
                      : 'bg-transparent text-gray-700 hover:bg-white/30 hover:text-purple-600 border border-transparent'
                    }
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                    ${microAnimations.cardHover}
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? "Admin" : undefined}
                  style={{ transitionTimingFunction: springEasing }}
                >
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      pathname === '/admin' 
                        ? 'bg-white/20' 
                        : 'bg-white/50 group-hover:bg-white/70'
                    } ${microAnimations.iconHover}`}
                    style={{ 
                      backgroundColor: pathname === '/admin' ? 'rgba(255,255,255,0.2)' : iconCategories.admin.background,
                      transitionTimingFunction: springEasing
                    }}
                  >
                    <Shield 
                      className="w-5 h-5 flex-shrink-0"
                      style={{ 
                        color: pathname === '/admin' ? 'white' : iconCategories.admin.icon
                      }}
                    />
                  </div>
                  {!isCollapsed && (
                    <span className="font-medium tracking-wide">Admin</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      {/* Enhanced Sidebar Footer with glassmorphism */}
      <SidebarSeparator className="border-white/30" />
      <SidebarFooter className="p-4 flex flex-col gap-2 bg-white/40 backdrop-blur-sm border-t border-white/30">
        {!isCollapsed ? (
          <>
            {/* Enhanced User Profile */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30">
              <Avatar className="h-12 w-12 ring-2 ring-white/50 shadow-sm bg-white flex-shrink-0">
                <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" />
                <AvatarFallback className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 font-semibold">
                  {user?.name?.charAt(0) ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name ?? 'Loading...'}</p>
                <p className="text-xs text-gray-600 truncate">{user?.username ?? ''}</p>
                <p className="text-xs text-purple-600 font-medium mt-1">
                  {user?.role === 3 ? 'Administrator' : user?.role === 2 ? 'Manager' : 'Staff'}
                </p>
              </div>
            </div>

            {/* Enhanced Footer Buttons */}
            <Button 
              asChild 
              variant="ghost" 
              className="w-full justify-start hover:bg-white/30 hover:text-purple-600 text-gray-700 rounded-xl py-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              <Link href="/settings" className="group flex items-center gap-2 w-full">
                <Settings className="w-4 h-4 text-gray-600 group-hover:text-purple-600 transition-colors" /> 
                Settings
              </Link>
            </Button>
            <Button 
              asChild 
              variant="ghost" 
              className="w-full justify-start hover:bg-white/30 hover:text-purple-600 text-gray-700 rounded-xl py-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              <Link href="/support" className="group flex items-center gap-2 w-full">
                <LifeBuoy className="w-4 h-4 text-gray-600 group-hover:text-purple-600 transition-colors" /> 
                Support
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start hover:bg-white/30 hover:text-purple-600 text-gray-700 rounded-xl py-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50" 
              onClick={logout}
            >
              <LogOut className="w-4 h-4 text-gray-600 group-hover:text-purple-600 transition-colors mr-2" /> 
              Logout
            </Button>
          </>
        ) : (
          <>
            {/* Collapsed Footer */}
            <div className="flex justify-center w-full mb-2">
              <Avatar className="h-12 w-12 ring-2 ring-white/50 shadow-sm bg-gradient-to-r from-purple-100 to-blue-100">
                <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" />
                <AvatarFallback className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 font-semibold">
                  {user?.name?.charAt(0) ?? 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <Button 
              asChild 
              variant="ghost" 
              className="w-full justify-center hover:bg-white/30 rounded-xl p-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50" 
              title="Settings"
            >
              <Link href="/settings" className="group flex items-center justify-center w-full text-gray-700">
                <Settings className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="ghost" 
              className="w-full justify-center hover:bg-white/30 rounded-xl p-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50" 
              title="Support"
            >
              <Link href="/support" className="group flex items-center justify-center w-full text-gray-700">
                <LifeBuoy className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-center hover:bg-white/30 rounded-xl p-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50" 
              onClick={logout} 
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
            </Button>
          </>
        )}
      </SidebarFooter>
    </div>
  );
}