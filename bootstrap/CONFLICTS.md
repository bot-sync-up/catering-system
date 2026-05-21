# CONFLICTS — מה יתפוצץ ב-`pnpm install`

מסמך זה מציין כל קונפליקט שזיהיתי בסריקת ה-monorepo F1, עם מיקום מדויק והצעת fix.

חומרה: **P0** = `pnpm install` נופל / build בלתי-אפשרי. **P1** = install עובר אבל יש חוסר תאימות / TypeScript fails / runtime crash. **P2** = עובד אבל שגוי / טכני-חוב.

---

## P0-1 — Workspace dependency שלא קיים: `@aneh/auth` בלי `workspace:` protocol

**מיקום**: `apps/aneh-web/package.json:13`
```json
"@aneh/auth": "*"
```
**בעיה**: pnpm לא מזהה זאת כ-workspace dep (חסר `workspace:*` או `workspace:^`). הוא ינסה לפנות ל-npm registry, שם לא קיימת חבילה כזו → `ERR_PNPM_FETCH_404`.

**אותו דבר ב**:
- `apps/mobile/package.json`: `"@field-ops/ui": "*"`
- `apps/public-site/package.json`: `"@contracts/core": "*"` — **גם השם לא תואם** לאף חבילה במונורפו! החבילה הקיימת היא `@catering/contracts`.

**Fix**:
- `apps/aneh-web`: `"@aneh/auth": "workspace:*"`
- `apps/mobile`: `"@field-ops/ui": "workspace:*"`
- `apps/public-site`: להחליף `@contracts/core` ב-`@catering/contracts` עם `workspace:*`, ולעדכן imports בקוד אם קיימים.

---

## P0-2 — npm workspaces בתוך pnpm workspace

**מיקום**: `apps/expenses/package.json`, `apps/fleet/package.json`, `apps/hr/package.json`, `apps/marketing/package.json`, `apps/menus/package.json`, `packages/security-fixes/package.json` — לכל אחד מהם `"workspaces": [...]`.

