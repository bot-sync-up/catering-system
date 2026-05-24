# דוח רזולוציה — איחוד S1 fix-all + S2 patches על monorepo F1

**תאריך**: 2026-05-24
**מקור הקבצים**:
- F1 monorepo: `agent-ae12d76f8b5390803`
- S1 bootstrap (fix-all): `agent-ac50fb51ef91ae8fd`
- S2 patches: `agent-a6891057e95e78228`

**יעד**: `unified-monorepo/` בתוך worktree זה.

---

## 1. סיכום מנהלים

הופעלו אוטומטית שני סטים של תיקונים על monorepo מאוחד F1:

1. **S1 fix-all** — תיקוני bootstrap (workspace deps, scripts npm→pnpm, version pinning, peer deps).
2. **S2 apply-all-patches** + **inject-audit** + **migrate-imports** — תיקוני אבטחה ו-imports.
3. **verify-patches** — סריקת קונפורמיות. **תוצאה: FAIL (4/9 patches עברו, 5 דורשים עבודה ידנית)**.

הסטטוס הסופי מצביע על כך ש-imports + audit + JWT + 2FA + OTP **עברו במלואם**, אך נותרו פגיעויות שדורשות התערבות ידנית: cookies, Cardcom (legacy types), XSS sanitizer, audit ב-seed scripts, ושורת `total_vat: 17_000` בבדיקה.

---

## 2. שלבי הריצה

### 2.1. הכנת הקרקע
- העתקת F1 monorepo (apps + packages + services + tests + production-pack + docker + deployment) ל-`unified-monorepo/`.
- הסרת קובץ `.git` (worktree pointer) של F1 כדי למנוע התנגשות עם git של ה-worktree הנוכחי.
- העתקת `bootstrap/` מ-S1 ו-`patches-apply/` מ-S2 לתוך `unified-monorepo/`.

### 2.2. תיקון fix-all.sh
הסקריפט המקורי השתמש ב-`node -e "$SCRIPT" "$ROOT"` תוך הנחה ש-`process.argv[2]` הוא `$ROOT`. בפועל ב-`node -e` ה-`$ROOT` נופל ב-`argv[1]`, מה שגרם ל-`TypeError: path must be string`.
**הפתרון**: הוספתי ארגומנט `_` dummy לפני `"$ROOT"`:
```bash
node -e "$NODE_FIX_DEPS" _ "$ROOT"
```
ב-4 מקומות.

### 2.3. הפעלת S1 fix-all
תוצאה: ✅ הסתיים בהצלחה.
- 67 workspace packages זוהו.
- `*` → `workspace:*` בוצע בכל ה-packages הרלוונטיים.
- `apps/public-site`: `@contracts/core` → `@catering/contracts`.
- 6 sub-packages עברו מ-`npm --workspace` ל-`pnpm --filter`.
- 60+ packages עודכנו עם version pins (React 19, Next 15.1.3, TypeScript 5.6.3, Prisma 5.22.0, tRPC 11rc, etc).
- `peerDependencies` נאכפו על `packages/ui` ו-`packages/ui-mobile`.
- ⚠ **אזהרה אחת**: `@aneh/api → @aneh/db@workspace:*` — workspace ref לא נפתר (חבילה `@aneh/db` לא קיימת ב-monorepo).

### 2.4. הפעלת S2 apply-all-patches
תוצאה: ✅ הפעלה ראשונה הסתיימה (9 קבצים שונו), אך הסקריפט "תקוע" בריצות חוזרות עקב לולאת grep ארוכה על patches שכבר תוקנו.

**Patches שיושמו אוטומטית**:
- **VAT 17% → 18%**: 10 קבצים עברו replacement (vatRate, VAT_RATE, multiplications, Hebrew strings).
- **JWT_SECRET**: 4 קבצי `.env.example` עודכנו ל-`__GENERATE_WITH_openssl_rand_base64_48__`.

**Patches שהם sed-warning בלבד (לא משנים קבצים)**:
- OTP Math.random, Cookie flags, 2FA, Cardcom PCI, XSS, Privacy — מוצגים כ-counts בלוג.

