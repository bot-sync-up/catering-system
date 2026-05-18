/**
 * @syncup/icount-production
 * תוכנה מאושרת מס' 1346 — מודל ישראל
 */

// Client
export { IcountClient, IcountError } from './IcountClient';

// Allocation
export {
  AllocationManager,
  AllocationRequiredError,
  ALLOCATION_THRESHOLDS_ILS,
} from './allocation/AllocationManager';

// Compliance
export {
  APPROVED_SOFTWARE_NUMBER,
  buildSoftware1346Declaration,
  getSoftware1346Headers,
  get1346InvoiceFooterHebrew,
  get1346InvoiceFooterEnglish,
  validateDocumentHas1346Declaration,
} from './compliance/software1346';
export type { Software1346Declaration } from './compliance/software1346';

// Reports
export { PCN874Generator, PCN874ValidationError } from './reports/pcn874Generator';
export { Form126Generator } from './reports/form126';
export { Form856Generator } from './reports/form856';
export type { Form126Report } from './reports/form126';
export type { Form856Report } from './reports/form856';

// Webhooks
export { WebhookReceiver, WebhookSignatureError } from './webhooks/receiver';
export type { WebhookHandler, WebhookReceiverOptions } from './webhooks/receiver';

// Adapters
export {
  IcountAdapter,
  GreenInvoiceAdapter,
  RivhitAdapter,
  MockAdapter,
} from './adapters';
export type {
  IBillingAdapter,
  GreenInvoiceCredentials,
  RivhitCredentials,
} from './adapters';

// Factory & Health
export { AdapterFactory } from './AdapterFactory';
export type { AdapterFactoryConfig, AdapterCallOptions } from './AdapterFactory';
export { HealthMonitor, pingAll } from './healthCheck';
export type { HealthStatus, HealthMonitorOptions } from './healthCheck';

// Queue
export {
  createIcountQueue,
  createIcountWorker,
  ICOUNT_QUEUE_NAME,
  DEFAULT_JOB_OPTIONS,
} from './queue';
export type { IcountJobData, IcountJobType, QueueDeps } from './queue';

// Logging
export {
  InMemoryLogStore,
  createLogSink,
} from './IntegrationLog';
export type { IIntegrationLogStore, LogFilter } from './IntegrationLog';

// Archival
export { Archiver, ARCHIVAL_YEARS } from './archival';
export type { ArchivalConfig, ArchivedDocument } from './archival';

// Types
export * from './types';
