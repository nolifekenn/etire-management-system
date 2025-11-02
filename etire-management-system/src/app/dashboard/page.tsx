"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart, Blocks, DollarSign, AlertTriangle, Users, Wrench, Loader2, Bell, 
  Building2, Package, Car, TrendingUp, FileText, Download, ArrowUpRight, 
  Calendar, Clock, RefreshCw, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  total_sales: number;
  total_items: number;
  total_customers: number;
  pending_jobs: number;
  total_branches: number;
  total_suppliers: number;
  total_vehicles: number;
  unread_notifications: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    total_sales: 0,
    total_items: 0,
    total_customers: 0,
    pending_jobs: 0,
    total_branches: 0,
    total_suppliers: 0,
    total_vehicles: 0,
    unread_notifications: 0,
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showSecondaryStats, setShowSecondaryStats] = useState(false);

  // ===== IMPROVEMENTS: Style Systems =====
  const buttonStyles = {
    primary: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-green-600",
    secondary: "bg-white border border-slate-300 hover:border-green-500 hover:text-green-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors",
    glass: "bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
  };

  const microAnimations = {
    cardHover: "transition-all duration-300 hover:scale-105 hover:shadow-lg",
    buttonHover: "transition-all duration-200 hover:scale-105 active:scale-95",
    fadeIn: "animate-in fade-in duration-500"
  };

  const accessibleColors = {
    primary: "#1e293b",
    secondary: "#475569",
    muted: "#64748b",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626"
  };

  // Enhanced color palette with better contrast
  const cardColors = {
    sales: { 
      background: '#dcfce7',
      hover: '#bbf7d0',
      icon: '#15803d',
      text: '#15803d',
      glow: 'rgba(21, 128, 61, 0.2)'
    },
    inventory: { 
      background: '#ccfbf1',
      hover: '#99f6e4',
      icon: '#0f766e',
      text: '#0f766e',
      glow: 'rgba(15, 118, 110, 0.2)'
    },
    customers: { 
      background: '#cffafe',
      hover: '#a5f3fc',
      icon: '#0e7490',
      text: '#0e7490',
      glow: 'rgba(14, 116, 144, 0.2)'
    },
    jobs: { 
      background: '#dbeafe',
      hover: '#bfdbfe',
      icon: '#1d4ed8',
      text: '#1d4ed8',
      glow: 'rgba(29, 78, 216, 0.2)'
    },
    branches: { 
      background: '#dcfce7',
      hover: '#bbf7d0',
      icon: '#15803d',
      text: '#15803d',
      glow: 'rgba(21, 128, 61, 0.2)'
    },
    suppliers: { 
      background: '#ccfbf1',
      hover: '#99f6e4',
      icon: '#0f766e',
      text: '#0f766e',
      glow: 'rgba(15, 118, 110, 0.2)'
    },
    vehicles: { 
      background: '#cffafe',
      hover: '#a5f3fc',
      icon: '#0e7490',
      text: '#0e7490',
      glow: 'rgba(14, 116, 144, 0.2)'
    },
    notifications: { 
      background: '#dbeafe',
      hover: '#bfdbfe',
      icon: '#1d4ed8',
      text: '#1d4ed8',
      glow: 'rgba(29, 78, 216, 0.2)'
    }
  };

  // Icon color system - standardized
const iconCategories = {
  financial: { background: 'rgba(16, 185, 129, 0.1)', icon: '#10b981' },
  inventory: { background: 'rgba(6, 182, 212, 0.1)', icon: '#06b6d4' },
  analytics: { background: 'rgba(99, 102, 241, 0.1)', icon: '#6366f1' },
  service: { background: 'rgba(139, 92, 246, 0.1)', icon: '#8b5cf6' },
  customers: { background: 'rgba(59, 130, 246, 0.1)', icon: '#3b82f6' },
  branches: { background: 'rgba(16, 185, 129, 0.1)', icon: '#10b981' },
  suppliers: { background: 'rgba(6, 182, 212, 0.1)', icon: '#06b6d4' },
  vehicles: { background: 'rgba(59, 130, 246, 0.1)', icon: '#3b82f6' },
  notifications: { background: 'rgba(139, 92, 246, 0.1)', icon: '#8b5cf6' }
};

  // ===== IMPROVEMENTS: Enhanced Components =====
  const MetricSkeleton = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
            <div className="w-5 h-5 bg-slate-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-7 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-3 bg-slate-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const EmptyState = ({ icon: Icon, title, description, action, metricValue }: { 
    icon: any, 
    title: string, 
    description: string, 
    action?: string,
    metricValue?: string | number
  }) => (
    <div className={`text-center py-12 px-6 rounded-xl bg-slate-50/80 border-2 border-dashed border-slate-300 ${metricValue === 0 || metricValue === '0' || metricValue === '₱0' ? 'animate-pulse' : ''}`}>
      <Icon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-500 mb-4 max-w-sm mx-auto leading-relaxed">{description}</p>
      {action && (
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          {action}
        </Button>
      )}
    </div>
  );

  // Quick actions for Hick's Law
