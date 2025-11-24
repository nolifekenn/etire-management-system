"use client";

import React, { useState, useEffect } from "react";
import {
  fetchInventoryReport,
  exportInventoryReportPDF,
  exportInventoryReportCSV,
} from "@/lib/inventoryReportService";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/StatCard";
import { DataTableWrapper } from "@/components/DataTableWrapper";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

export default function InventoryReportCard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    branch_id: "",
    supplier_id: "",
    category: "",
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Fetch dropdown options
  useEffect(() => {
    const fetchDropdowns = async () => {
      const { data: branchData } = await supabase
        .from("branch")
        .select("branch_id, name")
        .eq("is_active", true);
      if (branchData) setBranches(branchData);

      const { data: supplierData } = await supabase
        .from("supplier")
        .select("supplier_id, name")
        .eq("is_active", true);
      if (supplierData) setSuppliers(supplierData);
    };
    fetchDropdowns();
  }, []);

  const handleFetch = async () => {
    try {
      setLoading(true);
      const res = await fetchInventoryReport(filters);

      if (!res || !res.inventory) {
        toast({
          title: "No Data",
          description: "No inventory items found for the given filters.",
        });
        setReportData([]);
        return;
      }

      setReportData(res.inventory);
      toast({
        title: "Report Loaded",
        description: "Inventory report data retrieved successfully.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to load inventory report.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = () => {
    if (!reportData.length) {
      toast({
        title: "No Data",
        description: "Generate the report first before exporting.",
      });
      return;
    }
    exportInventoryReportPDF(reportData, filters);
  };

  const handleCSV = () => {
    if (!reportData.length) {
      toast({
        title: "No Data",
        description: "Generate the report first before exporting.",
      });
      return;
    }
    exportInventoryReportCSV(reportData);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md space-y-6">
      <h2 className="text-xl font-semibold">📦 Inventory Report</h2>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Branch Dropdown */}
        <div>
          <label className="text-sm">Branch</label>
          <select
            className="form-select w-full"
            value={filters.branch_id}
            onChange={(e) =>
              setFilters({ ...filters, branch_id: e.target.value || null })
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

        {/* Supplier Dropdown */}
        <div>
          <label className="text-sm">Supplier</label>
          <select
            className="form-select w-full"
            value={filters.supplier_id}
            onChange={(e) =>
              setFilters({ ...filters, supplier_id: e.target.value || null })
            }
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.supplier_id} value={s.supplier_id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Text Input */}
        <div>
          <label className="text-sm">Category</label>
          <input
            type="text"
            placeholder="e.g. tire, tools"
            className="form-input w-full"
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value || "" })
            }
          />
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
            title="Total Stock Value"
            value={`₱${reportData
              .reduce((sum, i) => sum + (i.stock_value || 0), 0)
              .toLocaleString()}`}
            icon={() => <span>💰</span>}
          />
          <StatCard
            title="Potential Revenue"
            value={`₱${reportData
              .reduce((sum, i) => sum + (i.potential_revenue || 0), 0)
              .toLocaleString()}`}
            icon={() => <span>📈</span>}
          />
          <StatCard
            title="Low Stock Items"
            value={reportData.filter((i) => i.low_stock).length.toString()}
            icon={() => <span>⚠️</span>}
          />
        </div>
      )}

      {/* TABLE */}
      {reportData.length > 0 && (
        <DataTableWrapper
          title="Inventory Items"
          columns={[
            { key: "name", header: "Item", sortable: true },
            { key: "category", header: "Category", sortable: true },
            { key: "stock_quantity", header: "Stock", sortable: true },
            { key: "cost_price", header: "Cost Price", sortable: true },
            { key: "sale_price", header: "Sale Price", sortable: true },
            { key: "stock_value", header: "Stock Value", sortable: true },
            { key: "potential_revenue", header: "Potential Revenue", sortable: true },
          ]}
          data={reportData}
        />
      )}
    </div>
  );
}
