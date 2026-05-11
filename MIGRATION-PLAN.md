# תוכנית מיגרציה — איחוד 25 worktrees למונורפו

> **מטרה:** לאחד 25 איים נפרדים (worktree-ים שעבדו אגנטים שונים) למונורפו pnpm + turbo
> אחיד עם DB משותף, auth משותף, ו-pipelines בנייה משותפים.
>
> **המסמך הזה אינו מבצע מיגרציה — הוא מסביר איך לבצע אותה.**

---

## עקרונות מנחים

1. **ללא איבוד היסטוריה** — שמירת `git log` של כל worktree באמצעות `git subtree add` או `git filter-repo`.
2. **שלב-שלב** — מטמיעים worktree אחד בכל פעם, בודקים build, ממשיכים.
3. **לא משברים את הראש בקונפליקטים סמנטיים** — הם **צפויים** (כל אגנט המציא מודלים של DB משלו). הפתרון: שכבת `packages/db` מאוחדת.
4. **תיעוד "מה הוחלף"** — אם 06-Orders המציא טבלה `customers` ו-05-CRM גם כן, מתעדים איזו גרסה נשארה.

---

## סדר המיזוג המומלץ

הסדר הזה ממזער קונפליקטים — קודם תשתית, אז מודלים משותפים, ואז apps.

### שלב 0 — הכנה (פעם אחת)

```bash
cd /c/Users/user/.claude/worktrees/agent-a58d6b3d689de6fbd
pnpm install                  # שלד ריק עם dev-deps בלבד
git status                    # להבטיח שאין שינויים לא commit-ed
```

### שלב 1 — תשתית ובסיס (01 → 02 → 03 → 04)

קריטי ראשון. שאר המודולים תלויים בזה.

| סדר | worktree              | יעד                              | פעולה                                                    |
|-----|-----------------------|----------------------------------|----------------------------------------------------------|
| 1   | 01 תשתית              | `docker/`, `services/gateway/`   | `bash scripts/import-worktrees.sh --apply 01`            |
| 2   | 02 DB                 | `packages/db/`                   | `bash scripts/import-worktrees.sh --apply 02`            |
| 3   | 03 Auth               | `packages/auth/`                 | `bash scripts/import-worktrees.sh --apply 03`            |
| 4   | 04 Audit              | `packages/audit/`                | `bash scripts/import-worktrees.sh --apply 04`            |

**אחרי כל שלב:**
```bash
pnpm install
pnpm --filter @catering/db typecheck
pnpm --filter @catering/db db:generate
git add -A && git commit -m "feat(monorepo): import worktree XX"
```

### שלב 2 — אינטגרציות חיצוניות (18, 19, 23-partial)

לא תלויות ב-apps. מתחילים מהן כדי שיהיו זמינות מוקדם.

| 5 | 18 iCount        | `packages/integrations/icount/`   | `--apply 18` |
| 6 | 19 Cardcom       | `packages/integrations/cardcom/`  | `--apply 19` |
| 7 | 23-email/sms/wa  | `packages/integrations/{email,sms,whatsapp}/` | `--apply 23` (ירוץ רק על תתי-נתיבים 23b/c/d) |

### שלב 3 — Apps פנימיים (תלויים ב-packages)

קוד עסקי. סדר לפי תלות שכיחה:

| 8  | 11 Suppliers     | `apps/suppliers`     | `--apply 11` |
| 9  | 10 Inventory     | `apps/inventory`     | `--apply 10` |
| 10 | 09 Recipes       | `apps/recipes`       | `--apply 09` |
| 11 | 08 Menus         | `apps/menus`         | `--apply 08` |
| 12 | 05 CRM           | `apps/crm`           | `--apply 05` |
| 13 | 06 Orders        | `apps/orders`        | `--apply 06` |
| 14 | 13 Events        | `apps/events`        | `--apply 13` |
| 15 | 14 Logistics     | `apps/logistics`     | `--apply 14` |
| 16 | 12 OCR           | `apps/ocr` + `services/worker/ocr` | `--apply 12` |
| 17 | 15 HR            | `apps/hr`            | `--apply 15` |
| 18 | 16 Payroll       | `apps/payroll`       | `--apply 16` |
| 19 | 17 Invoices      | `apps/invoices`      | `--apply 17` |
| 20 | 20 Expenses      | `apps/expenses`      | `--apply 20` |
| 21 | 21 Fleet         | `apps/fleet`         | `--apply 21` |
| 22 | 22 BI            | `apps/bi` + `services/worker/bi` | `--apply 22` |
| 23 | 23 Marketing     | `apps/marketing`     | `--apply 23` (חלק 23a — ה-app) |
| 24 | 07 Portal        | `apps/web-portal`    | `--apply 07` |
| 25 | 24 Public Site   | `apps/public-site`   | `--apply 24` |
| 26 | 25 Mobile        | `apps/mobile`        | `--apply 25` |

