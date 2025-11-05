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
  User,
  Camera,
  Check,
  X,
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

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredRole: 1 },
  { href: '/inventory', label: 'Inventory', icon: Boxes, requiredRole: 1 },
  { href: '/pos', label: 'POS', icon: ShoppingCart, requiredRole: 1 },
  { href: '/services', label: 'Service Jobs', icon: Wrench, requiredRole: 1 },
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

// Avatar options with different gradient combinations
const avatarOptions = [
  { id: 1, gradient: 'from-purple-500 to-pink-500', emoji: '👑', name: 'Royal' },
  { id: 2, gradient: 'from-blue-500 to-cyan-500', emoji: '💎', name: 'Crystal' },
  { id: 3, gradient: 'from-green-500 to-emerald-500', emoji: '🌟', name: 'Emerald' },
  { id: 4, gradient: 'from-orange-500 to-red-500', emoji: '🔥', name: 'Flame' },
  { id: 5, gradient: 'from-indigo-500 to-purple-500', emoji: '🌌', name: 'Twilight' },
  { id: 6, gradient: 'from-teal-500 to-blue-500', emoji: '🌊', name: 'Ocean' },
];

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
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);
  const [isHovering, setIsHovering] = useState(false);

  // Original color system with purple/blue focus
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
      hover: 'hover:bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300'
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
        background: 'hover:bg-gray-100',
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
    
    // Load selected avatar from localStorage
    const savedAvatar = localStorage.getItem('selectedAvatar');
    if (savedAvatar) {
      setSelectedAvatar(JSON.parse(savedAvatar));
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

  const handleAvatarSelect = (avatar: typeof avatarOptions[0]) => {
    setSelectedAvatar(avatar);
    localStorage.setItem('selectedAvatar', JSON.stringify(avatar));
    setIsAvatarDialogOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsLogoutDialogOpen(false);
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
    <>
      <div
        className={`
          flex flex-col h-full
          bg-white text-gray-700
          shadow-xl shadow-purple-100/50 border-r border-gray-200
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
        {/* Enhanced Sidebar Header */}
        <SidebarHeader className="p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-3">
            {isCollapsed ? (
              <button 
                onClick={toggleSidebar}
                className="flex items-center justify-center w-full cursor-pointer hover:opacity-90 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-full p-2"
                title="Expand sidebar"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <LayoutDashboard className="h-6 w-6 text-white" />
                </div>
              </button>
            ) : (
              <>
                <button 
                  onClick={toggleSidebar}
                  className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-2xl p-2 -ml-2"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg border border-white/30">
                    <LayoutDashboard className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex flex-col text-left">
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">eTire Manager</h2>
                    <p className="text-sm text-gray-600 font-medium">Q.R T&V Shop</p>
                  </div>
                </button>
                <button
                  onClick={toggleSidebar}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
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
                <SelectTrigger className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-300 rounded-xl shadow-xl">
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

        {/* Enhanced Sidebar Content */}
        <SidebarContent className="p-3 overflow-y-auto flex-1 bg-white">
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
                          : 'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-purple-600 border border-transparent'
                        }
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                        ${microAnimations.cardHover}
                        ${isCollapsed ? 'justify-center' : ''}
                      `}
                      title={isCollapsed ? item.label : undefined}
                      style={{ transitionTimingFunction: springEasing }}
                    >
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                          active 
                            ? 'bg-white/20' 
                            : 'bg-gray-100 group-hover:bg-gray-200'
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
                        : 'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-purple-600 border border-transparent'
                      }
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                      ${microAnimations.cardHover}
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                    title={isCollapsed ? "Admin" : undefined}
                    style={{ transitionTimingFunction: springEasing }}
                  >
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        pathname === '/admin' 
                          ? 'bg-white/20' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
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

        {/* Enhanced Sidebar Footer */}
        <SidebarSeparator className="border-gray-200" />
        <SidebarFooter className="p-4 flex flex-col gap-2 bg-white border-t border-gray-200">
          {!isCollapsed ? (
            <>
              {/* Enhanced User Profile */}
              <div 
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-all duration-300 group"
                onClick={() => setIsAvatarDialogOpen(true)}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm bg-white flex-shrink-0">
                    <AvatarImage src="" alt="User Avatar" />
                    <AvatarFallback className={`bg-gradient-to-r ${selectedAvatar.gradient} text-white font-semibold`}>
                      {selectedAvatar.emoji}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Camera className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
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
                className={`w-full justify-start hover:bg-gray-100 hover:text-purple-600 text-gray-700 rounded-xl py-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                  pathname === '/settings' ? 'bg-purple-50 text-purple-700' : ''
                }`}
              >
                <Link href="/settings" className="group flex items-center gap-2 w-full">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-all duration-300">
                    <Settings className="w-4 h-4 text-gray-600 group-hover:text-purple-600 transition-colors" />
                  </div>
                  <span className="font-medium">Settings</span>
                </Link>
              </Button>
              <Button 
                asChild 
                variant="ghost" 
                className={`w-full justify-start hover:bg-gray-100 hover:text-purple-600 text-gray-700 rounded-xl py-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                  pathname === '/support' ? 'bg-purple-50 text-purple-700' : ''
                }`}
              >
                <Link href="/support" className="group flex items-center gap-2 w-full">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-all duration-300">
                    <LifeBuoy className="w-4 h-4 text-gray-600 group-hover:text-purple-600 transition-colors" />
                  </div>
                  <span className="font-medium">Support</span>
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start hover:bg-red-50 hover:text-red-600 text-gray-700 rounded-xl py-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50" 
                onClick={() => setIsLogoutDialogOpen(true)}
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-red-100 transition-all duration-300 mr-2">
                  <LogOut className="w-4 h-4 text-gray-600 group-hover:text-red-600 transition-colors" />
                </div>
                <span className="font-medium">Logout</span>
              </Button>
            </>
          ) : (
            <>
              {/* Collapsed Footer */}
              <div 
                className="flex justify-center w-full mb-2 cursor-pointer group"
                onClick={() => setIsAvatarDialogOpen(true)}
              >
                <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm bg-gradient-to-r from-purple-500 to-blue-500 group-hover:scale-110 transition-transform duration-300">
                  <AvatarImage src="" alt="User Avatar" />
                  <AvatarFallback className={`bg-gradient-to-r ${selectedAvatar.gradient} text-white font-semibold`}>
                    {selectedAvatar.emoji}
                  </AvatarFallback>
                </Avatar>
              </div>
              <Button 
                asChild 
                variant="ghost" 
                className={`w-full justify-center hover:bg-gray-100 rounded-xl p-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                  pathname === '/settings' ? 'bg-purple-50' : ''
                }`} 
                title="Settings"
              >
                <Link href="/settings" className="group flex items-center justify-center w-full text-gray-700 hover:text-purple-600">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-all duration-300">
                    <Settings className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
                  </div>
                </Link>
              </Button>
              <Button 
                asChild 
                variant="ghost" 
                className={`w-full justify-center hover:bg-gray-100 rounded-xl p-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                  pathname === '/support' ? 'bg-purple-50' : ''
                }`} 
                title="Support"
              >
                <Link href="/support" className="group flex items-center justify-center w-full text-gray-700 hover:text-purple-600">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-all duration-300">
                    <LifeBuoy className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
                  </div>
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-center hover:bg-red-50 rounded-xl p-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50" 
                onClick={() => setIsLogoutDialogOpen(true)} 
                title="Logout"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-red-100 transition-all duration-300">
                  <LogOut className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors" />
                </div>
              </Button>
            </>
          )}
        </SidebarFooter>
      </div>

      {/* Avatar Selection Dialog */}
      <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-300 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Choose Your Avatar</DialogTitle>
            <DialogDescription className="text-gray-600">
              Select an avatar style that represents you
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {avatarOptions.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleAvatarSelect(avatar)}
                className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                  selectedAvatar.id === avatar.id
                    ? 'border-purple-500 bg-purple-50 scale-105'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                } ${microAnimations.buttonHover}`}
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${avatar.gradient} flex items-center justify-center text-2xl mb-2 shadow-lg`}>
                  {avatar.emoji}
                </div>
                <span className="text-sm font-medium text-gray-700">{avatar.name}</span>
                {selectedAvatar.id === avatar.id && (
                  <Check className="w-5 h-5 text-green-500 absolute top-2 right-2" />
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsAvatarDialogOpen(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-300 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Confirm Logout</DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to logout from your account?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <Avatar className="h-12 w-12 ring-2 ring-white bg-gradient-to-r from-purple-500 to-blue-500">
              <AvatarFallback className={`bg-gradient-to-r ${selectedAvatar.gradient} text-white font-bold`}>
                {selectedAvatar.emoji}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-600">{user?.username}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              onClick={() => setIsLogoutDialogOpen(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white border border-red-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }

        .ease-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }

        .transform-gpu {
          transform: translateZ(0);
        }
      `}</style>
    </>
  );
}