const quickActions = [
  { 
    label: "Create Sale", 
    icon: Plus, 
    href: "/pos", 
    description: "Point of Sale",
    category: "financial"
  },
  { 
    label: "Manage Inventory", 
    icon: Package, 
    href: "/inventory", 
    description: "Stock items",
    category: "inventory"
  },
  { 
    label: "View Reports", 
    icon: FileText, 
    href: "/reports", 
    description: "Analytics",
    category: "analytics"
  },
  { 
    label: "Service Jobs", 
    icon: Wrench, 
    href: "/service-jobs", 
    description: "Manage jobs",
    category: "service"
  }
];

const primaryStats = [
  { id: 'sales', title: "Total Sales", value: `₱${stats.total_sales.toLocaleString()}`, icon: DollarSign, desc: "Last 7 days", category: "financial" },
  { id: 'inventory', title: "Inventory Items", value: stats.total_items.toLocaleString(), icon: Blocks, desc: "In stock", category: "inventory" },
  { id: 'customers', title: "Customers", value: stats.total_customers.toLocaleString(), icon: Users, desc: "Registered", category: "customers" },
  { id: 'jobs', title: "Pending Jobs", value: stats.pending_jobs.toLocaleString(), icon: Wrench, desc: "Needs attention", category: "service" }
];

