// Shared types for the audit-log subsystem.
// IMPORTANT: AuditAction here MUST stay in sync with the enum in prisma/schema.prisma.

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'READ_SENSITIVE'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'ROLE_CHANGE'
  | 'OFFICIAL_TAG_CHANGE'
  | 'EXPORT'
  | 'PERMISSION_DENIED';

/**
 * Per-request context. Populated by `auditContextMiddleware` and read by
 * the Prisma extension and any code that writes audit rows.
 *
 * AsyncLocalStorage is used so we never have to thread a context object
 * through every service function.
 */
export interface AuditContext {
  userId: string | null;
  userRole: string | null;
  tenantId: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string;
}

export interface AuditWriteInput {
  userId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: AuditAction;
  oldValues?: unknown;
  newValues?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  tenantId?: string | null;
}

/**
 * Tables we never want to audit — auditing the audit log itself would loop,
 * and session/refresh-token noise dwarfs real signal.
 */
export const NON_AUDITED_MODELS = new Set<string>([
  'AuditLog',
  // add any future low-signal tables here
]);

/**
 * Fields whose values must NEVER appear in old/new JSON, even if the row
 * legitimately contains them. We keep their *presence* (key with "***")
 * so that "password was changed" remains visible without leaking the value.
 */
export const SENSITIVE_FIELDS = new Set<string>([
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'apiKey',
  'secret',
  'otp',
  'creditCard',
  'cvv',
  'ssn',
  'idNumber', // תעודת זהות
]);
