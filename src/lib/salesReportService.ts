/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/salesReportService.ts
// ---------------------------------------------------
// Handles API fetch + PDF + CSV export for Sales Reports
// ---------------------------------------------------

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FormattedSaleRow } from "./salesReportFormatter";

// ---------------------------------------------------
// 🔹 FETCH SALES REPORT
// ---------------------------------------------------
export async function fetchSalesReport(filters: any) {
  const res = await fetch("/api/reports/sales", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(filters),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch sales report");
  }

  return res.json();
}

// ---------------------------------------------------
// 🔹 PDF EXPORT
// ---------------------------------------------------
export function exportSalesReportPDF(
  rows: FormattedSaleRow[],
  filters: any
) {
  try {
    const doc = new jsPDF("p", "mm", "a4");

    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text("E-TIRE Sales Report", 14, 18);

    // Filter Summary
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

    const startY = filterLines.length > 0 ? 32 + filterLines.length * 6 + 4 : 32;

    // Table Data
    const tableData = rows.map((r) => [
      r.sale_date,
      r.customer,
      r.item_name,
      r.quantity ?? 0,
      (r.price_at_sale ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
      (r.line_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
      (r.profit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
    ]);


    autoTable(doc, {
      startY,
      head: [["Date", "Customer", "Item", "Qty", "Unit Price", "Line Total", "Profit"]],
      body: tableData as any[],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] }, // Tailwind emerald-500
    });

    const date = new Date().toISOString().split('T')[0];
    doc.save(`sales_report, ${date}.pdf`);
  } catch (error) {
    console.error("PDF Export Error:", error);
  }
}

// ---------------------------------------------------
// 🔹 CSV EXPORT
// ---------------------------------------------------
export function exportSalesReportCSV(rows: FormattedSaleRow[]) {
  try {
    const headers = [
      "Sale ID",
      "Date",
      "Item",
      "Category",
      "Qty",
      "Price",
      "Line Total",
      "Profit",
      "Payment Method",
      "Customer ID",
      "Customer Name",
      "Branch",
      "Vehicle Type",
    ];

    const csvRows = rows.map((r) => [
      r.sale_id,
      r.sale_date,
      r.item_name,
      r.item_category,
      r.quantity,
      r.price_at_sale,
      r.line_total,
      r.profit,
      r.payment_method ?? "",
      r.customer_id ?? "",
      r.customer ?? "",
      r.branch_id ?? "",
      r.vehicle_type ?? "",
    ]);

    const csvContent =
      headers.join(",") +
      "\n" +
      csvRows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    link.download = `sales_report, ${date}.csv`;
    link.click();

    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("CSV Export Error:", error);
  }
}