**בעיה**: pnpm מתעלם מהשדה `workspaces` ב-sub-package.json (`apps/expenses/package.json`), אבל הסקריפטים שם משתמשים ב-`npm --workspace`. בנוסף, ה-children הללו (`apps/expenses/backend`, `apps/fleet/api`, וכו') **לא מוכרזים ב-pnpm-workspace.yaml** — pnpm לא יתקין אותם כלל.

**אותו דבר ב**:
- `packages/security-fixes/package.json` — מצהיר `"workspaces": ["packages/*"]` אבל ה-pnpm-workspace.yaml כן מכריז `packages/security-fixes/packages/*` בנפרד, אז ה-children מתקינים. השדה `workspaces` המקומי לא יזיק אבל מבלבל.

**Fix**:
1. עדכן `pnpm-workspace.yaml` להוסיף את כל ה-nested:
   ```yaml
   packages:
     - "apps/*"
     - "apps/expenses/*"
     - "apps/fleet/*"
     - "apps/hr/*"
     - "apps/marketing/*"
     - "apps/menus/*"
     - "packages/*"
     - "packages/integrations/*"
     - "packages/security-fixes/packages/*"
     - "services/*"
     - "tests"
   ```
2. החלף `"npm --workspace X run Y"` ב-`"pnpm --filter X run Y"` בכל ה-scripts.
3. הסר `"workspaces": [...]` מ-sub-package.json (אחרת pnpm warns).

---

## P0-3 — שם package מתנגש: `client` ו-`server` בלי scope

**מיקום**: `apps/menus/client/package.json` → name `client`, `apps/menus/server/package.json` → name `server`.

**בעיה**: שמות כאלה ישתמשו פעמיים אחרי שנפעיל nested workspaces (אם נכלול גם apps אחרים שיש להם client/server לא ייחודיים). גם גורם לבלבול ב-`pnpm --filter`.

**Fix**: לשנות ל-`@catering/menus-client` ו-`@catering/menus-server` (ובהתאמה לכל ה-others שלא scoped: `crm` → `@catering/crm`, `inventory` → `@catering/inventory`, `customer-portal`, `public-site`, `expenses-budget-backend`, `fleet-api`, `fleet-web`, `fleet-driver`, `hr-server`, `hr-client`).

---

## P0-4 — React major version mismatch

**מיקום**: רחב.
- React 18.3: `aneh-web`, `bi`, `crm`, `expenses/frontend`, `fleet/web`, `hr/client`, `marketing/client`, `menus/client`, `ocr-verify`, `orders`, `recipes`, `@aneh/ui` (peerDep!)
- React 19.0.0: `customer-portal`, `apps/web`
- React 19 RC: `public-site` (`19.0.0-rc-65a56d0e-20241020`)
- React Native 0.74 + React 18.2: `apps/mobile`, `apps/fleet/mobile`

**בעיה**:
1. `packages/ui` (`@aneh/ui`) מצהיר `peerDependencies: { "react": "19.0.0" }` — אבל הוא מיובא בפועל ב-apps שעובדים עם React 18 (`aneh-web`, `bi`). זה מעורר `ERR_PNPM_PEER_DEP_ISSUES`.
2. `apps/web` משתמש ב-React 19.0.0 אבל `@types/react` 19.0.0 — בעוד `@trpc/react-query@11.0.0-rc.648` נבדק על React 18. צריך `auto-install-peers=true`.
3. `apps/public-site` משתמש ב-React 19 RC חוצב (`19.0.0-rc-...`), אבל ה-`@types/react` שם `^18.3.12` — type-error מובטח.

**Fix**: לאחד את כל ה-monorepo על **React 19.0.0** (תואם Next 15.1 ו-tRPC 11 stable):
- כל ה-apps של Next/Vite: `"react": "^19.0.0"`, `"react-dom": "^19.0.0"`, `"@types/react": "^19.0.0"`, `"@types/react-dom": "^19.0.0"`.
- `apps/public-site`: להחליף RC ב-stable + לתקן `@types/react` ל-19.
- `packages/ui` peerDep יישאר `"react": "^19.0.0"`.
- React Native (`apps/mobile`, `apps/fleet/mobile`) — **לא** משתנה. הם נשארים על React 18.2 (Expo 51 דורש זאת). הם רצים בנפרד בכל מקרה ולא משתפים node_modules ב-deduplication.
- לוודא ש-`@aneh/ui` לא מיובא מ-mobile, ו-`@field-ops/ui` לא מיובא מ-web. מבחינת monorepo: הוסף `"engines": { "node": ">=20" }` ו-`pnpm.peerDependencyRules.allowedVersions` ב-root.

---

## P0-5 — Next.js major version mismatch

**מיקום**:
- Next 14: `apps/aneh-web` (`^14.2.0`), `apps/bi` (`^14.2.10`), `apps/recipes` (`14.2.15`)
- Next 15.0.x: `apps/crm` (`^15.0.2`), `apps/customer-portal` (`15.0.0`), `apps/orders` (`^15.0.0`), `apps/public-site` (`15.0.3`), `apps/web` (`15.0.3`)

**בעיה**: `eslint-config-next` עם גרסה משובצת — `crm` רוצה `^15.0.2`, אבל אם apps עם Next 14 עדיין דורשים eslint-config-next ישן, ה-hoisting ישבור לפחות אחד.

**Fix**: לאחד את כולם על **Next 15.1.3** (LTS האחרון נכון ל-2025-05):
- כל ה-Next apps: `"next": "15.1.3"`
- `eslint-config-next`: `"15.1.3"`
- ה-Next 14 apps (aneh-web, bi, recipes) נדרשים לבדוק יציאה מ-getServerSideProps deprecated → לעיתים דורש migrations קלים אבל לא חוסם install.

---

## P0-6 — Prisma major version mismatch

**מיקום**:
- Prisma 5.18: `apps/invoices` (`@prisma/client`, `prisma`)
- Prisma 5.20: `apps/bi`, `apps/expenses/backend`, `apps/hr/server`
- Prisma 5.22: `apps/crm`, `apps/orders`, `apps/recipes`, `apps/fleet/api`, `apps/menus/server`, `packages/audit`, `packages/db`
- **Prisma 6.0.0**: `apps/marketing/server`

**בעיה**: Prisma 6 ל-CRM-Server לא תואם generator של Prisma 5 ב-`packages/db`. אם generator Prisma 6 רץ אחרי 5, ה-client של marketing יחפש runtime לא קיים. בנוסף, hoisting של `@prisma/client` יביא לקונפליקט גרסאות חמור.

**Fix**: לאחד את כל ה-monorepo על **Prisma 5.22.0**:
- `apps/marketing/server`: להוריד ל-`^5.22.0` (אין שום פיצ׳ר ב-6 שנדרש).
- כל ה-others על Prisma 5.18, 5.20: לעדכן ל-`^5.22.0`.
- ב-root `package.json`: `pnpm.overrides` מאכיף `"@prisma/client": "5.22.0"`, `"prisma": "5.22.0"`.

---

## P0-7 — TypeScript version drift (5.3 → 5.7)

**מיקום**:
- TS 5.3.3: `apps/mobile`, `packages/security-fixes`
- TS 5.4.0: `apps/aneh-web`, `packages/auth`, `packages/contracts`, `packages/event-bus`, `packages/integration-adapters`
- TS 5.5.x: `apps/invoices`, `apps/ocr-verify`, `services/ocr-api`, `services/orchestrator`, `packages/integrations/ocr`
- TS 5.6.x: רוב, כולל `apps/orders`, `apps/crm`, `apps/web`, root
- TS 5.7.2: `apps/marketing/client`, `apps/marketing/server`

**בעיה**: לא חוסם install (תואם ל-back), אבל בלבול גרסאות. כל פעם ש-pnpm יחליט איזה TS להעלות לטופ-לבל, התנהגות הקומפלר תשתנה בין apps שבונים מ-IDE.

**Fix**: לאכוף **TypeScript 5.6.3** בכולם (`pnpm.overrides`).

---

## P0-8 — `@types/node` major drift (20 vs 22)

**מיקום**:
- v20: `apps/aneh-web` (^20.11), `apps/invoices`, `services/orchestrator`, `packages/contracts`, `packages/event-bus`, `packages/integration-adapters`, `services/ocr-api`, `apps/expenses/backend`, ועוד
- v22: רוב ה-Next apps, `packages/db`, `packages/audit`

**בעיה**: לא חוסם install אבל גורם ל-TS type errors מסוג "globalThis missing" / "fetch signature mismatch" לפי גרסת Node 20 ↔ 22.

**Fix**: לאחד על `@types/node@^22.10.0` (תואם ל-Node 20 ב-runtime, מטריקס מטיפוסים מעולה).

---

## P0-9 — `tests` package בלי package.json

**מיקום**: `pnpm-workspace.yaml:9` מצהיר `tests` כ-workspace.

**בעיה**: אם `tests/package.json` חסר (כן חסר! בדקנו), pnpm יזרוק `ERR_PNPM_INVALID_WORKSPACE_CONFIGURATION_FILE` או יתעלם בשקט (תלוי בגרסה).

**Fix**: ליצור `tests/package.json` בסיסי:
```json
{
  "name": "@catering/tests-e2e",
  "version": "0.0.0",
  "private": true,
  "scripts": { "test": "vitest run" },
  "devDependencies": { "vitest": "^2.1.8" }
}
```

---

## P1-1 — tsconfig.base.json מצביע ל-`packages/db/src` אבל ה-namespace בפועל הוא `@aneh-hashoel/db`

**מיקום**: `tsconfig.base.json:19`
```json
"@catering/db": ["packages/db/src"]
```
**מול** `packages/db/package.json:2` — שם החבילה הוא `@aneh-hashoel/db`, לא `@catering/db`.

**בעיה**: כל קוד שעושה `import { Prisma } from "@catering/db"` ייכשל ב-runtime (TS paths עובדים רק ב-compile), כי החבילה הותקנה ב-node_modules כ-`@aneh-hashoel/db`.

**אותו דבר ב**:
- `@catering/auth` → אבל החבילה היא `@aneh/auth`
- `@catering/api` → אבל החבילה היא `@aneh/api`
- `@catering/ui` → אבל החבילה היא `@aneh/ui` / `@field-ops/ui`
- `@catering/utils` → אבל החבילה היא `@aneh/utils`
- `@catering/audit` → אבל החבילה היא `audit-log-system`

**Fix**: יש שתי דרכים:
A) **שינוי שמות בכל החבילות** ל-namespace אחיד `@catering/*`. דורש refactor של imports בקוד.
B) **תיקון paths** ב-tsconfig.base.json כך שיתאימו לשמות הקיימים (פחות אגרסיבי):
```json
"@aneh/db": ["packages/db/src"],
"@aneh-hashoel/db": ["packages/db/src"],
"@aneh/auth": ["packages/auth/src"],
"@aneh/api": ["packages/api/src"],
"@aneh/ui": ["packages/ui/src"],
"@aneh/utils": ["packages/utils/src"],
"@aneh/integrations": ["packages/integrations/legacy/src"],
"@field-ops/ui": ["packages/ui-mobile/src"],
"audit-log-system": ["packages/audit/src"]
```
המסמך `package.json.fixed` ו-`tsconfig.base.json.fixed` מיישמים גישה B (פחות סיכון).

