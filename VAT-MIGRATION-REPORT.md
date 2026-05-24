# דוח מיגרציית VAT 17% → 18%

**תאריך**: 18/5/2026
**תקפות שינוי החוק**: 1/1/2025
**מבצע**: agent-ab161962f128a986d (worktree)

---

## 1. תקציר מנהלים

החל מ-1 בינואר 2025 שיעור המע"מ בישראל עלה מ-17% ל-18%.
מסמך זה מתעד את הסריקה הכוללת שבוצעה ב-worktrees של הפרויקטים, את ה-patches
שנוצרו, ואת התשתית החדשה (חבילת `@syncup/vat-engine` + SQL migration) שתשמש
מקור-אמת יחיד למניעת חזרת התקלה.

## 2. היקף הסריקה

| פרמטר | ערך |
|--------|-----|
| תיקיית שורש | `C:/Users/user/.claude/worktrees/` |
| מספר worktrees סה"כ באינדקס | 213 |
| worktrees שנדרשו לסריקה לפי המשימה | 25 מודולים + sealing 1-5 + INT 1-5 = 35 |
| worktrees שנסרקו בפועל | 1 (worktree נוכחי בלבד) |
| sees שנמצאו | 0 |

### דפוסי חיפוש
הסקריפט `scripts/scan-vat.sh` סורק את הדפוסים הבאים:
- `vat:\s*17` - אובייקטים JSON/TS עם שדה vat
- `VAT_RATE[^0-9]*17` - קבועים שמאוחסנים כמספר שלם
- `\b0\.17\b` - שבר עשרוני (אסטרטגית כפל)
- `\b1\.17\b` - מקדם ברוטו מ-net (× 1.17)
- `\*\s*0\.17` - ביטוי כפל מפורש
- `מע"מ.*17%` / `מע״מ.*17%` - מחרוזות ממשק עברית
- `vatRate\s*[:=]\s*17` / `vat_rate` / `VatRate` - שדות אובייקט/DB

### החרגות
- `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `.turbo`
- סיומות לא רלוונטיות (תמונות, lock files)

## 3. תוצאות

### 3.1 hits לפי worktree
| Worktree | hits | סטטוס |
|----------|------|--------|
| agent-ab161962f128a986d (נוכחי) | 0 | ריק - רק README placeholder |
| **שאר ה-worktrees** | **לא נסרקו** | **נחסם בהרשאות** - ראה סעיף 5 |

### 3.2 Patches שנוצרו
**אין** - לא נמצאו hits לתיקון.
תיקיית `patches/` מוכנה ומכילה `README.md` עם הוראות יישום עתידיות.

### 3.3 Patches שנכשלו (אמביגוויים)
לא רלוונטי - לא בוצעו patches.

## 4. תוצרים שנוצרו

### 4.1 סקריפט סריקה
- `scripts/scan-vat.sh` - bash, מקבל פרמטר תיקיית שורש, מפיק JSONL + פלט קריא.
  השתמש בו כשתינתן גישה לכל ה-worktrees.

### 4.2 חבילה `packages/vat-engine/`
מנוע VAT מרכזי שיחליף את כל ה-`0.17` המפוזרים בקוד. API:

| פונקציה | תיאור |
|---------|--------|
| `getVATRate(date, opts?)` | מחזיר 0.17/0.18 לפי תאריך |
| `getVATPercent(date, opts?)` | מחזיר 17/18 (אחוז שלם) |
| `calcVATAmount(net, date)` | מחשב סכום מע"מ |
| `calcGrossFromNet(net, date)` | net + VAT |
| `splitGross(gross, date)` | פירוק ברוטו לרכיביו |
| `configureVATSchedule(tenantId?, schedule)` | תאריך מעבר מותאם ל-tenant |
| `recomputeInvoiceTotals(invoice, opts?)` | מיגרציית חשבונית בודדת |
| `recomputeBatch(invoices, opts?)` | מיגרציית אצווה + סיכום |

**מאפיינים מרכזיים**:
- תמיכה ב-Multi-tenant (לוח-זמנים שונה לכל ארגון)
- שתי אסטרטגיות מיגרציה: `preserveNet` (ברירת מחדל) / `preserveGross`
- אינו משנה in-place - מחזיר אובייקט חדש (immutable)
- מדלג אוטומטית על חשבוניות סגורות/ששולמו
- מדווח delta-VAT לצרכי הנהלת חשבונות

**בדיקות**: vitest. כיסוי - 2 קבצי spec עם 18+ בדיקות.

### 4.3 SQL Migration
`migrations/vat-migration.sql` - PostgreSQL:
- טרנזקציה אחת מלאה (BEGIN/COMMIT)
- 3 טבלאות גיבוי אוטומטיות (`vat_migration_backup_*`) - rollback safety
- מעדכן `Invoice`, `InvoiceLine`, `Receipt` עם `vatRate=0.17` ותאריך ≥ 2025-01-01
- מדלג על סטטוסים `closed/paid/cancelled`
- מעדכן `DEFAULT` של עמודות (אם נתמך)
- Idempotent - ניתן להרצה חוזרת ללא נזק
- מכיל סקריפט ROLLBACK מוכן בהערה

## 5. מגבלות ופערים

### גישת קריאה ל-worktrees
ה-Grep tool חסום מסיבת הרשאה (`Permission to use Grep has been denied`) על
תיקיות מחוץ ל-worktree הנוכחי. לכן הסריקה האוטומטית בוצעה רק על ה-worktree הזה,
שהוא ריק. הסקריפט `scripts/scan-vat.sh` יעבוד מיד שתינתן גישה - אין צורך בשינוי קוד.

**הצעת המשך**:
- להריץ ידנית: `bash scripts/scan-vat.sh /c/Users/user/.claude/worktrees > scan.log`
- או: לתת לסוכן הרשאה לסריקה כללית של תיקיית `worktrees`

### 25 מודולים + sealing/INT
המשימה ציינה רשימה ספציפית של 35 worktrees. רשימת ה-worktrees הקיימת מכילה 213
תיקיות במוסכמת שמות `agent-XXXXX` בלי מטא-דאטה שמזהה איזה מהם הם המודולים הספציפיים.
על-מנת לבצע סינון מדויק לפי הרשימה הזו, נדרשת מפת `agent-id → module-name`
שאינה זמינה ב-context הנוכחי.

## 6. הוראות יישום

### שלב א' - דריסת הקוד הקיים
1. בכל worktree, התקן: `npm install @syncup/vat-engine` (לאחר פרסום) או
   `npm install file:../../packages/vat-engine` (monorepo).
2. החלף כל מופע של:
   ```ts
   const vat = price * 0.17;            // ❌
   ```
   ב-:
   ```ts
   import { calcVATAmount } from '@syncup/vat-engine';
   const vat = calcVATAmount(price, invoiceDate); // ✅
   ```
3. הסר קבועים `VAT_RATE = 17` והעבר את הקוראים אליהם דרך `getVATPercent()`.

### שלב ב' - מיגרציית DB
1. **גבה את ה-DB**: `pg_dump -F c db_name > pre_vat.dump`
2. בצע dry-run: הרץ רק את ה-DO block בסעיף 0 של ה-SQL לראות היקף.
3. הרץ את הסקריפט המלא: `psql -d db -f migrations/vat-migration.sql`
4. אמת: השווה סיכומים בין `vat_migration_backup_invoice` ל-`Invoice`.

### שלב ג' - מיגרציית אצווה ברמת אפליקציה (אופציונלי)
אם יש לוגיקה עסקית נוספת (למשל invoices מצומדות בPDF):
```ts
import { recomputeBatch } from '@syncup/vat-engine';

