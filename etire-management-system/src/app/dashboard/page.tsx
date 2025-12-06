"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart, Blocks, DollarSign, AlertTriangle, Users, Wrench, Loader2, Bell,
  Building2, Package, Car, TrendingUp, FileText, Download, ArrowUpRight,
  Calendar, Clock, RefreshCw, Plus, ChevronDown, ChevronUp, TrendingDown,
  BarChart3, ShoppingBag, Star
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area, ReferenceLine, BarChart as RechartsBarChart, Bar, Cell } from 'recharts';
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
  low_stock_count?: number;
}

interface SalesDataPoint {
  date: string;
  sales: number;
  average: number;
  trend: 'up' | 'down';
}

interface RecentSale {
  sale_item_id: string;
  quantity: number;
  price_at_sale: number;
  created_at: string;
  item_name: string;
  item_category: string;
  user_name: string;
  total_amount: number;
}

interface LowStockItem {
  item_id: string;
  name: string;
  category: string;
  stock_quantity: number;
  reorder_level: number;
}

interface TopSellingItem {
  item_id?: string;
  name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
  average_price: number;
  sales_count: number;
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
    low_stock_count: 0,
  });
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showSecondaryStats, setShowSecondaryStats] = useState(false);

  // Calculate top selling items from recent sales data
  const topSellingItems = useMemo(() => {
    if (!recentSales || recentSales.length === 0) return [];
    
    const itemMap = new Map<string, TopSellingItem>();
    
    recentSales.forEach(sale => {
      const existing = itemMap.get(sale.item_name);
      if (existing) {
        existing.total_quantity += sale.quantity;
        existing.total_revenue += sale.total_amount;
        existing.average_price = existing.total_revenue / existing.total_quantity;
        existing.sales_count += 1;
      } else {
        itemMap.set(sale.item_name, {
          name: sale.item_name,
          category: sale.item_category,
          total_quantity: sale.quantity,
          total_revenue: sale.total_amount,
          average_price: sale.price_at_sale,
          sales_count: 1
        });
      }
    });
    
    // Sort by total revenue (descending) and take top 6
    return Array.from(itemMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 6);
  }, [recentSales]);

  const buttonStyles = {
    primary: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-green-600",
    secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95",
    glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg"
  };

  const microAnimations = {
    cardHover: "transition-all duration-350 ease-spring hover:translate-y-[-6px] hover:shadow-2xl",
    iconHover: "transition-all duration-350 ease-spring group-hover:scale-105 group-hover:translate-y-[-2px]",
  };

  const springEasing = "cubic-bezier(0.34, 1.56, 0.64, 1)";

  const iconCategories = {
    financial: { background: 'rgba(16, 185, 129, 0.1)', icon: '#10b981' },
    inventory: { background: 'rgba(6, 182, 212, 0.1)', icon: '#06b6d4' },
    analytics: { background: 'rgba(99, 102, 241, 0.1)', icon: '#6366f1' },
    service: { background: 'rgba(139, 92, 246, 0.1)', icon: '#8b5cf6' },
    customers: { background: 'rgba(59, 130, 246, 0.1)', icon: '#3b82f6' },
    branches: { background: 'rgba(16, 185, 129, 0.1)', icon: '#10b981' },
    suppliers: { background: 'rgba(6, 182, 212, 0.1)', icon: '#06b6d4' },
    vehicles: { background: 'rgba(59, 130, 246, 0.1)', icon: '#3b82f6' }
  };

  const MetricSkeleton = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
            <div className="w-5 h-5 bg-slate-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-12 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-3 bg-slate-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const EmptyState = ({ icon: Icon, title, description, action }: {
    icon: any,
    title: string,
    description: string,
    action?: string
  }) => (
    <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
      <Icon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-500 mb-4">{description}</p>
      {action && (
        <Button className={buttonStyles.primary}>
          {action}
        </Button>
      )}
    </div>
  );

  const GetStartedLink = ({ onClick, children }: {
    onClick: (e: React.MouseEvent) => void;
    children: string
  }) => (
    <button
      onClick={onClick}
      className="group relative inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 transition-all duration-300 pb-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
    >
      <span>{children}</span>
      <ArrowUpRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300 group-hover:w-[calc(100%-20px)] group-hover:left-2.5"></span>
    </button>
  );

  const quickActions = [
    { label: "Create Sale", icon: Plus, href: "/pos", description: "Point of Sale", category: "financial" },
    { label: "Manage Inventory", icon: Package, href: "/inventory", description: "Stock items", category: "inventory" },
    { label: "View Reports", icon: FileText, href: "/reports", description: "Analytics", category: "analytics" },
    { label: "Service Jobs", icon: Wrench, href: "/services", description: "Manage jobs", category: "service" }
  ];

  const handleCardClick = (cardId: string) => {
    const routes: { [key: string]: string } = {
      sales: '/reports/sales',
      inventory: '/inventory',
      customers: '/customers',
      jobs: '/services',
      branches: '/branches',
      suppliers: '/purchasing',
      vehicles: '/vehicles'
    };
    if (routes[cardId]) {
      router.push(routes[cardId]);
    }
  };

  const handleCardKeyPress = (event: React.KeyboardEvent, cardId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick(cardId);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    if (!supabase || !user?.user_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const statsPromise = supabase
        .rpc('get_dashboard_stats', { user_uuid: user.user_id } as any);

      const recentSalesPromise = supabase
        .from('sale_item')
        .select(`
          sale_item_id,
          quantity,
          price_at_sale,
          created_at,
          sale!inner(
            sale_id,
            sale_date,
            user:user_id(name),
            total_amount
          ),
          inventory_item!inner(name, category)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const salesChartPromise = supabase
        .rpc('get_weekly_sales');

      const lowStockPromise = supabase
        .from('inventory_item')
        .select('*')
        .lte('stock_quantity', 5)
        .order('created_at', { ascending: false })
        .limit(10);

      const [
        { data: statsData, error: statsError },
        { data: recentSalesData, error: recentSalesError },
        { data: salesChartData, error: salesChartError },
        { data: lowStockData, error: lowStockError }
      ] = await Promise.all([
        statsPromise,
        recentSalesPromise,
        salesChartPromise,
        lowStockPromise
      ]);

      if (statsError) throw statsError;
      if (recentSalesError) throw recentSalesError;
      if (salesChartError) throw salesChartError;
      if (lowStockError) throw lowStockError;

      const formattedRecentSales: RecentSale[] = (recentSalesData as any[] || []).map(item => ({
        sale_item_id: item.sale_item_id,
        quantity: item.quantity,
        price_at_sale: item.price_at_sale,
        created_at: item.created_at,
        item_name: item.inventory_item?.name || 'Unknown',
        item_category: item.inventory_item?.category || 'Unknown',
        user_name: item.sale?.user?.name || 'Unknown',
        total_amount: item.quantity * item.price_at_sale
      }));

      const enhancedSalesData = await calculateEnhancedSalesData(salesChartData as SalesDataPoint[]);

      setStats(statsData as any as DashboardStats);
      setSalesData(enhancedSalesData);
      setLowStockItems(lowStockData as LowStockItem[] || []);
      setRecentSales(formattedRecentSales);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const calculateEnhancedSalesData = async (salesData: SalesDataPoint[]): Promise<SalesDataPoint[]> => {
    if (!salesData || salesData.length === 0) {
      const sampleData: SalesDataPoint[] = [];
      const today = new Date();
      const sevenDayAverage = 15000;

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const sales = Math.floor(Math.random() * 20000) + 5000;
        sampleData.push({
          date: date.toISOString().split('T')[0],
          sales,
          average: sevenDayAverage,
          trend: sales > sevenDayAverage ? 'up' : 'down'
        });
      }
      return sampleData;
    }

    const totalSales = salesData.reduce((sum, day) => sum + day.sales, 0);
    const sevenDayAverage = totalSales / Math.max(salesData.length, 1);

    return salesData.map(day => ({
      ...day,
      average: sevenDayAverage,
      trend: day.sales > sevenDayAverage ? 'up' : 'down'
    }));
  };

  useEffect(() => {
    if (user?.user_id) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const primaryStats = [
    { id: 'sales', title: "Total Sales", value: `₱${stats.total_sales.toLocaleString()} `, icon: DollarSign, desc: "Last 7 days", category: "financial" },
    { id: 'inventory', title: "Inventory Items", value: stats.total_items.toLocaleString(), icon: Blocks, desc: "In stock", category: "inventory" },
    { id: 'customers', title: "Customers", value: stats.total_customers.toLocaleString(), icon: Users, desc: "Registered", category: "customers" },
    { id: 'jobs', title: "Pending Jobs", value: stats.pending_jobs.toLocaleString(), icon: Wrench, desc: "Needs attention", category: "service" }
  ];

  const secondaryStats = [
    { id: 'branches', title: "Active Branches", value: stats.total_branches.toLocaleString(), icon: Building2, category: "branches" },
    { id: 'suppliers', title: "Suppliers", value: stats.total_suppliers.toLocaleString(), icon: Package, category: "suppliers" },
    { id: 'vehicles', title: "Vehicles", value: stats.total_vehicles.toLocaleString(), icon: Car, category: "vehicles" }
  ];

  const focusStyles = "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

  // Color palette for top selling items chart
  const chartColors = [
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#ec4899', // Pink
    '#a855f7', // Purple variant
    '#14b8a6', // Teal
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">

      {/* TOP BACKGROUND SECTION */}
      <div className="absolute top-0 left-0 w-full h-64 rounded-b-[40px] overflow-hidden">
        <div
          className="absolute inset-0 rounded-b-[40px] bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/image2.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 30%"
          }}
        ></div>

        <div className="absolute top-0 left-0 w-32 h-32 bg-green-300/20 rounded-br-full"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-300/20 rounded-bl-full"></div>
        <div className="absolute bottom-10 left-20 w-16 h-16 bg-white/20 rounded-2xl rotate-45"></div>
        <div className="absolute bottom-16 right-24 w-12 h-12 bg-white/15 rounded-full"></div>
      </div>

      <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">

        {/* PROFILE HEADER SECTION */}
        <div className={`mb-12 pt-7 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
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
                <div className="flex items-center gap-4 text-lg">
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                      <Clock className="w-5 h-5" />
                      Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-glow"></div>
                    Live data
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className={buttonStyles.glass + " active:scale-95"}
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className={`h-6 w-6 mr-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* QUICK ACTIONS SECTION */}
        <section className="mb-10 mt-20" aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="text-xl font-bold text-slate-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
            {quickActions.map((action, index) => (
              <div
                key={action.label}
                className={`transform transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                style={{
                  transitionDelay: `${index * 50}ms`,
                  transitionTimingFunction: springEasing
                }}
              >
                <div
                  className={`group bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer h-full flex flex-col shadow-sm hover:border-indigo-300/25 active:scale-[0.98] ${microAnimations.cardHover} ${focusStyles}`}
                  onClick={() => router.push(action.href)}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(action.href)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${action.label} - ${action.description}`}
                  style={{ transitionTimingFunction: springEasing }}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${microAnimations.iconHover}`}
                      style={{
                        backgroundColor: (iconCategories as any)[action.category]?.background || 'rgba(99, 102, 241, 0.1)',
                        transitionTimingFunction: springEasing
                      }}
                    >
                      <action.icon
                        className="w-5 h-5"
                        style={{ color: (iconCategories as any)[action.category]?.icon || '#6366f1' }}
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors leading-tight mb-2">
                      {action.label}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed flex-1 mb-3">
                      {action.description}
                    </p>
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

        {/* Key Metrics Section */}
        <section className="mb-10" aria-labelledby="key-metrics-heading">
          <h2 id="key-metrics-heading" className="text-xl font-bold text-slate-900 mb-6">Key Metrics</h2>

          {isLoading ? (
            <MetricSkeleton />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {primaryStats.map((stat, i) => (
                <div
                  key={i}
                  className={`group bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer shadow-sm hover:border-indigo-300/25 active:scale-[0.98] ${microAnimations.cardHover} ${focusStyles}`}
                  onClick={() => handleCardClick(stat.id)}
                  onKeyDown={(e) => handleCardKeyPress(e, stat.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${stat.title} details. Current value: ${stat.value}`}
                  style={{
                    transitionTimingFunction: springEasing,
                    transitionDelay: `${250 + i * 50}ms`,
                    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                    opacity: mounted ? 1 : 0,
                    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${microAnimations.iconHover}`}
                      style={{
                        backgroundColor: (iconCategories as any)[stat.category]?.background || 'rgba(99, 102, 241, 0.1)',
                        transitionTimingFunction: springEasing
                      }}
                    >
                      <stat.icon
                        className="w-5 h-5"
                        style={{ color: (iconCategories as any)[stat.category]?.icon || '#6366f1' }}
                      />
                    </div>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-400 scale-90 translate-y-1 group-hover:scale-100 group-hover:translate-y-0"
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        transitionTimingFunction: springEasing,
                        transitionDelay: '0.1s'
                      }}
                    >
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p
                      className={`text-3xl font-extrabold tracking-tight tabular-nums leading-none mb-2 ${stat.value === '₱0' || stat.value === '0' ? 'text-slate-300' : 'text-slate-800'
                        }`}
                      style={{ letterSpacing: '-0.03em' }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-sm font-semibold text-slate-700">{stat.title}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {stat.desc}
                    </p>
                  </div>

                  {stat.value === '₱0' || stat.value === '0' ? (
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-400 opacity-70 italic mb-1">No data yet</p>
                      <GetStartedLink
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(stat.id === 'sales' ? '/pos' : `/${stat.id}`);
                        }}
                      >
                        Get started
                      </GetStartedLink>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Additional Metrics Section */}
        <section className="mb-12" aria-labelledby="additional-metrics-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="additional-metrics-heading" className="text-xl font-bold text-slate-900">Additional Metrics</h2>
            <Button
              onClick={() => setShowSecondaryStats(!showSecondaryStats)}
              variant="outline"
              className="flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95"
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
                  className={`group bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer shadow-sm hover:border-indigo-300/25 active:scale-[0.98] ${microAnimations.cardHover} ${focusStyles}`}
                  onClick={() => handleCardClick(stat.id)}
                  onKeyDown={(e) => handleCardKeyPress(e, stat.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${stat.title} details. Current value: ${stat.value}`}
                  style={{ transitionTimingFunction: springEasing }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${microAnimations.iconHover}`}
                      style={{
                        backgroundColor: (iconCategories as any)[stat.category]?.background || 'rgba(99, 102, 241, 0.1)',
                        transitionTimingFunction: springEasing
                      }}
                    >
                      <stat.icon
                        className="w-5 h-5"
                        style={{ color: (iconCategories as any)[stat.category]?.icon || '#6366f1' }}
                      />
                    </div>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-400 scale-90 translate-y-1 group-hover:scale-100 group-hover:translate-y-0"
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        transitionTimingFunction: springEasing,
                        transitionDelay: '0.1s'
                      }}
                    >
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p
                      className={`text-3xl font-extrabold tracking-tight tabular-nums leading-none ${stat.value === '0' ? 'text-slate-300' : 'text-slate-800'
                        }`}
                      style={{ letterSpacing: '-0.03em' }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-sm font-semibold text-slate-700">{stat.title}</p>
                  </div>

                  {stat.value === '0' ? (
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-400 opacity-70 italic">No data available</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Performance & Analytics Section */}
        <section className="mb-8" aria-labelledby="performance-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="performance-heading" className="text-xl font-bold text-slate-800">Performance & Analytics</h2>
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
                    <CardTitle id="sales-chart-title" className="flex items-center text-xl font-bold text-slate-800">
                      <BarChart className="mr-3 h-5 w-5 text-green-600" aria-hidden="true" />
                      Sales Overview
                    </CardTitle>
                    <CardDescription className="mt-2 text-slate-600">
                      Daily performance with 7-day average
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
                  <div className="h-80 w-full" aria-label="Sales trend chart showing daily sales for the past week with 7-day average">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
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
                          tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            backdropFilter: "blur(12px)",
                            border: `1px solid rgba(21, 128, 61, 0.2)`,
                            borderRadius: "12px",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                            color: "#1e293b"
                          }}
                          formatter={(value, name) => {
                            if (name === 'sales') return [`₱${Number(value).toLocaleString()}`, 'Daily Sales'];
                            if (name === 'average') return [`₱${Number(value).toLocaleString()}`, '7-Day Average'];
                            return [value, name];
                          }}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <ReferenceLine
                          y={salesData[0]?.average}
                          stroke="#64748b"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                          label={{
                            value: '7-Day Avg',
                            position: 'right',
                            fill: '#64748b',
                            fontSize: 10
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          stroke="#10b981"
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

            {/* Low Stock Alerts */}
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
                      onKeyDown={(e) => e.key === 'Enter' && router.push('/inventory')}
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

        {/* Recent Activity Section - UPDATED */}
        <section aria-labelledby="recent-activity-heading">
          <h2 id="recent-activity-heading" className="text-xl font-bold mb-6 text-slate-800">Recent Activity</h2>
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Recent Sales - SLIMMER (4 columns) */}
            <Card
              className="lg:col-span-4 bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl"
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {recentSales.length > 0 ? recentSales.slice(0, 5).map((sale) => (
                    <div
                      key={sale.sale_item_id}
                      className="p-3 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white hover:scale-[1.02]"
                      onClick={() => router.push('/pos')}
                      onKeyDown={(e) => e.key === 'Enter' && router.push('/pos')}
                      tabIndex={0}
                      role="button"
                      aria-label={`Recent sale: ${sale.item_name || 'Unknown Item'}, amount: ₱${sale.total_amount.toLocaleString()}`}
                    >
                      <div className="space-y-2">
                        <p className="font-semibold text-slate-800 text-sm group-hover:text-slate-900 transition-colors truncate">
                          {sale.item_name || 'Unknown Item'}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-600">
                            {sale.quantity} × ₱{sale.price_at_sale?.toLocaleString() || '0'}
                          </p>
                          <p className="text-lg font-bold text-green-600 transition-transform duration-300 group-hover:scale-110">
                            ₱{sale.total_amount.toLocaleString()}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : 'Unknown date'}
                        </p>
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
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-4 flex items-center justify-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-700 hover:text-indigo-800 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 hover:bg-indigo-50"
                  onClick={() => router.push('/pos')}
                >
                  View All Sales
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>

            {/* Top Selling Items - WIDER (8 columns) */}
            <Card
              className="lg:col-span-8 bg-gradient-to-br from-white via-white to-purple-50/30 border-slate-200 shadow-lg transition-all duration-300 hover:shadow-2xl"
              role="region"
              aria-labelledby="top-selling-title"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle id="top-selling-title" className="flex items-center text-lg font-bold text-slate-800">
                      <TrendingUp className="mr-2 h-5 w-5 text-purple-600" aria-hidden="true" />
                      Top Selling Items
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      Best performers by revenue in the last 7 days
                    </CardDescription>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="flex items-center gap-2 min-h-[44px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 shadow-md hover:shadow-lg"
                  >
                    <Link href="/inventory">
                      View Inventory
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-80">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-hidden="true" />
                    <span className="sr-only">Loading top selling items</span>
                  </div>
                ) : topSellingItems.length > 0 ? (
                  <div className="space-y-6">
                    {/* Enhanced Horizontal Bar Chart */}
                    <div className="h-64 bg-gradient-to-br from-slate-50/50 to-purple-50/30 rounded-2xl p-4 border border-slate-100" aria-label="Horizontal bar chart showing top selling items by revenue">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                          data={topSellingItems}
                          layout="vertical"
                          margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
                        >
                          <defs>
                            {chartColors.map((color, idx) => (
                              <linearGradient key={idx} id={`gradient-${idx}`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                                <stop offset="100%" stopColor={color} stopOpacity={1} />
                              </linearGradient>
                            ))}
                          </defs>
                          <XAxis
                            type="number"
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={100}
                            tickFormatter={(value) => value.length > 12 ? value.substring(0, 10) + '...' : value}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.98)",
                              backdropFilter: "blur(16px)",
                              border: `2px solid rgba(139, 92, 246, 0.2)`,
                              borderRadius: "16px",
                              boxShadow: "0 12px 40px rgba(139, 92, 246, 0.15)",
                              color: "#1e293b",
                              padding: "12px 16px"
                            }}
                            cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                            formatter={(value: any, name: string) => {
                              if (name === 'total_revenue') {
                                return [
                                  <span className="font-bold text-purple-600">₱{Number(value).toLocaleString()}</span>,
                                  'Total Revenue'
                                ];
                              }
                              return [value, name];
                            }}
                            labelFormatter={(label) => <span className="font-semibold text-slate-800">{label}</span>}
                          />
                          <Bar
                            dataKey="total_revenue"
                            radius={[0, 8, 8, 0]}
                            background={{ fill: 'rgba(226, 232, 240, 0.4)', radius: 8 }}
                          >
                            {topSellingItems.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={`url(#gradient-${index % chartColors.length})`}
                              />
                            ))}
                          </Bar>
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Enhanced Item Details List */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-600" />
                        Detailed Breakdown
                      </h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {topSellingItems.map((item, index) => (
                          <div
                            key={item.name}
                            className="group relative p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 cursor-pointer bg-white overflow-hidden"
                            onClick={() => router.push('/inventory')}
                            onKeyDown={(e) => e.key === 'Enter' && router.push('/inventory')}
                            tabIndex={0}
                            role="button"
                            aria-label={`Top selling item: ${item.name}, revenue: ₱${item.total_revenue.toLocaleString()}`}
                          >
                            {/* Gradient background on hover */}
                            <div 
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              style={{
                                background: `linear-gradient(135deg, ${chartColors[index % chartColors.length]}08 0%, ${chartColors[index % chartColors.length]}03 100%)`
                              }}
                            />
                            
                            <div className="relative flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow duration-300"
                                  style={{
                                    background: `linear-gradient(135deg, ${chartColors[index % chartColors.length]}20 0%, ${chartColors[index % chartColors.length]}10 100%)`,
                                  }}
                                >
                                  {index === 0 ? (
                                    <TrendingUp className="w-5 h-5" style={{ color: chartColors[index % chartColors.length] }} />
                                  ) : (
                                    <Package className="w-5 h-5" style={{ color: chartColors[index % chartColors.length] }} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-purple-700 transition-colors">
                                      {item.name}
                                    </p>
                                    {index === 0 && (
                                      <Badge className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0">
                                        #1
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mb-2">{item.category}</p>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-slate-600 flex items-center gap-1">
                                      <span className="font-medium">{item.total_quantity}</span> units
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-600 flex items-center gap-1">
                                      <span className="font-medium">{item.sales_count}</span> sales
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xl font-bold bg-gradient-to-br from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                  ₱{item.total_revenue.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  ₱{item.average_price.toFixed(2)} avg
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={Package}
                    title="No Sales Data"
                    description="Start making sales to see your top performing items"
                    action="Create First Sale"
                  />
                )}
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

        .ease-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% {
            opacity: 0.8;
            transform: scale(0.95);
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}