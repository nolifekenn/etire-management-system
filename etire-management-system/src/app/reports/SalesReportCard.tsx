// app/reports/SalesReportCard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // <--- ADDED THIS IMPORT
import { 
  FileText, 
  Sparkles, 
  Download,
  Filter,
  BarChart3,
  X,
  Calendar,
  Building,
  Car,
  TrendingUp,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import {
  fetchSalesReport,
  exportSalesReportPDF,
  exportSalesReportCSV,
} from "@/lib/salesReportService";
import { formatSalesReportData } from "@/lib/salesReportFormatter";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/StatCard";
import { DataTableWrapper } from "@/components/DataTableWrapper";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const poppins = {
  className: "font-poppins"
};

export default function SalesReportCard() {
  const { toast } = useToast();
  
  // --- STATE MANAGEMENT ---
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [localFilters, setLocalFilters] = useState(filters);

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "report" | "pdf" | "csv" | null;
  }>({
    isOpen: false,
    type: null,
  });

  // --- EFFECTS ---
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

  // --- DATA PROCESSING ---
  const flattenedData = reportData.flatMap((sale) =>
    sale.sale_item?.map((item: any) => ({
      sale_date: sale.sale_date?.substring(0, 10) || "—",
      customer: sale.customer?.name || "—",
      item: item.inventory_item?.name || "—",
      quantity: item.quantity || 0,
      price: item.price_at_sale || 0,
      line_total: item.line_total || 0,
      profit: item.profit || 0,
      branch: sale.branch?.name || "—",
      vehicle_type: sale.vehicle_type?.name || "—",
    })) || []
  );

  const totalRows = flattenedData.length;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
  const paginatedData = flattenedData.slice(startIndex, endIndex);

  useEffect(() => {
    const pages = Math.ceil(totalRows / rowsPerPage);
    setTotalPages(pages || 1);
    
    if (currentPage > pages && pages > 0) {
      setCurrentPage(pages);
    }
  }, [totalRows, rowsPerPage, currentPage]);

  // --- HANDLERS ---
  const handleFetch = async () => {
    try {
      setLoading(true);
      setCurrentPage(1); 
      
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

      // UX: Just show toast for data load, no modal
      toast({
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

    const formattedRows = formatSalesReportData(reportData);
    exportSalesReportPDF(formattedRows, localFilters);
    
    // Trigger Success Modal
    setModalState({ isOpen: true, type: "pdf" });
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

    const formattedRows = formatSalesReportData(reportData);
    exportSalesReportCSV(formattedRows);

    // Trigger Success Modal
    setModalState({ isOpen: true, type: "csv" });
  };

  const clearFilters = () => {
    setLocalFilters({
      date_from: "",
      date_to: "",
      branch_id: "all",
      vehicle_type_id: "all",
    });
    toast({
      title: "Filters Cleared",
      description: "All filters have been reset to default.",
    });
  };

  const hasActiveFilters = localFilters.date_from || localFilters.date_to ||
    localFilters.branch_id !== "all" || localFilters.vehicle_type_id !== "all";

  // Calculate stats
  const totalRevenue = reportData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const totalProfit = reportData.flatMap((sale) => sale.sale_item || [])
    .reduce((sum: number, item: any) => sum + (item.profit || 0), 0);
  const itemsSold = reportData.flatMap((sale) => sale.sale_item || [])
    .reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

  // Pagination handlers
  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${poppins.className}`}>
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 h-10 border border-white/30">
              <label htmlFor="rows-per-page" className="text-sm text-white">
                Rows:
              </label>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20 h-7 bg-transparent border-0 text-white hover:bg-white/10 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              className="bg-white/20 text-white border-white/30 hover:bg-white/30 h-10"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Filters Section */}
      {showFilters && (
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Date From</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={localFilters.date_from}
                    onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value })}
                    className="pl-10 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 h-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Date To</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={localFilters.date_to}
                    onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value })}
                    className="pl-10 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 h-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Branch</Label>
                <Select
                  value={localFilters.branch_id}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, branch_id: value })}
                >
                  <SelectTrigger className="border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 h-10">
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

            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Vehicle Type</Label>
                <Select
                  value={localFilters.vehicle_type_id}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, vehicle_type_id: value })}
                >
                  <SelectTrigger className="border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 h-10">
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

          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Button
                onClick={handleFetch}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-all duration-200 h-10"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handlePDF}
                disabled={!reportData.length}
                className="flex items-center gap-2 border-slate-300 hover:bg-slate-50 transition-colors h-10"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>

              <Button
                variant="outline"
                onClick={handleCSV}
                disabled={!reportData.length}
                className="flex items-center gap-2 border-slate-300 hover:bg-slate-50 transition-colors h-10"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors h-10"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>

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
              title="Total Revenue"
              value={`₱${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={BarChart3}
              iconClassName="text-green-600"
              trend="up"
            />
            <StatCard
              title="Total Profit"
              value={`₱${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={TrendingUp}
              iconClassName="text-blue-600"
              trend="up"
            />
            <StatCard
              title="Items Sold"
              value={itemsSold.toLocaleString()}
              icon={CheckCircle}
              iconClassName="text-purple-600"
              trend="up"
            />
          </div>
        </div>
      )}

      {/* Data Table */}
      {reportData.length > 0 && (
        <div className="p-6">
          <DataTableWrapper
            title="Sales Report"
            columns={[
              {
                key: "sale_date",
                header: "Date",
                sortable: true,
                render: (value: any) => (
                  <span className="font-medium text-slate-700">
                    {value ? new Date(value).toLocaleDateString() : "—"}
                  </span>
                )
              },
              {
                key: "customer",
                header: "Customer",
                render: (value: any) => (
                  <span className="text-slate-600">{value || "—"}</span>
                )
              },
              {
                key: "item",
                header: "Item",
                render: (value: any) => (
                  <span className="font-medium text-slate-800">{value || "—"}</span>
                )
              },
              {
                key: "quantity",
                header: "Quantity",
                sortable: true,
                render: (value: any) => (
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                    {value}
                  </span>
                )
              },
              {
                key: "price",
                header: "Unit Price",
                sortable: true,
                render: (value: any) => (
                  <span className="font-medium text-slate-700">
                    ₱{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )
              },
              {
                key: "line_total",
                header: "Line Total",
                sortable: true,
                render: (value: any) => (
                  <span className="font-semibold text-green-600">
                    ₱{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )
              },
              {
                key: "profit",
                header: "Profit",
                sortable: true,
                render: (value: any) => (
                  <span className={`font-semibold ${Number(value) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ₱{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )
              },
            ]}
            data={paginatedData}
          />
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{endIndex}</span> of{" "}
              <span className="font-medium">{totalRows}</span> results
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm text-slate-600">Rows:</span>
                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFirstPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1 mx-2">
                  <span className="text-sm text-slate-700">
                    Page <span className="font-medium">{currentPage}</span> of{" "}
                    <span className="font-medium">{totalPages}</span>
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLastPage}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!reportData.length && !loading && (
        <div className="p-12 text-center">
          <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Sales Data</h3>
          <p className="text-slate-500 mb-6">
            Generate a report to view sales analytics and performance metrics.
          </p>
          <Button
            onClick={handleFetch}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 h-10"
          >
            Generate Report
          </Button>
        </div>
      )}

      {/* --- RENDER SUCCESS MODAL --- */}
      <SuccessModal 
        isOpen={modalState.isOpen}
        type={modalState.type}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
      />
    </div>
  );
}

