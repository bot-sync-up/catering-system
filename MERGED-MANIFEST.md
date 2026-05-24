# MERGED MANIFEST — מונורפו מאוחד

תאריך מיזוג: 2026-05-18
תוצר: **monorepo אחד** שמשלב את כל תוצרי האינטגרציה והאיטום (INT1-5 + Sealing 2-5).

---

## 1. מקורות (Sources)

| קוד  | Worktree | תפקיד | מיקום אצלנו |
|------|----------|--------|--------------|
| INT1 | `agent-a572cad8aecc19473` | שלד monorepo (21 apps + 12 packages + ocr-api) | בסיס - כל המבנה |
| INT2 | `agent-ab78dafb87e7abbb1` | סכמת DB מאוחדת (84 ישויות, Prisma + migrations + seed) | `packages/db/` (החליף את גרסת INT1) |
| INT3 | `agent-a649982b842ba6f63` | Orchestrator — saga + workflows | `services/orchestrator/` + `tests/` |
| INT4 | `agent-a34946484d4a82483` | Deployment infra (Docker/Nginx/Grafana/k6) | `deployment/` |
| INT5 | `agent-a90b5381ae29c2329` | מסמכי השקה (Launch docs) | `docs/launch/` |
| Seal-2 | `agent-a76e96667f8ed42ce` | חוזי API/Events/Entities מאוחדים | `packages/contracts/` (החליף את גרסת INT1, היא ירדה ל-`contracts-pdf`) |
| Seal-3 | `agent-a3a11a087ec5a2e42` | תיקוני אבטחה P0 (13 חבילות) | `packages/security-fixes/` (זהה לגרסה ש-INT1 כבר משכה) |
| Seal-4 | `agent-abce53bf9a6dd530a` | Event Bus + Integration Adapters | `packages/event-bus/` + `packages/integration-adapters/` |
| Seal-5 | `agent-a512d51e60e628503` | Production Pack (k8s/migrations/load-tests/RUNBOOK) | `production-pack/` |

---

## 2. מבנה התוצר

