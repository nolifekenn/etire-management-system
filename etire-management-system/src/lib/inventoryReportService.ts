// src/lib/inventoryReportService.ts
// ---------------------------------------------------
// Handles API fetch + PDF + CSV export for Inventory Reports
// ---------------------------------------------------

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------------------------------------------------
// 🔹 FETCH INVENTORY REPORT
// ---------------------------------------------------
export async function fetchInventoryReport(filters: Record<string, any>) {
  const token = localStorage.getItem("reportToken");
  if (!token) {
    throw new Error("Missing report token. Please log in again.");
  }

  const res = await fetch("/api/reports/inventory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // ✅ guaranteed non-empty
    },
    body: JSON.stringify(filters),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch inventory report");
  }

  return res.json();
}

// ---------------------------------------------------
// 🔹 PDF EXPORT
// ---------------------------------------------------
export function exportInventoryReportPDF(rows: any[], filters: Record<string, any>) {
  try {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text("E-TIRE Inventory Report", 14, 18);

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

    // ✅ Guard against undefined and format numbers
    const tableData = rows.map((r) => [
      r.name ?? "—",
      r.category ?? "—",
      r.stock_quantity ?? 0,
      (r.cost_price ?? 0).toLocaleString(),
      (r.sale_price ?? 0).toLocaleString(),
      (r.stock_value ?? 0).toLocaleString(),
      (r.potential_revenue ?? 0).toLocaleString(),
    ]);

    autoTable(doc, {
      startY,
      head: [["Item", "Category", "Stock", "Cost Price", "Sale Price", "Stock Value", "Potential Revenue"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }, // Tailwind blue-500
    });

    doc.save("inventory_report.pdf");
  } catch (error) {
    console.error("PDF Export Error:", error);
  }
}

// ---------------------------------------------------
// 🔹 CSV EXPORT
// ---------------------------------------------------
export function exportInventoryReportCSV(rows: any[]) {
  try {
    const headers = ["Item", "Category", "Stock", "Cost Price", "Sale Price", "Stock Value", "Potential Revenue"];

    const csvRows = rows.map((r) => [
      r.name,
      r.category,
      r.stock_quantity,
      r.cost_price,
      r.sale_price,
      r.stock_value,
      r.potential_revenue,
    ]);

    const csvContent = headers.join(",") + "\n" + csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "inventory_report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("CSV Export Error:", error);
  }
}