---

## פתרון קונפליקטים — לכל worktree

### 01 תשתית
- **קונפליקט צפוי:** למונורפו השלד כבר יש `package.json`, `pnpm-workspace.yaml`, `turbo.json`.
- **פתרון:** דורסים **לא** את הגרסה החדשה. מ-01 לוקחים רק `docker/`, `nginx.conf`, ו-`scripts/` (שיועברו ל-`scripts/_imported/01-infra/`).
- **בדיקה:** `docker compose config`.

### 02 DB
- **קונפליקט צפוי:** ה-`schema.prisma` של 02 הוא המקור-של-אמת אבל apps אחרים (05, 06, 09, וכו') הכניסו לו שדות.
- **פתרון:** קומיט 02 כפי שהוא. כל worktree עוקב — אם יש `prisma/schema.prisma` משלו, **מזגים ידנית** את ה-models אל תוך `packages/db/prisma/schema.prisma` (לא דורסים).
- **כלל אצבע:** המודל שהוגדר ראשון (02) זוכה. apps רק מוסיפים שדות חדשים. סכסוכים — חיווי בלוג.
- **בדיקה:** `pnpm --filter @catering/db prisma validate`.

### 03 Auth / 04 Audit
- **בעיות צפויות:** ייתכן שכמה apps כתבו middleware משלהם. צריך להוציא לוואקום ולהשתמש ב-`@catering/auth/middleware`.
- **פתרון אחרי המיזוג של כל ה-apps:** עבור על כל `apps/*/middleware.ts` ובדוק שכולם מייבאים מ-`@catering/auth`.

### 05 CRM ↔ 06 Orders
- **קונפליקט קלאסי:** שניהם הגדירו `Customer`. החליטו שה-`Customer` המוסמך נמצא ב-05 CRM, ו-06 Orders מצמיד `customerId` בלבד.
- **פעולה בקוד:** ב-`packages/db/prisma/schema.prisma` משאירים גרסה אחת. ב-`apps/orders` מסירים את ה-prisma model המקומי ומחליפים ב-`import { Customer } from '@catering/db'`.

### 07 Portal ↔ 24 Public Site
- **קונפליקט:** שניהם אתרים פונים-ללקוח. ה-Portal מאומת, ה-Public Site אנונימי.
- **פתרון:** הם נשארים נפרדים. רכיבי UI משותפים → `packages/ui`.

### 08 Menus ↔ 09 Recipes
- **קונפליקט:** ל-Menu יש items, ל-Recipe יש ingredients. הסכמה צריכה להבדיל ביניהם.
- **פעולה:** ב-`packages/db`: `MenuItem` (פריט תפריט) ≠ `Recipe` (מתכון). MenuItem יכול להפנות ל-Recipe.

### 10 Inventory ↔ 11 Suppliers ↔ 12 OCR
- **קונפליקט שכיח:** "מי הבעלים של InvoiceLine?". 12 OCR מחלץ → 17 Invoices מאחסן → 10 Inventory מעדכן כמויות.
- **פעולה:** הפרדה ברורה: 12 כותב ל-`packages/db` בלבד דרך service של 17. 10 מאזין דרך event/queue.
- **תור משותף:** `packages/queue` עם queue בשם `invoice.processed`.

### 13 Events ↔ 14 Logistics ↔ 21 Fleet
- **שלושתם נוגעים ב-DeliveryRoute.** המודל יושב ב-`packages/db`. 21 Fleet מנהל את הרכבים, 14 Logistics את המסלולים, 13 Events צורך.

### 15 HR ↔ 16 Payroll
- **תלות חזקה** — Payroll צורך Employee מ-HR. השאר את `Employee` ב-`packages/db` והפנה אליו מ-Payroll.

### 17 Invoices ↔ 18 iCount ↔ 19 Cardcom
- **17 הוא המקור.** 18 = ייצוא חשבוניות לרשות המסים. 19 = סליקה. שניהם adapters תחת `packages/integrations/*`.
- **17 בודק** ש-`@catering/integrations-icount` ו-`-cardcom` נשארים stateless.

### 20 Expenses ↔ 22 BI
- 20 כותב הוצאות. 22 קורא דוחות. אין כתיבה דו-כיוונית.

### 23 Marketing
- **3-ב-1:** ה-app עצמו + 3 אינטגרציות (email/sms/whatsapp). ה-script מפצל אותם.
- **בדיקה:** וודא שמסעי שיווק שולחים דרך `packages/queue` ולא חוסמים את ה-request.

### 25 Mobile (Expo)
- **בעיה צפויה:** Expo אינו עובד טוב עם monorepos ללא `metro.config.js` מיוחד.
- **פתרון:** ייבא את [Expo monorepo guide](https://docs.expo.dev/guides/monorepos/) — צריך `nodeModulesPaths` ו-`watchFolders` ב-metro.
- **בדיקה:** `pnpm --filter @catering/mobile start`.

---

## פקודות git לכל יבוא — שתי גישות

### גישה A — העתקה פשוטה (מומלצת, מהירה)

```bash
# בלי לשמור היסטוריה — פשוט מעתיקים קוד
bash scripts/import-worktrees.sh --apply 02
git add -A
git commit -m "feat(db): import worktree 02 (DB schema + client)"
```

### גישה B — שמירת היסטוריית commits (כשחשובה)

```bash
# 1. הוסף את ה-worktree כ-remote
git remote add wt-02 /c/Users/user/.claude/worktrees/agent-abcfc839a28d7b588
git fetch wt-02

# 2. השתמש ב-subtree כדי לייבא לתיקיה היעד (משמר היסטוריה)
git subtree add --prefix=packages/db wt-02 main --squash

# 3. אם צריך rewrite של נתיבים בתוך ה-history:
# pipx install git-filter-repo
# cd /tmp/wt-02-mirror && git filter-repo --to-subdirectory-filter packages/db
# ואז:
# git pull /tmp/wt-02-mirror main --allow-unrelated-histories

# 4. נקה
git remote remove wt-02
```

### גישה C — cherry-pick commits ספציפיים (נדיר)

רק אם רוצים רק חלק מהשינויים:

```bash
git remote add wt-06 /c/Users/user/.claude/worktrees/agent-a3864f31565b63390
git fetch wt-06
git log wt-06/main --oneline       # ראה commits
git cherry-pick <sha1> <sha2>      # קח רק רלוונטיים
```

---

## checklist אחרי כל יבוא

- [ ] `pnpm install` רץ ללא שגיאות
- [ ] `pnpm --filter <package> typecheck` עובר
- [ ] `pnpm --filter <package> test` עובר (אם יש)
- [ ] לא נשארו `node_modules`, `.next`, `.git` בתוך התיקיה היעד
- [ ] ה-`package.json` עודכן עם dependencies הנכונות (`@catering/*: workspace:*`)
- [ ] ה-`.env.example` עודכן אם יש משתנה חדש
- [ ] commit נפרד לכל worktree (להקלת bisect)

---

## סיכום בסוף

לאחר השלמת כל 25:

```bash
pnpm install
pnpm typecheck                  # כל ה-monorepo
pnpm build                      # כל ה-monorepo
pnpm test
docker compose up -d            # smoke test
```

לאחר מכן מתחילים שלב **refactor** — חילוץ קוד כפול ל-`packages/ui`, `packages/utils`,
איחוד schemas של Zod ב-`packages/contracts`, ועוד.
