# פורטל פרטיות — Privacy Portal

יישום מעשי של **תיקון 13 לחוק הגנת הפרטיות (ישראל, אוגוסט 2025)**.

## מבט-על

- **Stack:** Next.js 15 (App Router) · Prisma · PostgreSQL · BullMQ + Redis · Zod · Vitest · PDFKit · JSZip
- **שפות זכויות הנושא הנתמכות:**
  - **זכות עיון (SAR)** — `POST /api/privacy/sar/request` עם double opt-in באימייל. Worker בונה ZIP (JSON + PDF) לכל מודול.
  - **זכות להישכח (Erasure)** — `POST /api/privacy/erasure/request` ו-`approve/:token`. Worker מבצע cascade soft-delete + אנונימיזציה תוך השארת חשבוניות (7 שנים) ו-audit log.
  - **ניהול הסכמות** — `POST /api/privacy/consent` (double opt-in), `DELETE /api/privacy/consent/:channel`, `GET /api/privacy/consent-history/:userId`.

## הפעלה מקומית

```bash
cp .env.example .env
pnpm i
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev                       # Next.js על פורט 3030
pnpm worker:sar                # Worker SAR ב-terminal נפרד
pnpm worker:erasure            # Worker מחיקה
pnpm test                      # vitest
```

## מבנה תיקיות

```
src/
  app/
    api/privacy/
      sar/{request,status/[token],download/[token]}/route.ts
      erasure/{request,approve/[token]}/route.ts
      consent/{route,[channel]}/route.ts
      consent-history/[userId]/route.ts
    portal/{my-data,erasure,consents}/page.tsx
    admin/privacy-requests/page.tsx
    layout.tsx | page.tsx | globals.css
  lib/
    db.ts          # Prisma singleton
    queue.ts       # BullMQ + Redis
    tokens.ts      # HMAC-signed tokens
    mailer.ts      # email abstraction (mock לפיתוח)
    audit.ts       # רישום ל-AuditLog
    http.ts        # zod + request helpers
    mocks/dataSources.ts  # mocks ל-CRM/Orders/Invoices/Payments/Events
  workers/
    sarBuilder.ts        # אוסף נתונים, בונה ZIP+PDF, שומר ל-artifacts/
    erasureExecutor.ts   # אנונימיזציה + cascade
prisma/schema.prisma
docs/
  PRIVACY-POLICY.md
  DATA-RETENTION-POLICY.md
  DPA-TEMPLATE.md
tests/
```

## עקרונות שאומצו

- **double opt-in** לכל פעולה מהותית (SAR / Erasure / Consent).
- **anti-enumeration** — תשובות גנריות שלא מגלות אם משתמש קיים.
- **immutable audit** — לא מוחקים `AuditLog` גם בעת erasure.
- **חשבוניות 7 שנים** — נשמרות בכוח חוק (פקודת מס הכנסה / סעיף 25 להוראות ניהול ספרים).
- **HMAC-signed tokens** ייחודיים לכל מטרה, עם בדיקת תוקף ב-DB.
- **anti-PAN** — אין שמירת מספר כרטיס מלא, רק 4 ספרות אחרונות.

## מסמכים משפטיים

- `docs/PRIVACY-POLICY.md` — מדיניות פרטיות לפרסום.
- `docs/DATA-RETENTION-POLICY.md` — טבלת שמירה מפורטת.
- `docs/DPA-TEMPLATE.md` — תבנית הסכם עיבוד עם ספקים.

> שימו לב: המסמכים בתיקייה `docs/` הם תבניות מעשיות אך אינם תחליף לבדיקה משפטית.
