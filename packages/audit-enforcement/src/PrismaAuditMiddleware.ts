/**
 * Prisma `$use` middleware — מצרף לכל מודל יומן ביקורת אוטומטי.
 *
 * עבור פעולות create/update/delete/upsert/updateMany/deleteMany:
 *   - שומר ערכים ישנים (לפני הפעולה) וחדשים (אחרי)
 *   - מסנן שדות רגישים (סיסמאות, טוקנים, PAN, CVV, שכר, ת"ז)
 *   - שולף הקשר משתמש מ-AsyncLocalStorage
 *   - כותב ל-AuditLog כולל חוליית hash chain (linkHashChain)
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { getAuditContext } from './context';
import { linkHashChain } from './integrity/hashChain';

export interface AuditMiddlewareOptions {
  /** רשימת מודלים לא לרשום ביומן (למשל AuditLog עצמו) */
  excludeModels?: string[];
  /** שמות שדות שייחשבו רגישים בנוסף לברירת המחדל */
  extraSensitiveFields?: string[];
  /**
   * האם לכלול בקריאות (find / findMany). בדרך כלל לא — לקריאות
   * רגישות יש hook ייעודי recordSensitiveRead.
   */
  logReads?: boolean;
}

const DEFAULT_SENSITIVE = [
  'password',
  'passwordHash',
  'hashedPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'pan',
  'cardNumber',
  'cvv',
  'cvc',
  'salary',
  'wage',
  'taxId',
  'nationalId',
  'ssn',
  'bankAccount',
  'iban',
];

const MUTATING_ACTIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

function filterSensitive(obj: unknown, sensitiveSet: Set<string>): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((v) => filterSensitive(v, sensitiveSet));
  if (typeof obj !== 'object') return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (sensitiveSet.has(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      out[k] = filterSensitive(v, sensitiveSet);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * חיבור המידלוור לאינסטנס Prisma קיים.
 * חשוב: יש להפעיל אחרי ייבוא PrismaClient ולפני שימוש ראשון.
 */
export function attachPrismaAuditMiddleware(
  prisma: PrismaClient,
  options: AuditMiddlewareOptions = {},
): void {
  const excludeModels = new Set([
    'AuditLog',
    'AuditLogArchive',
    ...(options.excludeModels ?? []),
  ]);
  const sensitive = new Set([...DEFAULT_SENSITIVE, ...(options.extraSensitiveFields ?? [])]);

  // @ts-expect-error — $use קיים אך לא מוטפס תמיד נכון לפי גרסה
  prisma.$use(async (params: Prisma.MiddlewareParams, next: (p: Prisma.MiddlewareParams) => Promise<unknown>) => {
    const model = params.model;
    const action = params.action;

    // דילוג על מודלים חסומים או על קריאות שלא מבוקשות
    if (!model || excludeModels.has(model)) return next(params);
    if (!MUTATING_ACTIONS.has(action) && !options.logReads) return next(params);

    const ctx = getAuditContext();

    // שליפת ערכים ישנים לפני update/delete
    let oldValues: unknown = null;
    if (
      (action === 'update' || action === 'delete') &&
      params.args?.where &&
      typeof model === 'string'
    ) {
      try {
        // @ts-expect-error — גישה דינמית למודל
        oldValues = await prisma[model.charAt(0).toLowerCase() + model.slice(1)].findUnique({
          where: params.args.where,
        });
      } catch {
        oldValues = null;
      }
    }

    const result = await next(params);

    // ערכים חדשים — מהתוצאה במקרה create/update/upsert; null במקרה delete
    let newValues: unknown = null;
    if (action === 'create' || action === 'update' || action === 'upsert') {
      newValues = result;
    } else if (action === 'updateMany' || action === 'deleteMany') {
      newValues = { count: (result as { count?: number })?.count ?? null };
    }

    const filteredOld = filterSensitive(oldValues, sensitive);
    const filteredNew = filterSensitive(newValues, sensitive);

    // כתיבת רשומת ביקורת + חוליית hash chain
    try {
      // @ts-expect-error — מודל AuditLog צפוי להיות מוגדר ב-schema של הצרכן
      await prisma.auditLog.create({
        data: await linkHashChain(prisma, {
          model,
          action,
          recordId: extractRecordId(result, params.args),
          oldValues: filteredOld as Prisma.InputJsonValue,
          newValues: filteredNew as Prisma.InputJsonValue,
          userId: ctx.user_id,
          ip: ctx.ip,
          userAgent: ctx.ua,
          requestId: ctx.request_id,
          tenantId: ctx.tenant_id,
          role: ctx.role,
          channel: ctx.channel ?? 'system',
          createdAt: new Date(),
        }),
      });
    } catch (err) {
      // אסור שכשל בכתיבת ביקורת יפיל את הפעולה העסקית — רושמים ל-stderr
      // (בפרודקשן, יש לחבר לכאן Sentry / alert)
      // eslint-disable-next-line no-console
      console.error('[audit-enforcement] failed to write audit log:', err);
    }

    return result;
  });
}

function extractRecordId(result: unknown, args: unknown): string | null {
  if (result && typeof result === 'object' && 'id' in result) {
    return String((result as { id: unknown }).id);
  }
  if (args && typeof args === 'object' && 'where' in args) {
    const where = (args as { where?: { id?: unknown } }).where;
    if (where && 'id' in where) return String(where.id);
  }
  return null;
}
