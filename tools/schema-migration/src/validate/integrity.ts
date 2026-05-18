/**
 * Validation: בדיקת שלמות מפתחות זרים ושפיות נתונים.
 *
 * - בודק שכל invoice.customerId קיים בטבלת customers.
 * - בודק שכל event.customerId קיים.
 * - בודק שכל payment.invoiceId קיים.
 * - בודק שכל סכום total = subtotal + tax (סובלנות 0.02).
 */

import type { PrismaClient } from "@prisma/client";

export interface IntegrityIssue {
  check: string;
  table: string;
  ids: string[];
  message: string;
}

export async function runIntegrityChecks(prisma: PrismaClient): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  const orphanInvoices = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT i.id FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
      WHERE c.id IS NULL
      LIMIT 100`,
  );
  if (orphanInvoices.length) {
    issues.push({
      check: "FK invoices.customer_id",
      table: "invoices",
      ids: orphanInvoices.map((r) => r.id),
      message: `${orphanInvoices.length} חשבוניות ללא לקוח קיים`,
    });
  }

  const orphanEvents = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT e.id FROM events e
       LEFT JOIN customers c ON c.id = e.customer_id
      WHERE c.id IS NULL
      LIMIT 100`,
  );
  if (orphanEvents.length) {
    issues.push({
      check: "FK events.customer_id",
      table: "events",
      ids: orphanEvents.map((r) => r.id),
      message: `${orphanEvents.length} אירועים ללא לקוח קיים`,
    });
  }

  const orphanPayments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT p.id FROM payments p
       LEFT JOIN invoices i ON i.id = p.invoice_id
      WHERE i.id IS NULL
      LIMIT 100`,
  );
  if (orphanPayments.length) {
    issues.push({
      check: "FK payments.invoice_id",
      table: "payments",
      ids: orphanPayments.map((r) => r.id),
      message: `${orphanPayments.length} תשלומים ללא חשבונית מקושרת`,
    });
  }

  const badInvoiceMath = await prisma.$queryRawUnsafe<Array<{ id: string; diff: string }>>(
    `SELECT id, (total_amount - amount - tax_amount)::text AS diff
       FROM invoices
      WHERE ABS(total_amount - amount - tax_amount) > 0.02
      LIMIT 100`,
  );
  if (badInvoiceMath.length) {
    issues.push({
      check: "INV total = amount + tax",
      table: "invoices",
      ids: badInvoiceMath.map((r) => r.id),
      message: `${badInvoiceMath.length} חשבוניות עם סכום שלא תואם`,
    });
  }

  // sanity — paid_amount לא יעלה על total_amount.
  const overpaid = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM invoices WHERE paid_amount > total_amount + 0.02 LIMIT 100`,
  );
  if (overpaid.length) {
    issues.push({
      check: "paid_amount <= total_amount",
      table: "invoices",
      ids: overpaid.map((r) => r.id),
      message: `${overpaid.length} חשבוניות עם תשלום מעל הסכום הכולל`,
    });
  }

  return issues;
}
