export interface InvoiceItem {
  desc: string;
  qty: number;
  price: number;
  vat: number;
  sku?: string;
  lineTotal?: number;
}

export interface Invoice {
  supplier: { name: string; taxId: string; address?: string; phone?: string };
  date: string;
  invoiceNum: string;
  currency: string;
  items: InvoiceItem[];
  subtotal?: number;
  vatTotal?: number;
  total: number;
  dueDate?: string;
  poRef?: string;
  notes?: string;
}

export interface PendingInvoice {
  hash: string;
  invoice: Invoice;
  alerts: { kind: string; severity: 'info' | 'warn' | 'critical'; message: string }[];
  source: string;
  filename: string;
}
