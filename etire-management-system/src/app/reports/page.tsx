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
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Rocket, 
  CheckCircle, 
  Wrench,
  BarChart3,
  ShoppingCart,
  Tag
} from "lucide-react";

const poppins = {
  className: "font-poppins"
};

export default function ReportsPage() {
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    itemsSold: 0,
    stockValue: 0,
    potentialRevenue: 0,
    completedJobs: 0,
    serviceFees: 0,
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // 🔹 SALES SUMMARY (reuse same service as SalesReportCard)
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

        // 🔹 SERVICE JOBS SUMMARY (only completed jobs)
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

        // ✅ Update summary state
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
      }
    };

    fetchSummary();
  }, []);

  return (
    <div className={`p-6 space-y-8 ${poppins.className}`}>
      <PageHeader
        title="Reports & Analytics"
        description="Generate detailed reports for sales, inventory, and service jobs."
      />

      {/* ENHANCED DASHBOARD SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`₱${summary.totalRevenue.toLocaleString()}`}
          icon={() => (
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          )}
          trend="up"
        />
        <StatCard
          title="Total Profit"
          value={`₱${summary.totalProfit.toLocaleString()}`}
          icon={() => (
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          )}
          trend="up"
        />
        <StatCard
          title="Items Sold"
          value={summary.itemsSold.toString()}
          icon={() => (
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
          )}
          trend="up"
        />
        <StatCard
          title="Stock Value"
          value={`₱${summary.stockValue.toLocaleString()}`}
          icon={() => (
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
              <Package className="h-6 w-6 text-white" />
            </div>
          )}
        />
      </div>

      {/* SECOND ROW OF METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Potential Revenue"
          value={`₱${summary.potentialRevenue.toLocaleString()}`}
          icon={() => (
            <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl">
              <Rocket className="h-6 w-6 text-white" />
            </div>
          )}
        />
        <StatCard
          title="Completed Jobs"
          value={summary.completedJobs.toString()}
          icon={() => (
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          )}
        />
        <StatCard
          title="Service Fees"
          value={`₱${summary.serviceFees.toLocaleString()}`}
          icon={() => (
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
              <Wrench className="h-6 w-6 text-white" />
            </div>
          )}
        />
      </div>

      {/* REPORT CARDS */}
      <SalesReportCard />
      <InventoryReportCard />
      <ServiceReportCard />
    </div>
  );
}