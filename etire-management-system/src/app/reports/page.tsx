// app/reports/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import SalesReportCard from "./SalesReportCard";
import InventoryReportCard from "./InventoryReportCard";
import ServiceReportCard from "./ServiceReportCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { fetchSalesReport } from "@/lib/salesReportService";
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Rocket, 
  CheckCircle, 
  Wrench,
  BarChart3,
  ShoppingCart,
  RefreshCw,
  Download,
  Calendar,
  Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Design System from branches page
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins ripple",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 font-poppins ripple",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg font-poppins ripple",
};

// Enhanced StatCard component matching branches design
interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  percentage?: number;
  description?: string;
  color?: 'purple' | 'blue' | 'green' | 'orange' | 'teal' | 'emerald' | 'red';
}

const EnhancedStatCard = ({ title, value, icon, trend, percentage, description, color = 'purple' }: EnhancedStatCardProps) => {
  const colorConfig = {
    purple: { from: 'from-purple-500', to: 'to-indigo-600', bgFrom: 'from-purple-50', bgTo: 'to-indigo-50/50' },
    blue: { from: 'from-blue-500', to: 'to-sky-600', bgFrom: 'from-blue-50', bgTo: 'to-sky-50/50' },
    green: { from: 'from-green-500', to: 'to-emerald-600', bgFrom: 'from-green-50', bgTo: 'to-emerald-50/50' },
    orange: { from: 'from-orange-500', to: 'to-amber-600', bgFrom: 'from-orange-50', bgTo: 'to-amber-50/50' },
    teal: { from: 'from-teal-500', to: 'to-cyan-600', bgFrom: 'from-teal-50', bgTo: 'to-cyan-50/50' },
    emerald: { from: 'from-emerald-500', to: 'to-green-600', bgFrom: 'from-emerald-50', bgTo: 'to-green-50/50' },
    red: { from: 'from-red-500', to: 'to-rose-600', bgFrom: 'from-red-50', bgTo: 'to-rose-50/50' },
  };

  const colors = colorConfig[color];

  return (
    <Card className={`bg-gradient-to-r ${colors.bgFrom} ${colors.bgTo} border-slate-200/50 backdrop-blur-sm transition-all duration-350 ease-spring hover:translate-y-[-6px] hover:shadow-2xl`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 font-poppins">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2 font-poppins flex items-center gap-2">
              {typeof value === 'number' ? value.toLocaleString() : value}
              {trend && percentage !== undefined && (
                <span className={`text-sm font-medium flex items-center gap-1 ${
                  trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {percentage}%
                </span>
              )}
            </p>
            {description && (
              <p className="text-sm text-slate-500 mt-1 font-poppins">{description}</p>
            )}
          </div>
          <div className={`p-3 bg-gradient-to-r ${colors.from} ${colors.to} rounded-xl`}>
            {icon}
          </div>
        </div>
        {trend === 'up' && percentage !== undefined && (
          <div className="mt-4 h-2 bg-green-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full progress-bar"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function EnhancedReportsPage() {
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
    stockTurnover: 0,
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
        branch_id: "",
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
      const { data: inventory, error: invError } = await supabase
        .from("inventory_item")
        .select("stock_quantity, cost_price, sale_price");

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

      // 🔹 SERVICE JOBS SUMMARY
      const { data: jobs, error: jobsError } = await supabase
        .from("service_job")
        .select("status, service_fee, job_id");

      if (jobsError) console.error("Service jobs summary error:", jobsError);

      const completedJobs =
        jobs?.filter((j) => j.status === "completed").length || 0;

      const serviceFees =
        jobs
          ?.filter((j) => j.status === "completed")
          .reduce((sum, j) => sum + (j.service_fee || 0), 0) || 0;

      // 🔹 CALCULATE METRICS
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const stockTurnover = itemsSold > 0 && stockValue > 0 ? (itemsSold / stockValue) : 0;
      
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
        stockTurnover: parseFloat(stockTurnover.toFixed(2)),
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Summary fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleRefresh = () => {
    fetchSummary();
  };

  const handleExportAll = () => {
    // Placeholder for export functionality
    alert("Export functionality would be implemented here");
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">
      
      {/* Background Sections */}
      <div className="absolute top-0 left-0 w-full h-64 rounded-b-[40px] overflow-hidden">
        <div
          className="absolute inset-0 rounded-b-[40px] bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/image2.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 30%"
          }}
        ></div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-purple-300/20 rounded-br-full"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-300/20 rounded-bl-full"></div>
      </div>

      <div className="absolute top-64 left-0 w-full h-full bg-indigo-50/10">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-100/15 to-indigo-50/10"></div>
      </div>

      <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">

        {/* Header Section */}
        <div className={`mb-12 pt-7 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>

            <div className="relative z-10 flex-1">
              <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl font-poppins tracking-tight">
                Reports and Analytics
              </h1>
              <div className="flex items-center gap-6 text-white/90">
                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium">
                  Generate Reports and Analyze Performance
                </p>
                <div className="flex items-center gap-4 text-lg">
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                      <Clock className="w-5 h-5" />
                      Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Live data
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className={buttonStyles.glass + " active:scale-95"}
            >
              <RefreshCw className={`h-6 w-6 mr-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>


        {/* ENHANCED DASHBOARD SUMMARY - First Row */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}>
          <EnhancedStatCard
            title="Total Revenue"
            value={`₱${summary.totalRevenue.toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6 text-white" />}
            trend="up"
            percentage={summary.revenueGrowth}
            description="All time sales revenue"
            color="purple"
          />
          
          <EnhancedStatCard
            title="Total Profit"
            value={`₱${summary.totalProfit.toLocaleString()}`}
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            trend={summary.profitMargin > 0 ? "up" : "down"}
            percentage={summary.profitMargin}
            description={`${summary.profitMargin.toFixed(1)}% margin`}
            color="green"
          />
          
          <EnhancedStatCard
            title="Items Sold"
            value={summary.itemsSold.toLocaleString()}
            icon={<ShoppingCart className="h-6 w-6 text-white" />}
            description="Total units sold"
            color="blue"
          />
          
          <EnhancedStatCard
            title="Stock Value"
            value={`₱${summary.stockValue.toLocaleString()}`}
            icon={<Package className="h-6 w-6 text-white" />}
            description="Current inventory value"
            color="orange"
          />
        </div>

        {/* SECOND ROW OF METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <EnhancedStatCard
            title="Potential Revenue"
            value={`₱${summary.potentialRevenue.toLocaleString()}`}
            icon={<Rocket className="h-6 w-6 text-white" />}
            description="From current stock"
            color="teal"
          />
          
          <EnhancedStatCard
            title="Completed Jobs"
            value={summary.completedJobs.toString()}
            icon={<CheckCircle className="h-6 w-6 text-white" />}
            description="Service jobs completed"
            color="emerald"
          />
          
          <EnhancedStatCard
            title="Service Fees"
            value={`₱${summary.serviceFees.toLocaleString()}`}
            icon={<Wrench className="h-6 w-6 text-white" />}
            description="Total service revenue"
            color="red"
          />
        </div>

        {/* Performance Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 font-poppins">Profit Margin</h3>
                <div className={`p-2 rounded-lg ${summary.profitMargin >= 20 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  <span className="font-bold">{summary.profitMargin.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                  style={{ width: `${Math.min(summary.profitMargin, 100)}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 mt-2 font-poppins">
                {summary.profitMargin >= 20 ? 'Excellent' : summary.profitMargin >= 10 ? 'Good' : 'Needs Improvement'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 font-poppins">Stock Turnover</h3>
                <div className={`p-2 rounded-lg ${summary.stockTurnover > 0.5 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  <span className="font-bold">{summary.stockTurnover.toFixed(2)}x</span>
                </div>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full"
                  style={{ width: `${Math.min(summary.stockTurnover * 100, 100)}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 mt-2 font-poppins">
                {summary.stockTurnover > 0.5 ? 'Good turnover' : 'Slow moving inventory'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 font-poppins">Service Efficiency</h3>
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <span className="font-bold">{summary.completedJobs}</span>
                </div>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full"
                  style={{ width: `${Math.min((summary.completedJobs / 100) * 100, 100)}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 mt-2 font-poppins">
                {summary.completedJobs > 50 ? 'High efficiency' : 'Moderate efficiency'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* REPORT CARDS */}
        <div className="space-y-8">
          <SalesReportCard />
          <InventoryReportCard />
          <ServiceReportCard />
        </div>
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