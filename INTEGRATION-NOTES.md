# INTEGRATION-NOTES — איחוד 28 worktrees ל-monorepo מאוחד

> נכתב: 2026-05-17
> מבנה: `pnpm` workspaces + `turbo` עם `apps/*`, `packages/*`, `packages/integrations/*`, `services/*`
> נכון להיום: **הקוד הועתק** אך **`pnpm install` עדיין לא רץ** (חסך דיסק).

---

## תוכן עניינים
1. [מבנה ה-monorepo](#מבנה-ה-monorepo)
2. [טבלת מקור→יעד מלאה (28 worktrees)](#טבלת-מקוריעד-מלאה-28-worktrees)
3. [Conflicts ידועים — דורש resolve ידני](#conflicts-ידועים--דורש-resolve-ידני)
4. [Excludes שלא הועתקו](#excludes-שלא-הועתקו)
5. [המשך — מה עוד צריך](#המשך--מה-עוד-צריך)

---

## מבנה ה-monorepo

```
agent-a572cad8aecc19473/
├── package.json              # שורש: pnpm + turbo
├── pnpm-workspace.yaml       # apps/*, packages/*, packages/integrations/*, services/*
├── turbo.json                # build / dev / lint / test / typecheck
├── tsconfig.base.json        # paths: @catering/db, @catering/auth, @catering/audit, וכו'
├── .env.example              # מאוחד מכל ה-worktrees
├── .gitignore
├── nginx.conf                # מ-worktree 01
├── docker/                   # Dockerfile.web + docker-compose.yml מ-worktree 01
├── scripts/
│   ├── import-all.sh         # סקריפט הייבוא (לתיעוד)
│   └── _imported/01-infra/   # bootstrap.sh, reset-db.sh מ-worktree 01
├── apps/                     # 21 apps
│   ├── aneh-web/             # Q&A web (ענה את השואל) — Next.js + tRPC
│   ├── bi/                   # BI + Reports (P&L, Cashflow, מע"מ, COGS)
│   ├── crm/                  # CRM B2B/B2C — Next.js 15 + Prisma + tRPC + dnd-kit + BullMQ
│   ├── customer-portal/      # פורטל לקוח (Sealing skeleton)
│   ├── events/               # ניהול אירועים — Gantt, צוות, ציוד
│   ├── expenses/             # הוצאות ותקציב — workspace (backend + frontend)
│   ├── fleet/                # ניהול צי — workspace (api + web + mobile)
│   ├── hr/                   # HR — workspace (server + client)
│   ├── inventory/            # ניהול מלאי דו-רמתי — FIFO + תפוגה + רכש אוטומטי
│   ├── invoices/             # מסמכים פיננסיים (Quote→Order→Invoice→Receipt)
│   ├── logistics/            # לוגיסטיקה ומשלוחים — צי, שיבוץ, GRN
│   ├── marketing/            # שיווק + קמפיינים + צ'אט-בוט — workspace
│   ├── menus/                # תפריטים ותמחור — workspace (server + client)
│   ├── mobile/               # Field Ops mobile (RN + Expo, RTL, offline-first)
│   ├── ocr-verify/           # OCR verify UI
│   ├── orders/               # ניהול הזמנות — Next.js + Prisma
│   ├── payroll/              # חישוב שכר ישראלי
│   ├── public-site/          # אתר ציבורי — Next.js + Studio
│   ├── recipes/              # מטבח/מתכונים — Next.js 14 + PWA + Gantt
│   ├── suppliers/            # ספקים + PO + GRN
│   └── web/                  # שלד אפליקציית web (מ-worktree 01)
├── packages/                 # 12 packages
│   ├── api/                  # API helpers (מ-worktree 01)
│   ├── audit/                # Audit log (append-only, 7-year retention)
│   ├── auth/                 # Auth + 2FA + JWT (מ-worktree 03)
│   ├── config/               # Configuration (מ-Sealing-1 skeleton)
│   ├── contracts/            # Type contracts + Studio templates
│   ├── db/                   # Prisma schema (מ-worktree 02)
│   ├── integrations/
│   │   ├── cardcom/          # Cardcom payments (מ-worktree 19)
│   │   ├── icount/           # iCount accounting (מ-worktree 18)
│   │   ├── ocr/              # OCR + iCount + matching (מ-worktree 12)
│   │   └── legacy/           # שמירת ה-integrations הישנה מ-worktree 01
│   ├── queue/                # BullMQ helpers (מ-Sealing-1 skeleton)
│   ├── security-fixes/       # תיקוני P0 לאבטחה וחוקי ישראל (Sealing-3)
│   ├── ui/                   # UI components (web)
│   ├── ui-mobile/            # UI components (RN)
│   └── utils/                # Utilities
└── services/
    └── ocr-api/              # OCR API server (Express)
```

---

## טבלת מקור→יעד מלאה (28 worktrees)

| #  | Source worktree | תיאור | יעד ב-monorepo |
|----|----------------|-------|----------------|
| 01 | `agent-ac2389dbcde5e8bd9` | Infrastructure skeleton | `docker/`, `nginx.conf`, `scripts/_imported/01-infra/`, `apps/web`, חבילות base (api/auth/db/ui/utils/integrations/legacy) |
| 02 | `agent-abcfc839a28d7b588` | DB schema (Prisma + Aneh) | `packages/db/` (החליף את ה-skeleton) |
| 03 | `agent-a0d949436df27ed12` | Auth + 2FA + Q&A web | `packages/auth/`, `apps/aneh-web/` |
| 04 | `agent-a5e9ec7d29999be9c` | Audit log | `packages/audit/` |
| 05 | `agent-ad2220241a52022d0` | CRM B2B/B2C | `apps/crm/` |
| 06 | `agent-a3864f31565b63390` | Orders | `apps/orders/` |
| 07 | `agent-aecddcb45d3db0342` | Customer Portal | `apps/customer-portal/` |
| 08 | `agent-a1f475c6464b1f625` | Menus + pricing | `apps/menus/` |
| 09 | `agent-adc7b003297d67905` | Recipes kitchen | `apps/recipes/` |
| 10 | `agent-a9490fdab3005fda1` | Inventory | `apps/inventory/` |
| 11 | `agent-a23e11108be93681b` | Suppliers + PO | `apps/suppliers/` |
| 12 | `agent-a9ab30939b7e8e2c3` | OCR + Verify | `packages/integrations/ocr/`, `apps/ocr-verify/`, `services/ocr-api/` |
| 13 | `agent-ab6c0dce79413e79f` | Event manager | `apps/events/` |
| 14 | `agent-aa05ac323e9015be7` | Logistics & deliveries | `apps/logistics/` |
| 15 | `agent-a50ad709234b49b0b` | HR / dispatch | `apps/hr/` |
| 16 | `agent-ab96ab384014c8442` | Payroll | `apps/payroll/` |
| 17 | `agent-a31b566159e7cc878` | Finance docs | `apps/invoices/` |
| 18 | `agent-accb121134afd7c1a` | iCount integration | `packages/integrations/icount/` |
| 19 | `agent-a91fe015c553e924f` | Cardcom integration | `packages/integrations/cardcom/` |
| 20 | `agent-a016172202c9645f0` | Expenses & Budget | `apps/expenses/` (workspace: backend + frontend) |
| 21 | `agent-a2f8c66ff540bd496` | Fleet | `apps/fleet/` (workspace: api + web + mobile) |
| 22 | `agent-a0cfd9be4e88397cc` | BI Reports | `apps/bi/` |
| 23 | `agent-a7f6f8c320f0b1219` | Marketing + Chatbot | `apps/marketing/` (workspace: server + client + shared) |
| 24 | `agent-a4541f69f7ac884b2` | Public site + Studio | `apps/public-site/`, `packages/contracts/` |
| 25 | `agent-a869d3b70f23a9a88` | Field Ops Mobile | `apps/mobile/`, `packages/ui-mobile/` |
| S1 | `agent-a58d6b3d689de6fbd` | Sealing-1: monorepo skeleton + READMEs | רוב הפרויקט מבוסס על המבנה הזה. READMEs הועתקו כ-`README-sealing.md` |
| S2 | `agent-a76e96667f8ed42ce` | Sealing-2: contracts (sealed) | `packages/contracts/_sealed/` |
| S3 | `agent-a3a11a087ec5a2e42` | Sealing-3: security fixes P0 | `packages/security-fixes/` |

**סה"כ:** 28 worktrees → 21 apps + 12 packages + 1 service.

---

## Conflicts ידועים — דורש resolve ידני

### 1. `@aneh/web` — שמות חבילות כפולים
- ב-worktree 01 (`apps/web`) וב-worktree 03 (`apps/qa-web`) שניהם נקראו `@aneh/web`.
- **פתרון זמני:** `apps/qa-web` שונה שמו ל-`apps/aneh-web` ושמה לחבילה ל-`@aneh-hashoel/web`. ה-`apps/web` נשאר עם השם המקורי (skeleton ב-Next.js 15).
- **דרוש:** להחליט אם `apps/web` בכלל נחוץ או שצריך למחוק אותו. ייתכן ש-`aneh-web` הוא ה-web "האמיתי".

### 2. `packages/contracts/` — שני אי-ת'ות
- worktree 24 כתב contracts (`@contracts/core` של Studio + public-site).
- Sealing-2 הביא contracts אחר (`@catering/contracts`).
- שניהם הועתקו: `packages/contracts/` (24) ו-`packages/contracts/_sealed/` (S2).
- **דרוש:** למזג את שני ה-schemas או להחליט מי הגרסה הסופית.

### 3. `packages/db/` — schema יחיד
- worktree 02 (`@aneh-hashoel/db`) הוא ה-schema המוביל.
- כל ה-apps שיש להם `prisma/schema.prisma` משלהם (CRM, Orders, Recipes, Invoices, BI, Expenses, Fleet, וכו') — **המודלים שלהם לא מוזגו אוטומטית**.
- **דרוש:** ידנית לפתוח כל `apps/*/prisma/schema.prisma` ולהעביר את ה-models הייחודיים אל `packages/db/prisma/schema.prisma`, ואז להפנות את ה-apps ל-`@catering/db` במקום ל-Prisma הלוקאלי שלהם.

### 4. `packages/integrations/legacy/` — אינטגרציות בסיסיות מ-01
- מ-worktree 01 נכנס `packages/integrations` עם `email.ts` ו-`r2.ts` בסיסיים.
- שמרנו אותו ב-`packages/integrations/legacy/`.
- **דרוש:** לבדוק אם יש שימוש בקוד הזה. אם לא — למחוק.

### 5. `packages/security-fixes/` — תיקונים חוצי-מערכת
- Sealing-3 הביא חבילה שאמורה לפתור P0 בכמה apps.
- **דרוש:** לבחון את `FIXES-APPLIED.md` ו-`SECURITY-RUNBOOK.md` (אם קיימים) ולוודא שהתיקונים מוחלים על ה-apps החדשים אחרי המיזוג.

### 6. רוב ה-apps מחזיקים `node_modules`/`package-lock.json` משלהם
- ה-`package-lock.json` הוסר בייבוא; node_modules גם.
- כעת ה-apps יותקנו ע"י `pnpm install` משורש ה-monorepo.
- **דרוש:** אחרי `pnpm install`, לוודא שאין `package-lock.json` ישנים שנותרו.

### 7. `apps/aneh-web` תלוי ב-`@aneh/auth`
- ה-package.json של ה-app הזה מצביע על `@aneh/auth` ולא על `@catering/auth`.
- חבילת auth ב-monorepo נקראת `@catering/auth` או `@aneh-hashoel/auth` (תלוי במקור).
- **דרוש:** עדכון של `apps/aneh-web/package.json` להפנות לחבילה הנכונה.

### 8. שתי חבילות UI
- `packages/ui/` — web React (לחיצים, וכו')
- `packages/ui-mobile/` — RN/Expo
- שניהם תקפים. **אין conflict** — רק שצריך לוודא שה-mobile app מייבא מ-`ui-mobile`.

### 9. `tsconfig.base.json` paths
- ב-base יש paths ל-`@catering/*` בלבד.
- ה-`@aneh-hashoel/*` ו-`@field-ops/*` חסרים.
- **דרוש:** הוספת aliases במידת הצורך — או שינוי שמות החבילות לקונבנציה אחידה (`@catering/*`).

### 10. שמות חבילות לא אחידים
- חלק `@catering/*` (utils, ui, db, וכו')
- חלק `@aneh-hashoel/*` (db, web)
- חלק `@field-ops/*` (ui)
- חלק `@contracts/core`
- **דרוש:** האחדה. ההמלצה: `@catering/*` לכל המודולים המשותפים, ושמות חופשיים ל-apps.

---

## Excludes שלא הועתקו

הסקריפט `scripts/import-all.sh` מסנן בעת הייבוא:
- `node_modules/`
- `.git/`
- `.next/`
- `dist/`
- `build/`
- `out/`
- `.turbo/`
- `coverage/`
- `*.tsbuildinfo`
- `*.log`
- `.cache/`
- `package-lock.json` (יורד בייבוא, יוחלף ע"י `pnpm-lock.yaml`)
- `uploads/` (קבצי משתמש בזמן ריצה)

**השלכות:**
- אין `pnpm-lock.yaml` עדיין — ייווצר בריצת `pnpm install` הראשונה.
- חלק מהsubmodules היו עם `prisma/dev.db` או `data/*.db` — לא הועתקו (`.gitignore` חוסם).
- מי שצריך seed data, יצטרך להריץ `db:seed` ידנית.

---

## המשך — מה עוד צריך

### שלב 1 — להריץ install
```bash
cd /c/Users/user/.claude/worktrees/agent-a572cad8aecc19473
pnpm install
```
**ייתכן ויהיו failures** בגלל גרסאות תלויות לא תואמות. צריך לאחד.

### שלב 2 — typecheck משורש
```bash
pnpm -r typecheck
```

### שלב 3 — לפתור את ה-conflicts לפי הסדר:
1. שמות החבילות (סעיף 10) → אחר כך הכל אחרי זה עובד.
2. `packages/db` — איחוד schemas (סעיף 3).
3. `packages/contracts` (סעיף 2).
4. בדיקה של כל app בנפרד (`pnpm --filter <name> build`).

### שלב 4 — Docker
```bash
docker compose -f docker/docker-compose.yml up -d
```
לוודא שכל ה-services (Postgres, Redis, וכו') עולים.

### שלב 5 — git commit
כל שלב למעלה — commit נפרד עם תיאור ברור בעברית.

---

## הערות סופיות

- **אין דחיפה ל-remote** — לפי דרישת המשתמש.
- ה-monorepo הזה הוא **בסיס לתחילת עבודה**, לא מוצר מוגמר.
- כל שאלה על העתקה ספציפית — `scripts/import-all.sh` הוא ה-single source of truth של המיגרציה.
- READMEs מ-Sealing-1 הועתקו כ-`README-sealing.md` (לא לדרוס את ה-README המקורי של כל app/package).