// --- REUSABLE SUCCESS MODAL COMPONENT (WITH PORTAL) ---

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "pdf" | "csv" | "report" | null;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, type }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  // Ensure we are mounted on the client AND modal is open
  if (!mounted || !isOpen || !type) return null;

  const config = {
    pdf: {
      title: "PDF Export Completed!",
      desc: "Your sales report PDF has been exported successfully.",
      gradient: "from-blue-600 via-cyan-600 to-blue-700",
      bgGradient: "from-blue-500 via-blue-600 to-cyan-600",
      lightBg: "bg-blue-100",
      icon: <FileText className="h-6 w-6 text-blue-600" />,
      badgeText: "PDF Document",
      badgeColor: "text-blue-700",
      buttonGradient: "from-blue-600 to-cyan-600",
    },
    csv: {
      title: "CSV Export Ready!",
      desc: "Your data has been successfully converted to CSV format.",
      gradient: "from-emerald-600 via-green-600 to-teal-700",
      bgGradient: "from-emerald-500 via-green-600 to-teal-600",
      lightBg: "bg-emerald-100",
      icon: <Download className="h-6 w-6 text-emerald-600" />,
      badgeText: "CSV Spreadsheet",
      badgeColor: "text-emerald-700",
      buttonGradient: "from-emerald-600 to-green-600",
    },
    report: {
      title: "Report Generated!",
      desc: "Sales data has been successfully retrieved.",
      gradient: "from-purple-600 via-indigo-600 to-purple-700",
      bgGradient: "from-purple-500 via-indigo-600 to-purple-600",
      lightBg: "bg-purple-100",
      icon: <BarChart3 className="h-6 w-6 text-purple-600" />,
      badgeText: "Analytics Report",
      badgeColor: "text-purple-700",
      buttonGradient: "from-purple-600 to-indigo-600",
    },
  };

  const currentConfig = config[type];

  // USE CREATEPORTAL TO RENDER DIRECTLY INTO BODY
  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] animate-fadeIn backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-lg w-full mx-4 animate-scaleIn relative overflow-hidden">
        {/* Decorative background elements */}
        <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${currentConfig.gradient} rounded-full blur-3xl opacity-10 -translate-y-20 translate-x-20`}></div>
        <div className={`absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr ${currentConfig.gradient} rounded-full blur-3xl opacity-10 translate-y-16 -translate-x-16`}></div>

        <div className="relative z-10">
          <button
            onClick={onClose}
            className="absolute top-0 right-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center">
            {/* Animated Checkmark */}
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className={`absolute inset-0 w-28 h-28 rounded-full ${currentConfig.lightBg} animate-ping opacity-75`}></div>
              <div className={`absolute inset-0 w-28 h-28 rounded-full ${currentConfig.lightBg} animate-pulse`}></div>
              
              <div className={`relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br ${currentConfig.bgGradient} shadow-2xl animate-scaleIn`}>
                <CheckCircle className="h-16 w-16 text-white animate-checkmark" strokeWidth={2.5} />
              </div>
              
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-spin-slow" />
            </div>
            
            {/* Text */}
            <div className="animate-slideUp space-y-3">
              <h3 className={`text-4xl font-bold bg-gradient-to-r ${currentConfig.gradient} bg-clip-text text-transparent`}>
                {currentConfig.title}
              </h3>
              
              <p className="text-slate-600 text-lg leading-relaxed">
                {currentConfig.desc}
              </p>
            </div>
            
            {/* Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-100 mt-6 mb-6 animate-slideUp shadow-sm" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm">
                {currentConfig.icon}
              </div>
              <div className="text-left">
                <div className={`text-sm font-semibold ${currentConfig.badgeColor}`}>{currentConfig.badgeText}</div>
                <div className="text-xs text-slate-500">Ready to view</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mb-8 overflow-hidden">
              <div className={`bg-gradient-to-r ${currentConfig.buttonGradient} h-2 rounded-full animate-progress`}></div>
            </div>
            
            {/* Button */}
            <div className="flex gap-3 justify-center animate-slideUp" style={{ animationDelay: '0.3s' }}>
              <button
                onClick={onClose}
                className={`px-8 py-3.5 bg-gradient-to-r ${currentConfig.buttonGradient} text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-semibold text-sm tracking-wide shadow-md`}
              >
                Continue
              </button>
            </div>
            
            <p className="text-xs text-slate-400 mt-6 animate-slideUp" style={{ animationDelay: '0.4s' }}>
              This will close automatically
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
        @keyframes checkmark { 0% { opacity: 0; transform: scale(0) rotate(-45deg); } 50% { opacity: 1; transform: scale(1.15) rotate(5deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes progress { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-checkmark { animation: checkmark 0.7s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-slideUp { animation: slideUp 0.6s ease-out forwards; opacity: 0; }
        .animate-progress { animation: progress 4s ease-out; }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
      `}</style>
    </div>,
    document.body // Target container
  );
};