"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart, Blocks, DollarSign, AlertTriangle, Users, Wrench, Loader2, Bell, 
  Building2, Package, Car, TrendingUp, FileText, Download, ArrowUpRight, 
  Calendar, Clock, RefreshCw 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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

  // Color palette
  const cardColors = {
    sales: { background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', hover: 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)', glow: 'rgba(34, 197, 94, 0.2)', icon: '#16a34a', text: '#166534' },
    inventory: { background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', hover: 'linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 100%)', glow: 'rgba(99, 102, 241, 0.2)', icon: '#4f46e5', text: '#3730a3' },
    customers: { background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', hover: 'linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)', glow: 'rgba(168, 85, 247, 0.2)', icon: '#9333ea', text: '#6b21a8' },
    jobs: { background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', hover: 'linear-gradient(135deg, #fde68a 0%, #fcd34d 100%)', glow: 'rgba(245, 158, 11, 0.2)', icon: '#d97706', text: '#92400e' },
    branches: { background: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)', hover: 'linear-gradient(135deg, #a5f3fc 0%, #67e8f9 100%)', glow: 'rgba(6, 182, 212, 0.2)', icon: '#0891b2', text: '#0e7490' },
    suppliers: { background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)', hover: 'linear-gradient(135deg, #99f6e4 0%, #5eead4 100%)', glow: 'rgba(20, 184, 166, 0.2)', icon: '#0d9488', text: '#0f766e' },
    vehicles: { background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', hover: 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)', glow: 'rgba(59, 130, 246, 0.2)', icon: '#2563eb', text: '#1e40af' },
    notifications: { background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', hover: 'linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 100%)', glow: 'rgba(236, 72, 153, 0.2)', icon: '#db2777', text: '#be185d' }
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-800 font-poppins relative overflow-hidden">
            {/* Dynamic background glow effects */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                {/* Base subtle backgrounds */}
                <div className="absolute left-1/2 top-0 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-gradient-radial from-blue-100/20 to-transparent blur-3xl"></div>
                <div className="absolute left-1/4 top-1/2 h-[35rem] w-[35rem] -translate-y-1/2 rounded-full bg-gradient-radial from-cyan-100/15 to-transparent blur-3xl"></div>
                <div className="absolute right-1/4 bottom-0 h-[30rem] w-[30rem] translate-y-1/2 rounded-full bg-gradient-radial from-teal-100/10 to-transparent blur-3xl"></div>
                
                {/* Dynamic glow effects for hovered cards */}
                {hoveredCard && (
                    <>
                        {hoveredCard === 'sales' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 to-emerald-50/15 transition-all duration-500" />
                        )}
                        {hoveredCard === 'inventory' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-purple-50/15 transition-all duration-500" />
                        )}
                        {hoveredCard === 'customers' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-fuchsia-50/15 transition-all duration-500" />
                        )}
                        {hoveredCard === 'jobs' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 to-orange-50/15 transition-all duration-500" />
                        )}
                        {hoveredCard === 'branches' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/30 to-blue-50/15 transition-all duration-500" />
                        )}
                        {hoveredCard === 'suppliers' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-teal-50/30 to-emerald-50/15 transition-all duration-500" />
                        )}
                        {hoveredCard === 'vehicles' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-sky-50/15 transition-all duration-500" />
                        )}
                        {hoveredCard === 'notifications' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-50/30 to-rose-50/15 transition-all duration-500" />
                        )}
                    </>
                )}
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
                {/* Header Section */}
                <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                                Welcome back, {user?.name ?? 'User'}
                            </h1>
                            <div className="flex items-center gap-4 text-slate-600">
                                <p className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 opacity-80" />
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                {lastUpdated && (
                                    <p className="flex items-center gap-2 text-sm">
                                        <Clock className="h-3 w-3 opacity-70" />
                                        Updated {lastUpdated.toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button 
                                onClick={handleRefresh}
                                disabled={isLoading}
                                variant="outline" 
                                className="border-slate-300 bg-white hover:border-cyan-500 hover:text-cyan-600 transition-all"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 opacity-80 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/20 text-white">
                                <FileText className="h-4 w-4 mr-2 opacity-90" />
                                Reports
                            </Button>
                        </div>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive" className="mb-8 border-2 border-rose-200 bg-rose-50 shadow-lg animate-slideIn">
                        <AlertTriangle className="h-4 w-4 text-rose-600 opacity-90" />
                        <AlertTitle className="text-rose-800">Dashboard Error</AlertTitle>
                        <AlertDescription className="text-rose-700">{error}</AlertDescription>
                    </Alert>
                )}

                {/* Main Stats Grid - With Hover Animations */}
                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                        {Array(4).fill(0).map((_, i) => (
                            <Card key={i} className="bg-white border-slate-200 shadow-lg h-36">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-400 opacity-70"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-slate-400">...</div>
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
                                    className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 group cursor-pointer h-full
                                        ${hoveredCard === stat.id ? 'shadow-2xl scale-105 -translate-y-2' : 'hover:shadow-xl hover:scale-105 hover:-translate-y-2'}`}
                                    style={{ 
                                        background: hoveredCard === stat.id ? stat.colors.hover : stat.colors.background,
                                        boxShadow: hoveredCard === stat.id ? 
                                            `0 25px 50px -12px ${stat.colors.glow}` : 
                                            '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                                    }}
                                    onMouseEnter={() => setHoveredCard(stat.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                >
                                    {/* HUGE Top-Right Icon with Hover Animation */}
                                    <div className={`absolute top-2 right-2 transition-all duration-300 ${
                                        hoveredCard === stat.id ? 'opacity-30 scale-110' : 'opacity-20 group-hover:opacity-30 group-hover:scale-110'
                                    }`}>
                                        <stat.icon 
                                            className="w-24 h-24" 
                                            style={{ color: stat.colors.icon }}
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
                                            <TrendingUp className="h-3 w-3 transition-transform duration-300 group-hover:scale-110" />
                                            {stat.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Secondary Stats Row - With Hover Animations */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {secondaryStats.map((stat, i) => (
                        <div
                            key={i}
                            className={`transform transition-all duration-700 hover:scale-105 hover:-translate-y-2 h-36 ${
                                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                            }`}
                            style={{ transitionDelay: `${stat.delay}ms` }}
                        >
                            <div 
                                className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 group cursor-pointer h-full
                                    ${hoveredCard === stat.id ? 'shadow-2xl scale-105 -translate-y-2' : 'hover:shadow-xl hover:scale-105 hover:-translate-y-2'}`}
                                style={{ 
                                    background: hoveredCard === stat.id ? stat.colors.hover : stat.colors.background,
                                    boxShadow: hoveredCard === stat.id ? 
                                        `0 25px 50px -12px ${stat.colors.glow}` : 
                                        '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                                }}
                                onMouseEnter={() => setHoveredCard(stat.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                {/* HUGE Top-Right Icon with Hover Animation */}
                                <div className={`absolute top-2 right-2 transition-all duration-300 ${
                                    hoveredCard === stat.id ? 'opacity-30 scale-110' : 'opacity-20 group-hover:opacity-30 group-hover:scale-110'
                                }`}>
                                    <stat.icon 
                                        className="w-24 h-24" 
                                        style={{ color: stat.colors.icon }}
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

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6 mb-8">
                    {/* Sales Chart */}
                    <Card 
                        className="lg:col-span-2 bg-white border-slate-200 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
                        onMouseEnter={() => setHoveredCard('chart')}
                        onMouseLeave={() => setHoveredCard(null)}
                    >
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center text-2xl font-bold text-slate-800">
                                        <BarChart className="mr-3 h-6 w-6 opacity-90 transition-transform duration-300 hover:scale-110" style={{ color: cardColors.sales.icon }} />
                                        Sales Overview
                                    </CardTitle>
                                    <CardDescription className="mt-2 text-slate-600">
                                        Performance over the last 7 days
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary" className="text-xs bg-cyan-100 text-cyan-700 border-cyan-200">
                                    <Clock className="h-3 w-3 mr-1 opacity-80" />
                                    Live
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-80">
                                    <Loader2 className="h-8 w-8 animate-spin opacity-80" style={{ color: cardColors.sales.icon }} />
                                </div>
                            ) : (
                                <div className="h-80 w-full">
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
                        className="bg-white border-slate-200 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
                        onMouseEnter={() => setHoveredCard('alerts')}
                        onMouseLeave={() => setHoveredCard(null)}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg font-bold text-slate-800">
                                <AlertTriangle className="mr-2 h-5 w-5 opacity-90 transition-transform duration-300 hover:scale-110" style={{ color: cardColors.notifications.icon }} />
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
                                    <div className="text-center py-8 text-slate-500">
                                        <Package className="h-12 w-12 mx-auto mb-3 opacity-60" />
                                        <p className="text-sm">All items are well stocked!</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom Grid - Recent Sales & Notifications */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Recent Sales */}
                    <Card 
                        className="bg-white border-slate-200 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
                        onMouseEnter={() => setHoveredCard('recent-sales')}
                        onMouseLeave={() => setHoveredCard(null)}
                    >
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center text-lg font-bold text-slate-800">
                                        <TrendingUp className="mr-2 h-5 w-5 opacity-90 transition-transform duration-300 hover:scale-110" style={{ color: cardColors.sales.icon }} />
                                        Recent Sales
                                    </CardTitle>
                                    <CardDescription className="text-slate-600">Latest transactions</CardDescription>
                                </div>
                                <Button asChild size="sm" variant="outline" 
                                        className="border-slate-300 bg-white hover:border-cyan-500 hover:text-cyan-600 transition-all">
                                    <Link href="/pos">
                                        View POS
                                        <ArrowUpRight className="h-4 w-4 ml-1 opacity-80 transition-transform duration-300 group-hover:scale-110" />
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
                                    <div className="text-center py-8 text-slate-500">
                                        <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-60" />
                                        <p className="text-sm">No recent sales</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notifications */}
                    <Card 
                        className="bg-white border-slate-200 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
                        onMouseEnter={() => setHoveredCard('notifications')}
                        onMouseLeave={() => setHoveredCard(null)}
                    >
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center text-lg font-bold text-slate-800">
                                        <Bell className="mr-2 h-5 w-5 opacity-90 transition-transform duration-300 hover:scale-110" style={{ color: cardColors.notifications.icon }} />
                                        Notifications
                                    </CardTitle>
                                    <CardDescription className="text-slate-600">Latest system alerts</CardDescription>
                                </div>
                                <Button asChild size="sm" variant="outline" 
                                        className="border-slate-300 bg-white hover:border-cyan-500 hover:text-cyan-600 transition-all">
                                    <Link href="/notifications">
                                        View All
                                        <ArrowUpRight className="h-4 w-4 ml-1 opacity-80 transition-transform duration-300 group-hover:scale-110" />
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
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {notification.type === 'success' && <div className="w-3 h-3 rounded-full shadow-lg bg-green-500 opacity-90 transition-transform duration-300 group-hover:scale-110"></div>}
                                                {notification.type === 'warning' && <div className="w-3 h-3 rounded-full shadow-lg bg-amber-500 opacity-90 transition-transform duration-300 group-hover:scale-110"></div>}
                                                {notification.type === 'error' && <div className="w-3 h-3 rounded-full shadow-lg bg-rose-500 opacity-90 transition-transform duration-300 group-hover:scale-110"></div>}
                                                {notification.type === 'info' && <div className="w-3 h-3 rounded-full shadow-lg bg-blue-500 opacity-90 transition-transform duration-300 group-hover:scale-110"></div>}
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
                                                    <Clock className="h-3 w-3 opacity-70" />
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 text-slate-500">
                                        <Bell className="h-12 w-12 mx-auto mb-3 opacity-60" />
                                        <p className="text-sm">No notifications</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

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