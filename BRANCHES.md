# Module Branches

ה-monorepo המאוחד מארגן 38 modules תחת `apps/`, `packages/`, ו-`services/`.
כדי לאפשר review מודולרי, יצרנו branch לכל מודול.

## Apps (21)

| Branch | מסלול | תיאור |
|--------|--------|-------|
| `module/apps-aneh-web` | `apps/aneh-web` | Aneh web client |
| `module/apps-bi` | `apps/bi` | BI Reports |
| `module/apps-crm` | `apps/crm` | CRM |
| `module/apps-customer-portal` | `apps/customer-portal` | Customer Portal |
| `module/apps-events` | `apps/events` | Event Manager |
| `module/apps-expenses` | `apps/expenses` | Expenses & Budget (frontend+backend) |
| `module/apps-fleet` | `apps/fleet` | Fleet (api+web) |
| `module/apps-hr` | `apps/hr` | HR (client+server) |
| `module/apps-inventory` | `apps/inventory` | Inventory |
| `module/apps-invoices` | `apps/invoices` | Invoices / Finance docs |
| `module/apps-logistics` | `apps/logistics` | Logistics & Delivery |
| `module/apps-marketing` | `apps/marketing` | Marketing (client+server) |
| `module/apps-menus` | `apps/menus` | Menus (client+server) |
| `module/apps-mobile` | `apps/mobile` | Field Ops mobile (Expo) |
| `module/apps-ocr-verify` | `apps/ocr-verify` | OCR Web Verify |
| `module/apps-orders` | `apps/orders` | Orders Management |
| `module/apps-payroll` | `apps/payroll` | Payroll System |
| `module/apps-public-site` | `apps/public-site` | Public marketing site |
| `module/apps-recipes` | `apps/recipes` | Kitchen Recipes |
| `module/apps-suppliers` | `apps/suppliers` | Suppliers PO |
| `module/apps-web` | `apps/web` | Main Aneh web app |

## Services (2)

| Branch | מסלול |
|--------|--------|
| `module/services-ocr-api` | `services/ocr-api` |
| `module/services-orchestrator` | `services/orchestrator` |

## Packages (15)

| Branch | מסלול |
|--------|--------|
| `module/packages-api` | `packages/api` |
| `module/packages-audit` | `packages/audit` |
| `module/packages-auth` | `packages/auth` |
| `module/packages-config` | `packages/config` |
| `module/packages-contracts` | `packages/contracts` |
| `module/packages-contracts-pdf` | `packages/contracts-pdf` |
| `module/packages-db` | `packages/db` |
| `module/packages-event-bus` | `packages/event-bus` |
| `module/packages-integration-adapters` | `packages/integration-adapters` |
| `module/packages-integrations` | `packages/integrations` |
| `module/packages-queue` | `packages/queue` |
| `module/packages-security-fixes` | `packages/security-fixes` |
| `module/packages-ui` | `packages/ui` |
| `module/packages-ui-mobile` | `packages/ui-mobile` |
| `module/packages-utils` | `packages/utils` |

## איך לעבוד

לכל מודול הוקדש branch נפרד. כשרוצים לבצע תיקון פר-מודול (למשל תיקונים מ-§4 ב-`RESOLUTION-REPORT.md`):

```bash
git checkout module/packages-auth
# בצע שינויים בתוך packages/auth/
git add packages/auth/
git commit -m "fix(auth): cookie flags hardening"
git push origin module/packages-auth
# פתח PR ל-main
```

ה-CI workflow `.github/workflows/verify-patches.yml` ירוץ אוטומטית על ה-PR ויאמת ש-verify-patches עובר.
