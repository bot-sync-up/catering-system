/**
 * נקודת כניסה ל־extractors — בוחר את ה־extractor המתאים לפי sourceModule.
 */
import type { Pool } from "pg";
import type { Extractor, SourceModule } from "./base.js";
import { CustomersFromCrmExtractor } from "./extractCustomersFromCrm.js";
import { OrdersFromOrdersModuleExtractor } from "./extractOrdersFromOrdersModule.js";
import { InvoicesFromFinanceDocsExtractor } from "./extractInvoicesFromFinanceDocs.js";
import { EmployeesFromHrExtractor } from "./extractEmployeesFromHr.js";
import { VehiclesFromFleetExtractor } from "./extractVehiclesFromFleet.js";
import { ExpensesFromExpensesExtractor } from "./extractExpensesFromExpenses.js";
import { PaymentsFromFinanceDocsExtractor } from "./extractPaymentsFromFinanceDocs.js";
import { LeadsFromCrmExtractor } from "./extractLeadsFromCrm.js";

export {
  CustomersFromCrmExtractor,
  OrdersFromOrdersModuleExtractor,
  InvoicesFromFinanceDocsExtractor,
  EmployeesFromHrExtractor,
  VehiclesFromFleetExtractor,
  ExpensesFromExpensesExtractor,
  PaymentsFromFinanceDocsExtractor,
  LeadsFromCrmExtractor,
};

/**
 * סדר ה־extractors מומלץ למיגרציה. תאם להמלצות
 * `MIGRATION-FROM-MODULES.md §12`:
 *   1) tenant 2) משתמשים 3) לקוחות 4) פריטים/ספקים 5) אירועים+הזמנות
 *   6) חשבוניות+תשלומים 7) AuditLog
 */
export function buildExtractorPipeline(
  pools: Partial<Record<SourceModule, Pool>>,
): Extractor[] {
  const pipeline: Extractor[] = [];
  if (pools.crm) {
    pipeline.push(new CustomersFromCrmExtractor(pools.crm));
    pipeline.push(new LeadsFromCrmExtractor(pools.crm));
  }
  if (pools.hr) pipeline.push(new EmployeesFromHrExtractor(pools.hr));
  if (pools.fleet) pipeline.push(new VehiclesFromFleetExtractor(pools.fleet));
  if (pools.orders) pipeline.push(new OrdersFromOrdersModuleExtractor(pools.orders));
  if (pools["finance-docs"]) {
    pipeline.push(new InvoicesFromFinanceDocsExtractor(pools["finance-docs"]));
    pipeline.push(new PaymentsFromFinanceDocsExtractor(pools["finance-docs"]));
  }
  if (pools.expenses) pipeline.push(new ExpensesFromExpensesExtractor(pools.expenses));
  return pipeline;
}
