# apps/ — אפליקציות (Next.js / Expo)

כל אפליקציה היא תוצר deploy-able עצמאי שצורך packages משותפים.

## מיפוי worktrees → apps/

| #  | מקור (worktree)                   | יעד במונורפו             | פורט | מסגרת |
|----|-----------------------------------|--------------------------|------|--------|
| 01 | `agent-ac2389dbcde5e8bd9` תשתית   | פיזור: root + `services/gateway` + `docker/` + `apps/admin` (UI ניהול) | 3001 | Next |
| 02 | `agent-abcfc839a28d7b588` DB      | `packages/db`            | -    | Prisma |
| 03 | `agent-a0d949436df27ed12` Auth    | `packages/auth`          | -    | -      |
| 04 | `agent-a5e9ec7d29999be9c` Audit   | `packages/audit`         | -    | -      |
| 05 | `agent-ad2220241a52022d0` CRM     | `apps/crm`               | 3005 | Next   |
| 06 | `agent-a3864f31565b63390` Orders  | `apps/orders`            | 3006 | Next   |
| 07 | `agent-aecddcb45d3db0342` Portal  | `apps/web-portal`        | 3007 | Next   |
| 08 | `agent-a1f475c6464b1f625` Menus   | `apps/menus`             | 3008 | Next   |
| 09 | `agent-adc7b003297d67905` Recipes | `apps/recipes`           | 3009 | Next   |
| 10 | `agent-a9490fdab3005fda1` Inventory | `apps/inventory`       | 3010 | Next   |
| 11 | `agent-a23e11108be93681b` Suppliers | `apps/suppliers`       | 3011 | Next   |
| 12 | `agent-a9ab30939b7e8e2c3` OCR     | `apps/ocr` + `services/worker` | 3012 | Next |
| 13 | `agent-ab6c0dce79413e79f` Events  | `apps/events`            | 3013 | Next   |
| 14 | `agent-aa05ac323e9015be7` Logistics | `apps/logistics`       | 3014 | Next   |
| 15 | `agent-a50ad709234b49b0b` HR      | `apps/hr`                | 3015 | Next   |
| 16 | `agent-ab96ab384014c8442` Payroll | `apps/payroll`           | 3016 | Next   |
| 17 | `agent-a31b566159e7cc878` Invoices| `apps/invoices`          | 3017 | Next   |
| 18 | `agent-accb121134afd7c1a` iCount  | `packages/integrations/icount` | - | -    |
| 19 | `agent-a91fe015c553e924f` Cardcom | `packages/integrations/cardcom` | - | -   |
| 20 | `agent-a016172202c9645f0` Expenses| `apps/expenses`          | 3020 | Next   |
| 21 | `agent-a2f8c66ff540bd496` Fleet   | `apps/fleet`             | 3021 | Next   |
| 22 | `agent-a0cfd9be4e88397cc` BI      | `apps/bi` + `services/worker` | 3022 | Next |
| 23 | `agent-a7f6f8c320f0b1219` Marketing | `apps/marketing` + `packages/integrations/{email,sms,whatsapp}` | 3023 | Next |
| 24 | `agent-a4541f69f7ac884b2` Public  | `apps/public-site`       | 3024 | Next   |
| 25 | `agent-a869d3b70f23a9a88` Mobile  | `apps/mobile`            | 8081 | Expo   |

## כללי תלות

- כל app רשאי לייבא **רק** מ-`packages/*` ו-`services/gateway` (HTTP).
- אסור ל-app אחד לייבא ישירות מ-app אחר.
- מודלים של DB עוברים דרך `@catering/db` בלבד.
- אימות עובר דרך `@catering/auth` בלבד (NextAuth/middleware משותף).

## הרצה מקומית

```bash
pnpm install
pnpm --filter @catering/orders dev    # הרצת app יחיד
pnpm dev                              # הרצת כל ה-apps במקביל (turbo)
```
