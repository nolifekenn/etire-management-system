import type { User, Customer, Branch, Sale } from '@/lib/types'; // Import from your main types.ts

// -----------------------------------------------------------------------------
// EXPORTED INTERFACES
// -----------------------------------------------------------------------------

/**
 * Represents a single item line on the receipt.
 * This matches the structure of your CartItem.
 */
export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number; // Price per unit at time of sale
}

/**
 * Static information about the business.
 */
export interface BusinessInfo {
  storeName: string;
  address: string;
  phone: string;
  taxInfo: string;
  footerMessage: string;
  registeredBusinessName?: string;
  mainBranchAddress?: string;
  tin?: string;
  vatLabel?: string;
  atpNumber?: string;
  printerName?: string;
  printerAddress?: string;
  printerTin?: string;
  serialRange?: string;
  receiptTypeLabel?: string;
  vatInclusiveNote?: string;
}

/**
 * A generic customer object for the receipt.
 */
export interface ReceiptCustomer {
  name: string;
  phone?: string;
  address?: string;
  tin?: string;
}

/**
 * All data required to generate a complete receipt.
 */
export interface ReceiptData {
  sale: Sale; // This is the Sale type from your types.ts
  items: ReceiptItem[];
  cashier: User; // The User type from your types.ts
  businessInfo: BusinessInfo;
  customer?: ReceiptCustomer;
  branch?: Branch; // The Branch type from your types.ts
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Formats a number as Philippine Peso.
 */
const formatCurrency = (amount: number): string => {
  // Use toLocaleString for a more robust formatting
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

/**
 * Formats a date string into a readable local format.
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

// -----------------------------------------------------------------------------
// HTML & CSS
// -----------------------------------------------------------------------------

/**
 * CSS for the receipt.
 * This is embedded in the <style> tag for print compatibility.
 */
const getReceiptCss = (): string => `
  body {
    font-family: 'Courier New', Courier, monospace;
    margin: 0;
    padding: 12px;
    background: #ffffff;
  }
  .receipt-container {
    width: 360px;
    margin: auto;
    background: #fff;
    border: 1px solid #111;
    padding: 14px;
    box-shadow: none;
  }
  .header {
    text-align: center;
    padding-bottom: 10px;
    border-bottom: 1px dashed #000;
  }
  .header h1 {
    margin: 0;
    font-size: 20px;
  }
  .header p {
    margin: 2px 0;
    font-size: 12px;
  }
  .document-label {
    margin-top: 6px;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 0.8px;
  }
  .section-title {
    margin: 0 0 4px 0;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  .details, .customer {
    padding: 10px 0;
    font-size: 12px;
    border-bottom: 1px dashed #000;
  }
  .details p, .customer p {
    margin: 3px 0;
  }
  .items-table {
    width: 100%;
    font-size: 12px;
    border-collapse: collapse;
    margin-top: 10px;
  }
  .items-table thead th {
    text-align: left;
    border-bottom: 1px solid #000;
    padding-bottom: 5px;
  }
  .items-table tbody td {
    padding: 4px 0;
  }
  .items-table .qty, .items-table .price {
    text-align: center;
  }
  .items-table .total {
    text-align: right;
  }
  .totals-table {
    width: 100%;
    font-size: 12px;
    margin-top: 10px;
    border-top: 1px solid #000;
    padding-top: 5px;
  }
  .totals-table td {
    padding: 2px 0;
  }
  .totals-table .label {
    text-align: left;
  }
  .totals-table .value {
    text-align: right;
  }
  .totals-table .total-row .label,
  .totals-table .total-row .value {
    font-weight: bold;
    font-size: 14px;
    padding-top: 5px;
  }
  .footer {
    text-align: center;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed #000;
    font-size: 12px;
  }
  .footer p {
    margin: 3px 0;
  }

  @media print {
    body {
      background: #fff;
    }
    .receipt-container {
      box-shadow: none;
      border: none;
      margin: 0;
      padding: 0;
      width: 100%;
    }
  }
`;

// -----------------------------------------------------------------------------
// MAIN GENERATOR FUNCTION
// -----------------------------------------------------------------------------

/**
 * Generates a complete HTML receipt for a given sale.
 * @param data - The complete set of data needed for the receipt.
 * @returns An HTML string.
 */
export const generateHtmlReceipt = (data: ReceiptData): string => {
  const { sale, items, cashier, businessInfo, customer, branch } = data;

  // Calculate subtotal from sale object
  const totalAmount = Number(sale.total_amount || 0);
  const taxAmount = Number(sale.tax_amount || 0);
  const discountAmount = Number(sale.discount_amount || 0);
  const subtotal = totalAmount - taxAmount + discountAmount;
  const receiptSerial = sale.sale_number ?? sale.sale_id.split('-')[0]!;
  const registeredBusinessName = businessInfo.registeredBusinessName || businessInfo.storeName;
  const mainBranchAddress = businessInfo.mainBranchAddress || businessInfo.address || 'N/A';
  const businessTin = businessInfo.tin || businessInfo.taxInfo || 'N/A';
  const vatLabel = businessInfo.vatLabel || 'VAT Registered';
  const receiptTypeLabel = businessInfo.receiptTypeLabel || 'SALES INVOICE';
  const atpNumber = businessInfo.atpNumber || 'ATP-000000000000';
  const printerName = businessInfo.printerName || 'TUP-M BSIS-4A 25-26 Team';
  const printerAddress = businessInfo.printerAddress || 'Printer Address Placeholder';
  const printerTin = businessInfo.printerTin || '000-000-000-000';
  const serialRange = businessInfo.serialRange || '000001-000500';
  const isVatRegistered = !/non-vat/i.test(vatLabel);
  const vatTreatmentNote = businessInfo.vatInclusiveNote || (isVatRegistered
    ? 'Prices shown are VAT-inclusive.'
    : 'Non-VAT sale (no VAT breakdown).');
  const vatableSales = Math.max(0, totalAmount - taxAmount);

  // Generate rows for the items table
  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td class="qty">${item.quantity}</td>
      <td class="price">${formatCurrency(item.price)}</td>
      <td class="total">${formatCurrency(item.quantity * item.price)}</td>
    </tr>
  `,
    )
    .join('');

  return `
    <html>
      <head>
        <title>${receiptTypeLabel} ${receiptSerial}</title>
        <style>
          ${getReceiptCss()}
        </style>
      </head>
      <body>
        <div class="receipt-container">
          
          <div class="header">
            <h1>${registeredBusinessName}</h1>
            <p>${mainBranchAddress}</p>
            <p>Phone: ${businessInfo.phone || 'N/A'}</p>
            <p>TIN: ${businessTin}</p>
            <p>${vatLabel}</p>
            <p class="document-label">${receiptTypeLabel}</p>
          </div>

          <div class="details">
            <p class="section-title">Receipt Details</p>
            <p>Serial No: ${receiptSerial}</p>
            <p>Transaction Date: ${formatDate(sale.sale_date ?? new Date().toISOString())}</p>
            <p>Printed Date: ${formatDate(new Date().toISOString())}</p>
            <p>Cashier: ${cashier.name}</p>
            ${branch ? `<p>Branch: ${branch.name}</p>` : ''}
          </div>

          <div class="details">
            <p class="section-title">Permit to Print</p>
            <p>ATP No: ${atpNumber}</p>
            <p>Accredited Printer: ${printerName}</p>
            <p>Printer Address: ${printerAddress}</p>
            <p>Printer TIN: ${printerTin}</p>
            <p>Serial Range: ${serialRange}</p>
          </div>

          <div class="customer">
            <p class="section-title">Customer Details</p>
            <p>Customer: ${customer ? customer.name : 'Walk-in Customer'}</p>
            ${customer && customer.phone ? `<p>Phone: ${customer.phone}</p>` : ''}
            ${customer && customer.address ? `<p>Address: ${customer.address}</p>` : ''}
            ${customer && customer.tin ? `<p>TIN: ${customer.tin}</p>` : ''}
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="qty">Qty</th>
                <th class="price">Unit</th>
                <th class="total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <table class="totals-table">
            <tbody>
              <tr>
                <td class="label">Subtotal</td>
                <td class="value">${formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td class="label">Discount</td>
                <td class="value">-${formatCurrency(discountAmount)}</td>
              </tr>
              <tr>
                <td class="label">VATable Sales</td>
                <td class="value">${isVatRegistered ? formatCurrency(vatableSales) : 'Non-VAT'}</td>
              </tr>
              <tr>
                <td class="label">VAT Amount</td>
                <td class="value">${isVatRegistered ? formatCurrency(taxAmount) : 'Non-VAT'}</td>
              </tr>
              <tr>
                <td class="label">Tax Note</td>
                <td class="value">${vatTreatmentNote}</td>
              </tr>
              <tr class="total-row">
                <td class="label">TOTAL AMOUNT DUE</td>
                <td class="value">${formatCurrency(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Mode of Payment: ${sale.payment_method ? String(sale.payment_method).toUpperCase() : 'N/A'}</p>
            <p>Cashier: ${cashier.name}</p>
            <p>Cashier Signature: ____________________</p>
            <p><strong>This serves as your official receipt.</strong></p>
            <p class="thanks">${businessInfo.footerMessage}</p>
          </div>

        </div>
      </body>
    </html>
  `;
};

/**
 * Opens a new window and triggers the print dialog for the receipt.
 * @param htmlContent - The HTML string of the receipt.
 */
export const printReceipt = (htmlContent: string) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    // printWindow.close(); // You can enable this to auto-close after printing
  } else {
    alert('Please allow popups to print the receipt.');
  }
};

// -----------------------------------------------------------------------------
// SERVICE JOB RECEIPT
// -----------------------------------------------------------------------------

export interface ServiceReceiptLine {
  name:       string;
  quantity:   number;
  unit_price: number;
}

export interface ServiceReceiptData {
  job_number:     string;
  job_date:       string;
  branch_name:    string;
  branch_address?: string;
  branch_phone?:  string;
  customer_name?: string;
  customer_phone?: string;
  plate_number?:  string;
  vehicle_make?:  string;
  vehicle_model?: string;
  vehicle_year?:  number | null;
  mechanic_name?: string;
  lines:          ServiceReceiptLine[];
  total_amount:   number;
  notes?:         string;
}

export const generateServiceReceiptHtml = (data: ServiceReceiptData): string => {
  const {
    job_number, job_date, branch_name, branch_address, branch_phone,
    customer_name, customer_phone, plate_number, vehicle_make, vehicle_model,
    vehicle_year, mechanic_name, lines, total_amount, notes,
  } = data;

  const vehicleStr = [plate_number, vehicle_make, vehicle_model, vehicle_year]
    .filter(Boolean).join(' ');

  const lineRows = lines.map(l => `
    <tr>
      <td style="padding:4px 0">${l.name}</td>
      <td style="text-align:center;padding:4px 4px">${l.quantity}</td>
      <td style="text-align:right;padding:4px 4px">${formatCurrency(l.unit_price)}</td>
      <td style="text-align:right;padding:4px 0">${formatCurrency(l.quantity * l.unit_price)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Service Invoice — ${job_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      background: #f4f4f4;
      padding: 20px;
    }
    .receipt {
      width: 320px;
      margin: auto;
      background: #fff;
      border: 1px dashed #ccc;
      padding: 18px;
      box-shadow: 0 0 10px rgba(0,0,0,.08);
    }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .sub { font-size: 11px; line-height: 1.5; }
    .section { font-size: 12px; padding: 6px 0; }
    .section p { margin: 2px 0; }
    .label { font-weight: bold; }
    table { width: 100%; font-size: 12px; border-collapse: collapse; }
    thead th {
      text-align: left;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      font-size: 11px;
    }
    tfoot td {
      padding-top: 6px;
      font-weight: bold;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      padding-top: 8px;
      line-height: 1.6;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border: none; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="receipt">

    <div class="center" style="padding-bottom:8px;border-bottom:1px dashed #000">
      <h1>${branch_name}</h1>
      ${branch_address ? `<p class="sub">${branch_address}</p>` : ''}
      ${branch_phone   ? `<p class="sub">Tel: ${branch_phone}</p>` : ''}
    </div>

    <div class="center" style="padding:6px 0;border-bottom:1px dashed #000">
      <p style="font-size:13px;font-weight:bold;letter-spacing:1px">SERVICE INVOICE</p>
    </div>

    <div class="section" style="border-bottom:1px dashed #000">
      <p><span class="label">Job #: </span>${job_number}</p>
      <p><span class="label">Date: </span>${formatDate(job_date)}</p>
      ${mechanic_name ? `<p><span class="label">Mechanic: </span>${mechanic_name}</p>` : ''}
    </div>

    <div class="section" style="border-bottom:1px dashed #000">
      <p><span class="label">Customer: </span>${customer_name ?? 'Walk-in'}</p>
      ${customer_phone ? `<p><span class="label">Phone: </span>${customer_phone}</p>` : ''}
      ${vehicleStr     ? `<p><span class="label">Vehicle: </span>${vehicleStr}</p>` : ''}
    </div>

    <table style="margin-top:8px;margin-bottom:4px">
      <thead>
        <tr>
          <th>Service / Part</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align:right;padding-right:4px">TOTAL</td>
          <td style="text-align:right">${formatCurrency(total_amount)}</td>
        </tr>
      </tfoot>
    </table>

    ${notes ? `
    <div class="divider"></div>
    <div class="section">
      <p class="label">Notes:</p>
      <p>${notes}</p>
    </div>` : ''}

    <div class="divider"></div>
    <div class="footer">
      <p>Thank you for choosing ${branch_name}!</p>
      <p>Please retain this receipt for your records.</p>
    </div>

  </div>
</body>
</html>`;
};
