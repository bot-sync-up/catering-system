# מדריך אינטגרציה — @aneh-hashoel/audit-enforcement

מדריך מקצה-לקצה לחיבור החבילה ל-stack של הפרויקט.

---

## 1. סכמת Prisma

הוסף ל-`prisma/schema.prisma`:

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  model      String
  action     String
  recordId   String?
  oldValues  Json?
  newValues  Json?
  userId     String?
  ip         String?
  userAgent  String?
  requestId  String?
  tenantId   String?
  role       String?
  channel    String   @default("system")
  createdAt  DateTime @default(now())
  hash       String
  prevHash   String?

  @@index([userId, createdAt])
  @@index([model, action, createdAt])
  @@index([tenantId, createdAt])
  @@index([recordId])
  @@index([createdAt])
}

model LoginAttempt {
  id            String   @id @default(cuid())
  userId        String?
  email         String?
  ip            String?
  userAgent     String?
  success       Boolean
  failureReason String?
  createdAt     DateTime @default(now())

  @@index([ip, createdAt])
  @@index([userId, createdAt])
  @@index([email, createdAt])
}

model SensitiveAccess {
  id        String   @id @default(cuid())
  model     String
  recordId  String
  fields    String[]
  reason    String?
  userId    String?
  ip        String?
  userAgent String?
  requestId String?
  tenantId  String?
  role      String?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([model, recordId, createdAt])
}
```

הרץ `npx prisma migrate dev --name audit_tables`.

## 2. SQL — Triggers + RLS + Retention

אחרי שה-migration רץ, צור migration חדש ידני שמכיל את שלושת קבצי ה-SQL:

```bash
mkdir prisma/migrations/$(date +%Y%m%d%H%M%S)_audit_enforcement
cp node_modules/@aneh-hashoel/audit-enforcement/src/db/triggers.sql \
   prisma/migrations/.../migration.sql
# הוסף לאותו קובץ גם rls.sql ו-retention.sql
```

או הרץ ידנית מול ה-DB:

```bash
psql $DATABASE_URL -f node_modules/@aneh-hashoel/audit-enforcement/src/db/triggers.sql
psql $DATABASE_URL -f node_modules/@aneh-hashoel/audit-enforcement/src/db/rls.sql
psql $DATABASE_URL -f node_modules/@aneh-hashoel/audit-enforcement/src/db/retention.sql
```

## 3. חיבור PrismaClient

```ts
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { attachPrismaAuditMiddleware } from '@aneh-hashoel/audit-enforcement';

export const prisma = new PrismaClient();
attachPrismaAuditMiddleware(prisma, {
  // שדות רגישים נוספים לאפליקציה
  extraSensitiveFields: ['answerDraft', 'rabbiPrivateNote'],
});
```

## 4. Express

```ts
import express from 'express';
import { expressAuditMiddleware } from '@aneh-hashoel/audit-enforcement';

const app = express();
app.use(
  expressAuditMiddleware({
    getUserId: (req) => req.user?.id ?? null,
    getTenantId: (req) => req.user?.tenantId ?? null,
    getRole: (req) => req.user?.role ?? null,
  }),
);
```

חשוב: ה-middleware חייב להיות **אחרי** ה-auth (כדי ש-req.user יהיה זמין) ו**לפני** כל קריאה ל-prisma.

## 5. tRPC

```ts
import { trpcAuditMiddleware } from '@aneh-hashoel/audit-enforcement';
import { initTRPC } from '@trpc/server';

const t = initTRPC.context<Context>().create();
export const auditedProcedure = t.procedure.use(trpcAuditMiddleware());

// כל פרוצדורה שמשנה נתונים — השתמש ב-auditedProcedure
export const updateAnswer = auditedProcedure
  .input(z.object({ id: z.string(), text: z.string() }))
  .mutation(async ({ input }) => {
    return prisma.answer.update({ where: { id: input.id }, data: { text: input.text } });
  });
```

## 6. Next.js App Router

```ts
// app/api/answers/[id]/route.ts
import { nextjsAuditMiddleware } from '@aneh-hashoel/audit-enforcement';
import { getServerSession } from 'next-auth';

export const PATCH = nextjsAuditMiddleware(
  async (req, { params }) => {
    // קוד ה-handler הרגיל
  },
  {
    getUserId: async () => {
      const session = await getServerSession();
      return session?.user?.id ?? null;
    },
  },
);
```

## 7. React Native / Expo

באפליקציית המובייל, הוסף את הכותרות לכל בקשת fetch:

```ts
import { mobileRnAuditHeaders } from '@aneh-hashoel/audit-enforcement';

const res = await fetch(`${API}/answers`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...mobileRnAuditHeaders({
      userId: currentUser.id,
      appVersion: Constants.expoConfig?.version,
      deviceId: await Application.getAndroidId(),
    }),
  },
  body: JSON.stringify(data),
});
```

בצד השרת, ה-expressAuditMiddleware צריך לקרוא את הכותרת `x-channel` ולהעדיף `x-user-id` רק אם הוא תואם את ה-JWT (אחרת trust issue).

## 8. Hooks ייעודיים

```ts
import {
  recordLoginAttempt,
  recordSensitiveRead,
  recordPermissionDenied,
  recordOfficialTagChange,
} from '@aneh-hashoel/audit-enforcement';