---

## P1-2 — `@catering/api` ב-tsconfig vs `@aneh/api` בפועל

**מיקום**: `tsconfig.base.json:36` → `@catering/api`. `packages/api/package.json:2` → `@aneh/api`.

מטופל ב-Fix של P1-1.

---

## P1-3 — `peerDependencies` חסרים

**מיקום**:
- `packages/ui` (`@aneh/ui`) מצהיר peerDep `react: 19.0.0` exact — צריך להיות `^19.0.0` (פתוח לעדכוני minor).
- `packages/ui-mobile` (`@field-ops/ui`) — `peerDependencies: { react: "*", react-native: "*" }` — wildcard מסוכן. לקבע ל-`^18.2.0` ו-`0.74.x`.
- `packages/contracts-pdf` — תלוי ב-`pdfkit` אבל זה ב-`dependencies` ולא `peerDependencies`. בסדר.
- `packages/security-fixes/packages/xss-sanitizer` — מצהיר `dompurify` כ-peerDep optional. בסדר.

**Fix**:
- `packages/ui/package.json`: `"peerDependencies": { "react": "^19.0.0", "react-dom": "^19.0.0" }`
- `packages/ui-mobile/package.json`: `"peerDependencies": { "react": "^18.2.0", "react-native": ">=0.74.0 <0.75.0" }`

