/**
 * Mocks למודולים פנימיים (CRM / Orders / Invoices / Payments / Events).
 * בפרודקשן יוחלפו בקריאות REST/gRPC או ב-Prisma מ-DB אחר.
 * החתימה זהה כדי שה-worker יהיה אגנוסטי למימוש.
 */

export interface CrmRecord {
  userId: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  tags: string[];
  notes: string[];
}

export interface OrderRecord {
  id: string;
  userId: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  userId: string;
  orderId: string;
  total: number;
  taxId: string;
  createdAt: string;
  /** חשבוניות חייבות בשמירה 7 שנים — סעיף 25(ב) להוראות ניהול ספרים */
  legalRetentionUntil: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  invoiceId: string;
  amount: number;
  last4: string; // אסור לאחסן PAN מלא
  method: "card" | "bit" | "bank";
  createdAt: string;
}

export interface EventRecord {
  id: string;
  userId: string;
  type: string;
  meta: Record<string, unknown>;
  occurredAt: string;
}

export async function fetchCrm(userId: string): Promise<CrmRecord> {
  return {
    userId,
    fullName: `דוגמה ${userId.slice(-4)}`,
    email: `${userId}@example.co.il`,
    phone: "050-0000000",
    tags: ["lead", "newsletter"],
    notes: ["שיחה ראשונה ביום שני", "הביע עניין במסלול חודשי"],
  };
}

export async function fetchOrders(userId: string): Promise<OrderRecord[]> {
  return [
    {
      id: `ord_${userId}_1`,
      userId,
      total: 199,
      currency: "ILS",
      status: "fulfilled",
      createdAt: "2026-01-12T08:00:00Z",
    },
  ];
}

export async function fetchInvoices(userId: string): Promise<InvoiceRecord[]> {
  return [
    {
      id: `inv_${userId}_1`,
      userId,
      orderId: `ord_${userId}_1`,
      total: 199,
      taxId: "514999999",
      createdAt: "2026-01-12T08:05:00Z",
      // שמירה משפטית עד 7 שנים מסוף שנת הוצאת החשבונית
      legalRetentionUntil: "2033-12-31T23:59:59Z",
    },
  ];
}

export async function fetchPayments(userId: string): Promise<PaymentRecord[]> {
  return [
    {
      id: `pay_${userId}_1`,
      userId,
      invoiceId: `inv_${userId}_1`,
      amount: 199,
      last4: "4242",
      method: "card",
      createdAt: "2026-01-12T08:06:00Z",
    },
  ];
}

export async function fetchEvents(userId: string): Promise<EventRecord[]> {
  return [
    {
      id: `evt_${userId}_1`,
      userId,
      type: "login",
      meta: { ip: "10.0.0.1", ua: "Mozilla/5.0" },
      occurredAt: "2026-02-01T10:00:00Z",
    },
    {
      id: `evt_${userId}_2`,
      userId,
      type: "purchase",
      meta: { orderId: `ord_${userId}_1` },
      occurredAt: "2026-01-12T08:00:00Z",
    },
  ];
}

export type ModuleName = "crm" | "orders" | "invoices" | "payments" | "events";

export async function fetchAllModules(userId: string) {
  const [crm, orders, invoices, payments, events] = await Promise.all([
    fetchCrm(userId),
    fetchOrders(userId),
    fetchInvoices(userId),
    fetchPayments(userId),
    fetchEvents(userId),
  ]);
  return { crm, orders, invoices, payments, events };
}
