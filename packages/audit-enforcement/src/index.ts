/**
 * @aneh-hashoel/audit-enforcement
 * מערכת אכיפת ביקורת — נקודת כניסה ראשית
 */

export { attachPrismaAuditMiddleware, type AuditMiddlewareOptions } from './PrismaAuditMiddleware';
export {
  auditContext,
  runWithAuditContext,
  getAuditContext,
  type AuditContext,
} from './context';

// Middlewares
export { expressAuditMiddleware } from './middleware/express';
export { trpcAuditMiddleware } from './middleware/trpc';
export { nextjsAuditMiddleware } from './middleware/nextjs';
export { mobileRnAuditHeaders } from './middleware/mobile-rn';

// Hooks
export { recordLoginAttempt } from './hooks/loginAttempts';
export { recordSensitiveRead } from './hooks/sensitiveAccess';
export { recordPermissionDenied } from './hooks/permissionDenied';
export { recordOfficialTagChange } from './hooks/officialTagChange';

// Integrity
export { computeRowHash, linkHashChain } from './integrity/hashChain';
export { verifyHashChain } from './integrity/verify';
export { startScheduledIntegrityCheck } from './integrity/scheduled-check';

// Search + Export
export { searchAuditLogs, type AuditSearchQuery } from './search/query';
export { exportAuditLogsCsv } from './export/csv';
export { exportAuditLogsPdf } from './export/pdf';

// UI (re-exported lazily by consumers)
export { AuditLogPage } from './ui/AuditLogPage';
