// src/lib/serviceReportService.ts
// ---------------------------------------------------
// Handles API fetch + PDF + CSV export for Service Jobs Reports
// ---------------------------------------------------

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------------------------------------------------
// 🔹 FETCH SERVICE JOBS REPORT
// ---------------------------------------------------
export async function fetchServiceJobsReport(filters: Record<string, any>) {
  const token = localStorage.getItem("reportToken");
  if (!token) {
    throw new Error("Missing report token. Please log in again.");
  }

  // ✅ Corrected endpoint to match route.ts
  const res = await fetch("/api/reports/service", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(filters),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch service jobs report");
  }

  return res.json();
}

// ---------------------------------------------------
// 🔹 PDF EXPORT
// ---------------------------------------------------
export function exportServiceJobsReportPDF(rows: any[], filters: Record<string, any>) {
  try {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text("E-TIRE Service Jobs Report", 14, 18);

    // Optional: include filters summary
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    const filterLines: string[] = [];
    for (const key in filters) {
      if (filters[key]) filterLines.push(`${key}: ${filters[key]}`);
    }
    if (filterLines.length > 0) {
      doc.text("Filters Applied:", 14, 26);
      filterLines.forEach((line, i) => {
        doc.text(`• ${line}`, 18, 32 + i * 6);
      });
    }
    const startY = filterLines.length > 0 ? 32 + filterLines.length * 6 + 4 : 26;

    const tableData = rows.map((j) => [
      j.job_date || "—",
      j.customer?.name || "—",
      j.vehicle?.plate_number || "—",
      j.job_description || "—",
      j.status || "—",
      j.service_fee ?? 0,
      j.job_total ?? 0,
    ]);

    autoTable(doc, {
      startY,
      head: [["Date", "Customer", "Vehicle", "Description", "Status", "Service Fee", "Total Revenue"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    doc.save("service_jobs_report.pdf");
  } catch (error) {
    console.error("PDF Export Error:", error);
  }
}

// ---------------------------------------------------
// 🔹 CSV EXPORT
// ---------------------------------------------------
export function exportServiceJobsReportCSV(rows: any[]) {
  try {
    const headers = ["Date", "Customer", "Vehicle", "Description", "Status", "Service Fee", "Total Revenue"];

    const csvRows = rows.map((j) => [
      j.job_date || "",
      j.customer?.name || "",
      j.vehicle?.plate_number || "",
      j.job_description || "",
      j.status || "",
      j.service_fee ?? 0,
      j.job_total ?? 0,
    ]);

    const csvContent = headers.join(",") + "\n" + csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "service_jobs_report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("CSV Export Error:", error);
  }
}
