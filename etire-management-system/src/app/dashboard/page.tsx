"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart, Blocks, DollarSign, AlertTriangle, Users, Wrench, Loader2,
  Building2, Package, Car, TrendingUp, RefreshCw, Plus, ChevronDown, ChevronUp,
  ArrowUpRight, Calendar, Settings2, Eye, EyeOff, LayoutGrid
} from 'lucide-react';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { RevenueSplitChart } from '@/components/dashboard/widgets/RevenueSplitChart';
import { AROCard } from '@/components/dashboard/widgets/AROCard';
import { TopBrandsChart } from '@/components/dashboard/widgets/TopBrandsChart';
import { InventoryHealthTable } from '@/components/dashboard/widgets/InventoryHealthTable';
import { BayUtilizationGauge } from '@/components/dashboard/widgets/BayUtilizationGauge';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area, ReferenceLine, BarChart as RechartsBarChart, Bar, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchSalesReport } from "@/lib/salesReportService";

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
  name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
  average_price: number;
  sales_count: number;
}

type TimeFrame = '1d' | '3d' | '7d';

// Widget visibility configuration
interface WidgetVisibility {
  quickActions: boolean;
  keyMetrics: boolean;
  secondaryMetrics: boolean;
  salesChart: boolean;
  lowStock: boolean;
  revenueSplit: boolean;
  aroCard: boolean;
  bayUtilization: boolean;
  topBrands: boolean;
  inventoryHealth: boolean;
  recentSales: boolean;
  topSelling: boolean;
}

const WIDGET_STORAGE_KEY = 'dashboard_widget_visibility';

const DEFAULT_VISIBILITY: WidgetVisibility = {
  quickActions: true,
  keyMetrics: true,
  secondaryMetrics: false,
  salesChart: true,
  lowStock: true,
  revenueSplit: true,
  aroCard: true,
  bayUtilization: true,
  topBrands: true,
  inventoryHealth: true,
  recentSales: true,
  topSelling: true,
};

const WIDGET_LABELS: Record<keyof WidgetVisibility, string> = {
  quickActions: 'Quick Actions',
  keyMetrics: 'Key Metrics',
  secondaryMetrics: 'Secondary Metrics',
  salesChart: 'Sales Performance Chart',
  lowStock: 'Low Stock Alerts',
  revenueSplit: 'Revenue Split',
  aroCard: 'Average Repair Order',
  bayUtilization: 'Bay Utilization',
  topBrands: 'Top Brands',
  inventoryHealth: 'Inventory Health',
  recentSales: 'Recent Sales',
  topSelling: 'Top Selling Items',
};

