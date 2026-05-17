# @aneh-hashoel/db

Prisma schema + client for the **"Aneh et HaShoel"** platform — a multi-tenant ERP/CRM tailored for Israeli catering and event-management businesses (with rabbinical Q&A integration for "Moreshet Maran").

## Highlights

- **Multi-tenant by design** — every table carries `tenant_id` for hard tenant isolation.
- **PostgreSQL-first** — uses `pgcrypto`, `citext`, and `pg_trgm` extensions.
- **Financial duality** — every monetary entity (Payment, Invoice, Receipt, Expense, PettyCash, PayrollRecord, BankTransaction, SupplierInvoice) carries a `category` enum: `OFFICIAL` (reported) vs. `UNOFFICIAL` (cash/internal).
- **Hebrew-first** — `hebrew_name` fields, Hebrew seed data, RTL-aware default values.
- **Audit trail** — `AuditLog` captures all changes with old/new JSON snapshots, IP, user-agent, tenant.

## Domains covered

| Area | Models |
| --- | --- |
| Identity / access | `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `Session`, `ApiKey`, `AuditLog` |
| CRM | `Customer`, `ContactPerson`, `Address`, `Tag`, `CustomerTag`, `Document`, `Note` |
| Events / catering | `Event`, `Venue`, `Menu`, `MenuItem`, `OrderItem`, `Task`, `StaffAssignment`, `Delivery` |
| Inventory / kitchen | `Product`, `Category`, `Recipe`, `RecipeIngredient`, `RecipeVersion`, `InventoryMovement`, `StockLevel` |
| Suppliers / purchasing | `Supplier`, `SupplierPrice`, `SupplierInvoice`, `PurchaseOrder` |
| HR | `Employee`, `Shift`, `TimeEntry`, `PayrollRecord`, `VacationBalance`, `Evaluation` |
| Finance | `Invoice`, `Payment`, `Receipt`, `PettyCash`, `Expense`, `BudgetCategory`, `BankTransaction` |
| Fleet | `Vehicle` |
| Marketing | `Campaign`, `Lead`, `Testimonial`, `Gallery`, `Portfolio` |
| Platform | `FeatureFlag`, `Webhook`, `IntegrationLog`, `Notification` |

## Usage

```bash
cp .env.example .env
# edit DATABASE_URL

npm install
npm run generate          # prisma generate
npm run migrate:deploy    # apply migrations
npm run db:seed           # populate Hebrew demo data
```

## Programmatic use

```ts
import { prisma } from "@aneh-hashoel/db";

const customers = await prisma.customer.findMany({
  where: { tenantId: "00000000-0000-0000-0000-000000000001" },
});
```
