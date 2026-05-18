/**
 * Public API של @aneh-hashoel/reports-bi
 */
export * from "./types.js";

// Aggregations
export { buildPnL, summarizePnL } from "./aggregations/pnl.js";
export { buildCashflow } from "./aggregations/cashflow.js";
export { buildVatReport, VAT_RATE_2025 } from "./aggregations/vat.js";
export { buildCogsPerEvent } from "./aggregations/cogs-per-event.js";
export { buildInventoryValuation, totalInventoryValue } from "./aggregations/inventory-valuation.js";
export {
  breakdownByCustomer,
  breakdownByAgent,
  breakdownByEventType,
} from "./aggregations/breakdowns.js";
export { buildRetentionCohorts } from "./aggregations/retention.js";
export { buildCustomerLtv } from "./aggregations/customer-ltv.js";
export { buildAgingReport } from "./aggregations/aging.js";

// Forecast
export { linearRegression } from "./forecast/linear-regression.js";
export { computeSeasonalIndex, applySeasonalFactor } from "./forecast/seasonal.js";

// Reports
export { buildPnLPdf, buildVatPdf, buildAgingPdf } from "./reports/pdf-builder.js";
export {
  buildPnLExcel,
  buildVatExcel,
  buildAgingExcel,
  buildCashflowExcel,
  buildLtvExcel,
  buildEventProfitabilityExcel,
} from "./reports/excel-builder.js";
export { buildQueue, buildWorker, registerCronJobs, runReportJob, ReportJobSchema } from "./reports/scheduler.js";

// API
export { getDashboard } from "./api/dashboard.js";
export { drillDown, DrillDownSchema } from "./api/drill-down.js";
