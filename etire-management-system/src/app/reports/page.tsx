// app/reports/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { fetchSalesReport, exportSalesReportPDF, exportSalesReportCSV } from "@/lib/salesReportService";
import { fetchInventoryReport, exportInventoryReportPDF, exportInventoryReportCSV } from "@/lib/inventoryReportService";
import { fetchServiceJobsReport, exportServiceJobsReportPDF, exportServiceJobsReportCSV } from "@/lib/serviceReportService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  Wrench,
  ShoppingCart,
  RefreshCw,
  Download,
  Clock,
  TrendingDown,
  Zap,
  Target,
  Percent,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  TrendingUp as TrendingUpIcon,
  DollarSign as DollarSignIcon,
  Package as PackageIcon,
  Wrench as WrenchIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar
} from "recharts";

import { useAuth } from "@/hooks/useAuth";

type JobSummaryRow = {
  status: string | null;
  job_id: string;
  service_fee?: number | null;
};

type ServiceRevenueRecord = {
  quantity?: number | null;
  price_at_sale?: number | null;
};

type PieLabelData = {
  name?: string | number;
  percent?: number;
};

export default function EnhancedReportsPage() {
  const { activeBranchId } = useAuth();
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    itemsSold: 0,
    stockValue: 0,
    potentialRevenue: 0,
    completedJobs: 0,
    serviceFees: 0,
    revenueGrowth: 0,
    profitMargin: 0,
    gmroi: 0, // Changed from stockTurnover to GMROI
  });

  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);

      // 🔹 SALES SUMMARY
      const res = await fetchSalesReport({
        date_from: "",
        date_to: "",
        branch_id: activeBranchId || "",
        vehicle_type_id: "",
      });

      let totalRevenue = 0;
      let totalProfit = 0;
      let itemsSold = 0;

      if (res?.sales?.length) {
        totalRevenue = res.sales.reduce(
          (sum, sale) => sum + (sale.total_amount || 0),
          0
        );

        totalProfit = res.sales
          .flatMap((sale) => sale.sale_item)
          .reduce((sum, item) => sum + (item.profit || 0), 0);

        itemsSold = res.sales
          .flatMap((sale) => sale.sale_item)
          .reduce((sum, item) => sum + (item.quantity || 0), 0);
      }

      // 🔹 INVENTORY SUMMARY
      let invQuery = supabase
        .from("view_branch_inventory")
        .select("stock_quantity:quantity, cost_price, sale_price")
        .is("deleted_at", null);

      if (activeBranchId) {
        invQuery = invQuery.eq('branch_id', activeBranchId);
      }

      const { data: inventory, error: invError } = await invQuery;

      if (invError) console.error("Inventory summary error:", invError);

      const stockValue =
        inventory?.reduce(
          (sum, i) => sum + (i.stock_quantity || 0) * (i.cost_price || 0),
          0
        ) || 0;

      const potentialRevenue =
        inventory?.reduce(
          (sum, i) => sum + (i.stock_quantity || 0) * (i.sale_price || 0),
          0
        ) || 0;

      // Helper: derive service revenue from recorded sales when service_fee column is unavailable
      const deriveServiceRevenueFromSales = async () => {
        let serviceRevenueQuery = supabase
          .from('sale_item')
          .select(`
            quantity,
            price_at_sale,
            inventory_item!inner (
              category
            ),
            sale!inner (
              branch_id,
              deleted_at
            )
          `)
          .eq('inventory_item.category', 'service')
          .is('sale.deleted_at', null);

        if (activeBranchId) {
          serviceRevenueQuery = serviceRevenueQuery.eq('sale.branch_id', activeBranchId);
        }

        const { data, error } = await serviceRevenueQuery;

        if (error) {
          console.error('Service revenue summary error:', error);
          return 0;
        }

        return data?.reduce((sum: number, item: ServiceRevenueRecord) => (
          sum + (item.price_at_sale || 0) * (item.quantity || 0)
        ), 0) || 0;
      };

      // 🔹 SERVICE JOBS SUMMARY
      let jobsQuery = supabase
        .from("service_job")
        .select("status, service_fee, job_id")
        .is("deleted_at", null);

      if (activeBranchId) {
        jobsQuery = jobsQuery.eq('branch_id', activeBranchId);
      }

      const jobsResult = await jobsQuery;
      let jobs: JobSummaryRow[] = (jobsResult.data as JobSummaryRow[]) ?? [];
      let serviceFees = 0;
      let completedJobs = 0;
      let serviceRevenueFallbackNeeded = false;

      if (jobsResult.error) {
        console.error("Service jobs summary error:", jobsResult.error);

        if (jobsResult.error.message?.toLowerCase().includes('service_fee')) {
          serviceRevenueFallbackNeeded = true;

          let fallbackQuery = supabase
            .from('service_job')
            .select('status, job_id')
            .is('deleted_at', null);

          if (activeBranchId) {
            fallbackQuery = fallbackQuery.eq('branch_id', activeBranchId);
          }

          const fallbackResult = await fallbackQuery;

          if (fallbackResult.error) {
            console.error('Service jobs fallback summary error:', fallbackResult.error);
          } else {
            jobs = (fallbackResult.data ?? []).map((job) => ({
              ...job,
              service_fee: null,
            }));
          }
        }
      }

      const completedRecords = jobs.filter((job) => job?.status === "completed");
      completedJobs = completedRecords.length;

      if (serviceRevenueFallbackNeeded) {
        serviceFees = await deriveServiceRevenueFromSales();
      } else {
        serviceFees = completedRecords.reduce(
          (sum, job) => sum + (job.service_fee ?? 0),
          0
        );
      }

      // 🔹 CALCULATE METRICS
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // CALCULATE GMROI (Gross Margin Return on Inventory)
      const gmroi = stockValue > 0 ? (totalProfit / stockValue) * 100 : 0;

      // Mock revenue growth (in real app, compare with previous period)
      const revenueGrowth = 12.5; // Example growth percentage

      // ✅ Update summary state
      setSummary({
        totalRevenue,
        totalProfit,
        itemsSold,
        stockValue,
        potentialRevenue,
        completedJobs,
        serviceFees,
        revenueGrowth,
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        gmroi: parseFloat(gmroi.toFixed(1)), // GMROI instead of stock turnover
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Summary fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleRefresh = () => {
    fetchSummary();
  };

  // Chart data calculations - UPDATED COLORS
  const revenueSourcesData = [
    {
      name: 'Sales Revenue',
      value: Math.max(0, summary.totalRevenue - summary.serviceFees),
      color: '#9333ea', // Purple
      description: 'Revenue from product sales'
    },
    {
      name: 'Service Revenue',
      value: summary.serviceFees,
      color: '#4f46e5', // Indigo
      description: 'Revenue from service jobs'
    }
  ];

  const revenueProfitData = [
    {
      month: 'Jan',
      revenue: summary.totalRevenue * 0.8,
      profit: summary.totalProfit * 0.7,
      target: summary.totalRevenue * 0.85
    },
    {
      month: 'Feb',
      revenue: summary.totalRevenue * 0.9,
      profit: summary.totalProfit * 0.8,
      target: summary.totalRevenue * 0.9
    },
    {
      month: 'Mar',
      revenue: summary.totalRevenue,
      profit: summary.totalProfit,
      target: summary.totalRevenue * 1.1
    }
  ];

  const inventoryValueData = [
    {
      name: 'Current Value',
      value: summary.stockValue,
      color: '#3b82f6', // Blue (replaced orange)
      description: 'Total cost of inventory on hand'
    },
    {
      name: 'Potential Revenue',
      value: summary.potentialRevenue,
      color: '#14b8a6', // Teal
      description: 'Revenue if all inventory is sold'
    }
  ];

  const performanceMetricsData = [
    {
      metric: 'Profit Margin',
      value: summary.profitMargin,
      target: 20,
      unit: '%',
      color: '#10b981', // Green
      description: 'Profit as percentage of revenue',
      icon: <Percent className="w-4 h-4" />
    },
    {
      metric: 'GMROI',
      value: summary.gmroi,
      target: 50,
      unit: '%',
      color: '#3b82f6', // Blue
      description: 'Gross Margin Return on Inventory',
      icon: <TrendingUpIcon className="w-4 h-4" />
    },
    {
      metric: 'Service Efficiency',
      value: Math.min((summary.completedJobs / 100) * 100, 100),
      target: 80,
      unit: '%',
      color: '#8b5cf6', // Violet
      description: 'Job completion rate',
      icon: <CheckCircle className="w-4 h-4" />
    }
  ];

  const kpiCardsData = [
    {
      title: "Total Revenue",
      value: `₱${summary.totalRevenue.toLocaleString()}`,
      icon: <DollarSignIcon className="h-5 w-5 text-white" />,
      change: summary.revenueGrowth,
      trend: "up",
      color: "from-purple-600 to-indigo-600",
      bgColor: "bg-purple-500/10",
      description: "Combined sales and service revenue",
      iconBg: "bg-gradient-to-r from-purple-600 to-indigo-600"
    },
    {
      title: "Total Profit",
      value: `₱${summary.totalProfit.toLocaleString()}`,
      icon: <TrendingUpIcon className="h-5 w-5 text-white" />,
      change: summary.profitMargin,
      trend: summary.profitMargin > 0 ? "up" : "down",
      color: "from-emerald-600 to-green-600",
      bgColor: "bg-emerald-500/10",
      description: "Net profit after costs",
      iconBg: "bg-gradient-to-r from-emerald-600 to-green-600"
    },
    {
      title: "Items Sold",
      value: summary.itemsSold.toLocaleString(),
      icon: <ShoppingCart className="h-5 w-5 text-white" />,
      change: 8.2,
      trend: "up",
      color: "from-blue-600 to-sky-600",
      bgColor: "bg-blue-500/10",
      description: "Total units sold",
      iconBg: "bg-gradient-to-r from-blue-600 to-sky-600"
    },
    {
      title: "Service Revenue",
      value: `₱${summary.serviceFees.toLocaleString()}`,
      icon: <WrenchIcon className="h-5 w-5 text-white" />,
      change: 15.3,
      trend: "up",
      color: "from-violet-600 to-purple-600", // Changed from red to violet
      bgColor: "bg-violet-500/10", // Changed from red to violet
      description: "Revenue from service jobs",
      iconBg: "bg-gradient-to-r from-violet-600 to-purple-600" // Changed from red to violet
    }
  ];

  // UPDATED COLORS - Removed orange, using purple, blue, green, teal palette
  const COLORS = ['#9333ea', '#3b82f6', '#10b981', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 py-4">

        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              Reports & Analytics
            </h1>
            {lastUpdated && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Sales Report</DropdownMenuLabel>
                <DropdownMenuItem onClick={async () => {
                  const data = await fetchSalesReport({});
                  exportSalesReportPDF(data, {});
                }}>
                  <Download className="h-4 w-4 mr-2" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  const data = await fetchSalesReport({});
                  exportSalesReportCSV(data);
                }}>
                  <Download className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Inventory Report</DropdownMenuLabel>
                <DropdownMenuItem onClick={async () => {
                  const data = await fetchInventoryReport({});
                  exportInventoryReportPDF(data, {});
                }}>
                  <Download className="h-4 w-4 mr-2" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  const data = await fetchInventoryReport({});
                  exportInventoryReportCSV(data);
                }}>
                  <Download className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Service Jobs Report</DropdownMenuLabel>
                <DropdownMenuItem onClick={async () => {
                  const { jobs } = await fetchServiceJobsReport({});
                  exportServiceJobsReportPDF(jobs, {});
                }}>
                  <Download className="h-4 w-4 mr-2" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  const { jobs } = await fetchServiceJobsReport({});
                  exportServiceJobsReportCSV(jobs);
                }}>
                  <Download className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* KPI Cards - Minimal Overview */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}>
          {kpiCardsData.map((card, index) => (
            <Card key={index} className="border-slate-200/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:border-slate-300">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${card.iconBg}`}>
                    {card.icon}
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-full ${card.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {card.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {card.change}%
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900 mb-2">{card.value}</p>
                <p className="text-xs text-slate-500">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MAIN CHART SECTION */}
        <div className="space-y-8">

          {/* Revenue Analysis Row */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}>
            {/* Revenue Sources Pie Chart */}
            <Card className="border-slate-200/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                    <PieChartIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 font-poppins">Revenue Distribution</h3>
                    <p className="text-sm text-slate-500 font-poppins">
                      Visual breakdown of income sources between product sales and service fees
                    </p>
                  </div>
                </div>

                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueSourcesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }: PieLabelData) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                        animationDuration={800}
                      >
                        {revenueSourcesData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="white"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => {
                          const { payload } = props;
                          return [
                            `₱${Number(value).toLocaleString()}`,
                            payload.description || name
                          ];
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {revenueSourcesData.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }}></div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{source.name}</p>
                          <p className="text-xs text-slate-500">{source.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">₱{source.value.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">
                          {((source.value / summary.totalRevenue) * 100 || 0).toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue & Profit Trend */}
            <Card className="border-slate-200/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
                    <LineChartIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 font-poppins">Revenue & Profit Trend</h3>
                    <p className="text-sm text-slate-500 font-poppins">
                      Track monthly performance trends and compare against targets for better financial planning
                    </p>
                  </div>
                </div>

                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={revenueProfitData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <YAxis
                        tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          const label = name === 'revenue' ? 'Revenue' :
                            name === 'profit' ? 'Profit' : 'Target';
                          return [`₱${Number(value).toLocaleString()}`, label];
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#9333ea"
                        fill="url(#colorRevenue)"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        name="Profit"
                        stroke="#10b981"
                        fill="url(#colorProfit)"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="target"
                        name="Target"
                        stroke="#8b5cf6" // Changed from yellow to violet
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9333ea" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-700 font-medium">Current Revenue</p>
                      <p className="text-lg font-bold text-purple-900">
                        ₱{summary.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-emerald-700 font-medium">Current Profit</p>
                      <p className="text-lg font-bold text-emerald-900">
                        ₱{summary.totalProfit.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-violet-50 rounded-lg"> {/* Changed from amber to violet */}
                      <p className="text-xs text-violet-700 font-medium">Growth</p>
                      <p className="text-lg font-bold text-violet-900">
                        +{summary.revenueGrowth}%
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Insight:</span> {summary.profitMargin >= 15
                      ? "Strong profit margins with consistent growth"
                      : "Focus on improving profit margins through cost optimization"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory & Performance Row */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 delay-200'
            }`}>
            {/* Inventory Analysis */}
            <Card className="border-slate-200/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl"> {/* Changed from orange to blue */}
                    <PackageIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 font-poppins">Inventory Value Analysis</h3>
                    <p className="text-sm text-slate-500 font-poppins">
                      Compare current inventory investment against potential revenue to identify opportunity gaps
                    </p>
                  </div>
                </div>

                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={inventoryValueData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <YAxis
                        tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value, name, props) => {
                          const { payload } = props;
                          return [
                            `₱${Number(value).toLocaleString()}`,
                            payload.description || name
                          ];
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        animationDuration={1000}
                      >
                        {inventoryValueData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  {/* 1. Inventory Efficiency Bar */}
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"></div> {/* Changed from orange to blue */}
                        <span className="text-sm font-medium text-slate-800">Inventory Efficiency</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-slate-900">
                          {summary.potentialRevenue > 0
                            ? ((summary.totalRevenue - summary.serviceFees) / summary.potentialRevenue * 100).toFixed(1)
                            : '0'}%
                        </span>
                        <span className="text-xs text-slate-500 ml-1">utilization</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" // Changed from orange to blue
                        style={{
                          width: `${Math.min(
                            summary.potentialRevenue > 0
                              ? ((summary.totalRevenue - summary.serviceFees) / summary.potentialRevenue * 100)
                              : 0,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* 2. Projected Margin Bar */}
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                        <span className="text-sm font-medium text-slate-800">Projected Margin</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-slate-900">
                          {summary.potentialRevenue > 0
                            ? (((summary.potentialRevenue - summary.stockValue) / summary.potentialRevenue) * 100).toFixed(1)
                            : '0'}%
                        </span>
                        <span className="text-xs text-slate-500 ml-1">profitability</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            summary.potentialRevenue > 0
                              ? (((summary.potentialRevenue - summary.stockValue) / summary.potentialRevenue) * 100)
                              : 0,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* 3. Cost Ratio Bar */}
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                        <span className="text-sm font-medium text-slate-800">Cost Ratio</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-slate-900">
                          {summary.potentialRevenue > 0
                            ? ((summary.stockValue / summary.potentialRevenue) * 100).toFixed(1)
                            : '0'}%
                        </span>
                        <span className="text-xs text-slate-500 ml-1">investment</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            summary.potentialRevenue > 0
                              ? ((summary.stockValue / summary.potentialRevenue) * 100)
                              : 0,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Interpretation:</span> Higher potential revenue compared to current value indicates opportunities for sales growth. GMROI of {summary.gmroi.toFixed(1)}% shows {summary.gmroi > 100 ? 'excellent' : 'moderate'} return on inventory investment.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="border-slate-200/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-sky-600 rounded-xl">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 font-poppins">Key Performance Indicators</h3>
                    <p className="text-sm text-slate-500 font-poppins">
                      Critical business metrics showing overall performance and efficiency across operations
                    </p>
                  </div>
                </div>

                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="25%"
                      outerRadius="95%"
                      data={performanceMetricsData}
                      startAngle={180}
                      endAngle={0}
                      barSize={24}
                    >
                      <RadialBar

                        background={{ fill: '#f8fafc', fillOpacity: 0.8 }}
                        dataKey="value"
                        cornerRadius={8}
                        label={false}
                      >
                        {performanceMetricsData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            fillOpacity={0.8}
                          />
                        ))}
                      </RadialBar>
                      <Tooltip
                        formatter={(value, name, props) => {
                          const { payload } = props;
                          return [
                            `${value}${payload.unit}`,
                            payload.metric
                          ];
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  {performanceMetricsData.map((metric, index) => (
                    <div key={index} className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${metric.color}20` }}>
                            {metric.icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{metric.metric}</p>
                            <p className="text-xs text-slate-500">{metric.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-slate-900">{metric.value.toFixed(1)}{metric.unit}</span>
                          <div className="text-xs text-slate-500">
                            Target: {metric.target}{metric.unit}
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                            backgroundColor: metric.color
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Current</span>
                        <span className={metric.value >= metric.target ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                          {metric.value >= metric.target ? '✓ Target Achieved' : `${((metric.target - metric.value) / metric.target * 100).toFixed(1)}% below target`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Performance */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 delay-300'
            }`}>
            <Card className="border-slate-200/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl"> {/* Changed from red to violet */}
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 font-poppins">Service Operations Performance</h3>
                    <p className="text-sm text-slate-500 font-poppins">
                      Monitor service department efficiency, revenue generation, and job completion metrics
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Completed Jobs</p>
                        <p className="text-2xl font-bold text-slate-900">{summary.completedJobs}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Total service jobs successfully completed</p>
                    <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min((summary.completedJobs / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-sky-600 rounded-xl">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Service Revenue</p>
                        <p className="text-2xl font-bold text-slate-900">
                          ₱{summary.serviceFees.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Total income generated from service operations</p>
                    <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-sky-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(
                            summary.totalRevenue > 0
                              ? (summary.serviceFees / summary.totalRevenue * 100)
                              : 0,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Service Contribution</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {summary.totalRevenue > 0
                            ? ((summary.serviceFees / summary.totalRevenue) * 100).toFixed(1)
                            : '0'}%
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Percentage of total revenue from services</p>
                    <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(
                            summary.totalRevenue > 0
                              ? (summary.serviceFees / summary.totalRevenue * 100)
                              : 0,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-800">Service Department Insights</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {summary.serviceFees > summary.totalRevenue * 0.3
                      ? "Services are a significant revenue driver. Consider expanding service offerings."
                      : "Services have growth potential. Focus on upselling and marketing service packages."}
                    {" "}Average revenue per job: ₱{summary.completedJobs > 0
                      ? (summary.serviceFees / summary.completedJobs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '0'}.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Report downloads available in header dropdown */}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }

        .ripple {
          position: relative;
          overflow: hidden;
        }

        .ripple:after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 5px;
          height: 5px;
          background: rgba(255, 255, 255, 0.5);
          opacity: 0;
          border-radius: 100%;
          transform: scale(1, 1) translate(-50%);
          transform-origin: 50% 50%;
        }

        .ripple:focus:not(:active)::after {
          animation: ripple 1s ease-out;
        }

        @keyframes ripple {
          0% {
            transform: scale(0, 0);
            opacity: 0.5;
          }
          20% {
            transform: scale(25, 25);
            opacity: 0.3;
          }
          100% {
            opacity: 0;
            transform: scale(40, 40);
          }
        }

        @keyframes progress {
          from {
            width: 0%;
          }
        }

        .progress-bar {
          animation: progress 1s ease-out forwards;
        }

        .ease-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}