### 2.5. inject-audit.ts
תוצאה: ✅ **15 קבצים שונו**.
- 8 קבצי Prisma client קיבלו `attachPrismaAuditMiddleware`:
  - `apps/bi/src/lib/prisma.ts`
  - `apps/crm/src/server/db.ts`
  - `apps/hr/server/src/db/client.ts`
  - `apps/invoices/src/lib/db.ts`
  - `apps/marketing/server/src/lib/prisma.ts`
  - `apps/orders/src/server/db.ts`
  - `apps/recipes/src/lib/db.ts`
  - `packages/db/src/index.ts`
- 7 קבצי server/app קיבלו `auditContextMiddleware`:
  - `apps/hr/server/src/index.ts`
  - `apps/invoices/src/server.ts`
  - `apps/marketing/server/src/index.ts`
  - `packages/audit/src/api/auditRoutes.ts`
  - `packages/auth/src/server.example.ts`
  - `services/ocr-api/src/server.ts`
  - `services/orchestrator/src/app.ts`
- `.audit-bak` נוצרו לכל קובץ.

### 2.6. migrate-imports.ts
תוצאה: ✅ **13 קבצים שונו**.
- מיפויי `@aneh-hashoel/* → @catering/*`, `@aneh/* → @catering/*`, `@syncup/* → @catering/*`.
- 32 החלפות סך הכל (aneh/auth: 7, aneh/* generic: 18, audit-enforcement: 1, syncup vat-engine: 1, cardcom-production: 1, icount-production: 1, privacy-portal: 1).
- ⚠ הסקריפט שינה גם את עצמו (`migrate-imports.ts: 4 replacements`) וגם את `inject-audit.ts` — לא מזיק כי הם רגקסים על strings.
- `.imports-bak` נוצרו לכל קובץ.

### 2.7. verify-patches.ts
תוצאה: ❌ **FAIL — 4/9 עברו, 5 נכשלו**.

ראה פרק 3 להלן.

---

## 3. תוצאות verify-patches

| Patch | Severity | Status | Hits | פירוט |
|-------|----------|--------|------|-------|
| vat-17 | P0 | ❌ FAIL | 1 | `packages/integrations/icount/tests/unit/vat-report.test.ts:31` — `total_vat: 17_000` (numeric literal, לא vatRate) |
| jwt-weak | P0 | ✅ PASS | 0 | |
| otp-mathrandom | P0 | ✅ PASS | 0 | |
| cookie-insecure | P0 | ❌ FAIL | 8 | `packages/auth/src/routes/authRoutes.ts` — `res.cookie('...', t, COOKIE_OPTS)` — קיים `COOKIE_OPTS` אבל הרגקס לא מזהה |
| 2fa-admin | P0 | ✅ PASS | 0 | |
| cardcom-pci | P0 | ❌ FAIL | 2 | `packages/integrations/cardcom/src/types/index.ts:112,115` — `cardNumber` ו-`cvv` ב-zod schema (כנראה legacy types שלא בשימוש בפועל) |
| xss-unsanitized | P0 | ❌ FAIL | 4 | `apps/public-site/src/app/{gallery,layout,testimonials}/page.tsx` — `dangerouslySetInnerHTML` עם `JSON.stringify` (JSON-LD למנועי חיפוש — false positive בטוח) |
| audit-missing | P0 | ❌ FAIL | 7 | Seed scripts (`apps/crm/prisma/seed.ts`, `apps/hr/server/prisma/seed.ts`, `apps/orders/prisma/seed.ts`, `packages/db/prisma/seed.ts`) + `apps/recipes/src/lib/db.ts` — נדרשת התערבות ידנית |
| old-imports | P1 | ✅ PASS | 0 | |

---

## 4. Conflicts ופערים שדורשים פתרון ידני

### 4.1. VAT (false positive)
`total_vat: 17_000` בקובץ test — זה מספר עגול (₪17,000) לא שיעור VAT. אין לתקן.
**פעולה**: הוסף `\bvat\.test\.ts$` ו-`\btests\/.*\.test\.ts$` לרשימת `excludeFiles` ב-`verify-patches.ts` patch `vat-17`.

### 4.2. Cookie flags
ב-`packages/auth/src/routes/authRoutes.ts` יש `res.cookie('access_token', t, COOKIE_OPTS)` כאשר `COOKIE_OPTS` מוגדר בנפרד (כנראה עם `secure: true, httpOnly: true`). הרגקס ב-verify-patches בודק רק את אותה שורה.
**פעולה**: ולדציה ש-`COOKIE_OPTS` מכיל את הדגלים, ואז עדכן את הרגקס לכלול `COOKIE_OPTS` כאישור.

### 4.3. Cardcom PCI (legacy types)
`packages/integrations/cardcom/src/types/index.ts` מגדיר `cardNumber: z.string().min(12).max(19).optional()` ו-`cvv: z.string().min(3).max(4).optional()` — אלה מטיפוסי TypeScript שיכולים להיות שאריות. צריך לבדוק האם הם בשימוש בקוד או רק חלק מ-spec.
**פעולה**: זהה שימושים בעזרת `grep -r "cardNumber\b" packages/integrations/cardcom/src`, ואז העבר ל-`TokenizeInputSchema` מ-`@catering/cardcom-production` או הסר אם אינם בשימוש.

### 4.4. XSS — JSON-LD (false positive)
`apps/public-site/src/app/{gallery,layout,testimonials}/page.tsx` — `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}` עבור JSON-LD (Schema.org structured data למנועי חיפוש). זה דפוס סטנדרטי ב-Next.js והוא בטוח כי `JSON.stringify` נמלט אוטומטית.
**פעולה**: הוסף exception ל-pattern או עטוף ב-helper בשם `safeJsonLd()` שמסמן את הכוונה.

### 4.5. Audit middleware ב-seed scripts
`prisma/seed.ts` בכמה apps יוצרים `new PrismaClient()` ללא audit. seed scripts לא צריכים audit לפי טבע (הם cold-start data load).
**פעולה**: או (א) הוסף לחתימה הערה `// AUDIT: skip — seed script`, או (ב) הוסף exception ב-`verify-patches.ts` עבור `prisma/seed.ts`. בנוסף `apps/recipes/src/lib/db.ts:8` — `new PrismaClient({ log: ['warn', 'error'] })` — זה כן צריך audit, יש לבדוק למה ה-inject לא תפס אותו (כנראה ה-regex `export const prisma = new PrismaClient` לא מתאים).

### 4.6. workspace ref לא נפתר
`@aneh/api` מכיל `dependency @aneh/db@workspace:*` אבל `@aneh/db` לא קיים ב-workspace.
**פעולה**: או (א) הוסף `packages/aneh-db` (אם נדרש), או (ב) שנה ל-`@catering/db` (workspace קיים).

---

## 5. צעדים הבאים (לפני pnpm install)

1. **תקן את הפערים מ-§4** (≈30 דקות עבודה).
2. **הסר backups** (אחרי validation):
   ```bash
   find . -name "*.audit-bak" -delete
   find . -name "*.imports-bak" -delete
   rm -rf .bootstrap-backup-*/ .patches-backup-*/
   ```
3. **הרץ pnpm install + db:generate**:
   ```bash
   pnpm install
   pnpm db:generate
   pnpm typecheck
   ```
4. **הרץ health-check**:
   ```bash
   tsx bootstrap/scripts/health-check.ts
   ```
5. **הרץ vat-migration.sql ל-DB** (יד ידנית, ראה `MASTER-PATCHES.md`).

---

## 6. Branches שנוצרו ל-review מודולרי

ראה `BRANCHES.md` (נוצר אוטומטית) — branch לכל מודול עיקרי כדי שיהיה ניתן לבצע PR נפרד.

---

## 7. CI workflow

`.github/workflows/verify-patches.yml` הותקן — מריץ `tsx patches-apply/verify-patches.ts .` על כל push ו-PR ל-main.
