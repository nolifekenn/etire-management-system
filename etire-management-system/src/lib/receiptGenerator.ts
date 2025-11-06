// 🔄 RECEIPT GENERATION SERVICE - COMPLETE IMPLEMENTATION

import { supabase } from './supabaseClient';
import { jsPDF } from 'jspdf';

// =======================
// TYPES
// =======================
export interface ReceiptData {
  receiptId: string;
  saleId: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  receiptDate: Date;
  employeeName: string;
  companyInfo: CompanyInfo;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  taxId?: string;
}

export interface ReceiptGenerationResult {
  receiptId: string;
  pdfUrl: string;
  emailSent: boolean;
  printQueued: boolean;
  receiptNumber: string;
}

// =======================
// RECEIPT GENERATOR CLASS
// =======================
export class ReceiptGenerator {
  private companyInfo: CompanyInfo;

  constructor(companyInfo: CompanyInfo) {
    this.companyInfo = companyInfo;
  }

  // 🧾 Generate a PDF receipt using jsPDF
  async generatePDFReceipt(receiptData: ReceiptData): Promise<Blob> {
    const doc = new jsPDF();
    const lineHeight = 8;
    let y = 20;

    // Company Info
    doc.setFontSize(14);
    doc.text(this.companyInfo.name, 15, y);
    doc.setFontSize(10);
    y += lineHeight;
    doc.text(this.companyInfo.address, 15, y);
    y += lineHeight;
    doc.text(`Phone: ${this.companyInfo.phone}`, 15, y);
    y += lineHeight;
    doc.text(`Email: ${this.companyInfo.email}`, 15, y);
    if (this.companyInfo.taxId) {
      y += lineHeight;
      doc.text(`Tax ID: ${this.companyInfo.taxId}`, 15, y);
    }

    y += 15;
    doc.setFontSize(12);
    doc.text(`Receipt #: ${receiptData.receiptId}`, 15, y);
    y += lineHeight;
    doc.text(`Date: ${receiptData.receiptDate.toLocaleString()}`, 15, y);
    y += lineHeight;
    doc.text(`Customer: ${receiptData.customerName}`, 15, y);
    y += lineHeight;
    doc.text(`Payment Method: ${receiptData.paymentMethod}`, 15, y);

    y += 15;
    doc.setFontSize(12);
    doc.text('Items:', 15, y);
    y += lineHeight;

    // Table Header
    doc.setFontSize(10);
    doc.text('Item', 15, y);
    doc.text('Qty', 100, y);
    doc.text('Price', 120, y);
    doc.text('Total', 160, y);
    y += 5;
    doc.line(15, y, 200, y);
    y += 5;

    // Table Rows
    receiptData.items.forEach((item) => {
      doc.text(item.name, 15, y);
      doc.text(String(item.quantity), 100, y);
      doc.text(`₱${item.unitPrice.toFixed(2)}`, 120, y);
      doc.text(`₱${item.totalPrice.toFixed(2)}`, 160, y);
      y += lineHeight;
    });

    y += 5;
    doc.line(15, y, 200, y);
    y += lineHeight;
    doc.text(`Subtotal: ₱${receiptData.subtotal.toFixed(2)}`, 140, y);
    y += lineHeight;
    doc.text(`Tax: ₱${receiptData.tax.toFixed(2)}`, 140, y);
    y += lineHeight;
    doc.setFontSize(12);
    doc.text(`TOTAL: ₱${receiptData.total.toFixed(2)}`, 140, y);

    y += 20;
    doc.setFontSize(10);
    doc.text(`Served by: ${receiptData.employeeName}`, 15, y);
    y += lineHeight;
    doc.text('Thank you for your purchase!', 15, y);
    y += lineHeight;
    doc.text('Visit us again soon!', 15, y);

    const blob = doc.output('blob');
    return blob;
  }

  // 🗂️ Upload PDF to Supabase Storage
  async uploadReceiptPDF(pdfBlob: Blob, fileName: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(`pdfs/${fileName}.pdf`, pdfBlob, {
        upsert: true,
        contentType: 'application/pdf',
      });

    if (error) {
      console.error('Error uploading receipt to Supabase:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(`pdfs/${fileName}.pdf`);

    return publicUrlData.publicUrl;
  }

  // 💾 Store receipt record in the database
  async storeReceipt(receiptData: ReceiptData, pdfUrl: string): Promise<string> {
    const { data, error } = await supabase
      .from('receipts')
      .insert({
        sale_id: receiptData.saleId,
        customer_id: receiptData.customerId || null,
        receipt_number: receiptData.receiptId,
        receipt_url: pdfUrl,
        total_amount: receiptData.total,
        payment_method: receiptData.paymentMethod,
        employee_name: receiptData.employeeName,
        email_sent: !!receiptData.customerEmail,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing receipt in database:', error);
      throw error;
    }

    return data.receipt_id;
  }

  // 📧 Email sending placeholder
  async sendEmailReceipt(receiptData: ReceiptData, pdfUrl: string): Promise<boolean> {
    if (!receiptData.customerEmail) return false;

    console.log('Emailing receipt to', receiptData.customerEmail, pdfUrl);
    // Later: integrate SendGrid or Nodemailer
    return true;
  }

  // 🖨️ Printing placeholder
  async printReceipt(receiptId: string): Promise<boolean> {
    console.log('Printing receipt', receiptId);
    return true;
  }

  // 🧮 Generate unique receipt number
  generateReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `RCP-${year}${month}${day}-${timestamp}`;
  }

  // 🔄 Full receipt generation workflow
  async generateCompleteReceipt(saleId: string, saleData: any, cartItems: any[]): Promise<ReceiptGenerationResult> {
    try {
      const receiptId = this.generateReceiptNumber();

      const receiptData: ReceiptData = {
        receiptId,
        saleId,
        customerId: saleData.customer_id,
        customerName: saleData.customer_name || 'Walk-in Customer',
        customerEmail: saleData.customer_email,
        items: cartItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.sale_price,
          totalPrice: item.quantity * item.sale_price,
          description: item.category,
        })),
        subtotal: saleData.total_amount,
        tax: 0,
        total: saleData.total_amount,
        paymentMethod: saleData.payment_method || 'Cash',
        receiptDate: new Date(),
        employeeName: saleData.employee_name || 'Staff',
        companyInfo: this.companyInfo,
      };

      // 1. Generate PDF blob
      const pdfBlob = await this.generatePDFReceipt(receiptData);

      // 2. Upload to Supabase Storage
      const pdfUrl = await this.uploadReceiptPDF(pdfBlob, receiptId);

      // 3. Store in database
      const dbId = await this.storeReceipt(receiptData, pdfUrl);

      // 4. Email and Print (optional)
      const emailSent = await this.sendEmailReceipt(receiptData, pdfUrl);
      const printQueued = await this.printReceipt(dbId);

      return {
        receiptId,
        pdfUrl,
        emailSent,
        printQueued,
        receiptNumber: receiptId,
      };
    } catch (error) {
      console.error('❌ Receipt generation failed:', error);
      throw error;
    }
  }
}

// =======================
// DEFAULT COMPANY INFO
// =======================
export const defaultCompanyInfo: CompanyInfo = {
  name: 'E-Tire Manager',
  address: '123 Tire Street, City, Philippines',
  phone: '(+63) 912-345-6789',
  email: 'receipts@etiremanager.com',
  website: 'www.etiremanager.com',
  taxId: 'TAX-123456789',
};

// =======================
// EXPORT DEFAULT INSTANCE
// =======================
export const receiptGenerator = new ReceiptGenerator(defaultCompanyInfo);