```
catering-monorepo/
├── apps/                       # 21 apps (INT1)
│   ├── aneh-web/  bi/  crm/  customer-portal/  events/
│   ├── expenses/  fleet/  hr/  inventory/  invoices/
│   ├── logistics/ marketing/ menus/ mobile/ ocr-verify/
│   ├── orders/    payroll/   public-site/ recipes/
│   ├── suppliers/ web/
│
├── packages/                   # 15 packages (INT1 + Seal-2 + Seal-4)
│   ├── api/                    # API helpers (INT1)
│   ├── audit/                  # Audit log (INT1)
│   ├── auth/                   # Auth/JWT (INT1)
│   ├── config/                 # Config שיתופי (INT1)
│   ├── contracts/              # ★ Seal-2: entities + events + api + enums
│   ├── contracts-pdf/          # ★ INT1 contracts הישן (PDF/templates/reminders)
│   ├── db/                     # ★ INT2: 84 ישויות Prisma מאוחד
│   ├── event-bus/              # ★ Seal-4: BullMQ + Redis Streams + Saga
│   ├── integration-adapters/   # ★ Seal-4: ICount/Cardcom/Twilio/SendGrid adapters
│   ├── integrations/           # INT1: cardcom, icount, legacy, ocr
│   ├── queue/                  # INT1 queue helpers
│   ├── security-fixes/         # ★ Seal-3: 13 חבילות אבטחה (P0)
│   │   └── packages/
│   │       ├── 2fa-enforcement/  archival/   consent-ledger/
│   │       ├── cookies/   invoicing-fallback/ jwt-config/
│   │       ├── kms-client/ otp/  pci-validator/
│   │       ├── privacy/  tax-reports/  vat/  xss-sanitizer/
│   ├── ui/                     # INT1 UI lib (web)
│   ├── ui-mobile/              # INT1 UI lib (mobile)
│   └── utils/                  # INT1 utils
│
├── services/
│   ├── ocr-api/                # INT1
│   └── orchestrator/           # ★ INT3: saga workflows
│
├── tests/                      # INT3 e2e
│   ├── e2e/   package.json   vitest.config.ts
│
├── deployment/                 # ★ INT4
│   ├── backups/  docker/  docs/  fonts/  load-tests/
│   ├── monitoring/ nginx/  secrets/
│
├── production-pack/            # ★ Seal-5
│   ├── PRE-LAUNCH-CHECKLIST.md  RUNBOOK.md
│   ├── backups/  ci/  docker/  fonts/  k8s/
│   ├── load-tests/  migrations/  monitoring/
│   ├── performance/ secrets/
│
├── docs/
│   └── launch/                 # ★ INT5: 8 מסמכי השקה
│       ├── EXECUTIVE-SUMMARY.md
│       ├── GO-LIVE-CHECKLIST.md
│       ├── LAUNCH-DAY-RUNBOOK.md
│       ├── PHASED-LAUNCH-PLAN.md
│       ├── RISK-REGISTER.md
│       ├── KNOWN-GAPS.md
│       ├── BUSINESS-METRICS-DASHBOARD-SPEC.md
│       └── README.md
│
├── docker/                     # INT1 docker (dev compose)
├── scripts/                    # INT1 scripts
├── nginx.conf                  # INT1 (dev)
│
├── .env.example                # ★ מאוחד (root) - dev/prod
├── .gitignore                  # ★ מאוחד
├── package.json                # ★ root scripts ל-turbo + orchestrator + k8s + loadtest
├── pnpm-workspace.yaml         # ★ כולל security-fixes/packages/* + tests
├── tsconfig.base.json          # ★ paths לכל החבילות החדשות
├── turbo.json                  # ★ globalEnv מורחב (KMS/Twilio/Sentry/Datadog)
├── INTEGRATION-NOTES.md        # INT1
├── INTEGRATION-GAPS.md         # INT3
├── README.md                   # README כללי
└── MERGED-MANIFEST.md          # קובץ זה
```

★ = שינה/נוסף במהלך המיזוג.

---

## 3. Conflicts שנפתרו

### 3.1 `packages/db`
- **התנגשות**: INT1 הביא גרסה ישנה (drizzle.config.ts + פריזמה חלקית). INT2 הביא את הסכמה הסמכותית של 84 ישויות עם migrations + seed.ts.
- **פתרון**: הוחלף ב-INT2 במלואו. גרסת INT1 נמחקה.

### 3.2 `packages/contracts`
- **התנגשות**: INT1 contracts = מודול ל-PDF/templates/reminders/storage (שם npm: `@contracts/core`). Sealing-2 contracts = פלטפורמת חוזי API/Entities/Events/Enums (שם npm: `@catering/contracts`).
- **פתרון**: שני התפקידים שונים מהותית — לכן שמרנו את שניהם.
  - `packages/contracts/` ← Sealing-2 (סכמות Zod + types רוחביים).
  - `packages/contracts-pdf/` ← INT1 הישן, ושינינו את שם החבילה מ-`@contracts/core` ל-`@catering/contracts-pdf` כדי להימנע מהתנגשות שמות.

### 3.3 `packages/security-fixes`
- **התנגשות**: גרסת INT1 וגרסת Sealing-3 זהות (13 חבילות, אותם תכנים — דיף ריק).
- **פתרון**: נשארה הגרסה שכבר ב-INT1, אומתה מול Sealing-3.

### 3.4 `packages/event-bus` + `packages/integration-adapters`
- **התנגשות**: לא היו ב-INT1. נוספו מ-Sealing-4.
- **פתרון**: העתקה ישירה.

### 3.5 `pnpm-workspace.yaml`
- **התנגשות**: INT1 הגדיר `apps/*`, `packages/*`, `packages/integrations/*`, `services/*`. Sealing-3 ו-Sealing-4 הגדירו workspaces משלהם.
- **פתרון**: workspace מאוחד שכולל גם `packages/security-fixes/packages/*` (sub-workspace של 13 חבילות אבטחה) וגם `tests`.

