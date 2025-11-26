// app/reports/SalesReportCard.tsx (Fixed Select components)
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
import { supabase } from "@/lib/supabaseClient";
import { 
  Download, 
  Filter, 
  BarChart3, 
  Search, 
  X,
  Calendar,
  Building,
  Car,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SalesReportCard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    branch_id: "all",
    vehicle_type_id: "all",
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  // Enhanced filter state
  const [localFilters, setLocalFilters] = useState(filters);

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
      // Convert "all" to empty string for API
      const apiFilters = {
        ...localFilters,
        branch_id: localFilters.branch_id === "all" ? "" : localFilters.branch_id,
        vehicle_type_id: localFilters.vehicle_type_id === "all" ? "" : localFilters.vehicle_type_id,
      };
      
      setFilters(apiFilters);
      const res = await fetchSalesReport(apiFilters);

      if (!res || !res.sales) {
        toast({
          title: "No Data",
          description: "No sales found for the given filters.",
          variant: "destructive"
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

    const formattedRows = reportData.flatMap((sale) =>
      sale.sale_item.map((item: any) => ({
        sale_date: sale.sale_date?.substring(0, 10) || "—",
        customer: sale.customer?.name || "—",
        item: item.inventory_item?.name || "—",
        quantity: item.quantity,
        price: item.price_at_sale,
        line_total: item.line_total,
        profit: item.profit,
      }))
    );

    exportSalesReportPDF(formattedRows, localFilters);
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
    exportSalesReportCSV(reportData);
  };

  const clearFilters = () => {
    setLocalFilters({
      date_from: "",
      date_to: "",
      branch_id: "all",
      vehicle_type_id: "all",
    });
  };

  const hasActiveFilters = localFilters.date_from || localFilters.date_to || 
                          localFilters.branch_id !== "all" || localFilters.vehicle_type_id !== "all";

  // Calculate stats
  const totalRevenue = reportData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const totalProfit = reportData.flatMap((sale) => sale.sale_item)
    .reduce((sum: number, item: any) => sum + (item.profit || 0), 0);
  const itemsSold = reportData.flatMap((sale) => sale.sale_item)
    .reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-400 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Sales Report</h2>
              <p className="text-white/90">Track sales performance and revenue analytics</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Date From */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Date From</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  type="date"
                  value={localFilters.date_from}
                  onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value })}
                  className="pl-10 border-slate-300 focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Date To</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  type="date"
                  value={localFilters.date_to}
                  onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value })}
                  className="pl-10 border-slate-300 focus:border-indigo-400"
                />
              </div>
            </div>

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

            {/* Vehicle Type */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Vehicle Type</Label>
              <Select
                value={localFilters.vehicle_type_id}
                onValueChange={(value) => setLocalFilters({ ...localFilters, vehicle_type_id: value })}
              >
                <SelectTrigger className="border-slate-300 focus:border-indigo-400">
                  <Car className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="All Vehicle Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicle Types</SelectItem>
                  {vehicleTypes.map((vt) => (
                    <SelectItem key={vt.vehicle_type_id} value={vt.vehicle_type_id}>
                      {vt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Button 
                onClick={handleFetch}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
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
                {localFilters.date_from && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs">
                    From: {localFilters.date_from}
                  </span>
                )}
                {localFilters.date_to && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs">
                    To: {localFilters.date_to}
                  </span>
                )}
                {localFilters.branch_id !== "all" && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs">
                    Branch: {branches.find(b => b.branch_id === localFilters.branch_id)?.name}
                  </span>
                )}
                {localFilters.vehicle_type_id !== "all" && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs">
                    Vehicle: {vehicleTypes.find(vt => vt.vehicle_type_id === localFilters.vehicle_type_id)?.name}
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
              title="Total Revenue"
              value={`₱${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={() => <div className="p-3 bg-green-100 rounded-xl"><BarChart3 className="h-6 w-6 text-green-600" /></div>}
              trend="up"
            />
            <StatCard
              title="Total Profit"
              value={`₱${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={() => <div className="p-3 bg-blue-100 rounded-xl"><TrendingUp className="h-6 w-6 text-blue-600" /></div>}
              trend="up"
            />
            <StatCard
              title="Items Sold"
              value={itemsSold.toLocaleString()}
              icon={() => <div className="p-3 bg-purple-100 rounded-xl"><Download className="h-6 w-6 text-purple-600" /></div>}
              trend="up"
            />
          </div>
        </div>
      )}

      {/* Data Table */}
      {reportData.length > 0 && (
        <div className="p-6">
          <DataTableWrapper
            title="Sales Items"
            columns={[
              { key: "sale_date", header: "Date", sortable: true },
              { key: "customer", header: "Customer" },
              { key: "item", header: "Item" },
              { key: "quantity", header: "Qty", sortable: true },
              { 
                key: "price", 
                header: "Price", 
                sortable: true,
                render: (value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              },
              { 
                key: "line_total", 
                header: "Line Total", 
                sortable: true,
                render: (value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              },
              { 
                key: "profit", 
                header: "Profit", 
                sortable: true,
                render: (value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              },
            ]}
            data={reportData.flatMap((sale) =>
              sale.sale_item.map((item: any) => ({
                sale_date: sale.sale_date?.substring(0, 10) || "—",
                customer: sale.customer?.name || "—",
                item: item.inventory_item?.name || "—",
                quantity: item.quantity,
                price: item.price_at_sale,
                line_total: item.line_total,
                profit: item.profit,
              }))
            )}
          />
        </div>
      )}

      {/* Empty State */}
      {!reportData.length && !loading && (
        <div className="p-12 text-center">
          <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Sales Data</h3>
          <p className="text-slate-500 mb-6">
            Generate a report to view sales analytics and performance metrics.
          </p>
          <Button 
            onClick={handleFetch}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            Generate Report
          </Button>
        </div>
      )}
    </div>
  );
}