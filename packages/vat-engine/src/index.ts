/**
 * @syncup/vat-engine
 * נקודת כניסה ציבורית - מייצא את כל ה-API.
 */
export {
  getVATRate,
  getVATPercent,
  calcVATAmount,
  calcGrossFromNet,
  splitGross,
  configureVATSchedule,
  resetVATSchedule,
  VAT_RATES,
  VAT_TRANSITION_DATE,
} from './vatRate';

export type { VATScheduleEntry, GetVATRateOptions } from './vatRate';

export {
  recomputeInvoiceTotals,
  recomputeBatch,
} from './migrationHelper';

export type {
  InvoiceLike,
  InvoiceLineLike,
  RecomputeOptions,
  RecomputeResult,
  BatchSummary,
  MigrationStrategy,
} from './migrationHelper';
