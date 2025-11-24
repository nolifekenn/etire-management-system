"use client";

import React, { useState, useEffect } from "react";
import {
  fetchSalesReport,
  exportSalesReportPDF,
  exportSalesReportCSV,
} from "@/lib/salesReportService";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/StatCard";
import { DataTableWrapper } from "@/components/DataTableWrapper";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";   // ✅ Option 2 import

export default function SalesReportCard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    branch_id: "",
    vehicle_type_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);

  // Fetch dropdown options
  useEffect(() => {
    const fetchDropdowns = async () => {
      if (!supabase) {
        console.error("Supabase client not initialized");
        return;
      }

      const { data: branchData } = await supabase
        .from("branch")
        .select("branch_id, name")
        .eq("is_active", true);
      if (branchData) setBranches(branchData);

      const { data: vehicleTypeData } = await supabase
        .from("vehicle_type")
        .select("vehicle_type_id, name");
      if (vehicleTypeData) setVehicleTypes(vehicleTypeData);
    };
    fetchDropdowns();
  }, []);

  const handleFetch = async () => {
    try {
      setLoading(true);
      const res = await fetchSalesReport(filters);

      if (!res || !res.sales) {
        toast({
          title: "No Data",
          description: "No sales found for the given filters.",
        });
        setReportData([]);
        return;
      }

      setReportData(res.sales);

      toast({
        title: "Report Loaded",
        description: "Sales report data retrieved successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load sales report.",
      });
    } finally {
      setLoading(false);
    }
  };

const handlePDF = () => {
  if (!reportData.length) {
    toast({ title: "No Data", description: "Generate the report first before exporting." });
    return;
  }

  const formattedRows = reportData.flatMap((sale) =>
    sale.sale_item.map((item) => ({
      sale_date: sale.sale_date.substring(0, 10),
      customer: sale.customer?.name || "—",
      item: item.inventory_item.name,
      quantity: item.quantity,
      price: item.price_at_sale,
      line_total: item.line_total,
      profit: item.profit,
    }))
  );

  exportSalesReportPDF(formattedRows, filters);
};


  const handleCSV = () => {
    if (!reportData.length) {
      toast({
        title: "No Data",
        description: "Generate the report first before exporting.",
      });
      return;
    }
    exportSalesReportCSV(reportData);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md space-y-6">
      <h2 className="text-xl font-semibold">📊 Sales Report</h2>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Date From */}
        <div>
          <label className="text-sm">Date From</label>
          <input
            type="date"
            className="form-input w-full"
            value={filters.date_from}
            onChange={(e) =>
              setFilters({ ...filters, date_from: e.target.value })
            }
          />
        </div>

        {/* Date To */}
        <div>
          <label className="text-sm">Date To</label>
          <input
            type="date"
            className="form-input w-full"
            value={filters.date_to}
            onChange={(e) =>
              setFilters({ ...filters, date_to: e.target.value })
            }
          />
        </div>

        {/* Branch Dropdown */}
        <div>
          <label className="text-sm">Branch</label>
          <select
            className="form-select w-full"
            value={filters.branch_id}
            onChange={(e) =>
              setFilters({ ...filters, branch_id: e.target.value })
            }
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Type Dropdown */}
        <div>
          <label className="text-sm">Vehicle Type</label>
          <select
            className="form-select w-full"
            value={filters.vehicle_type_id}
            onChange={(e) =>
              setFilters({ ...filters, vehicle_type_id: e.target.value })
            }
          >
            <option value="">All Vehicle Types</option>
            {vehicleTypes.map((vt) => (
              <option key={vt.vehicle_type_id} value={vt.vehicle_type_id}>
                {vt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BUTTONS */}
      <div className="flex gap-3">
        <Button onClick={handleFetch} disabled={loading}>
          {loading ? "Loading..." : "Generate Report"}
        </Button>
        <Button variant="outline" onClick={handlePDF}>
          Export PDF
        </Button>
        <Button variant="outline" onClick={handleCSV}>
          Export CSV
        </Button>
      </div>

      {/* KPI CARDS */}
      {reportData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Revenue"
            value={`₱${reportData
              .reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
              .toLocaleString()}`}
            icon={() => <span>💰</span>}
          />
          <StatCard
            title="Total Profit"
            value={`₱${reportData
              .flatMap((sale) => sale.sale_item)
              .reduce((sum, item) => sum + (item.profit || 0), 0)
              .toLocaleString()}`}
            icon={() => <span>📈</span>}
          />
          <StatCard
            title="Items Sold"
            value={reportData
              .flatMap((sale) => sale.sale_item)
              .reduce((sum, item) => sum + (item.quantity || 0), 0)
              .toString()}
            icon={() => <span>📦</span>}
          />
        </div>
      )}

      {/* TABLE */}
      {reportData.length > 0 && (
        <DataTableWrapper
          title="Sales Items"
          columns={[
            { key: "sale_date", header: "Date", sortable: true },
            { key: "customer", header: "Customer" },
            { key: "item", header: "Item" },
            { key: "quantity", header: "Qty", sortable: true },
            { key: "price", header: "Price", sortable: true },
            { key: "line_total", header: "Line Total", sortable: true },
            { key: "profit", header: "Profit", sortable: true },
          ]}
          data={reportData.flatMap((sale) =>
            sale.sale_item.map((item) => ({
              sale_date: sale.sale_date.substring(0, 10),
              customer: sale.customer?.name || "—",
              item: item.inventory_item.name,
              quantity: item.quantity,
              price: item.price_at_sale,
              line_total: item.line_total,
              profit: item.profit,
            }))
          )}
        />
      )}
    </div>
  );
}
