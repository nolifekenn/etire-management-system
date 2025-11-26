// app/reports/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import SalesReportCard from "./SalesReportCard";
import InventoryReportCard from "./InventoryReportCard";
import ServiceReportCard from "./ServiceReportCard";
import { StatCard } from "@/components/StatCard";
import { fetchSalesReport } from "@/lib/salesReportService";
import { supabase } from "@/lib/supabaseClient";
import { TrendingUp, BarChart3, Download, RefreshCw, Package, Wrench, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const { toast } = useToast();
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    itemsSold: 0,
    stockValue: 0,
    potentialRevenue: 0,
    completedJobs: 0,
    serviceFees: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSummary = async () => {
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

      setSummary({
        totalRevenue,
        totalProfit,
        itemsSold,
        stockValue,
        potentialRevenue,
        completedJobs,
        serviceFees,
      });

    } catch (err) {
      console.error("Summary fetch error:", err);
      toast({
        title: "Error",
        description: "Failed to load report summary",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const buttonStyles = {
    glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg"
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
                Reports & Analytics
              </h1>
              <div className="flex items-center gap-6 text-white/90">
                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium">
                  <BarChart3 className="h-6 w-6 opacity-90" />
                  Comprehensive business insights and analytics
                </p>
                <div className="flex items-center gap-4 text-lg">
                  <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Live data
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={fetchSummary}
              disabled={isLoading}
              className={buttonStyles.glass + " active:scale-95"}
            >
              <RefreshCw className={`h-6 w-6 mr-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Dashboard Summary */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Business Overview</h2>
            <div className="flex items-center gap-2 text-slate-600">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Real-time Metrics</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="h-8 w-8 opacity-90" />
                <div className="text-right">
                  <div className="text-sm opacity-90">Total Revenue</div>
                  <div className="text-2xl font-bold">₱{summary.totalRevenue.toLocaleString()}</div>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-green-400 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (summary.totalRevenue / 1000000) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="h-8 w-8 opacity-90" />
                <div className="text-right">
                  <div className="text-sm opacity-90">Total Profit</div>
                  <div className="text-2xl font-bold">₱{summary.totalProfit.toLocaleString()}</div>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (summary.totalProfit / 100000) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <Package className="h-8 w-8 opacity-90" />
                <div className="text-right">
                  <div className="text-sm opacity-90">Items Sold</div>
                  <div className="text-2xl font-bold">{summary.itemsSold.toLocaleString()}</div>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-blue-300 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (summary.itemsSold / 1000) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <Wrench className="h-8 w-8 opacity-90" />
                <div className="text-right">
                  <div className="text-sm opacity-90">Completed Jobs</div>
                  <div className="text-2xl font-bold">{summary.completedJobs.toLocaleString()}</div>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-orange-300 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (summary.completedJobs / 100) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Package className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-600">Stock Value</div>
                  <div className="text-xl font-bold text-slate-800">₱{summary.stockValue.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-600">Potential Revenue</div>
                  <div className="text-xl font-bold text-slate-800">₱{summary.potentialRevenue.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-600">Service Fees</div>
                  <div className="text-xl font-bold text-slate-800">₱{summary.serviceFees.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
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

        .ease-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}