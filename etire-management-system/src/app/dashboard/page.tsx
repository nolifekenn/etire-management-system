
"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart, Blocks, DollarSign, AlertTriangle, Users, Wrench, Loader2, Bell, Building2, Package, Car, TrendingUp, FileText, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        total_sales: 0,
        total_items: 0,
        total_customers: 0,
        pending_jobs: 0,
        total_branches: 0,
        total_suppliers: 0,
        total_vehicles: 0,
        unread_notifications: 0,
    });
    const [salesData, setSalesData] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [recentSales, setRecentSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async () => {
        if (!supabase) {
            setError("Supabase client not available. Check credentials.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // Get sales data for the last 7 days from the sales table
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
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
            if(jobError) throw new Error(`Could not count service jobs: ${jobError.message}`);

            // Get additional stats
            const [branchesRes, suppliersRes, customersRes, vehiclesRes, notificationsRes] = await Promise.all([
                supabase.from('branch').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('supplier').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('customer').select('*', { count: 'exact', head: true }),
                supabase.from('vehicle').select('*', { count: 'exact', head: true }),
                supabase.from('notification').select('*', { count: 'exact', head: true }).eq('user_id', user?.user_id).eq('is_read', false)
            ]);

            // Calculate total sales from recent sales data
            const totalSales = recentSales?.reduce((acc, sale) => acc + sale.total_amount, 0) || 0;

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
                .eq('user_id', user?.user_id)
                .order('created_at', { ascending: false })
                .limit(5);
            
            setNotifications(notificationsData || []);

            // Fetch low stock items
            const { data: lowStockData } = await supabase
                .from('inventory_item')
                .select('*')
                .lte('stock_quantity', 10) // Assuming reorder_level is 10
                .order('stock_quantity', { ascending: true })
                .limit(10);
            
            setLowStockItems(lowStockData || []);

            // Fetch recent sales for detailed view
            const { data: recentSalesData } = await supabase
                .from('sale_item')
                .select(`
                    *,
                    inventory_item(name, category),
                    user(name)
                `)
                .order('created_at', { ascending: false })
                .limit(10);
            
            setRecentSales(recentSalesData || []);

            // Group sales by date and format for chart
            const salesByDate = new Map();
            recentSales?.forEach(sale => {
                const date = new Date(sale.sale_date).toDateString();
                if (salesByDate.has(date)) {
                    salesByDate.set(date, salesByDate.get(date) + sale.total_amount);
                } else {
                    salesByDate.set(date, sale.total_amount);
                }
            });

            // Format data for chart - last 7 days
            const formattedSales = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateString = date.toDateString();
                const sales = salesByDate.get(dateString) || 0;
                
                formattedSales.push({
                    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    sales: sales
                });
            }
            setSalesData(formattedSales as any);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageHeader title={`Welcome, ${user?.name ?? 'User'}`} description="Here's a summary of your shop's activity." />

            {error && (
                 <Alert variant="destructive" className="mb-8">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Dashboard Error</AlertTitle>
                    <AlertDescription>
                        {error}
                        <p className="mt-2">This may happen if the required database views (e.g., `daily_sales_report`) do not exist. Please check your Supabase schema and RLS policies.</p>
                    </AlertDescription>
                </Alert>
            )}

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {Array(4).fill(0).map((_, i) => (
                         <Card key={i} className="shadow-lg"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Loader2 className="h-5 w-5 animate-spin"/></CardHeader><CardContent><div className="text-2xl font-bold">...</div></CardContent></Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <StatCard title="Total Sales (7 days)" value={`₱${stats.total_sales.toLocaleString()}`} icon={DollarSign} description="Recent transaction totals" iconClassName="text-green-500" />
                    <StatCard title="Total Inventory Items" value={String(stats.total_items)} icon={Blocks} description="Number of unique products" iconClassName="text-blue-500" />
                    <StatCard title="Registered Customers" value={String(stats.total_customers)} icon={Users} description="Total customer accounts" iconClassName="text-purple-500" />
                    <StatCard title="Pending Service Jobs" value={String(stats.pending_jobs)} icon={Wrench} description="Jobs needing attention" iconClassName="text-yellow-500" />
                </div>
            )}

            {/* Additional Stats Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <StatCard title="Active Branches" value={String(stats.total_branches)} icon={Building2} description="Operating locations" iconClassName="text-indigo-500" />
                <StatCard title="Suppliers" value={String(stats.total_suppliers)} icon={Package} description="Active suppliers" iconClassName="text-orange-500" />
                <StatCard title="Vehicles" value={String(stats.total_vehicles)} icon={Car} description="Registered vehicles" iconClassName="text-cyan-500" />
                <StatCard title="Notifications" value={String(stats.unread_notifications)} icon={Bell} description="Unread alerts" iconClassName="text-red-500" />
            </div>
            
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5" /> Sales Trend (Last 7 Days)</CardTitle>
                    <CardDescription>A visual summary of sales performance over the past week.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-80"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={salesData}>
                                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₱${value}`}/>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--background))",
                                            borderColor: "hsl(var(--border))",
                                        }}
                                        cursor={{ fill: "hsl(var(--secondary))" }}
                                    />
                                    <Legend />
                                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
                            Low Stock Alerts
                        </CardTitle>
                        <CardDescription>Items that need immediate restocking.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {lowStockItems.map((item: any) => (
                                <div key={item.item_id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                                    <div className="flex-1">
                                        <p className="font-medium text-orange-900">{item.name}</p>
                                        <p className="text-sm text-orange-700">Category: {item.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-orange-900">{item.stock_quantity}</p>
                                        <p className="text-sm text-orange-700">units left</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Sales */}
            {recentSales.length > 0 && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center">
                                <TrendingUp className="mr-2 h-5 w-5" />
                                Recent Sales
                            </div>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/pos">View POS</Link>
                            </Button>
                        </CardTitle>
                        <CardDescription>Latest sales transactions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentSales.map((sale: any) => (
                                <div key={sale.sale_item_id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium">{sale.inventory?.name || 'Unknown Item'}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {sale.quantity} x ₱{sale.price_at_sale.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Sold by: {sale.users?.name || 'Unknown'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">
                                            ₱{(sale.quantity * sale.price_at_sale).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(sale.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Notifications */}
            {notifications.length > 0 && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Bell className="mr-2 h-5 w-5" />
                                Recent Notifications
                            </div>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/notifications">View All</Link>
                            </Button>
                        </CardTitle>
                        <CardDescription>Latest system alerts and notifications.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {notifications.map((notification: any) => (
                                <div key={notification.notification_id} className="flex items-start space-x-3 p-3 border rounded-lg">
                                    <div className="flex-shrink-0">
                                        {notification.type === 'success' && <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>}
                                        {notification.type === 'warning' && <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>}
                                        {notification.type === 'error' && <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>}
                                        {notification.type === 'info' && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(notification.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <Badge variant="default" className="text-xs">New</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