// בזרימת login
await recordLoginAttempt(prisma, {
  userId: user?.id ?? null,
  email,
  ip,
  ua,
  success: passwordOk,
}, {
  onBruteForceDetected: async (info) => {
    await sendSlackAlert(`Brute force suspected: ${JSON.stringify(info)}`);
  },
});

// לפני קריאת שדה רגיש
await recordSensitiveRead(prisma, {
  model: 'Employee',
  recordId: emp.id,
  fields: ['salary', 'bankAccount'],
  reason: 'אישור משכורת חודשית',
});
const fullEmp = await prisma.employee.findUnique({ where: { id: emp.id } });

// כשהרשאה נדחית
if (!canEdit) {
  await recordPermissionDenied(prisma, {
    action: 'answer.update',
    model: 'Answer',
    recordId: answerId,
    requiredPermission: 'RABBI',
    userPermissions: user.permissions,
  });
  throw new ForbiddenError();
}

// שינוי תיוג "תשובה רשמית" — חובה!
await recordOfficialTagChange(prisma, {
  answerId,
  oldOfficial: false,
  newOfficial: true,
  reason: 'אושר ע"י הרב מרן לאחר עיון נוסף בפסיקה',
  rabbiUserId: rabbi.id,
});
await prisma.answer.update({
  where: { id: answerId },
  data: { official: true },
});
```

## 9. בדיקת Tampering מתוזמנת

```ts
// src/server/audit-cron.ts
import { startScheduledIntegrityCheck } from '@aneh-hashoel/audit-enforcement';
import { prisma } from './prisma';

startScheduledIntegrityCheck({
  prisma,
  redisConnection: { host: process.env.REDIS_HOST!, port: 6379 },
  cron: '0 4 * * *',
  daysBack: 2,
  onTamperingDetected: async (result) => {
    await Sentry.captureMessage('AUDIT TAMPERING DETECTED', {
      level: 'fatal',
      extra: { result },
    });
    await sendSmsToAdmins(`זוהה ניסיון שיבוש ביומן הביקורת: ${result.brokenRows.length} שורות`);
  },
});
```

## 10. Admin UI

```tsx
// app/admin/audit/page.tsx
'use client';
import { AuditLogPage } from '@aneh-hashoel/audit-enforcement';
import { trpc } from '@/lib/trpc';

export default function AuditPage() {
  const utils = trpc.useUtils();
  return (
    <AuditLogPage
      isGeneralAdmin={true}
      fetchPage={(q) => utils.audit.search.fetch(q)}
      onExportCsv={(q) => window.open(`/api/audit/export.csv?${new URLSearchParams(q as never)}`)}
      onExportPdf={(q) => window.open(`/api/audit/export.pdf?${new URLSearchParams(q as never)}`)}
    />
  );
}
```

## 11. ייצוא CSV / PDF — Route handlers

```ts
// app/api/audit/export.csv/route.ts
import { exportAuditLogsCsv } from '@aneh-hashoel/audit-enforcement';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams) as never;
  const csv = await exportAuditLogsCsv(prisma, query);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-${Date.now()}.csv"`,
    },
  });
}
```

```ts
// app/api/audit/export.pdf/route.ts
import { exportAuditLogsPdf } from '@aneh-hashoel/audit-enforcement';
import path from 'node:path';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams) as never;
  const pdf = await exportAuditLogsPdf(prisma, query, {
    hebrewFontPath: path.join(process.cwd(), 'fonts', 'Heebo-Regular.ttf'),
    title: 'דוח ביקורת',
  });
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="audit-${Date.now()}.pdf"`,
    },
  });
}
```

הורד את הפונט Heebo-Regular.ttf מ-Google Fonts ושים תחת `fonts/`.

## 12. סדר ה-deploy

1. הוסף את מודלי Prisma → migrate.
2. הרץ את triggers.sql, rls.sql, retention.sql.
3. חבר את attachPrismaAuditMiddleware ל-PrismaClient.
4. חבר את ה-middleware המתאים (Express / tRPC / Next).
5. הפעל startScheduledIntegrityCheck.
6. פרוס את האפליקציה.
7. בדוק יד-ראשונה ב-DB ש-UPDATE/DELETE על AuditLog זורקים שגיאה.

## 13. אזהרות

- **אל תכבה את ה-triggers** בשום מקרה ב-prod מלבד תוך כדי `archive_old_audit_logs` (שעושה זאת לבד באופן מבוקר).
- **אל תרשום ביומן את גוף הסיסמה אפילו "רק לדיבאג"** — רשימת ברירת מחדל מסננת, אבל אם המפתח שלכם נקרא `pwd` או משהו לא רגיל — הוסף ל-`extraSensitiveFields`.
- **hash chain בעומס** — תחת > 1000 כתיבות לשנייה, ייתכן race ב-prevHash. למימוש מחוזק יש להפעיל את החישוב בצד DB (trigger AFTER INSERT).
