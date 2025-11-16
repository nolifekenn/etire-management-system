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
}

/**
 * A generic customer object for the receipt.
 */
export interface ReceiptCustomer {
  name: string;
  phone?: string;
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
    padding: 20px;
    background: #f4f4f4;
  }
  .receipt-container {
    width: 320px; /* Standard thermal printer width */
    margin: auto;
    background: #fff;
    border: 1px dashed #ccc;
    padding: 20px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
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
  const subtotal = (sale.total_amount || 0) - (sale.tax_amount || 0) + (sale.discount_amount || 0);

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
        <title>Receipt ${sale.sale_id.split('-')[0]}</title>
        <style>
          ${getReceiptCss()}
        </style>
      </head>
      <body>
        <div class="receipt-container">
          
          <div class="header">
            <h1>${businessInfo.storeName}</h1>
            <p>${businessInfo.address}</p>
            <p>Phone: ${businessInfo.phone || 'N/A'}</p>
            <p>TIN: ${businessInfo.taxInfo || 'N/A'}</p>
          </div>

          <div class="details">
            <p>Sale ID: ${sale.sale_id.split('-')[0]}</p>
            <p>Date: ${formatDate(sale.sale_date)}</p>
            <p>Cashier: ${cashier.name}</p>
            ${branch ? `<p>Branch: ${branch.name}</p>` : ''}
          </div>

          <div class="customer">
            <p>Customer: ${customer ? customer.name : 'Walk-in Customer'}</p>
            ${customer && customer.phone ? `<p>Phone: ${customer.phone}</p>` : ''}
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
                <td class="value">-${formatCurrency(sale.discount_amount || 0)}</td>
              </tr>
              <tr>
                <td class="label">Tax</td>
                <td class="value">${formatCurrency(sale.tax_amount || 0)}</td>
              </tr>
              <tr class="total-row">
                <td class="label">TOTAL</td>
                <td class="value">${formatCurrency(sale.total_amount || 0)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Payment Method: ${sale.payment_method}</p>
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