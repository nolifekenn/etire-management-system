// /app/reports/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import SalesReportCard from "./SalesReportCard";
import InventoryReportCard from "./InventoryReportCard";
import ServiceReportCard from "./ServiceReportCard";
import { StatCard } from "@/components/StatCard";
import { fetchSalesReport } from "@/lib/salesReportService"; // ✅ reuse same service
import { supabase } from "@/lib/supabaseClient";

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
    <div className="p-6 space-y-8">
      <PageHeader
        title="Reports & Analytics"
        description="Generate detailed reports for sales, inventory, and service jobs."
      />

      {/* DASHBOARD SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Revenue"
          value={`₱${summary.totalRevenue.toLocaleString()}`}
          icon={() => <span>💰</span>}
        />
        <StatCard
          title="Total Profit"
          value={`₱${summary.totalProfit.toLocaleString()}`}
          icon={() => <span>📈</span>}
        />
        <StatCard
          title="Items Sold"
          value={summary.itemsSold.toString()}
          icon={() => <span>📦</span>}
        />
        <StatCard
          title="Stock Value"
          value={`₱${summary.stockValue.toLocaleString()}`}
          icon={() => <span>🏷️</span>}
        />
        <StatCard
          title="Potential Revenue"
          value={`₱${summary.potentialRevenue.toLocaleString()}`}
          icon={() => <span>🚀</span>}
        />
        <StatCard
          title="Completed Jobs"
          value={summary.completedJobs.toString()}
          icon={() => <span>✅</span>}
        />
        <StatCard
          title="Service Fees (Completed)"
          value={`₱${summary.serviceFees.toLocaleString()}`}
          icon={() => <span>🛠️</span>}
        />
      </div>

      {/* REPORT CARDS */}
      <SalesReportCard />
      <InventoryReportCard />
      <ServiceReportCard />
    </div>
  );
}
