/**
 * Transformer: Document (finance-docs ישן) → Invoice חדש.
 *
 * שינויים מפתח:
 *   - vatRate: 0.17/0.18 → 17/18 (אחוזים).
 *   - tag (OFFICIAL/UNOFFICIAL) → category: FinancialCategory.
 *   - balance: לא נשמר בנפרד; הסכמה החדשה מחשבת אותו (total - paid).
 *   - parent linkage: parentId נשמר אם קיים, ממופה ל־UUID החדש.
 *   - orgId הישן → tenantId חדש (1:1 לפי הקונפיגורציה).
 */

import type { TransformedRecord, ExtractedRecord } from "../types.js";
import type { FinanceDocsInvoiceRow } from "../extractors/extractInvoicesFromFinanceDocs.js";
import {
  deterministicUuid,
  normalizeCurrency,
  normalizeVatRate,
  toDate,
  toMoneyDecimal,
  toFinancialCategory,
} from "../util/normalize.js";
import { Decimal } from "decimal.js";

const docStatusMap: Record<string, string> = {
  DRAFT: "DRAFT",
  ISSUED: "ISSUED",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
  OVERDUE: "OVERDUE",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  VOIDED: "CANCELLED",
};

export interface NewInvoiceData {
  id: string;
  tenantId: string;
  customerId: string;
  invoiceNum: string;
  status: string;
  category: "OFFICIAL" | "UNOFFICIAL";
  currency: string;
  amount: Decimal;
  vatRate: Decimal;
  taxAmount: Decimal;
  totalAmount: Decimal;
  paidAmount: Decimal;
  issuedAt: Date;
  dueAt: Date | null;
  notes: string | null;
  pdfPath: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _migrationSource: string;
  _migrationBatchId: string;
}

export function transformInvoice(
  rec: ExtractedRecord<FinanceDocsInvoiceRow>,
  tenantId: string,
): TransformedRecord<NewInvoiceData> {
  const p = rec.payload;
  const warnings: string[] = [];
  const newId = deterministicUuid(rec.__meta.sourceModule, p.id);

  const status = docStatusMap[p.status];
  if (!status) warnings.push(`InvoiceStatus לא ידוע: ${p.status} → DRAFT`);

  const subtotal = toMoneyDecimal(p.subtotal) ?? new Decimal(0);
  const vatRate = normalizeVatRate(p.vatRate);
  const taxAmount = toMoneyDecimal(p.vatAmount) ?? new Decimal(0);
  const totalAmount = toMoneyDecimal(p.total) ?? subtotal.plus(taxAmount);
  const paidAmount = toMoneyDecimal(p.paidAmount) ?? new Decimal(0);

  // אינווריאנט בסיסי: subtotal + tax ~= total (סובלנות אגורה).
  const expectedTotal = subtotal.plus(taxAmount);
  if (totalAmount.minus(expectedTotal).abs().greaterThan(new Decimal("0.02"))) {
    warnings.push(
      `סכום לא תואם: subtotal(${subtotal})+tax(${taxAmount})!=total(${totalAmount})`,
    );
  }

  const data: NewInvoiceData = {
    id: newId,
    tenantId,
    customerId: deterministicUuid("crm", p.customerId),
    invoiceNum: p.number,
    status: status ?? "DRAFT",
    category: toFinancialCategory(p.tag),
    currency: normalizeCurrency(p.currency),
    amount: subtotal,
    vatRate,
    taxAmount,
    totalAmount,
    paidAmount,
    issuedAt: toDate(p.issueDate) ?? new Date(),
    dueAt: toDate(p.dueDate),
    notes: p.notes,
    pdfPath: p.pdfPath,
    parentId: p.parentId ? deterministicUuid(rec.__meta.sourceModule, p.parentId) : null,
    createdAt: toDate(p.createdAt) ?? new Date(),
    updatedAt: toDate(p.updatedAt) ?? new Date(),
    _migrationSource: `${rec.__meta.sourceModule}::${rec.__meta.originalId}`,
    _migrationBatchId: rec.__meta.batchId,
  };

  return {
    __meta: rec.__meta,
    targetModel: "Invoice",
    newId,
    data,
    upsertKey: { tenantId, invoiceNum: data.invoiceNum },
    warnings,
  };
}
