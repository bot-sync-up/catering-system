/**
 * Transformer: Customer (CRM ישן) → Customer חדש בסכמה המאוחדת.
 *
 * מיפוי שדות (מתוך MIGRATION-FROM-MODULES.md §3):
 *   displayName → displayName
 *   companyName → companyName
 *   taxId       → taxId
 *   email/phone → email/phone (מנורמלים)
 *   type        → type (CustomerType enum — INDIVIDUAL/BUSINESS/...)
 *   status      → status (CustomerStatus)
 *   churn/upsellScore (Float) → Decimal(5,4) (0..1)
 *   ltv (Float) → Decimal(12,2)
 *   id (cuid)   → UUID דטרמיניסטי
 */

import type { TransformedRecord, ExtractedRecord } from "../types.js";
import type { CrmCustomerRow } from "../extractors/extractCustomersFromCrm.js";
import {
  deterministicUuid,
  normalizeEmail,
  normalizePhone,
  floatToDecimal,
  toDate,
} from "../util/normalize.js";
import { Decimal } from "decimal.js";

/** מיפוי enum: CustomerType הישן → החדש. */
const customerTypeMap: Record<string, string> = {
  PROSPECT: "INDIVIDUAL",
  INDIVIDUAL: "INDIVIDUAL",
  BUSINESS: "BUSINESS",
  ORGANIZATION: "ORGANIZATION",
  GOVERNMENT: "GOVERNMENT",
};

/** מיפוי enum: CustomerStatus הישן → החדש. */
const customerStatusMap: Record<string, string> = {
  PROSPECT: "ACTIVE",
  ACTIVE: "ACTIVE",
  CHURNED: "INACTIVE",
  INACTIVE: "INACTIVE",
  VIP: "ACTIVE",
};

export interface NewCustomerData {
  id: string;
  tenantId: string;
  type: string;
  status: string;
  displayName: string;
  companyName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  churnScore: Decimal;
  upsellScore: Decimal;
  ltv: Decimal;
  lastContactAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** מאיפה הגיע (לרולבק + audit). */
  _migrationSource: string;
  _migrationBatchId: string;
}

export function transformCustomer(
  rec: ExtractedRecord<CrmCustomerRow>,
  tenantId: string,
): TransformedRecord<NewCustomerData> {
  const p = rec.payload;
  const warnings: string[] = [];

  const newId = deterministicUuid(rec.__meta.sourceModule, p.id);
  const mappedType = customerTypeMap[p.type];
  if (!mappedType) warnings.push(`לא ידוע: type=${p.type} → ברירת מחדל INDIVIDUAL`);
  const mappedStatus = customerStatusMap[p.status];
  if (!mappedStatus) warnings.push(`לא ידוע: status=${p.status} → ברירת מחדל ACTIVE`);

  // churn/upsell scores היו Float 0..1. בסכמה החדשה Decimal(5,4).
  const churn = clamp01(p.churnScore);
  const upsell = clamp01(p.upsellScore);

  const data: NewCustomerData = {
    id: newId,
    tenantId,
    type: mappedType ?? "INDIVIDUAL",
    status: mappedStatus ?? "ACTIVE",
    displayName: (p.displayName ?? "").trim() || "(ללא שם)",
    companyName: p.companyName?.trim() || null,
    taxId: p.taxId?.trim() || null,
    email: normalizeEmail(p.email),
    phone: normalizePhone(p.phone),
    website: p.website?.trim() || null,
    notes: p.notes ?? null,
    churnScore: churn,
    upsellScore: upsell,
    ltv: floatToDecimal(p.ltv),
    lastContactAt: toDate(p.lastContact),
    createdAt: toDate(p.createdAt) ?? new Date(),
    updatedAt: toDate(p.updatedAt) ?? new Date(),
    _migrationSource: `${rec.__meta.sourceModule}::${rec.__meta.originalId}`,
    _migrationBatchId: rec.__meta.batchId,
  };

  return {
    __meta: rec.__meta,
    targetModel: "Customer",
    newId,
    data,
    // upsert key: זוג (tenantId, taxId) אם יש; אחרת (tenantId, email).
    upsertKey: data.taxId
      ? { tenantId, taxId: data.taxId }
      : data.email
        ? { tenantId, email: data.email }
        : { id: newId },
    warnings,
  };
}

function clamp01(v: number | null | undefined): Decimal {
  if (v === null || v === undefined || !Number.isFinite(v)) return new Decimal(0);
  const d = new Decimal(v);
  if (d.lessThan(0)) return new Decimal(0);
  if (d.greaterThan(1)) return new Decimal(1);
  return d.toDecimalPlaces(4);
}
