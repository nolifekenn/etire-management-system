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
  TrendingUp,
  CheckCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const poppins = {
  className: "font-poppins"
};

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
        title: "✅ Report Generated Successfully",
        description: "Thank you! Inventory report data has been loaded successfully.",
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
    toast({
      title: "✅ PDF Export Completed",
      description: "Thank you! Inventory report PDF has been exported successfully.",
    });
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
    toast({
      title: "✅ CSV Export Completed",
      description: "Thank you! Inventory report CSV has been exported successfully.",
    });
  };

  const clearFilters = () => {
    setLocalFilters({
      branch_id: "all",
      supplier_id: "all",
      category: "",
    });
    toast({
      title: "Filters Cleared",
      description: "All filters have been reset to default.",
    });
  };

  const hasActiveFilters = localFilters.branch_id !== "all" || localFilters.supplier_id !== "all" || localFilters.category;

  // Calculate stats
  const totalStockValue = reportData.reduce((sum, i) => sum + (i.stock_value || 0), 0);
  const potentialRevenue = reportData.reduce((sum, i) => sum + (i.potential_revenue || 0), 0);
  const lowStockItems = reportData.filter((i) => i.low_stock).length;

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${poppins.className}`}>
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

      {/* Enhanced Filters Section */}
      {showFilters && (
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Branch */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Branch</Label>
                <Select
                  value={localFilters.branch_id}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, branch_id: value })}
                >
                  <SelectTrigger className="border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
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
              </CardContent>
            </Card>

            {/* Supplier */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Supplier</Label>
                <Select
                  value={localFilters.supplier_id}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, supplier_id: value })}
                >
                  <SelectTrigger className="border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
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
              </CardContent>
            </Card>

            {/* Category */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Category</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="e.g. tire, tools"
                    value={localFilters.category}
                    onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
                    className="pl-10 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Button 
                onClick={handleFetch}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handlePDF}
                disabled={!reportData.length}
                className="flex items-center gap-2 border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleCSV}
                disabled={!reportData.length}
                className="flex items-center gap-2 border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Enhanced Active Filters Badge */}
          {hasActiveFilters && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700 font-medium">Active filters:</span>
                <div className="flex flex-wrap gap-2">
                  {localFilters.branch_id !== "all" && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs border border-blue-200">
                      🏢 {branches.find(b => b.branch_id === localFilters.branch_id)?.name}
                    </span>
                  )}
                  {localFilters.supplier_id !== "all" && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs border border-green-200">
                      🚚 {suppliers.find(s => s.supplier_id === localFilters.supplier_id)?.name}
                    </span>
                  )}
                  {localFilters.category && (
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs border border-orange-200">
                      📦 {localFilters.category}
                    </span>
                  )}
                </div>
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

      {/* Enhanced Data Table */}
      {reportData.length > 0 && (
        <div className="p-6">
          <DataTableWrapper
            title="Inventory Report"
            description="Comprehensive overview of inventory items, stock levels, and financial metrics"
            columns={[
              { 
                key: "name", 
                header: "Item", 
                sortable: true,
                render: (value: any) => (
                  <span className="font-medium text-slate-800">{value}</span>
                )
              },
              { 
                key: "category", 
                header: "Category", 
                sortable: true,
                render: (value: any) => (
                  <span className="text-slate-600">{value}</span>
                )
              },
              { 
                key: "stock_quantity", 
                header: "Stock", 
                sortable: true,
                render: (value: any, row: any) => (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-sm font-medium ${
                      row.low_stock 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {value}
                    </span>
                    {row.low_stock && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  </div>
                )
              },
              { 
                key: "cost_price", 
                header: "Cost Price", 
                sortable: true,
                render: (value: any) => (
                  <span className="font-medium text-slate-700">
                    ₱{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )
              },
              { 
                key: "sale_price", 
                header: "Sale Price", 
                sortable: true,
                render: (value: any) => (
                  <span className="font-medium text-green-600">
                    ₱{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )
              },
              { 
                key: "stock_value", 
                header: "Stock Value", 
                sortable: true,
                render: (value: any) => (
                  <span className="font-semibold text-blue-600">
                    ₱{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )
              },
              { 
                key: "potential_revenue", 
                header: "Potential Revenue", 
                sortable: true,
                render: (value: any) => (
                  <span className="font-semibold text-emerald-600">
                    ₱{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )
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