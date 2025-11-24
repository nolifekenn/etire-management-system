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

export default function ServiceReportCard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    branch_id: "",
    status: "",
    vehicle_type_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);

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
      const res = await fetchServiceJobsReport(filters);

      if (!res || !res.jobs) {
        toast({
          title: "No Data",
          description: "No service jobs found for the given filters.",
        });
        setReportData([]);
        return;
      }

      setReportData(res.jobs);

      toast({
        title: "Report Loaded",
        description: "Service jobs report data retrieved successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load service jobs report.",
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
    exportServiceJobsReportPDF(reportData, filters);
  };

  const handleCSV = () => {
    if (!reportData.length) {
      toast({
        title: "No Data",
        description: "Generate the report first before exporting.",
      });
      return;
    }
    exportServiceJobsReportCSV(reportData);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md space-y-6">
      <h2 className="text-xl font-semibold">🛠️ Service Jobs Report</h2>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        <div>
          <label className="text-sm">Status</label>
          <select
            className="form-select w-full"
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
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
            title="Total Service Fees"
            value={`₱${reportData
              .filter((j) => j.status === "completed")
              .reduce((sum, j) => sum + (j.service_fee_raw || 0), 0)
              .toLocaleString(undefined, { minimumFractionDigits: 2 })}
            `}
            icon={() => <span>💵</span>}
          />
          <StatCard
            title="Completed Jobs"
            value={reportData
              .filter((j) => j.status === "completed")
              .length.toString()}
            icon={() => <span>✅</span>}
          />
          <StatCard
            title="Total Job Revenue"
            value={`₱${reportData
              .filter((j) => j.status === "completed")
              .reduce((sum, j) => sum + (j.job_total_raw || 0), 0)
              .toLocaleString(undefined, { minimumFractionDigits: 2 })}
            `}
            icon={() => <span>📊</span>}
          />
        </div>
      )}

      {/* TABLE */}
      {reportData.length > 0 && (
        <DataTableWrapper
          title="Service Jobs"
          columns={[
            {
              key: "job_timestamp",
              header: "Date",
              sortable: true,
              render: (_v, row) => row.job_date,
            },
            { key: "customer", header: "Customer" },
            { key: "vehicle", header: "Vehicle" },
            { key: "vehicle_type", header: "Vehicle Type" },
            { key: "job_description", header: "Description" },
            { key: "status", header: "Status", sortable: true },
            { key: "service_fee", header: "Service Fee", sortable: true },
            { key: "job_total", header: "Total Revenue", sortable: true },
          ]}
          data={reportData}
        />
      )}
    </div>
  );
}
