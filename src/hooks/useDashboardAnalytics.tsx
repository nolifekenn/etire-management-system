import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface DashboardAnalytics {
    revenueSplit: {
        name: string;
        value: number;
        color: string;
    }[];
    averageRepairOrder: {
        value: number;
        trend: number; // Percentage vs last month
        period: string; // e.g. "This Month"
    };
    topBrands: {
        name: string;
        value: number; // Quantity sold
    }[];
    inventoryHealth: {
        item_id: string;
        name: string;
        stock_quantity: number;
        reorder_level: number;
        supplier_name: string;
    }[];
    bayUtilization: {
        active: number;
        capacity: number;
        utilization: number; // Percentage
    };
}

export function useDashboardAnalytics() {
    const { user, activeBranchId } = useAuth();
    const [data, setData] = useState<DashboardAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        if (!user || !activeBranchId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const now = new Date();
            const currentMonthStart = startOfMonth(now).toISOString();
            const currentMonthEnd = endOfMonth(now).toISOString();
            const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
            const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

                        // 1. REVENUE SPLIT (Services vs Goods)
                        // Note: We need to join sale_item -> inventory_item to get category
            const { data: revenueData, error: revenueError } = await supabase
                .from('sale_item')
                .select(`
          price_at_sale,
          quantity,
                    inventory_item!inner (
            category
          ),
          sale!inner (
            branch_id,
            total_amount,
            deleted_at
          )
        `)
                .eq('sale.branch_id', activeBranchId)
                .is('sale.deleted_at', null);

            if (revenueError) throw revenueError;

            let servicesRevenue = 0;
            let goodsRevenue = 0;

            revenueData?.forEach((item: Record<string, unknown>) => {
                const amount = (item.price_at_sale as number) * (item.quantity as number);
                if ((item.inventory_item as Record<string, unknown>).category === 'service') {
                    servicesRevenue += amount;
                } else {
                    goodsRevenue += amount;
                }
            });

            const revenueSplit = [
                { name: 'Services', value: servicesRevenue, color: '#4f46e5' }, // Indigo 600
                { name: 'Goods', value: goodsRevenue, color: '#0ea5e9' },    // Sky 500
            ];


            // 2. ARO (Average Repair Order) - This Month vs Last Month
            // Current Month
            const { data: currentSales, error: currentSalesError } = await supabase
                .from('sale')
                .select('total_amount')
                .eq('branch_id', activeBranchId)
                .is('deleted_at', null)
                .gte('created_at', currentMonthStart)
                .lte('created_at', currentMonthEnd);

            if (currentSalesError) throw currentSalesError;

            const currentTotal = currentSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
            const currentCount = currentSales?.length || 0;
            const currentARO = currentCount > 0 ? currentTotal / currentCount : 0;

            // Last Month
            const { data: lastSales, error: lastSalesError } = await supabase
                .from('sale')
                .select('total_amount')
                .eq('branch_id', activeBranchId)
                .is('deleted_at', null)
                .gte('created_at', lastMonthStart)
                .lte('created_at', lastMonthEnd);

            if (lastSalesError) throw lastSalesError;

            const lastTotal = lastSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
            const lastCount = lastSales?.length || 0;
            const lastARO = lastCount > 0 ? lastTotal / lastCount : 0;

            const aroTrend = lastARO === 0 ? 100 : ((currentARO - lastARO) / lastARO) * 100;


            // 3. TOP MOVING BRANDS
            // Fetch sale items and group by name (since we don't have a 'brand' column in catalog_item yet, we'll use 'category' or infer from name, 
            // BUT for now requirements say "Brand". Assuming 'name' contains brand or just grouping by Item Name as a proxy if Brand missing)
            // REVISION: Requirement says "Brand (from catalog)". CatalogItem has no explicit brand column in schema. 
            // We will group by `name` (Top Selling Items) as a proxy for now, or `category` if preferred. 
            // better implementation: Group by Item Name.

                        const { data: topItemsData, error: topItemsError } = await supabase
                .from('sale_item')
                .select(`
          quantity,
                    inventory_item!inner (
            name
          ),
          sale!inner (
            branch_id,
            deleted_at
          )
        `)
                .eq('sale.branch_id', activeBranchId)
                .is('sale.deleted_at', null);

            if (topItemsError) throw topItemsError;

            const itemCounts: Record<string, number> = {};
            topItemsData?.forEach((row: Record<string, unknown>) => {
                const name = (row.inventory_item as Record<string, unknown>).name as string;
                itemCounts[name] = (itemCounts[name] || 0) + (row.quantity as number);
            });

            const topBrands = Object.entries(itemCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);


            // 4. INVENTORY HEALTH (Below Reorder Level)
            // Using view_branch_inventory
            const { data: lowStockData, error: lowStockError } = await supabase
                .from('view_branch_inventory')
                .select('item_id, name, quantity, reorder_level, supplier_name')
                .eq('branch_id', activeBranchId)
                .is('deleted_at', null);

            if (lowStockError) throw lowStockError;

            const inventoryHealth = (lowStockData || [])
                .filter((item: Record<string, unknown>) => (item.quantity as number) <= (item.reorder_level as number))
                .map((item: Record<string, unknown>) => ({
                    item_id: item.item_id as string,
                    name: item.name as string,
                    stock_quantity: item.quantity as number,
                    reorder_level: item.reorder_level as number,
                    supplier_name: item.supplier_name as string || 'N/A'
                }))
                .slice(0, 10); // Limit to top 10 critical


            // 5. BAY UTILIZATION
            const BAY_CAPACITY = 5; // Hardcoded
            const { count: activeJobsCount, error: jobError } = await supabase
                .from('service_job')
                .select('*', { count: 'exact', head: true })
                .eq('branch_id', activeBranchId)
                .eq('status', 'in-progress')
                .is('deleted_at', null);

            if (jobError) throw jobError;

            const active = activeJobsCount || 0;
            const bayUtilization = {
                active,
                capacity: BAY_CAPACITY,
                utilization: (active / BAY_CAPACITY) * 100
            };

            setData({
                revenueSplit,
                averageRepairOrder: {
                    value: currentARO,
                    trend: aroTrend,
                    period: 'This Month'
                },
                topBrands,
                inventoryHealth,
                bayUtilization
            });

        } catch (err: unknown) {
            console.error('Error fetching dashboard analytics:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [user, activeBranchId]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return { data, isLoading, error, refetch: fetchAnalytics };
}