---

## P1-4 — tRPC mismatch — `rc.502` מול `rc.648`

**מיקום**:
- `apps/crm` ו-`apps/orders`: `^11.0.0-rc.502`
- `apps/web` ו-`packages/api`: `^11.0.0-rc.648`

**בעיה**: pnpm יביא שתי גרסאות שונות, אבל ה-types של `@trpc/server@rc.502` לא תואמות ל-`@trpc/client@rc.648`. בקריאת RPC חוצת-app יקרה schema mismatch.

**Fix**: לאחד את כולם על **`@trpc/*@11.0.0`** (stable שיצא, לבדוק `npm view @trpc/server versions`) — אחרת ננעל על **`^11.0.0-rc.648`** בכל המקומות.

---

## P1-5 — `zod` בגרסאות שונות

**מיקום**:
- `^3.22.4`: `packages/auth`, ועוד 13 חבילות security-fixes
- `^3.23.0`: `packages/integrations/ocr`
- `^3.23.8`: רוב
- `^3.24.1`: `apps/marketing/server`

**בעיה**: zod בגרסאות שונות יוצרת brand-types שלא שווים בין modules. שלכן `.parse()` של `z.string()` מ-module A לא תואמ-טיפוסי ל-`z.string()` מ-module B. ב-runtime עובד, ב-TS לא תמיד.

**Fix**: `pnpm.overrides`: `"zod": "3.23.8"` ב-root.

---

## P1-6 — `bullmq` בגרסאות שונות

**מיקום**:
- `^5.7.0`: `packages/event-bus`
- `^5.10.0`: `apps/expenses/backend`
- `^5.12.0`: `apps/bi`, `apps/invoices`, `services/orchestrator`
- `^5.20.0`: `packages/integrations/ocr`
- `^5.21.x`: `apps/crm`, `packages/integrations/cardcom`, `packages/integrations/icount`
- `^5.28.1`: `packages/api`
- `^5.34.0`: `apps/fleet/api`, `apps/marketing/server`

**בעיה**: לא חוסם install (semver overlap), אבל workers משני services עלולים להירשם כ-consumers על אותה queue ולקרוס על schema של job-data שהשתנה בין minors.

**Fix**: `pnpm.overrides`: `"bullmq": "5.34.0"`.

---

## P1-7 — `ioredis` בגרסאות שונות

**מיקום**: `^5.3.2`, `^5.4.0`, `^5.4.1`, `^5.4.2`.

**Fix**: `pnpm.overrides`: `"ioredis": "5.4.2"`.

---

## P1-8 — `express` major mismatch (4 vs 5)

**מיקום**: כל ה-services על Express 4. ב-`packages/audit` יש `@types/express: ^5.0.0` בעוד `express: ^4.21.1` — type mismatch!

**אותו דבר ב**:
- `apps/marketing/server`: `@types/express: ^5.0.0` עם `express: ^4.21.2`.

**Fix**: לאחד `express: ^4.21.2` + `@types/express: ^4.17.21`. או לעבור לכולם ל-Express 5 (יותר עבודה).

---

## P1-9 — `date-fns` major mismatch (3 vs 4)

**מיקום**:
- v3.6.0: `apps/bi`, `apps/expenses/backend`, `apps/expenses/frontend`
- v4.1.0: `apps/crm`, `apps/recipes`, `apps/hr/client`, `packages/utils`

