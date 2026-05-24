/**
 * Transformer: Payment (finance-docs ישן) → Payment חדש.
 *
 * שינויים: documentId הישן → invoiceId חדש (כי הסכמה החדשה מבדילה
 * Invoice מ־Receipt בעוד הישנה אחד נספג בשני).
 */

import type { TransformedRecord, ExtractedRecord } from "../types.js";
import type { FinancePaymentRow } from "../extractors/extractPaymentsFromFinanceDocs.js";
import {
  deterministicUuid,
  toDate,
  toMoneyDecimal,
} from "../util/normalize.js";
import { Decimal } from "decimal.js";

const paymentMethodMap: Record<string, string> = {
  CASH: "CASH",
  CHECK: "CHECK",
  BANK_TRANSFER: "BANK_TRANSFER",
  WIRE: "BANK_TRANSFER",
  CREDIT_CARD: "CREDIT_CARD",
  CC: "CREDIT_CARD",
  BIT: "BIT",
  PAYBOX: "PAYBOX",
  PAYPAL: "OTHER",
  OTHER: "OTHER",
};

export interface NewPaymentData {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: Decimal;
  method: string;
  paidAt: Date;
  reference: string | null;
  notes: string | null;
  category: "OFFICIAL" | "UNOFFICIAL";
  createdAt: Date;
  _migrationSource: string;
  _migrationBatchId: string;
}

export function transformPayment(
  rec: ExtractedRecord<FinancePaymentRow>,
  tenantId: string,
): TransformedRecord<NewPaymentData> {
  const p = rec.payload;
  const warnings: string[] = [];
  const newId = deterministicUuid(rec.__meta.sourceModule, p.id);

  const method = paymentMethodMap[p.method];
  if (!method) warnings.push(`PaymentMethod לא ידוע: ${p.method} → OTHER`);

  const data: NewPaymentData = {
    id: newId,
    tenantId,
    invoiceId: deterministicUuid(rec.__meta.sourceModule, p.documentId),
    amount: toMoneyDecimal(p.amount) ?? new Decimal(0),
    method: method ?? "OTHER",
    paidAt: toDate(p.paidAt) ?? new Date(),
    reference: p.reference,
    notes: p.notes,
    category: "OFFICIAL",
    createdAt: toDate(p.createdAt) ?? new Date(),
    _migrationSource: `${rec.__meta.sourceModule}::${rec.__meta.originalId}`,
    _migrationBatchId: rec.__meta.batchId,
  };

  return {
    __meta: rec.__meta,
    targetModel: "Payment",
    newId,
    data,
    upsertKey: { id: newId },
    warnings,
  };
}
