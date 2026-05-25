/**
 * @syncup/accountant-workflow
 * נקודת כניסה ציבורית.
 */

// Orchestrator
export {
  AccountantWorkflow,
  InMemoryFilesRepository,
} from './AccountantWorkflow';
export type {
  AccountantWorkflowDeps,
  FilesRepository,
} from './AccountantWorkflow';

// Config
export {
  loadAccountantConfig,
  getConfig,
  setReportingMode,
  resetConfigForTesting,
  AccountantConfigSchema,
  TaxReportingMode,
} from './config';
export type { AccountantConfig } from './config';

// Generators
export * from './generators';

// Notifications
export { AccountantNotifier } from './notifications/AccountantNotifier';
export type {
  EmailProvider,
  SmsProvider,
  WhatsAppProvider,
  AccountantContact,
  NotifierConfig,
} from './notifications/AccountantNotifier';

// Audit
export {
  SubmissionAuditLog,
  InMemoryAuditStore,
} from './audit/SubmissionAuditLog';
export type { AuditStore } from './audit/SubmissionAuditLog';

// RBAC
export {
  canPerform,
  filterFilesForRole,
  require as requirePermission,
  ForbiddenError,
  PERMISSIONS_BY_ROLE,
} from './rbac';
export type { Permission } from './rbac';

// Storage
export { nodeFs } from './storage/nodeFs';
export { InMemoryFs } from './storage/inMemoryFs';
export { sha256 } from './storage/checksum';
export { buildFullPath, buildReportDir, buildFileName } from './storage/paths';

// Jobs
export { MonthlyReportJobs, QUEUE_NAME } from './jobs/MonthlyReportJobs';
export type { SchedulerDependencies, MonthlyJobData } from './jobs/MonthlyReportJobs';

// Portal components
export * from './portal/components';

// Types
export * from './types';
