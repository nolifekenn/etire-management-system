// app/reports/ServiceReportCard.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  fetchServiceJobsReport,
  exportServiceJobsReportPDF,
  exportServiceJobsReportCSV,
} from "@/lib/serviceReportService";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/StatCard";
import { DataTableWrapper } from "@/components/DataTableWrapper";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { 
  Download, 
  Filter, 
  Wrench, 
  X,
  Calendar,
  Building,
  Car,
  Clock,
  TrendingUp,
  DollarSign,
  CheckCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const poppins = {
  className: "font-poppins"
};

export default function ServiceReportCard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    branch_id: "all",
    status: "all",
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
        status: localFilters.status === "all" ? "" : localFilters.status,
        vehicle_type_id: localFilters.vehicle_type_id === "all" ? "" : localFilters.vehicle_type_id,
      };
      
      setFilters(apiFilters);
      const res = await fetchServiceJobsReport(apiFilters);

      if (!res || !res.jobs) {
        toast({
          title: "No Data",
          description: "No service jobs found for the given filters.",
          variant: "destructive"
        });
        setReportData([]);
        return;
      }

      setReportData(res.jobs);

      toast({
        title: "✅ Report Generated Successfully",
        description: "Thank you! Service jobs report data has been loaded successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load service jobs report.",
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
    exportServiceJobsReportPDF(reportData, localFilters);
    toast({
      title: "✅ PDF Export Completed",
      description: "Thank you! Service report PDF has been exported successfully.",
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
    exportServiceJobsReportCSV(reportData);
    toast({
      title: "✅ CSV Export Completed",
      description: "Thank you! Service report CSV has been exported successfully.",
    });
  };

  const clearFilters = () => {
    setLocalFilters({
      date_from: "",
      date_to: "",
      branch_id: "all",
      status: "all",
      vehicle_type_id: "all",
    });
    toast({
      title: "Filters Cleared",
      description: "All filters have been reset to default.",
    });
  };

  const hasActiveFilters = localFilters.date_from || localFilters.date_to || 
                          localFilters.branch_id !== "all" || localFilters.status !== "all" || localFilters.vehicle_type_id !== "all";

  // Calculate stats
  const completedJobs = reportData.filter((j) => j.status === "completed").length;
  const totalServiceFees = reportData
    .filter((j) => j.status === "completed")
    .reduce((sum, j) => sum + (j.service_fee_raw || 0), 0);
  const totalJobRevenue = reportData
    .filter((j) => j.status === "completed")
    .reduce((sum, j) => sum + (j.job_total_raw || 0), 0);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${poppins.className}`}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-orange-500 via-red-600 to-pink-400 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Service Jobs Report</h2>
              <p className="text-white/90">Track service performance and job analytics</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Date From */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Date From</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={localFilters.date_from}
                    onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value })}
                    className="pl-10 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Date To */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Date To</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={localFilters.date_to}
                    onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value })}
                    className="pl-10 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </CardContent>
            </Card>

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

            {/* Status */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Status</Label>
                <Select
                  value={localFilters.status}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, status: value })}
                >
                  <SelectTrigger className="border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    <Clock className="h-4 w-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Vehicle Type */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Vehicle Type</Label>
                <Select
                  value={localFilters.vehicle_type_id}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, vehicle_type_id: value })}
                >
                  <SelectTrigger className="border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
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
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Button 
                onClick={handleFetch}
                disabled={loading}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-md transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4 mr-2" />
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
                  {localFilters.date_from && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs border border-blue-200">
                      📅 From: {new Date(localFilters.date_from).toLocaleDateString()}
                    </span>
                  )}
                  {localFilters.date_to && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs border border-blue-200">
                      📅 To: {new Date(localFilters.date_to).toLocaleDateString()}
                    </span>
                  )}
                  {localFilters.branch_id !== "all" && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs border border-green-200">
                      🏢 {branches.find(b => b.branch_id === localFilters.branch_id)?.name}
                    </span>
                  )}
                  {localFilters.status !== "all" && (
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs border border-purple-200">
                      ⚙️ {localFilters.status}
                    </span>
                  )}
                  {localFilters.vehicle_type_id !== "all" && (
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs border border-orange-200">
                      🚗 {vehicleTypes.find(vt => vt.vehicle_type_id === localFilters.vehicle_type_id)?.name}
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
              title="Total Service Fees"
              value={`₱${totalServiceFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={() => <div className="p-3 bg-green-100 rounded-xl"><DollarSign className="h-6 w-6 text-green-600" /></div>}
            />
            <StatCard
              title="Completed Jobs"
              value={completedJobs.toString()}
              icon={() => <div className="p-3 bg-blue-100 rounded-xl"><CheckCircle className="h-6 w-6 text-blue-600" /></div>}
            />
            <StatCard
              title="Total Job Revenue"
              value={`₱${totalJobRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={() => <div className="p-3 bg-purple-100 rounded-xl"><TrendingUp className="h-6 w-6 text-purple-600" /></div>}
            />
          </div>
        </div>
      )}

      {/* Enhanced Data Table */}
      {reportData.length > 0 && (
        <div className="p-6">
          <DataTableWrapper
            title="Service Jobs Report"
            description="Comprehensive overview of service jobs, status, and financial performance"
            columns={[
              {
                key: "job_timestamp",
                header: "Date",
                sortable: true,
                render: (_v: any, row: any) => (
                  <span className="font-medium text-slate-700">
                    {row.job_date ? new Date(row.job_date).toLocaleDateString() : "—"}
                  </span>
                ),
              },
              { 
                key: "customer", 
                header: "Customer",
                render: (value: any) => (
                  <span className="text-slate-600">{value || "—"}</span>
                )
              },
              { 
                key: "vehicle", 
                header: "Vehicle",
                render: (value: any) => (
                  <span className="font-medium text-slate-800">{value || "—"}</span>
                )
              },
              { 
                key: "vehicle_type", 
                header: "Vehicle Type",
                render: (value: any) => (
                  <span className="text-slate-600">{value || "—"}</span>
                )
              },
              { 
                key: "job_description", 
                header: "Description",
                render: (value: any) => (
                  <span className="text-slate-600">{value || "—"}</span>
                )
              },
              { 
                key: "status", 
                header: "Status", 
                sortable: true,
                render: (value: any) => (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    value === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                    value === 'in-progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    value === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {value?.charAt(0).toUpperCase() + value?.slice(1) || "—"}
                  </span>
                )
              },
              { 
                key: "service_fee", 
                header: "Service Fee", 
                sortable: true,
                render: (value: any) => (
                  <span className="font-semibold text-green-600">
                    ₱{Number(value?.replace('₱', '') || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )
              },
              { 
                key: "job_total", 
                header: "Total Revenue", 
                sortable: true,
                render: (value: any) => (
                  <span className="font-semibold text-blue-600">
                    ₱{Number(value?.replace('₱', '') || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
          <Wrench className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Service Data</h3>
          <p className="text-slate-500 mb-6">
            Generate a report to view service job analytics and performance metrics.
          </p>
          <Button 
            onClick={handleFetch}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          >
            Generate Report
          </Button>
        </div>
      )}
    </div>
  );
}