/**
 * Transformer: Order (orders module ישן) → Event חדש (אם type EVENT)
 * או Order חדש לפי המקרה.
 *
 * הסכמה המאוחדת מבחינה בין Event (אירוע אונליין) ל־Order/OrderItem. ההזמנה
 * הישנה לעיתים שניהם. עבור type=EVENT, אנחנו יוצרים Event; אחרים — תאם
 * ל־Order של ה־e-commerce.
 *
 * סכומים: Float → Decimal(12,2). מספר אורחים: שדה guestCount עובר ל־Event.
 */

import type { TransformedRecord, ExtractedRecord } from "../types.js";
import type { OrdersOrderRow } from "../extractors/extractOrdersFromOrdersModule.js";
import { deterministicUuid, floatToDecimal, toDate } from "../util/normalize.js";
import { Decimal } from "decimal.js";

const orderStatusToEventStatus: Record<string, string> = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export interface NewEventData {
  id: string;
  tenantId: string;
  customerId: string;
  eventNumber: string;
  type: string;
  status: string;
  eventDate: Date;
  eventLocation: string | null;
  guestCount: number | null;
  basePrice: Decimal;
  discount: Decimal;
  taxAmount: Decimal;
  totalPrice: Decimal;
  paidAmount: Decimal;
  customerNotes: string | null;
  internalNotes: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  _migrationSource: string;
  _migrationBatchId: string;
}

export function transformOrder(
  rec: ExtractedRecord<OrdersOrderRow>,
  tenantId: string,
): TransformedRecord<NewEventData> {
  const p = rec.payload;
  const warnings: string[] = [];
  const newId = deterministicUuid(rec.__meta.sourceModule, p.id);

  const status = orderStatusToEventStatus[p.status];
  if (!status) warnings.push(`status לא ידוע: ${p.status} → DRAFT`);

  if (!p.eventDate) {
    warnings.push("eventDate חסר; משתמש ב־createdAt כברירת מחדל");
  }

  const customerId = deterministicUuid("crm", p.customerId);

  const data: NewEventData = {
    id: newId,
    tenantId,
    customerId,
    eventNumber: p.orderNumber,
    type: mapEventType(p.type, warnings),
    status: status ?? "DRAFT",
    eventDate: toDate(p.eventDate) ?? toDate(p.createdAt) ?? new Date(),
    eventLocation: p.eventLocation?.trim() || null,
    guestCount: p.guestCount ?? null,
    basePrice: floatToDecimal(p.subtotal),
    discount: new Decimal(0),
    taxAmount: floatToDecimal(p.taxAmount),
    totalPrice: floatToDecimal(p.totalAmount),
    paidAmount: new Decimal(0),
    customerNotes: p.customerNotes,
    internalNotes: p.internalNotes,
    approvedById: p.approvedById ? deterministicUuid("crm", p.approvedById) : null,
    approvedAt: toDate(p.approvedAt),
    rejectedReason: p.rejectedReason,
    createdAt: toDate(p.createdAt) ?? new Date(),
    updatedAt: toDate(p.updatedAt) ?? new Date(),
    _migrationSource: `${rec.__meta.sourceModule}::${rec.__meta.originalId}`,
    _migrationBatchId: rec.__meta.batchId,
  };

  return {
    __meta: rec.__meta,
    targetModel: "Event",
    newId,
    data,
    upsertKey: { tenantId, eventNumber: data.eventNumber },
    warnings,
  };
}

/** OrderType הישן → EventType חדש. */
function mapEventType(orderType: string, warnings: string[]): string {
  const map: Record<string, string> = {
    WEDDING: "WEDDING",
    BAR_MITZVAH: "BAR_MITZVAH",
    BAT_MITZVAH: "BAT_MITZVAH",
    BRIT: "BRIT_MILAH",
    BRIT_MILAH: "BRIT_MILAH",
    ENGAGEMENT: "ENGAGEMENT",
    SHEVA_BRACHOT: "SHEVA_BRACHOT",
    CORPORATE: "CORPORATE",
    CONFERENCE: "CONFERENCE",
    PRIVATE: "PRIVATE_PARTY",
    PRIVATE_PARTY: "PRIVATE_PARTY",
    SUBSCRIPTION: "OTHER",
    DELIVERY: "OTHER",
  };
  const result = map[orderType];
  if (!result) {
    warnings.push(`OrderType לא ידוע: ${orderType} → OTHER`);
    return "OTHER";
  }
  return result;
}
