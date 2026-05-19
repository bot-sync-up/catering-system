# @aneh-hashoel/audit-enforcement

מערכת אכיפת ביקורת (Audit Enforcement) לפרויקט "ענה את השואל" — פלטפורמת השאלות-תשובות לרבנים.

## למה זה קיים

יומן ביקורת קלאסי שכותב רשומות מטבלה ניתן לעריכה הוא בעצם **לא יומן ביקורת** — DBA, האקר, או מפתח עם הרשאה גבוהה יכולים לשנות אותו במכה. החבילה הזו אוכפת ביקורת באמת:

- **append-only ברמת ה-DB** — Postgres triggers שזורקים EXCEPTION על UPDATE/DELETE/TRUNCATE. אפילו `psql` של ה-DBA לא יעבור.
- **hash chain SHA-256** — כל רשומה כוללת hash של תוכנה + hash של הקודמת. שינוי באמצע שובר את כל מי שאחריו ומזוהה אוטומטית.
- **בדיקת tampering יומית** — BullMQ cron שמריץ verify ושולח alert.
- **RLS** — GENERAL_ADMIN רואה הכל, אחרים רק את ה-tenant שלהם.
- **רטנציה אוטומטית** — אחרי 7 שנים מעבר ל-cold storage.

## מבנה

```
src/
  PrismaAuditMiddleware.ts   — Prisma $use middleware על כל המודלים
  context.ts                 — AsyncLocalStorage (user/ip/ua/request_id/tenant/role)
  middleware/
    express.ts               — Express middleware
    trpc.ts                  — tRPC middleware
    nextjs.ts                — Next.js App Router wrapper
    mobile-rn.ts             — React Native / Expo headers builder
  db/
    triggers.sql             — BEFORE UPDATE/DELETE/TRUNCATE → RAISE EXCEPTION
    rls.sql                  — Row-Level Security per role + tenant
    retention.sql            — archive_old_audit_logs(2557) + pg_cron
  hooks/
    loginAttempts.ts         — recordLoginAttempt + brute-force detection
    sensitiveAccess.ts       — recordSensitiveRead (שכר/בנק/ת"ז)
    permissionDenied.ts      — recordPermissionDenied
    officialTagChange.ts     — שינוי תיוג "תשובה רשמית" — קריטי לציות
  integrity/
    hashChain.ts             — computeRowHash + linkHashChain
    verify.ts                — verifyHashChain
    scheduled-check.ts       — BullMQ cron יומי + alert
  search/
    query.ts                 — searchAuditLogs עם paging + filters
  export/
    csv.ts                   — UTF-8 BOM ל-Excel עברית
    pdf.ts                   — RTL + פונט Heebo
  ui/
    AuditLogPage.tsx         — Admin UI: חיפוש + סינון + drilldown
```

## התקנה

```bash
npm install @aneh-hashoel/audit-enforcement
```

תלויות peer: `@prisma/client`, `bullmq`, `ioredis`, `pdfkit`, `express` (אם משתמשים ב-Express), `next`/`react` (אם משתמשים ב-UI).

## שימוש מהיר

ראה [INTEGRATION-GUIDE.md](./INTEGRATION-GUIDE.md) למדריך מלא.

```ts
import { PrismaClient } from '@prisma/client';
import {
  attachPrismaAuditMiddleware,
  expressAuditMiddleware,
  startScheduledIntegrityCheck,
} from '@aneh-hashoel/audit-enforcement';

const prisma = new PrismaClient();
attachPrismaAuditMiddleware(prisma);

app.use(expressAuditMiddleware({ getUserId: (req) => req.user?.id }));

startScheduledIntegrityCheck({
  prisma,
  redisConnection: { host: 'localhost', port: 6379 },
  onTamperingDetected: async (result) => {
    // Sentry / Slack / SMS לאדמין
    console.error('TAMPERING:', result.brokenRows);
  },
});
```

## בדיקות

```bash
npm test              # יחידה (כולל hash-chain + middleware mock)
DATABASE_URL=postgres://... npm test  # כולל append-only + retention
```

## תאימות לחוקים

- **חוק הגנת הפרטיות (ישראל) — תיקון 13** — תיעוד גישה לנתונים רגישים, רטנציה.
- **GDPR** — Article 30 (Records of processing activities), Article 32 (security of processing).
- **פסיקה הלכתית** — תיעוד שינויי תיוג "תשובה רשמית" עם נימוק וזיהוי הרב המבצע, ללא אפשרות מחיקה.

## רישיון

UNLICENSED — לשימוש פנימי של פרויקט "ענה את השואל" / המרכז למורשת מרן.