**בעיה**: date-fns 4 שינה את ה-API של `format()` ו-`parseISO()`. אם code משותף עובר בין apps יקרה runtime error.

**Fix**: `pnpm.overrides`: `"date-fns": "4.1.0"`. לעדכן את ה-`@catering/utils` בהתאם.

---

## P1-10 — `zustand` v4 vs v5

**מיקום**:
- v4.5.2: `apps/mobile`
- v5.0.0: `apps/crm`, `apps/hr/client`
- v5.0.2: `apps/marketing/client`

**בעיה**: v5 שינה את ה-API של `create()` (אין יותר default export). לא חוסם install אבל קרסות בקוד אם מועתק בין apps.

**Fix**: לאכוף 5.0.x ב-overrides. mobile יישאר 4.5.2 (אם RN לא תומך 5).

---

## P1-11 — Expo SDK בדיוק 51 — לא ניתן לשדרג React 19

**מיקום**: `apps/mobile`, `apps/fleet/mobile`.

**בעיה**: Expo 51 דורש React 18.2.0 בדיוק. **אסור** להעלות אותם ל-React 19. ה-overrides של React 19 ב-root חייב לא להשפיע עליהם.

**Fix**: ב-root `package.json` נשתמש ב-`pnpm.overrides[">@field-ops/mobile"]` ו-`>fleet-driver` כ-scope-limited override. אלטרנטיבה: `pnpm.peerDependencyRules.ignoreMissing` להחביא warnings.

---

## P1-12 — `services/orchestrator` משתמש ב-`ts-node-dev` + `ts-node` — שניהם

**מיקום**: `services/orchestrator/package.json` — בעת אותה התקנה גם `ts-node` וגם `ts-node-dev`.

**בעיה**: לא קונפליקט אמיתי אבל מיותר. `ts-node-dev` כולל את `ts-node` בתוכו.

**Fix**: למחוק `ts-node` מ-devDependencies של orchestrator.

---

## P1-13 — `services/orchestrator` מסומן `type: commonjs` עם `tsx` ו-Express — אבל imports אחרים במונורפו ESM

**מיקום**: `services/orchestrator/package.json:6` → `"type": "commonjs"`.

**מול** `packages/event-bus`, `packages/integration-adapters`, `services/ocr-api` — `"type": "module"`.

**בעיה**: `orchestrator` ייבא `@catering/event-bus` שהוא ESM, וזה ייכשל ב-CJS bundler ללא `import('...')` דינמי.

**Fix**: לעבור orchestrator ל-`"type": "module"`, או — אם אי-אפשר עכשיו — להוסיף `tsx` -only עם `moduleResolution: "Bundler"` ב-tsconfig.

---

## P2-1 — `pdfkit` בלי `@types/pdfkit` ב-`apps/invoices`

**מיקום**: `apps/invoices/devDependencies` — יש `@types/pdfkit`. **לא בעיה.** (סורק לבד פספסה.)

---

## P2-2 — Mobile uses `@field-ops/ui` workspace dep but published as `@field-ops/ui` only

`apps/mobile` תלוי ב-`@field-ops/ui: "*"`. אחרי P0-1 fix, יהיה תקין.

---

## P2-3 — אין `packageManager` בכמה sub-packages

הסכימה הצליחה — pnpm לוקח מ-root. P2 בלבד.

---

## P2-4 — Prisma 10 schemas ≠ DB אחד

10 schemas שונים יוצרים 10 databases שונים, אבל בפועל יש DB אחד מ-INT2 עם 1711 שורות.

**Fix**: צריך migration project — לבטל 9 schemas מקומיים ולהשתמש ב-`@aneh-hashoel/db` כולם. **לא חוסם pnpm install** אבל חוסם runtime. מטופל בנפרד ב-script `migrate-prisma-schemas.sh`.

---

## P2-5 — `apps/expenses/frontend` בלי name חוקי לpnpm

`apps/expenses/frontend/package.json:2` → `"name": "expenses-budget-frontend"`. תקין. (false-positive)

---

## P2-6 — Anthropic SDK שתי גרסאות

`apps/marketing/server` ו-`packages/integrations/ocr` — שניהם `^0.40.0`. תואם.

---

## סיכום עדיפויות

| חומרה | מספר |
|---|---|
| P0 (חוסם install) | 9 |
| P1 (חוסם build/runtime) | 13 |
| P2 (טכני-חוב) | 6 |

הסקריפט `bootstrap/scripts/fix-all.sh` מטפל ב-**כל P0 ו-P1**.
P2 דורש עבודה ידנית (שינוי namespace, איחוד Prisma schemas).
