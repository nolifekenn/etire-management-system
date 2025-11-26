// app/reports/InventoryReportCard.tsx
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
import { 
  Download, 
  Filter, 
  Package, 
  Search, 
  X,
  Building,
  Truck,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InventoryReportCard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    branch_id: "all",
    supplier_id: "all",
    category: "",
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  // Enhanced filter state
  const [localFilters, setLocalFilters] = useState(filters);

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
      // Convert "all" to empty string for API
      const apiFilters = {
        ...localFilters,
        branch_id: localFilters.branch_id === "all" ? "" : localFilters.branch_id,
        supplier_id: localFilters.supplier_id === "all" ? "" : localFilters.supplier_id,
      };
      
      setFilters(apiFilters);
      const res = await fetchInventoryReport(apiFilters);

      if (!res || !res.inventory) {
        toast({
          title: "No Data",
          description: "No inventory items found for the given filters.",
          variant: "destructive"
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
        variant: "destructive"
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
        variant: "destructive"
      });
      return;
    }
    exportInventoryReportPDF(reportData, localFilters);
  };

  const handleCSV = () => {
    if (!reportData.length) {
      toast({
        title: "No Data",
        description: "Generate the report first before exporting.",
        variant: "destructive"
      });
      return;
    }
    exportInventoryReportCSV(reportData);
  };

  const clearFilters = () => {
    setLocalFilters({
      branch_id: "all",
      supplier_id: "all",
      category: "",
    });
  };

  const hasActiveFilters = localFilters.branch_id !== "all" || localFilters.supplier_id !== "all" || localFilters.category;

  // Calculate stats
  const totalStockValue = reportData.reduce((sum, i) => sum + (i.stock_value || 0), 0);
  const potentialRevenue = reportData.reduce((sum, i) => sum + (i.potential_revenue || 0), 0);
  const lowStockItems = reportData.filter((i) => i.low_stock).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-400 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Inventory Report</h2>
              <p className="text-white/90">Track stock levels, values, and inventory health</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Branch */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Branch</Label>
              <Select
                value={localFilters.branch_id}
                onValueChange={(value) => setLocalFilters({ ...localFilters, branch_id: value })}
              >
                <SelectTrigger className="border-slate-300 focus:border-indigo-400">
                  <Building className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id} value={b.branch_id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Supplier</Label>
              <Select
                value={localFilters.supplier_id}
                onValueChange={(value) => setLocalFilters({ ...localFilters, supplier_id: value })}
              >
                <SelectTrigger className="border-slate-300 focus:border-indigo-400">
                  <Truck className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.supplier_id} value={s.supplier_id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Category</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="e.g. tire, tools"
                  value={localFilters.category}
                  onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
                  className="pl-10 border-slate-300 focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Button 
                onClick={handleFetch}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                {loading ? "Loading..." : "Generate Report"}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handlePDF}
                disabled={!reportData.length}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleCSV}
                disabled={!reportData.length}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-slate-600 hover:text-slate-800"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active Filters Badge */}
          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-slate-600">Active filters:</span>
              <div className="flex flex-wrap gap-2">
                {localFilters.branch_id !== "all" && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs">
                    Branch: {branches.find(b => b.branch_id === localFilters.branch_id)?.name}
                  </span>
                )}
                {localFilters.supplier_id !== "all" && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs">
                    Supplier: {suppliers.find(s => s.supplier_id === localFilters.supplier_id)?.name}
                  </span>
                )}
                {localFilters.category && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs">
                    Category: {localFilters.category}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      {reportData.length > 0 && (
        <div className="p-6 border-b border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Stock Value"
              value={`₱${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={() => <div className="p-3 bg-blue-100 rounded-xl"><Package className="h-6 w-6 text-blue-600" /></div>}
            />
            <StatCard
              title="Potential Revenue"
              value={`₱${potentialRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={() => <div className="p-3 bg-green-100 rounded-xl"><TrendingUp className="h-6 w-6 text-green-600" /></div>}
            />
            <StatCard
              title="Low Stock Items"
              value={lowStockItems.toString()}
              icon={() => <div className="p-3 bg-red-100 rounded-xl"><AlertTriangle className="h-6 w-6 text-red-600" /></div>}
              trend={lowStockItems > 0 ? "down" : "neutral"}
            />
          </div>
        </div>
      )}

      {/* Data Table */}
      {reportData.length > 0 && (
        <div className="p-6">
          <DataTableWrapper
            title="Inventory Items"
            columns={[
              { key: "name", header: "Item", sortable: true },
              { key: "category", header: "Category", sortable: true },
              { key: "stock_quantity", header: "Stock", sortable: true },
              { 
                key: "cost_price", 
                header: "Cost Price", 
                sortable: true,
                render: (value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              },
              { 
                key: "sale_price", 
                header: "Sale Price", 
                sortable: true,
                render: (value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              },
              { 
                key: "stock_value", 
                header: "Stock Value", 
                sortable: true,
                render: (value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              },
              { 
                key: "potential_revenue", 
                header: "Potential Revenue", 
                sortable: true,
                render: (value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              },
            ]}
            data={reportData}
          />
        </div>
      )}

      {/* Empty State */}
      {!reportData.length && !loading && (
        <div className="p-12 text-center">
          <Package className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Inventory Data</h3>
          <p className="text-slate-500 mb-6">
            Generate a report to view inventory analytics and stock metrics.
          </p>
          <Button 
            onClick={handleFetch}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            Generate Report
          </Button>
        </div>
      )}
    </div>
  );
}