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

  // Enhanced color palette with better contrast
// Green, Teal, Cyan, Blue color palette
const cardColors = {
  sales: { 
    background: '#dcfce7', // green-50
    hover: '#bbf7d0', // green-100
    icon: '#15803d', // green-700
    text: '#15803d'
  },
  inventory: { 
    background: '#ccfbf1', // teal-50
    hover: '#99f6e4', // teal-100
    icon: '#0f766e', // teal-700
    text: '#0f766e'
  },
  customers: { 
    background: '#cffafe', // cyan-50
    hover: '#a5f3fc', // cyan-100
    icon: '#0e7490', // cyan-700
    text: '#0e7490'
  },
  jobs: { 
    background: '#dbeafe', // blue-50
    hover: '#bfdbfe', // blue-100
    icon: '#1d4ed8', // blue-700
    text: '#1d4ed8'
  },
  branches: { 
    background: '#dcfce7', // green-50
    hover: '#bbf7d0', // green-100
    icon: '#15803d', // green-700
    text: '#15803d'
  },
  suppliers: { 
    background: '#ccfbf1', // teal-50
    hover: '#99f6e4', // teal-100
    icon: '#0f766e', // teal-700
    text: '#0f766e'
  },
  vehicles: { 
    background: '#cffafe', // cyan-50
    hover: '#a5f3fc', // cyan-100
    icon: '#0e7490', // cyan-700
    text: '#0e7490'
  },
  notifications: { 
    background: '#dbeafe', // blue-50
    hover: '#bfdbfe', // blue-100
    icon: '#1d4ed8', // blue-700
    text: '#1d4ed8'
  }
};

    // Quick actions for Hick's Law
    const quickActions = [
        { 
          label: "Create Sale", 
          icon: Plus, 
          href: "/pos", 
          description: "Point of Sale",
          colors: cardColors.sales 
        },
        { 
          label: "Manage Inventory", 
          icon: Package, 
          href: "/inventory", 
          description: "Stock items",
          colors: cardColors.inventory 
        },
        { 
          label: "View Reports", 
          icon: FileText, 
          href: "/reports", 
          description: "Analytics",
          colors: cardColors.customers 
        },
        { 
          label: "Service Jobs", 
          icon: Wrench, 
          href: "/service-jobs", 
          description: "Manage jobs",
          colors: cardColors.jobs 
        }
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

const primaryStats = [
  { id: 'sales', title: "Total Sales", value: `₱${stats.total_sales.toLocaleString()}`, icon: DollarSign, desc: "Last 7 days", delay: "100", colors: cardColors.sales },
  { id: 'inventory', title: "Inventory Items", value: stats.total_items.toLocaleString(), icon: Blocks, desc: "In stock", delay: "200", colors: cardColors.inventory },
  { id: 'customers', title: "Customers", value: stats.total_customers.toLocaleString(), icon: Users, desc: "Registered", delay: "300", colors: cardColors.customers },
  { id: 'jobs', title: "Pending Jobs", value: stats.pending_jobs.toLocaleString(), icon: Wrench, desc: "Needs attention", delay: "400", colors: cardColors.jobs }
];

const secondaryStats = [
  { id: 'branches', title: "Active Branches", value: stats.total_branches.toLocaleString(), icon: Building2, delay: "100", colors: cardColors.branches },
  { id: 'suppliers', title: "Suppliers", value: stats.total_suppliers.toLocaleString(), icon: Package, delay: "200", colors: cardColors.suppliers },
  { id: 'vehicles', title: "Vehicles", value: stats.total_vehicles.toLocaleString(), icon: Car, delay: "300", colors: cardColors.vehicles },
  { id: 'notifications', title: "Notifications", value: stats.unread_notifications.toLocaleString(), icon: Bell, delay: "400", colors: cardColors.notifications }
];

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
          backgroundImage: "url('/images/art1.png')",
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
      
      {/* PROFILE HEADER SECTION - Transparent Blur */}
      <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-6 flex items-center gap-6 shadow-lg">
          {/* Welcome Text - Removed avatar circle */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
              Welcome back, {user?.name ?? 'User'}
            </h1>
            <p className="text-white/90 flex items-center gap-2 drop-shadow-md">
              <Calendar className="h-5 w-5 opacity-90" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          {/* Refresh Button */}
          <Button 
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline" 
            className="border-white/40 bg-white/20 hover:bg-white/30 hover:border-white/60 text-white backdrop-blur-sm transition-all min-h-[44px] px-6"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`h-5 w-5 mr-2 opacity-90 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <section className="mb-12" aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="text-2xl font-bold mb-8 text-slate-800">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action, index) => (
            <div
              key={action.label}
              className={`transform transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div 
                className={`relative overflow-hidden rounded-2xl transition-all duration-500 group cursor-pointer h-32 ${focusStyles} ${
                  hoveredCard === action.label ? 'shadow-lg scale-105 -translate-y-2' : 'hover:shadow-md hover:scale-105 hover:-translate-y-2'
                }`}
                style={{ 
                  background: hoveredCard === action.label ? action.colors.hover : action.colors.background
                }}
                onClick={() => router.push(action.href)}
                onKeyPress={(e) => e.key === 'Enter' && router.push(action.href)}
                onMouseEnter={() => setHoveredCard(action.label)}
                onMouseLeave={() => setHoveredCard(null)}
                tabIndex={0}
                role="button"
                aria-label={`${action.label} - ${action.description}`}
              >
                <div className="relative p-6 h-full flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1 transition-all duration-300 group-hover:translate-x-1" style={{ color: action.colors.text }}>
                      {action.label}
                    </h3>
                    <p className="text-sm transition-all duration-300 group-hover:translate-x-1" style={{ color: action.colors.text, opacity: 0.7 }}>
                      {action.description}
                    </p>
                  </div>
                  <div className={`transform transition-all duration-300 group-hover:scale-110`}>
                    <action.icon 
                      className="h-8 w-8" 
                      style={{ color: action.colors.icon }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

        {/* Key Metrics Section - Clear Visual Hierarchy */}
        <section className="mb-8" aria-labelledby="key-metrics-heading">
          <h2 id="key-metrics-heading" className="text-2xl font-bold mb-6 text-slate-800">Key Metrics</h2>
          
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i} className="bg-white border-slate-200 shadow-lg h-36">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-2/3 bg-gray-200 rounded-md animate-pulse mb-2"></div>
                    <div className="h-4 w-full bg-gray-200 rounded-md animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {primaryStats.map((stat, i) => (
                <div
                  key={i}
                  className={`transform transition-all duration-700 hover:scale-105 hover:-translate-y-2 h-36 ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${stat.delay}ms` }}
                >
                  <div 
                    className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 group cursor-pointer h-full ${focusStyles} ${
                      hoveredCard === stat.id ? 'shadow-2xl scale-105 -translate-y-2' : 'hover:shadow-xl hover:scale-105 hover:-translate-y-2'
                    }`}
                    style={{ 
                      background: hoveredCard === stat.id ? stat.colors.hover : stat.colors.background,
                      boxShadow: hoveredCard === stat.id ? 
                        `0 25px 50px -12px ${stat.colors.glow}` : 
                        '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}
                    onClick={() => handleCardClick(stat.id)}
                    onKeyPress={(e) => handleCardKeyPress(e, stat.id)}
                    onMouseEnter={() => setHoveredCard(stat.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${stat.title} details. Current value: ${stat.value}`}
                  >
                    {/* HUGE Top-Right Icon with Hover Animation */}
                    <div className={`absolute top-2 right-2 transition-all duration-300 ${
                      hoveredCard === stat.id ? 'opacity-30 scale-110' : 'opacity-20 group-hover:opacity-30 group-hover:scale-110'
                    }`}>
                      <stat.icon 
                        className="w-24 h-24" 
                        style={{ color: stat.colors.icon }}
                        aria-hidden="true"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-6 h-full flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-medium mb-1 transition-colors duration-300 group-hover:font-semibold" style={{ color: stat.colors.text }}>
                          {stat.title}
                        </h3>
                        <div className="text-3xl font-bold transition-all duration-300 group-hover:text-4xl" style={{ color: stat.colors.text }}>
                          {stat.value}
                        </div>
                      </div>
                      <p className="text-xs flex items-center gap-1 transition-opacity duration-300 group-hover:opacity-100" style={{ color: stat.colors.text, opacity: 0.7 }}>
                         <TrendingUp className="h-3 w-3 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                        {stat.desc}  {/* ← FIXED: No more "Name" */}
                     </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Additional Metrics Section - Progressive Disclosure */}
        <section className="mb-8" aria-labelledby="additional-metrics-heading">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={() => setShowSecondaryStats(!showSecondaryStats)}
              variant="outline"
              className={`flex items-center gap-2 min-h-[44px] ${focusStyles}`}
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
                  className={`transform transition-all duration-700 hover:scale-105 hover:-translate-y-2 h-36 ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${stat.delay}ms` }}
                >
                  <div 
                    className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 group cursor-pointer h-full ${focusStyles} ${
                      hoveredCard === stat.id ? 'shadow-2xl scale-105 -translate-y-2' : 'hover:shadow-xl hover:scale-105 hover:-translate-y-2'
                    }`}
                    style={{ 
                      background: hoveredCard === stat.id ? stat.colors.hover : stat.colors.background,
                      boxShadow: hoveredCard === stat.id ? 
                        `0 25px 50px -12px ${stat.colors.glow}` : 
                        '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}
                    onClick={() => handleCardClick(stat.id)}
                    onKeyPress={(e) => handleCardKeyPress(e, stat.id)}
                    onMouseEnter={() => setHoveredCard(stat.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${stat.title} details. Current value: ${stat.value}`}
                  >
                    {/* HUGE Top-Right Icon with Hover Animation */}
                    <div className={`absolute top-2 right-2 transition-all duration-300 ${
                      hoveredCard === stat.id ? 'opacity-30 scale-110' : 'opacity-20 group-hover:opacity-30 group-hover:scale-110'
                    }`}>
                      <stat.icon 
                        className="w-24 h-24" 
                        style={{ color: stat.colors.icon }}
                        aria-hidden="true"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-6 h-full flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-medium mb-1 transition-colors duration-300 group-hover:font-semibold" style={{ color: stat.colors.text }}>
                          {stat.title}
                        </h3>
                        <div className="text-3xl font-bold transition-all duration-300 group-hover:text-4xl" style={{ color: stat.colors.text }}>
                          {stat.value}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Performance & Analytics Section */}
        <section className="mb-8" aria-labelledby="performance-heading">
          <h2 id="performance-heading" className="text-2xl font-bold mb-6 text-slate-800">Performance & Analytics</h2>
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Sales Chart */}
            <Card 
              className="lg:col-span-2 bg-white border-slate-200 shadow-xl transition-all duration-300 hover:shadow-2xl"
              role="region"
              aria-labelledby="sales-chart-title"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle id="sales-chart-title" className="flex items-center text-2xl font-bold text-slate-800">
                      <BarChart className="mr-3 h-6 w-6 opacity-90 transition-transform duration-300 hover:scale-110" style={{ color: cardColors.sales.icon }} aria-hidden="true" />
                      Sales Overview
                    </CardTitle>
                    <CardDescription className="mt-2 text-slate-600">
                      Performance over the last 7 days
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-cyan-100 text-cyan-700 border-cyan-200">
                    <Clock className="h-3 w-3 mr-1 opacity-80" aria-hidden="true" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-80">
                    <Loader2 className="h-8 w-8 animate-spin opacity-80" style={{ color: cardColors.sales.icon }} aria-hidden="true" />
                    <span className="sr-only">Loading sales chart</span>
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>

            {/* Low Stock Alerts */}
            <Card 
              className="bg-white border-slate-200 shadow-xl transition-all duration-300 hover:shadow-2xl"
              role="region"
              aria-labelledby="low-stock-title"
            >
              <CardHeader>
                <CardTitle id="low-stock-title" className="flex items-center text-lg font-bold text-slate-800">
                  <AlertTriangle className="mr-2 h-5 w-5 opacity-90 transition-transform duration-300 hover:scale-110" style={{ color: cardColors.notifications.icon }} aria-hidden="true" />
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
                    <div className="text-center py-8 text-slate-500" aria-live="polite">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-60" aria-hidden="true" />
                      <p className="text-sm">All items are well stocked!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Recent Activity Section */}
        <section aria-labelledby="recent-activity-heading">
          <h2 id="recent-activity-heading" className="text-2xl font-bold mb-6 text-slate-800">Recent Activity</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Sales */}
            <Card 
              className="bg-white border-slate-200 shadow-xl transition-all duration-300 hover:shadow-2xl"
              role="region"
              aria-labelledby="recent-sales-title"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle id="recent-sales-title" className="flex items-center text-lg font-bold text-slate-800">
                      <TrendingUp className="mr-2 h-5 w-5 opacity-90 transition-transform duration-300 hover:scale-110" style={{ color: cardColors.sales.icon }} aria-hidden="true" />
                      Recent Sales
                    </CardTitle>
                    <CardDescription className="text-slate-600">Latest transactions</CardDescription>
                  </div>
                  <Button asChild size="sm" variant="outline" 
                          className={`border-slate-300 bg-white hover:border-cyan-500 hover:text-cyan-600 transition-all min-h-[44px] ${focusStyles}`}>
                    <Link href="/pos">
                      View POS
                      <ArrowUpRight className="h-4 w-4 ml-1 opacity-80 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
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
                    <div className="text-center py-8 text-slate-500" aria-live="polite">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-60" aria-hidden="true" />
                      <p className="text-sm">No recent sales</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card 
              className="bg-white border-slate-200 shadow-xl transition-all duration-300 hover:shadow-2xl"
              role="region"
              aria-labelledby="notifications-title"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle id="notifications-title" className="flex items-center text-lg font-bold text-slate-800">
                      <Bell className="mr-2 h-5 w-5 opacity-90 transition-transform duration-300 hover:scale-110" style={{ color: cardColors.notifications.icon }} aria-hidden="true" />
                      Notifications
                    </CardTitle>
                    <CardDescription className="text-slate-600">Latest system alerts</CardDescription>
                  </div>
                  <Button asChild size="sm" variant="outline" 
                          className={`border-slate-300 bg-white hover:border-cyan-500 hover:text-cyan-600 transition-all min-h-[44px] ${focusStyles}`}>
                    <Link href="/notifications">
                      View All
                      <ArrowUpRight className="h-4 w-4 ml-1 opacity-80 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
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
                          {notification.type === 'success' && <div className="w-3 h-3 rounded-full shadow-lg bg-green-500 opacity-90 transition-transform duration-300 group-hover:scale-110" aria-hidden="true"></div>}
                          {notification.type === 'warning' && <div className="w-3 h-3 rounded-full shadow-lg bg-amber-500 opacity-90 transition-transform duration-300 group-hover:scale-110" aria-hidden="true"></div>}
                          {notification.type === 'error' && <div className="w-3 h-3 rounded-full shadow-lg bg-rose-500 opacity-90 transition-transform duration-300 group-hover:scale-110" aria-hidden="true"></div>}
                          {notification.type === 'info' && <div className="w-3 h-3 rounded-full shadow-lg bg-blue-500 opacity-90 transition-transform duration-300 group-hover:scale-110" aria-hidden="true"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">{notification.title}</p>
                            {!notification.is_read && (
                              <Badge variant="default" className="text-xs ml-2 bg-rose-500 opacity-90 transition-transform duration-300 group-hover:scale-110">
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
                    <div className="text-center py-8 text-slate-500" aria-live="polite">
                      <Bell className="h-12 w-12 mx-auto mb-3 opacity-60" aria-hidden="true" />
                      <p className="text-sm">No notifications</p>
                    </div>
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