const secondaryStats = [
  { id: 'branches', title: "Active Branches", value: stats.total_branches.toLocaleString(), icon: Building2, category: "branches" },
  { id: 'suppliers', title: "Suppliers", value: stats.total_suppliers.toLocaleString(), icon: Package, category: "suppliers" },
  { id: 'vehicles', title: "Vehicles", value: stats.total_vehicles.toLocaleString(), icon: Car, category: "vehicles" },
  { id: 'notifications', title: "Notifications", value: stats.unread_notifications.toLocaleString(), icon: Bell, category: "notifications" }
];

  // Card click handlers for better user flow
  const handleCardClick = (cardId: string) => {
    const routes: { [key: string]: string } = {
      sales: '/reports/sales',
      inventory: '/inventory',
      customers: '/customers',
      jobs: '/service-jobs',
      branches: '/branches',
      suppliers: '/suppliers',
      vehicles: '/vehicles',
      notifications: '/notifications'
    };
    if (routes[cardId]) {
      router.push(routes[cardId]);
    }
  };

  // Keyboard navigation for accessibility
  const handleCardKeyPress = (event: React.KeyboardEvent, cardId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick(cardId);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // ===== ORIGINAL BACKEND LOGIC - 100% PRESERVED =====
  const fetchDashboardData = useCallback(async () => {
    if (!supabase) {
      setError("Supabase client not available. Check credentials.");
      setIsLoading(false);
      return;
    }

    if (!user?.user_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Get sales data for the last 7 days
      const { data: recentSales, error: salesError } = await supabase
        .from('sale')
        .select('sale_date, total_amount')
        .gte('sale_date', sevenDaysAgo.toISOString())
        .order('sale_date', { ascending: false });

      if (salesError) throw new Error(`Could not fetch sales data: ${salesError.message}`);

      // Get inventory count
      const { count: itemCount, error: itemError } = await supabase
        .from('inventory_item')
        .select('*', { count: 'exact', head: true });
      if (itemError) throw new Error(`Could not count inventory: ${itemError.message}`);

      // Get user count
      const { count: userCount, error: userError } = await supabase
        .from('user')
        .select('*', { count: 'exact', head: true });
      if (userError) throw new Error(`Could not count users: ${userError.message}`);

      // Get pending service jobs count
      const { count: jobCount, error: jobError } = await supabase
        .from('service_job')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (jobError) throw new Error(`Could not count service jobs: ${jobError.message}`);

      // Get additional stats
      const [branchesRes, suppliersRes, customersRes, vehiclesRes, notificationsRes] = await Promise.all([
        supabase.from('branch').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('supplier').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('customer').select('*', { count: 'exact', head: true }),
        supabase.from('vehicle').select('*', { count: 'exact', head: true }),
        supabase.from('notification').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).eq('is_read', false)
      ]);

      // Calculate total sales from recent sales data
      const totalSales = recentSales?.reduce((acc: number, sale: any) => acc + sale.total_amount, 0) || 0;

      setStats({
        total_sales: totalSales,
        total_items: itemCount ?? 0,
        total_customers: customersRes.count ?? 0,
        pending_jobs: jobCount ?? 0,
        total_branches: branchesRes.count ?? 0,
        total_suppliers: suppliersRes.count ?? 0,
        total_vehicles: vehiclesRes.count ?? 0,
        unread_notifications: notificationsRes.count ?? 0,
      });

      // Fetch recent notifications
      const { data: notificationsData } = await supabase
        .from('notification')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setNotifications(notificationsData || []);

      // Fetch low stock items
      const { data: lowStockData } = await supabase
        .from('inventory_item')
        .select('*')
        .lte('stock_quantity', 10)
        .order('stock_quantity', { ascending: true })
        .limit(10);
      
      setLowStockItems(lowStockData || []);

      // Fetch recent sales for detailed view
      const { data: recentSalesData } = await supabase
        .from('sale_item')
        .select(`
          *,
          inventory_item (name, category),
          user (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setRecentSales(recentSalesData || []);

      // Group sales by date and format for chart
      const salesByDate = new Map();
      recentSales?.forEach((sale: any) => {
        const date = new Date(sale.sale_date).toDateString();
        salesByDate.set(date, (salesByDate.get(date) || 0) + sale.total_amount);
      });

      // Format data for chart - last 7 days
      const formattedSales = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toDateString();
        formattedSales.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: salesByDate.get(dateString) || 0
        });
      }
      setSalesData(formattedSales);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.user_id) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, user]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Focus styles for accessibility
  const focusStyles = "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

  return (
    <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">
      
      {/* TOP BACKGROUND SECTION */}
      <div className="absolute top-0 left-0 w-full h-80 rounded-b-[40px] overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 rounded-b-[40px] bg-cover bg-center"
          style={{ 
            backgroundImage: "url('/images/art2.png')",
            backgroundSize: "cover",
            backgroundPosition: "center center"
          }}
        ></div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-green-300/20 rounded-br-full"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-300/20 rounded-bl-full"></div>
        <div className="absolute bottom-10 left-20 w-16 h-16 bg-white/20 rounded-2xl rotate-45"></div>
        <div className="absolute bottom-16 right-24 w-12 h-12 bg-white/15 rounded-full"></div>
      </div>

      {/* BOTTOM BACKGROUND SECTION */}
      <div className="absolute top-80 left-0 w-full h-full bg-white">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-green-50/10 to-white"></div>
      </div>

      <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
        
        {/* PROFILE HEADER SECTION - IMPROVED */}
<div className={`mb-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
  <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
    {/* Enhanced dark overlay for better contrast */}
    <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>
    
    <div className="relative z-10 flex-1">
      <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl font-poppins tracking-tight">
        Welcome back, {user?.name ?? 'User'}
      </h1>
      <div className="flex items-center gap-6 text-white/90">
        <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium">
          <Calendar className="h-6 w-6 opacity-90" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        {/* REAL-TIME DATA INDICATORS */}
        <div className="flex items-center gap-4 text-lg">
          {lastUpdated && (
            <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
              <Clock className="w-5 h-5" />
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            Live data
          </div>
        </div>
      </div>
    </div>
    
    {/* Enhanced Refresh Button */}
    <Button 
      onClick={handleRefresh}
      disabled={isLoading}
      className="relative z-10 bg-white/40 backdrop-blur-lg border border-white/50 hover:bg-white/60 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
      aria-label="Refresh dashboard data"
    >
      <RefreshCw className={`h-6 w-6 mr-3 ${isLoading ? 'animate-spin' : ''}`} />
      Refresh Data
    </Button>
  </div>
</div>

        {/* QUICK ACTIONS SECTION - IMPROVED */}
<section className="mb-12" aria-labelledby="quick-actions-heading">
  <div className="flex items-center justify-between mb-8">
    <h2 id="quick-actions-heading" className="text-2xl font-bold text-slate-900 mb-0">Quick Actions</h2>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
    {quickActions.map((action, index) => (
      <div
        key={action.label}
        className={`transform transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{ transitionDelay: `${index * 150}ms` }}
      >
        <div 
          className="group bg-white border border-slate-200 rounded-xl p-6 transition-all duration-300 hover:border-indigo-300 hover:shadow-lg cursor-pointer h-full flex flex-col hover:scale-[1.02] hover:-translate-y-1"
          onClick={() => router.push(action.href)}
          onKeyPress={(e) => e.key === 'Enter' && router.push(action.href)}
          tabIndex={0}
          role="button"
          aria-label={`${action.label} - ${action.description}`}
        >
          {/* STANDARDIZED ICON CONTAINER - MODERN ROUNDED SQUARES */}
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 flex-shrink-0"
              style={{ backgroundColor: (iconCategories as any)[action.category]?.background || 'rgba(99, 102, 241, 0.1)' }}
            >
              <action.icon 
                className="w-6 h-6" 
                style={{ color: (iconCategories as any)[action.category]?.icon || '#6366f1' }}
              />
            </div>
          </div>
          
          {/* IMPROVED TEXT HIERARCHY */}
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors text-lg leading-tight mb-2">
              {action.label}
            </h3>
            
            <p className="text-sm text-slate-600 leading-relaxed flex-1 mb-4">
              {action.description}
            </p>
            
            {/* ENHANCED CTA INDICATOR */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 group-hover:border-indigo-100 transition-colors">
              <span className="text-xs font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
                Quick access
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
</section>

{/* Key Metrics Section - IMPROVED */}
<section className="mb-12" aria-labelledby="key-metrics-heading">
  <h2 id="key-metrics-heading" className="text-2xl font-bold text-slate-900 mb-8">Key Metrics</h2>
  
  {isLoading ? (
    <MetricSkeleton />
  ) : (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {primaryStats.map((stat, i) => (
        <div
          key={i}
          className="group bg-white border border-slate-200 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:border-indigo-200 cursor-pointer hover:scale-[1.02] hover:-translate-y-1"
          onClick={() => handleCardClick(stat.id)}
          onKeyPress={(e) => handleCardKeyPress(e, stat.id)}
          tabIndex={0}
          role="button"
          aria-label={`View ${stat.title} details. Current value: ${stat.value}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ backgroundColor: (iconCategories as any)[stat.category]?.background || 'rgba(99, 102, 241, 0.1)' }}
            >
              <stat.icon 
                className="w-6 h-6" 
                style={{ color: (iconCategories as any)[stat.category]?.icon || '#6366f1' }} 
              />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110" />
          </div>
          
          {/* IMPROVED TYPOGRAPHY HIERARCHY */}
          <div className="space-y-2">
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
            <p className="text-sm font-semibold text-slate-700">{stat.title}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {stat.desc}
            </p>
          </div>

          {/* EMPTY STATE MESSAGING */}
          {stat.value === '₱0' || stat.value === '0' ? (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 mb-2">No data yet</p>
              <button 
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(stat.id === 'sales' ? '/pos' : `/${stat.id}`);
                }}
              >
                Get started →
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )}
</section>

{/* Additional Metrics Section - IMPROVED */}
<section className="mb-12" aria-labelledby="additional-metrics-heading">
  <div className="flex items-center justify-between mb-8">
    <h2 id="additional-metrics-heading" className="text-2xl font-bold text-slate-900">Additional Metrics</h2>
    <Button
      onClick={() => setShowSecondaryStats(!showSecondaryStats)}
      variant="outline"
      className="flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
      aria-expanded={showSecondaryStats}
      aria-controls="secondary-stats-section"
    >
      {showSecondaryStats ? (
        <>
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
          Show Less
        </>
      ) : (
        <>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
          Show More
        </>
      )}
    </Button>
  </div>

  {showSecondaryStats && (
    <div id="secondary-stats-section" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {secondaryStats.map((stat, i) => (
        <div
          key={i}
          className="group bg-white border border-slate-200 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:border-indigo-200 cursor-pointer hover:scale-[1.02] hover:-translate-y-1"
          onClick={() => handleCardClick(stat.id)}
          onKeyPress={(e) => handleCardKeyPress(e, stat.id)}
          tabIndex={0}
          role="button"
          aria-label={`View ${stat.title} details. Current value: ${stat.value}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ backgroundColor: (iconCategories as any)[stat.category]?.background || 'rgba(99, 102, 241, 0.1)' }}
            >
              <stat.icon 
                className="w-6 h-6" 
                style={{ color: (iconCategories as any)[stat.category]?.icon || '#6366f1' }} 
              />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110" />
          </div>
          
          <div className="space-y-2">
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
            <p className="text-sm font-semibold text-slate-700">{stat.title}</p>
          </div>

          {/* Empty state for secondary metrics */}
          {stat.value === '0' ? (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600">No data available</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )}
</section>


        {/* Performance & Analytics Section - IMPROVED */}
        <section className="mb-8" aria-labelledby="performance-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="performance-heading" className="text-2xl font-bold text-slate-800">Performance & Analytics</h2>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <Clock className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </div>
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Sales Chart */}
            <Card 
              className="lg:col-span-2 bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl"
              role="region"
              aria-labelledby="sales-chart-title"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle id="sales-chart-title" className="flex items-center text-2xl font-bold text-slate-800">
                      <BarChart className="mr-3 h-6 w-6 text-green-600" aria-hidden="true" />
                      Sales Overview
                    </CardTitle>
                    <CardDescription className="mt-2 text-slate-600">
                      Performance over the last 7 days
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-80">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
                    <span className="sr-only">Loading sales chart</span>
                  </div>
                ) : salesData.length > 0 ? (
                  <div className="h-80 w-full" aria-label="Sales trend chart showing daily sales for the past week">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={cardColors.sales.icon} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={cardColors.sales.icon} stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b"
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#64748b"
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(value) => `₱${value.toLocaleString()}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            backdropFilter: "blur(12px)",
                            border: `1px solid ${cardColors.sales.background.split(' ')[2]}20`,
                            borderRadius: "12px",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                            color: "#1e293b"
                          }}
                          formatter={(value) => [`₱${value.toLocaleString()}`, 'Sales']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          stroke={cardColors.sales.icon}
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorSales)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState 
                    icon={BarChart}
                    title="No Sales Data"
                    description="Start making sales to see your performance analytics"
                    action="Create First Sale"
                  />
                )}
              </CardContent>
            </Card>

            {/* Low Stock Alerts - IMPROVED */}
            <Card 
              className="bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl"
              role="region"
              aria-labelledby="low-stock-title"
            >
              <CardHeader>
                <CardTitle id="low-stock-title" className="flex items-center text-lg font-bold text-slate-800">
                  <AlertTriangle className="mr-2 h-5 w-5 text-amber-600" aria-hidden="true" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription className="text-slate-600">
                  {lowStockItems.length} items need restocking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {lowStockItems.length > 0 ? lowStockItems.slice(0, 5).map((item) => (
                    <div 
                      key={item.item_id} 
                      className="p-4 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white hover:scale-105"
                      onClick={() => router.push('/inventory')}
                      onKeyPress={(e) => e.key === 'Enter' && router.push('/inventory')}
                      tabIndex={0}
                      role="button"
                      aria-label={`Low stock item: ${item.name}, only ${item.stock_quantity} units left`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-rose-600 transition-transform duration-300 group-hover:scale-110">{item.stock_quantity}</p>
                          <p className="text-xs text-slate-500">units left</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <EmptyState 
                      icon={Package}
                      title="All Items Stocked"
                      description="All your inventory items are well stocked!"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Recent Activity Section - IMPROVED */}
        <section aria-labelledby="recent-activity-heading">
          <h2 id="recent-activity-heading" className="text-2xl font-bold mb-6 text-slate-800">Recent Activity</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Sales */}
            <Card 
              className="bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl"
              role="region"
              aria-labelledby="recent-sales-title"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle id="recent-sales-title" className="flex items-center text-lg font-bold text-slate-800">
                      <TrendingUp className="mr-2 h-5 w-5 text-green-600" aria-hidden="true" />
                      Recent Sales
                    </CardTitle>
                    <CardDescription className="text-slate-600">Latest transactions</CardDescription>
                  </div>
                  <Button asChild size="sm" className={buttonStyles.secondary}>
                    <Link href="/pos">
                      View POS
                      <ArrowUpRight className="h-4 w-4 ml-1" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentSales.length > 0 ? recentSales.slice(0, 5).map((sale) => (
                    <div 
                      key={sale.sale_item_id} 
                      className="p-4 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white hover:scale-105"
                      onClick={() => router.push('/pos')}
                      onKeyPress={(e) => e.key === 'Enter' && router.push('/pos')}
                      tabIndex={0}
                      role="button"
                      aria-label={`Recent sale: ${sale.inventory_item?.name || 'Unknown Item'}, amount: ₱${((sale.quantity || 0) * (sale.price_at_sale || 0)).toLocaleString()}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                            {sale.inventory_item?.name || 'Unknown Item'}
                          </p>
                          <p className="text-sm text-slate-600 mt-1">
                            {sale.quantity} × ₱{sale.price_at_sale?.toLocaleString() || '0'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Sold by: {sale.user?.name || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600 transition-transform duration-300 group-hover:scale-110">
                            ₱{((sale.quantity || 0) * (sale.price_at_sale || 0)).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <EmptyState 
                      icon={TrendingUp}
                      title="No Recent Sales"
                      description="Your recent sales will appear here"
                      action="Create Sale"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card 
              className="bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl"
              role="region"
              aria-labelledby="notifications-title"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle id="notifications-title" className="flex items-center text-lg font-bold text-slate-800">
                      <Bell className="mr-2 h-5 w-5 text-blue-600" aria-hidden="true" />
                      Notifications
                    </CardTitle>
                    <CardDescription className="text-slate-600">Latest system alerts</CardDescription>
                  </div>
                  <Button asChild size="sm" className={buttonStyles.secondary}>
                    <Link href="/notifications">
                      View All
                      <ArrowUpRight className="h-4 w-4 ml-1" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? notifications.map((notification) => (
                    <div 
                      key={notification.notification_id} 
                      className="p-4 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white hover:scale-105"
                      onClick={() => router.push('/notifications')}
                      onKeyPress={(e) => e.key === 'Enter' && router.push('/notifications')}
                      tabIndex={0}
                      role="button"
                      aria-label={`Notification: ${notification.title}. ${notification.message}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {notification.type === 'success' && <div className="w-3 h-3 rounded-full shadow-lg bg-green-500 group-hover:scale-110 transition-transform" aria-hidden="true"></div>}
                          {notification.type === 'warning' && <div className="w-3 h-3 rounded-full shadow-lg bg-amber-500 group-hover:scale-110 transition-transform" aria-hidden="true"></div>}
                          {notification.type === 'error' && <div className="w-3 h-3 rounded-full shadow-lg bg-rose-500 group-hover:scale-110 transition-transform" aria-hidden="true"></div>}
                          {notification.type === 'info' && <div className="w-3 h-3 rounded-full shadow-lg bg-blue-500 group-hover:scale-110 transition-transform" aria-hidden="true"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">{notification.title}</p>
                            {!notification.is_read && (
                              <Badge variant="default" className="text-xs ml-2 bg-rose-500 group-hover:scale-110 transition-transform">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3 opacity-70" aria-hidden="true" />
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <EmptyState 
                      icon={Bell}
                      title="No Notifications"
                      description="You're all caught up with notifications"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="w-full bg-red-50 border-t border-red-200 py-4">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }

        /* Smooth transitions for background glow */
        .absolute.inset-0 {
          transition: all 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}