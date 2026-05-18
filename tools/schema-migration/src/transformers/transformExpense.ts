/**
 * Transformer: Expense (Expenses ישן) → Expense חדש.
 *
 * שינויים:
 *   - amount/vatAmount: Decimal(14,2) → Decimal(12,2).
 *   - source/status enums: ממופים לערכי ה־enum החדש.
 *   - vendorId המומר → supplierId (מודל Supplier בסכמה החדשה).
 *   - category (FinancialCategory) ברירת מחדל OFFICIAL.
 */

import type { TransformedRecord, ExtractedRecord } from "../types.js";
import type { ExpensesExpenseRow } from "../extractors/extractExpensesFromExpenses.js";
import {
  deterministicUuid,
  normalizeCurrency,
  toDate,
  toMoneyDecimal,
} from "../util/normalize.js";
import { Decimal } from "decimal.js";

const expenseSourceMap: Record<string, string> = {
  MANUAL: "MANUAL",
  OCR: "OCR",
  BANK_FEED: "BANK_FEED",
  RECURRING: "RECURRING",
  API: "API",
};

const expenseStatusMap: Record<string, string> = {
  RECORDED: "RECORDED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  RECONCILED: "RECONCILED",
  PENDING: "RECORDED",
};

export interface NewExpenseData {
  id: string;
  tenantId: string;
  amount: Decimal;
  currency: string;
  vatAmount: Decimal | null;
  description: string;
  expenseDate: Date;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  ocrData: unknown;
  source: string;
  status: string;
  category: "OFFICIAL" | "UNOFFICIAL";
  supplierId: string | null;
  userId: string | null;
  bankTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _migrationSource: string;
  _migrationBatchId: string;
}

export function transformExpense(
  rec: ExtractedRecord<ExpensesExpenseRow>,
  tenantId: string,
): TransformedRecord<NewExpenseData> {
  const p = rec.payload;
  const warnings: string[] = [];
  const newId = deterministicUuid(rec.__meta.sourceModule, p.id);

  const source = expenseSourceMap[p.source];
  if (!source) warnings.push(`ExpenseSource לא ידוע: ${p.source} → MANUAL`);
  const status = expenseStatusMap[p.status];
  if (!status) warnings.push(`ExpenseStatus לא ידוע: ${p.status} → RECORDED`);

  // הוצאות הן רשמיות בברירת מחדל (מדווחות לרשויות).
  const category: "OFFICIAL" | "UNOFFICIAL" = "OFFICIAL";

  const data: NewExpenseData = {
    id: newId,
    tenantId,
    amount: toMoneyDecimal(p.amount) ?? new Decimal(0),
    currency: normalizeCurrency(p.currency),
    vatAmount: toMoneyDecimal(p.vatAmount),
    description: p.description?.trim() || "(ללא תיאור)",
    expenseDate: toDate(p.expenseDate) ?? new Date(),
    invoiceNumber: p.invoiceNumber,
    invoiceUrl: p.invoiceUrl,
    ocrData: p.ocrData,
    source: source ?? "MANUAL",
    status: status ?? "RECORDED",
    category,
    supplierId: p.vendorId
      ? deterministicUuid(rec.__meta.sourceModule, p.vendorId)
      : null,
    userId: p.userId ? deterministicUuid(rec.__meta.sourceModule, p.userId) : null,
    bankTransactionId: p.bankTransactionId
      ? deterministicUuid(rec.__meta.sourceModule, p.bankTransactionId)
      : null,
    createdAt: toDate(p.createdAt) ?? new Date(),
    updatedAt: toDate(p.updatedAt) ?? new Date(),
    _migrationSource: `${rec.__meta.sourceModule}::${rec.__meta.originalId}`,
    _migrationBatchId: rec.__meta.batchId,
  };

  return {
    __meta: rec.__meta,
    targetModel: "Expense",
    newId,
    data,
    upsertKey: { id: newId },
    warnings,
  };
}