export default function DashboardPage() {
  const { user, activeBranchId } = useAuth();
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

  const { data: analyticsData, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useDashboardAnalytics();
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [filteredRecentSales, setFilteredRecentSales] = useState<RecentSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('7d');

  // Widget visibility state with localStorage persistence
  const [widgetVisibility, setWidgetVisibility] = useState<WidgetVisibility>(DEFAULT_VISIBILITY);

  // Load widget visibility from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWidgetVisibility({ ...DEFAULT_VISIBILITY, ...parsed });
      } catch (e) {
        console.error('Failed to parse widget visibility:', e);
      }
    }
  }, []);

  // Save widget visibility to localStorage
  const toggleWidget = (widget: keyof WidgetVisibility) => {
    setWidgetVisibility(prev => {
      const updated = { ...prev, [widget]: !prev[widget] };
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const showAllWidgets = () => {
    const allVisible = Object.keys(DEFAULT_VISIBILITY).reduce((acc, key) => {
      acc[key as keyof WidgetVisibility] = true;
      return acc;
    }, {} as WidgetVisibility);
    setWidgetVisibility(allVisible);
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(allVisible));
  };

  const hideAllWidgets = () => {
    const allHidden = Object.keys(DEFAULT_VISIBILITY).reduce((acc, key) => {
      acc[key as keyof WidgetVisibility] = false;
      return acc;
    }, {} as WidgetVisibility);
    setWidgetVisibility(allHidden);
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(allHidden));
  };

  const resetWidgets = () => {
    setWidgetVisibility(DEFAULT_VISIBILITY);
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(DEFAULT_VISIBILITY));
  };

  // Calculate top selling items
  const topSellingItems = useMemo(() => {
    if (!filteredRecentSales || filteredRecentSales.length === 0) return [];
    const itemMap = new Map<string, TopSellingItem>();

    filteredRecentSales.forEach(sale => {
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

    return Array.from(itemMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 6);
  }, [filteredRecentSales]);

  const getTimeFrameDays = (tf: TimeFrame): number => {
    switch (tf) {
      case '1d': return 1;
      case '3d': return 3;
      case '7d': return 7;
    }
  };

  const filterRecentSalesByTimeFrame = useCallback((sales: RecentSale[], tf: TimeFrame) => {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - getTimeFrameDays(tf));
    return sales.filter(sale => new Date(sale.created_at) >= cutoffDate);
  }, []);

  const calculateSalesChartData = useCallback((sales: RecentSale[], tf: TimeFrame) => {
    const chartDataMap = new Map<string, number>();
    const now = new Date();

    if (tf === '1d') {
      for (let i = 0; i < 24; i++) {
        chartDataMap.set(`${i}:00`, 0);
      }
    } else {
      const daysToShow = tf === '3d' ? 3 : 7;
      for (let i = daysToShow - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        chartDataMap.set(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), 0);
      }
    }

    sales.forEach(sale => {
      const saleDate = new Date(sale.created_at);
      let key: string;
      if (tf === '1d') {
        key = `${saleDate.getHours()}:00`;
      } else {
        key = saleDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
      if (chartDataMap.has(key)) {
        chartDataMap.set(key, (chartDataMap.get(key) || 0) + sale.total_amount);
      }
    });

    const chartData = Array.from(chartDataMap.entries()).map(([date, sales]) => ({
      date,
      sales,
      average: 0
    }));

    if (tf === '1d') {
      chartData.sort((a, b) => parseInt(a.date.split(':')[0]) - parseInt(b.date.split(':')[0]));
    }

    if (chartData.length > 0) {
      const totalSales = chartData.reduce((sum, day) => sum + day.sales, 0);
      const average = totalSales / chartData.length;
      return chartData.map(item => ({ ...item, average }));
    }

    return chartData;
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!supabase || !user?.user_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const salesReportPromise = fetchSalesReport({
        date_from: "",
        date_to: "",
        branch_id: activeBranchId || ""
      });

      let inventoryCountQuery = supabase.from('view_branch_inventory')
        .select('quantity, deleted_at')
        .is('deleted_at', null);
      if (activeBranchId) inventoryCountQuery = inventoryCountQuery.eq('branch_id', activeBranchId);

      let customerCountQuery = supabase.from('customer').select('customer_id', { count: 'exact', head: true }).is('deleted_at', null);
      if (activeBranchId) customerCountQuery = customerCountQuery.eq('branch_id', activeBranchId);

      let jobQuery = supabase.from('service_job').select('status').is('deleted_at', null);
      if (activeBranchId) jobQuery = jobQuery.eq('branch_id', activeBranchId);

      let branchCountQuery = supabase.from('branch').select('branch_id', { count: 'exact', head: true }).is('deleted_at', null);
      let supplierCountQuery = supabase.from('supplier').select('supplier_id', { count: 'exact', head: true }).is('deleted_at', null);

      let vehicleCountQuery = supabase
        .from('vehicle')
        .select('vehicle_id, customer!inner(branch_id)', { count: 'exact', head: true })
        .is('deleted_at', null);
      if (activeBranchId) vehicleCountQuery = vehicleCountQuery.eq('customer.branch_id', activeBranchId);

      let notifCountQuery = supabase.from('notification').select('notification_id', { count: 'exact', head: true }).eq('user_id', user.user_id).eq('is_read', false);

      let recentSalesQuery = supabase
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
            total_amount,
            branch_id
          ),
          inventory_item!inner(name, category)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (activeBranchId) recentSalesQuery = recentSalesQuery.eq('sale.branch_id', activeBranchId);

      let lowStockListQuery = supabase
        .from('view_branch_inventory')
        .select('*, stock_quantity:quantity')
        .is('deleted_at', null)
        .lte('quantity', 5)
        .order('quantity', { ascending: true })
        .limit(10);
      if (activeBranchId) lowStockListQuery = lowStockListQuery.eq('branch_id', activeBranchId);

      const [
        salesRes,
        invRes,
        custRes,
        jobRes,
        branchRes,
        suppRes,
        vehRes,
        notifRes,
        { data: recentSalesData, error: recentSalesError },
        { data: lowStockData, error: lowStockListError }
      ] = await Promise.all([
        salesReportPromise,
        inventoryCountQuery,
        customerCountQuery,
        jobQuery,
        branchCountQuery,
        supplierCountQuery,
        vehicleCountQuery,
        notifCountQuery,
        recentSalesQuery,
        lowStockListQuery
      ]);

      if (recentSalesError) throw recentSalesError;
      if (lowStockListError) throw lowStockListError;

      const totalSales = (salesRes.sales || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const inventoryCount = invRes.data?.length || 0;
      const lowStockCount = invRes.data?.filter((i: any) => i.quantity <= 5).length || 0;
      const pendingJobs = jobRes.data?.filter((j: any) => j.status === 'pending').length || 0;

      setStats({
        total_sales: totalSales,
        total_items: inventoryCount,
        total_customers: custRes.count || 0,
        pending_jobs: pendingJobs,
        total_branches: branchRes.count || 0,
        total_suppliers: suppRes.count || 0,
        total_vehicles: vehRes.count || 0,
        unread_notifications: notifRes.count || 0,
        low_stock_count: lowStockCount
      });

      const formattedRecentSales: RecentSale[] = (recentSalesData as any[] || []).map(item => ({
        sale_item_id: item.sale_item_id,
        quantity: item.quantity,
        price_at_sale: item.price_at_sale,
        created_at: item.created_at,
        item_name: item.inventory_item?.name || 'Unknown',
        item_category: item.inventory_item?.category || 'Unknown',
        user_name: item.sale?.user?.name || 'Unknown',
        total_amount: item.quantity * item.price_at_sale,
      }));

      const filtered = filterRecentSalesByTimeFrame(formattedRecentSales, timeFrame);
      const chartData = calculateSalesChartData(filtered, timeFrame);

      setRecentSales(formattedRecentSales);
      setFilteredRecentSales(filtered);
      setSalesData(chartData);
      setLowStockItems(lowStockData as LowStockItem[] || []);

    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, activeBranchId, timeFrame, filterRecentSalesByTimeFrame, calculateSalesChartData]);

  useEffect(() => {
    if (user?.user_id) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, user]);

  useEffect(() => {
    if (recentSales.length > 0) {
      const filtered = filterRecentSalesByTimeFrame(recentSales, timeFrame);
      const chartData = calculateSalesChartData(filtered, timeFrame);
      setFilteredRecentSales(filtered);
      setSalesData(chartData);
    }
  }, [timeFrame, recentSales, filterRecentSalesByTimeFrame, calculateSalesChartData]);

  const handleRefresh = () => {
    fetchDashboardData();
    refetchAnalytics();
  };

  const primaryStats = [
    { id: 'sales', title: "Total Sales", value: `₱${stats.total_sales.toLocaleString()}`, icon: DollarSign, href: '/reports/sales', color: 'bg-green-500' },
    { id: 'inventory', title: "Inventory Items", value: stats.total_items.toLocaleString(), icon: Blocks, href: '/inventory', color: 'bg-primary' },
    { id: 'customers', title: "Customers", value: stats.total_customers.toLocaleString(), icon: Users, href: '/customers', color: 'bg-purple-500' },
    { id: 'jobs', title: "Pending Jobs", value: stats.pending_jobs.toLocaleString(), icon: Wrench, href: '/services', color: 'bg-orange-500' }
  ];

  const secondaryStats = [
    { title: "Branches", value: stats.total_branches.toLocaleString(), icon: Building2, color: 'bg-blue-500' },
    { title: "Suppliers", value: stats.total_suppliers.toLocaleString(), icon: Package, color: 'bg-teal-500' },
    { title: "Vehicles", value: stats.total_vehicles.toLocaleString(), icon: Car, color: 'bg-indigo-500' }
  ];

  const chartColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

  const chartConfig = useMemo(() => {
    const maxVal = Math.max(...salesData.map(d => d.sales), 0);
    if (maxVal === 0) return { domain: [0, 10000], ticks: [0, 2500, 5000, 7500, 10000] };
    const steps = 4;
    const niceStep = Math.ceil(maxVal / steps / 1000) * 1000;
    const upperLimit = niceStep * steps;
    return { domain: [0, upperLimit], ticks: Array.from({ length: steps + 1 }, (_, i) => i * niceStep) };
  }, [salesData]);

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  const visibleWidgetCount = Object.values(widgetVisibility).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width container with minimal padding */}
      <div className="w-full px-3 py-4">

        {/* Compact Header with Widget Filter */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              Dashboard
            </h1>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              <Calendar className="inline h-3.5 w-3.5 mr-1" />
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Widget Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Widgets</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {visibleWidgetCount}/{Object.keys(widgetVisibility).length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Dashboard Widgets</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={showAllWidgets}>
                      <Eye className="h-3 w-3 mr-1" />All
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={hideAllWidgets}>
                      <EyeOff className="h-3 w-3 mr-1" />None
                    </Button>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-y-auto py-1">
                  {(Object.keys(WIDGET_LABELS) as Array<keyof WidgetVisibility>).map((key) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                      onClick={() => toggleWidget(key)}
                    >
                      <Checkbox
                        checked={widgetVisibility[key]}
                        onCheckedChange={() => toggleWidget(key)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm flex-1">{WIDGET_LABELS[key]}</span>
                    </div>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={resetWidgets}>
                    <Settings2 className="h-3 w-3 mr-1" />Reset to Default
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Quick Actions - Compact horizontal bar */}
        {widgetVisibility.quickActions && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <Button asChild size="sm" className="shrink-0 bg-green-500 hover:bg-green-600 text-white">
              <Link href="/pos"><Plus className="h-4 w-4 mr-1" />New Sale</Link>
            </Button>
            <Button asChild size="sm" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/inventory"><Package className="h-4 w-4 mr-1" />Inventory</Link>
            </Button>
            <Button asChild size="sm" className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white">
              <Link href="/services"><Wrench className="h-4 w-4 mr-1" />Services</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/reports"><BarChart className="h-4 w-4 mr-1" />Reports</Link>
            </Button>
          </div>
        )}

        {/* Key Metrics - Compact stat cards */}
        {widgetVisibility.keyMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {isLoading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)
            ) : (
              primaryStats.map((stat) => (
                <Card key={stat.id} className="cursor-pointer hover:bg-accent/50 transition-all" onClick={() => router.push(stat.href)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-lg font-semibold">{stat.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Secondary Metrics */}
        {widgetVisibility.secondaryMetrics && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {secondaryStats.map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`p-1.5 rounded ${stat.color} text-white`}>
                    <stat.icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                    <p className="text-base font-semibold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Grid - Sales Chart & Low Stock side by side */}
        {(widgetVisibility.salesChart || widgetVisibility.lowStock) && (
          <div className="grid lg:grid-cols-4 gap-3 mb-4">
            {/* Sales Chart - Takes 3/4 width */}
            {widgetVisibility.salesChart && (
              <Card className={widgetVisibility.lowStock ? "lg:col-span-3" : "lg:col-span-4"}>
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Sales Performance</CardTitle>
                    <Select value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)}>
                      <SelectTrigger className="w-20 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1d">1 Day</SelectItem>
                        <SelectItem value="3d">3 Days</SelectItem>
                        <SelectItem value="7d">7 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : salesData.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesData}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="date"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            interval={timeFrame === '1d' ? 4 : 0}
                            tickFormatter={(value) => {
                              if (timeFrame === '1d') {
                                const hour = parseInt(value.split(':')[0]);
                                return hour % 12 === 0 ? (hour === 0 ? '12a' : '12p') : `${hour % 12}`;
                              }
                              return value.split(',')[0];
                            }}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                            tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                            domain={chartConfig.domain}
                            ticks={chartConfig.ticks}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "6px",
                              fontSize: "12px"
                            }}
                            formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Sales']}
                          />
                          <ReferenceLine y={salesData[0]?.average} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                          <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorSales)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      No sales data for this period
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Low Stock Alerts - Takes 1/4 width */}
            {widgetVisibility.lowStock && (
              <Card className={widgetVisibility.salesChart ? "" : "lg:col-span-4"}>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    Low Stock ({lowStockItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {lowStockItems.length > 0 ? lowStockItems.slice(0, 6).map((item) => (
                      <div key={item.item_id} className="flex items-center justify-between py-1.5 px-1 hover:bg-accent/50 rounded text-sm">
                        <span className="truncate flex-1">{item.name}</span>
                        <Badge variant="destructive" className="text-xs ml-2 shrink-0">
                          {item.stock_quantity}
                        </Badge>
                      </div>
                    )) : (
                      <div className="text-center py-6 text-muted-foreground text-xs">
                        <Package className="h-6 w-6 mx-auto mb-1 opacity-50" />
                        All stock healthy
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Advanced Analytics Grid - Full width, compact cards */}
        {analyticsData && (widgetVisibility.revenueSplit || widgetVisibility.aroCard || widgetVisibility.bayUtilization || widgetVisibility.topBrands || widgetVisibility.inventoryHealth) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {widgetVisibility.revenueSplit && (
              <div className="h-56"><RevenueSplitChart data={analyticsData.revenueSplit} /></div>
            )}
            {(widgetVisibility.aroCard || widgetVisibility.bayUtilization) && (
              <div className="space-y-3">
                {widgetVisibility.aroCard && <div className="h-[106px]"><AROCard data={analyticsData.averageRepairOrder} /></div>}
                {widgetVisibility.bayUtilization && <div className="h-[106px]"><BayUtilizationGauge data={analyticsData.bayUtilization} /></div>}
              </div>
            )}
            {widgetVisibility.topBrands && (
              <div className="h-56"><TopBrandsChart data={analyticsData.topBrands} /></div>
            )}
            {widgetVisibility.inventoryHealth && (
              <div className="h-56"><InventoryHealthTable data={analyticsData.inventoryHealth} /></div>
            )}
          </div>
        )}

        {/* Recent Sales & Top Selling - Full width */}
        {(widgetVisibility.recentSales || widgetVisibility.topSelling) && (
          <div className="grid lg:grid-cols-3 gap-3">
            {/* Recent Sales */}
            {widgetVisibility.recentSales && (
              <Card>
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Recent Sales</CardTitle>
                    <Button asChild variant="ghost" size="sm" className="h-6 text-xs">
                      <Link href="/pos">View all</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-52 overflow-y-auto">
                    {filteredRecentSales.length > 0 ? (
                      <div className="divide-y divide-border">
                        {filteredRecentSales.slice(0, 6).map((sale) => (
                          <div key={sale.sale_item_id} className="px-3 py-2 flex items-center justify-between hover:bg-accent/50 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                                {getInitials(sale.user_name)}
                              </div>
                              <div>
                                <p className="text-sm font-medium truncate max-w-24">{sale.item_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(sale.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm font-semibold">₱{sale.total_amount.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground text-sm">No recent sales</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Selling */}
            {widgetVisibility.topSelling && (
              <Card className={widgetVisibility.recentSales ? "lg:col-span-2" : "lg:col-span-3"}>
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Top Selling Items</CardTitle>
                    <Button asChild variant="ghost" size="sm" className="h-6 text-xs">
                      <Link href="/inventory">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  {topSellingItems.length > 0 ? (
                    <div className="grid lg:grid-cols-5 gap-2">
                      <div className="lg:col-span-2 h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={topSellingItems.slice(0, 5)} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]}>
                              {topSellingItems.slice(0, 5).map((_, i) => (
                                <Cell key={i} fill={chartColors[i % chartColors.length]} />
                              ))}
                            </Bar>
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="lg:col-span-3">
                        <div className="divide-y divide-border">
                          {topSellingItems.slice(0, 5).map((item, i) => (
                            <div key={item.name} className="py-1.5 flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                                  {i + 1}
                                </span>
                                <div>
                                  <p className="text-sm font-medium truncate max-w-32">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.category}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-primary">₱{item.total_revenue.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">{item.total_quantity} sold</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">
                      No sales data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
          </div>
        )}
      </div>
    </div>
  );
}