### 3.6 `turbo.json`
- **פתרון**: הורחב `globalEnv` כדי לכסות את כל ה-secrets שהמערכת המאוחדת צריכה (KMS, Twilio, Sentry, Datadog, Bull Board וכו׳). נוסף `db:seed` כ-task.

### 3.7 `tsconfig.base.json`
- **פתרון**: נוספו paths ל-`@catering/contracts/{entities,events,api,enums}`, `@catering/contracts-pdf`, `@catering/event-bus`, `@catering/event-bus/saga`, `@catering/integration-adapters`, `@catering/api`, `@catering/ui-mobile`, ו-`@security/*` (ל-13 חבילות).

### 3.8 `.env.example`
- **פתרון**: לא היה ברמת root. נוצר חדש שמאחד את ה-env מכל ה-apps וה-production-pack: DB/Redis/JWT/KMS/AWS/iCount/Cardcom/Anthropic/SendGrid/Twilio/Sentry/Datadog.

### 3.9 `package.json` (root)
- **פתרון**: נוספו scripts ל-orchestrator, k8s apply, loadtest:smoke, ו-test:e2e. עודכן description ו-version ל-1.0.0.

### 3.10 docs כפולים
- כל מסמכי ה-Launch מ-INT5 הועברו ל-`docs/launch/` כדי לא לזהם את ה-root.
- `INTEGRATION-NOTES.md` (INT1) ו-`INTEGRATION-GAPS.md` (INT3) נשארו ב-root כי הם רלוונטיים לתחזוקה היומיומית של ה-monorepo.

---

## 4. Stack טכנולוגי מאוחד

| שכבה | טכנולוגיה |
|------|-----------|
| Package manager | pnpm 9.15.0 |
| Monorepo orchestration | Turbo 2.3 |
| Language | TypeScript 5.6 (strict) |
| Node | >= 20.10 |
| DB | PostgreSQL + Prisma (84 entities) |
| Queue | Redis + BullMQ + Redis Streams |
| Validation | Zod |
| Web | Next.js (אפליקציות web) |
| Mobile | React Native / Expo (`apps/mobile`) |
| Test | Vitest + Playwright (e2e ב-`tests/`) + k6 (load) |
| Deploy | Docker Compose (dev) + Kubernetes (prod ב-`production-pack/k8s/`) |
| Observability | Grafana + Prometheus + Sentry + Datadog |
| Security | KMS, JWT (RS256), 2FA, OTP, XSS sanitizer, PCI validator |

---

## 5. בריאות וצעדים מומלצים

לאחר ה-`pnpm install` הראשון:

1. `pnpm db:generate` — לייצר את Prisma client מ-INT2 schema.
2. `pnpm db:migrate` — להפעיל migrations.
3. `pnpm db:seed` — לטעון נתוני seed.
4. `pnpm typecheck` — לוודא שכל ה-paths המאוחדים תקינים.
5. `pnpm test` — להריץ את בדיקות ה-unit.
6. `pnpm orchestrator:test` — וריפיקציה של ה-saga workflows.
7. `pnpm docker:up` — להעלות Postgres+Redis+Nginx מ-deployment/.
8. עיון ב-`docs/launch/GO-LIVE-CHECKLIST.md` לפני יציאה לפרודקשן.

---

## 6. מה לא נכלל (כדי לחסוך בדיסק)

- `node_modules/` בכל worktree מקור.
- `dist/`, `.next/`, `.turbo/`, `build/`, `out/` בכל worktree מקור.
- `.git/` של worktrees מקור (רק מבני הקבצים הועתקו).

---

## 7. סטטיסטיקה

- 21 apps
- 15 root packages (כולל security-fixes שמכילה 13 sub-packages פנימיים)
- 2 services (ocr-api, orchestrator)
- 8 מסמכי launch
- 1312 קבצי קוד/תצורה (לפני node_modules)
