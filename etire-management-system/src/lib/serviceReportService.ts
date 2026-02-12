// src/lib/serviceReportService.ts
// ---------------------------------------------------
// Handles API fetch + PDF + CSV export for Service Jobs Reports
// ---------------------------------------------------

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ServiceReportFilters {
  date_from: string;
  date_to: string;
  branch_id: string;
  status: string;
  vehicle_type_id: string;
}

export type ServiceReportFilterPayload = Partial<ServiceReportFilters>;

export interface ServiceReportRow {
  job_id: string;
  job_timestamp: number | null;
  job_date: string | null;
  job_description: string;
  status: string;
  remarks: string;
  customer: string;
  vehicle: string;
  vehicle_type: string;
  service_fee_raw: number;
  service_fee: string;
  job_total_raw: number;
  job_total: string;
}

export interface ServiceReportResponse {
  jobs: ServiceReportRow[];
}

// ---------------------------------------------------
// 🔹 FETCH SERVICE JOBS REPORT
// ---------------------------------------------------
export async function fetchServiceJobsReport(
  filters: ServiceReportFilterPayload = {}
): Promise<ServiceReportResponse> {
  // ✅ Corrected endpoint to match route.ts
  const res = await fetch("/api/reports/service", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(filters),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch service jobs report");
  }

  return res.json() as Promise<ServiceReportResponse>;
}

// ---------------------------------------------------
// 🔹 PDF EXPORT
// ---------------------------------------------------
export function exportServiceJobsReportPDF(
  rows: ServiceReportRow[],
  filters: ServiceReportFilterPayload = {}
) {
  try {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text("E-TIRE Service Jobs Report", 14, 18);

    // Optional: include filters summary
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    const filterLines: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filterLines.push(`${key}: ${value}`);
      }
    });
    if (filterLines.length > 0) {
      doc.text("Filters Applied:", 14, 26);
      filterLines.forEach((line, i) => {
        doc.text(`• ${line}`, 18, 32 + i * 6);
      });
    }
    const startY = filterLines.length > 0 ? 32 + filterLines.length * 6 + 4 : 26;

    const tableData = rows.map((job) => [
      job.job_date || "—",
      job.customer || "—",
      job.vehicle || "—",
      job.job_description || "—",
      job.status || "—",
      job.service_fee_raw ?? 0,
      job.job_total_raw ?? 0,
    ]);

    autoTable(doc, {
      startY,
      head: [["Date", "Customer", "Vehicle", "Description", "Status", "Service Fee", "Total Revenue"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    const date = new Date().toISOString().split('T')[0];
    doc.save(`service_jobs_report, ${date}.pdf`);
  } catch (error) {
    console.error("PDF Export Error:", error);
  }
}

// ---------------------------------------------------
// 🔹 CSV EXPORT
// ---------------------------------------------------
export function exportServiceJobsReportCSV(rows: ServiceReportRow[]) {
  try {
    const headers = ["Date", "Customer", "Vehicle", "Description", "Status", "Service Fee", "Total Revenue"];

    const csvRows = rows.map((job) => [
      job.job_date || "",
      job.customer || "",
      job.vehicle || "",
      job.job_description || "",
      job.status || "",
      job.service_fee_raw ?? 0,
      job.job_total_raw ?? 0,
    ]);

    const csvContent = headers.join(",") + "\n" + csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    link.download = `service_jobs_report, ${date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("CSV Export Error:", error);
  }
}
