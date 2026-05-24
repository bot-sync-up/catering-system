# INVENTORY — F1 Master Merge

מפת המבנה המלאה של ה-monorepo (`agent-ae12d76f8b5390803`) — 21 apps + 14 packages + 2 services + תיקיות פנימיות.

מקור: `pnpm-workspace.yaml` מכריז על `apps/*`, `packages/*`, `packages/integrations/*`, `packages/security-fixes/packages/*`, `services/*`, `tests`.

---

## 1. apps/ (21 אפליקציות)

| תיקייה | name ב-package.json | סוג | runtime | DB |
|---|---|---|---|---|
| `apps/aneh-web` | `@aneh-hashoel/web` | Next.js 14 | React 18.3 | — |
| `apps/bi` | `bi-reports` | Next.js 14 + BullMQ | React 18.3 | Prisma 5.20 |
| `apps/crm` | `crm` | Next.js 15 + tRPC 11-rc.502 | React 18.3 | Prisma 5.22 |
| `apps/customer-portal` | `customer-portal` | Next.js 15.0.0 | **React 19.0.0** | — |
| `apps/events` | `event-manager` | Express plain JS | Node | — |
| `apps/expenses` | `expenses` (npm-workspace) | container | — | — |
| `apps/expenses/backend` | `expenses-budget-backend` | Express + Prisma | Node | Prisma 5.20 |
| `apps/expenses/frontend` | `expenses-budget-frontend` | Vite + React | React 18.3 | — |
| `apps/fleet` | `fleet` (npm-workspace) | container | — | — |
| `apps/fleet/api` | `fleet-api` | Express + Prisma + ESM | Node | Prisma 5.22 |
| `apps/fleet/web` | `fleet-web` | Vite + React | React 18.3 | — |
| `apps/fleet/mobile` | `fleet-driver` | Expo 51 | React Native | — |
| `apps/fleet/shared` | (לא נסרק — בדיקה ידנית) | — | — | — |
| `apps/hr` | `hr-shifts-platform` (npm-workspace) | container | — | — |
| `apps/hr/server` | `hr-server` | Express + Prisma + ESM | Node | Prisma 5.20 |
| `apps/hr/client` | `hr-client` | Vite + React | React 18.3 | — |
| `apps/inventory` | `inventory` | Express plain JS + sql.js | Node | sql.js |
| `apps/invoices` | `finance-docs` | Express + Prisma + ESM | Node | Prisma 5.18 |
| `apps/logistics` | `logistics-delivery` | Express plain JS + sql.js | Node | sql.js |
| `apps/marketing` | `marketing-platform` (npm-workspace) | container | — | — |
| `apps/marketing/server` | `@marketing/server` | Express + Prisma 6 + ESM | Node | **Prisma 6.0.0** |
| `apps/marketing/client` | `@marketing/client` | Vite + React | React 18.3 | — |
| `apps/menus` | `menu-pricing-platform` (npm-workspace) | container | — | — |
| `apps/menus/server` | `server` | Express + Prisma | Node | Prisma 5.22 |
| `apps/menus/client` | `client` | Vite + React | React 18.3 | — |
| `apps/mobile` | `@field-ops/mobile` | Expo 51 | React Native 0.74 | — |
| `apps/ocr-verify` | `@invoice-ocr/web-verify` | Vite + React | React 18.3 | — |
| `apps/orders` | `orders-management` | Next.js 15 + tRPC | React 18.3 | Prisma 5.22 |
| `apps/payroll` | `payroll-system` | Express plain JS | Node | — |
| `apps/public-site` | `public-site` | Next.js 15 | **React 19 RC pinned** | — |
| `apps/recipes` | `kitchen-recipes` | Next.js 14.2.15 | React 18.3 | Prisma 5.22 |
| `apps/suppliers` | `suppliers-po-system` | Express plain JS | Node | — |
| `apps/web` | `@aneh/web` | Next.js 15 + tRPC | **React 19.0.0** | — |

---

## 2. packages/ (14 חבילות root + נסטד)