const openInvoices = await db.invoice.findMany({
  where: { status: 'open', invoiceDate: { gte: '2025-01-01' }, vatRate: 0.17 },
  include: { lines: true },
});
const { invoices: updated, summary } = recomputeBatch(openInvoices);
console.log(`שונו ${summary.changed} חשבוניות, delta VAT = ${summary.vatDelta} ₪`);
await Promise.all(updated.map(inv => db.invoice.update({ where: { id: inv.id }, data: inv })));
```

### שלב ד' - validation לאחר deploy
- בדוק שחשבונית חדשה שנוצרת היום (אחרי 1/1/2025) קיבלה 0.18
- בדוק שחשבונית מ-2024 לא השתנתה
- בדוק שהמסך "סה"כ לתשלום" מציג מספרים מעודכנים

## 7. סיכון ובלמים

| סיכון | חומרה | בלם |
|--------|--------|------|
| double-migration (כפל עדכון) | נמוך | התנאי `vatRate = 0.17` במגרציה מבטיח idempotency |
| חשבוניות שכבר נשלחו ללקוח | בינוני | סטטוס `closed/paid` לא נוגעים; דורש בדיקה ידנית של `open` שנשלחו ידנית |
| הבדלי עיגול בין הקוד ל-DB | נמוך | שני הצדדים מעגלים ל-2 ספרות עם הוספת EPSILON |
| Tenants עם תאריך מעבר אחר | נמוך | `configureVATSchedule(tenantId, ...)` |
| Cache של חישובים | בינוני | יש לפנות cache (Redis/CDN) לאחר ה-migration |

## 8. נספחים

### A. קבצים שנוצרו במסגרת המשימה
```
scripts/scan-vat.sh
packages/vat-engine/package.json
packages/vat-engine/tsconfig.json
packages/vat-engine/src/index.ts
packages/vat-engine/src/vatRate.ts
packages/vat-engine/src/migrationHelper.ts
packages/vat-engine/src/tests/vatRate.test.ts
packages/vat-engine/src/tests/migrationHelper.test.ts
migrations/vat-migration.sql
patches/README.md
VAT-MIGRATION-REPORT.md
```

### B. צעדים עתידיים מומלצים
1. הגדרת eslint rule מותאם שמזהיר על שימוש בקבועים `0.17`/`0.18` מחוץ ל-`vat-engine`.
2. הוספת אזהרה ב-CI: `grep -RnE '\b0\.17\b' --include='*.ts' src/ && exit 1`.
3. תיעוד ב-CLAUDE.md של כל פרויקט: "השתמש תמיד ב-`@syncup/vat-engine`".
