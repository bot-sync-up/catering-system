/**
 * נקודת כניסה ל־transformers — מאחדים את הפונקציות לפי סוג ה־extractor.
 */
export { transformCustomer } from "./transformCustomer.js";
export { transformOrder } from "./transformOrder.js";
export { transformInvoice } from "./transformInvoice.js";
export { transformEmployee } from "./transformEmployee.js";
export { transformExpense } from "./transformExpense.js";
export { transformPayment } from "./transformPayment.js";

import type { ExtractedRecord, TransformedRecord, SourceModule } from "../types.js";
import { transformCustomer } from "./transformCustomer.js";
import { transformOrder } from "./transformOrder.js";
import { transformInvoice } from "./transformInvoice.js";
import { transformEmployee } from "./transformEmployee.js";
import { transformExpense } from "./transformExpense.js";
import { transformPayment } from "./transformPayment.js";

/** מנתב רשומה חולצת לפונקציית transform המתאימה לפי (sourceModule, sourceTable). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function routeTransform(
  rec: ExtractedRecord<any>,
  sourceTable: string,
  tenantId: string,
): TransformedRecord<any> {
  const key: `${SourceModule}::${string}` = `${rec.__meta.sourceModule}::${sourceTable}`;
  switch (key) {
    case "crm::Customer":
      return transformCustomer(rec, tenantId);
    case "orders::Order":
      return transformOrder(rec, tenantId);
    case "finance-docs::Document":
      return transformInvoice(rec, tenantId);
    case "finance-docs::Payment":
      return transformPayment(rec, tenantId);
    case "hr::Employee":
      return transformEmployee(rec, tenantId);
    case "expenses::Expense":
      return transformExpense(rec, tenantId);
    default:
      throw new Error(`אין transformer ל־${key}`);
  }
}