| תיקייה | name | תפקיד | תלויות workspace |
|---|---|---|---|
| `packages/api` | `@aneh/api` | tRPC server schema | `@aneh/db`, `@aneh/auth` |
| `packages/audit` | `audit-log-system` | Express service | — |
| `packages/auth` | `@aneh/auth` | Auth library (argon2, 2FA) | — |
| `packages/config` | `@catering/config` | ENV loader | — |
| `packages/contracts` | `@catering/contracts` | Zod schemas, events, API | — |
| `packages/contracts-pdf` | `@catering/contracts-pdf` | PDF generation | — |
| `packages/db` | `@aneh-hashoel/db` | Prisma schema + client | — |
| `packages/event-bus` | `@catering/event-bus` | BullMQ + Redis Streams | — |
| `packages/integration-adapters` | `@catering/integration-adapters` | Inter-service adapters | `@catering/event-bus` |
| `packages/integrations/cardcom` | `@integrations/cardcom` | CardCom payments | — |
| `packages/integrations/icount` | `@aneh-hashoel/icount` | iCount invoicing | — |
| `packages/integrations/legacy` | `@aneh/integrations` | nodemailer, S3 helpers | — |
| `packages/integrations/ocr` | `@invoice-ocr/integrations-ocr` | OCR (Anthropic SDK) | — |
| `packages/queue` | `@catering/queue` | BullMQ workers | — |
| `packages/security-fixes` | `security-fixes` (npm-workspace) | container | — |
| `packages/security-fixes/packages/2fa-enforcement` | `@security-fixes/2fa-enforcement` | 2FA middleware | — |
| `packages/security-fixes/packages/archival` | `@security-fixes/archival` | R2 cold storage | — |
| `packages/security-fixes/packages/consent-ledger` | `@security-fixes/consent-ledger` | Double-opt-in | — |
| `packages/security-fixes/packages/cookies` | `@security-fixes/cookies` | Secure cookies | — |
| `packages/security-fixes/packages/invoicing-fallback` | `@security-fixes/invoicing-fallback` | iCount→GreenInvoice→Rivhit | — |
| `packages/security-fixes/packages/jwt-config` | `@security-fixes/jwt-config` | JWT secrets | — |
| `packages/security-fixes/packages/kms-client` | `@security-fixes/kms-client` | AWS KMS/Vault wrapper | — |
| `packages/security-fixes/packages/otp` | `@security-fixes/otp` | crypto.randomInt OTP | — |
| `packages/security-fixes/packages/pci-validator` | `@security-fixes/pci-validator` | PAN/CVV scanner | — |
| `packages/security-fixes/packages/privacy` | `@security-fixes/privacy` | GDPR + IL Privacy Act | — |
| `packages/security-fixes/packages/tax-reports` | `@security-fixes/tax-reports` | 106/102/126 XML | — |
| `packages/security-fixes/packages/vat` | `@security-fixes/vat` | IL VAT 18% | — |
| `packages/security-fixes/packages/xss-sanitizer` | `@security-fixes/xss-sanitizer` | DOMPurify wrapper | — |
| `packages/ui` | `@aneh/ui` | UI components (React 19) | — |
| `packages/ui-mobile` | `@field-ops/ui` | React Native UI | — |
| `packages/utils` | `@aneh/utils` | Shared utils | — |

---

## 3. services/ (2 שירותים)

| תיקייה | name | תפקיד |
|---|---|---|
| `services/ocr-api` | `@invoice-ocr/api` | Express OCR HTTP API |
| `services/orchestrator` | `@syncup/orchestrator` | Saga orchestration (customer→event→billing) |

---

## 4. ספירות

- **21 apps** ברמה ראשונה תחת `apps/`
- **+11 nested workspaces** (expenses/2, fleet/3-4, hr/2, marketing/2, menus/2) — חלקם npm-workspace ולא pnpm-workspace
- **14 packages** ראשיים + 13 ב-security-fixes + 4 ב-integrations = 31 packages סך הכל
- **2 services**
- **שמות namespaces שונים בלי תיאום**: `@catering/*`, `@aneh/*`, `@aneh-hashoel/*`, `@syncup/*`, `@field-ops/*`, `@integrations/*`, `@invoice-ocr/*`, `@marketing/*`, `@security-fixes/*`, ועוד שמות יחידים בלי scope (`crm`, `inventory`, `client`, `server`, `fleet-api`, ...).

---

## 5. Prisma schemas

10 schemas נפרדים, כל אחד יוצר client משלו:
- `apps/bi/prisma/schema.prisma`
- `apps/crm/prisma/schema.prisma`
- `apps/invoices/prisma/schema.prisma`
- `apps/orders/prisma/schema.prisma`
- `apps/recipes/prisma/schema.prisma`
- `apps/expenses/backend/prisma/schema.prisma`
- `apps/fleet/api/prisma/schema.prisma`
- `apps/hr/server/prisma/schema.prisma`
- `apps/marketing/server/prisma/schema.prisma`
- `apps/menus/server/prisma/schema.prisma`

ה-schema האחיד מ-INT2 (`agent-ab78dafb87e7abbb1/packages/db/prisma/schema.prisma`, 1711 שורות) **לא הוטמע** ב-F1.
