<div dir="rtl" lang="he">

# מדריך תרומה ופיתוח

תודה שאתה רוצה לתרום למערכת ניהול הקייטרינג! המסמך הזה מכוון איך להקים סביבת פיתוח, איך לכתוב קוד, ואיך להגיש PR.

---

## 1. הקמת סביבת פיתוח

```bash
git clone https://github.com/bot-sync-up/catering.git
cd catering
bash release-bundle/install-local.sh
```

זה ישבט את הקוד, יקים את כל ה-services (Postgres, Redis), ויפעיל את ה-dev server.

### תצורת IDE מומלצת

* **VS Code** + Extensions: ESLint, Prettier, Tailwind CSS IntelliSense, GitLens
* **Cursor** / **JetBrains WebStorm** — נתמכים

### Pre-commit hooks

```bash
pnpm run prepare  # מתקין את husky
```

הוקים שמופעלים בכל commit:

* `lint-staged` (ESLint + Prettier על קבצים שהשתנו)
* בדיקת `tsc --noEmit`
* בדיקת secrets לא מקודדים

---

## 2. מבנה הריפו

```
catering/
├── apps/
│   ├── web/           # Next.js frontend
│   ├── api/           # NestJS / Fastify backend
│   └── worker/        # Background jobs (BullMQ)
├── packages/
│   ├── db/            # Prisma schema + migrations
│   ├── ui/            # רכיבי UI משותפים
│   └── shared/        # types + utils
├── bootstrap/         # סקריפטי setup ראשוני
├── patches-apply/     # patches מותאמים אישית
├── release-bundle/    # חבילת ההתקנה (זה!)
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── ...
```

---

## 3. תהליך עבודה (workflow)

### ענפים

* `main` — production. תמיד stable. רק PRs ממוזגים אליו.
* `develop` — אינטגרציה. כאן יושבת הגרסה הבאה.
* `feat/<short-name>` — feature חדש
* `fix/<short-name>` — bug fix
* `chore/<short-name>` — תחזוקה (deps, refactor)

### יצירת branch ו-PR

```bash
git checkout develop && git pull
git checkout -b feat/order-bulk-actions
# ... ערוך והרץ בדיקות ...
git commit -m "feat(orders): bulk-actions on order list"
git push -u origin feat/order-bulk-actions
gh pr create --base develop
```

### Commit messages — Conventional Commits

```
<type>(<scope>): <short summary>

<body>

<footer with BREAKING CHANGE / refs / issues>
```

**Types נתמכים**: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `build`, `ci`, `revert`.

דוגמאות:
* `feat(invoices): add monthly PDF export`
* `fix(auth): prevent token leak in client bundle`
* `chore(deps): bump prisma to 5.18`

---

## 4. כללי קוד

### TypeScript

* `strict: true` — אסור `any` לא מוצדק
* `noUncheckedIndexedAccess: true`
* טיפוסים משותפים ב-`packages/shared/types/`

### React / Next.js

* Server Components בברירת מחדל; client רק בעת הצורך
* טפסים — `react-hook-form` + `zod`
* state גלובלי — `zustand` (לא Redux)

### Backend

* Validation עם `zod` בקצוות (controllers / DTOs)
* טרנזקציות — `prisma.$transaction()`
* כל endpoint חדש — צריך OpenAPI schema

### Style

* Prettier (קיים בקונפיג)
* ESLint עם `--max-warnings 0` ב-CI
* Tailwind בלבד — לא CSS מודולים חדשים

---

## 5. בדיקות

### הרצה מקומית

```bash
pnpm test                # unit
pnpm test:integration    # integration
pnpm test:e2e            # Playwright
pnpm test:watch
```

### כיסוי

יעד: **80%+ statements** בקוד החדש.

```bash
pnpm test --coverage
```

### Test fixtures

* DB seed לבדיקות: `packages/db/seed-test.ts`
* mocks ל-SMTP / SMS: `packages/shared/test-utils/`

---

## 6. תיעוד

### כשאתה מוסיף feature

* עדכן את `docs/features/<area>.md`
* אם זה משנה API — עדכן `apps/api/openapi.yaml`
* אם זה משפיע על התקנה — עדכן `release-bundle/INSTALL.md`

### תיעוד עברית מול אנגלית

* **תיעוד למשתמש סופי** — עברית RTL
* **תיעוד למפתחים** — אנגלית (אלא אם זה המסמך הזה)
* **commit messages** — אנגלית

---

## 7. דיווח על באג / בקשת פיצ'ר

* באג → פתח issue עם תבנית "Bug report" (`.github/ISSUE_TEMPLATE/bug.yml`)
* פיצ'ר → תבנית "Feature request"

מינימום שצריך:
* גרסה (`git rev-parse HEAD`)
* OS + Node + pnpm version
* צעדים לשחזור
* התנהגות צפויה ובפועל
* לוגים (חתוכים מסודות)

---

## 8. בדיקת אבטחה לפני merge

* [ ] אין secrets בקוד
* [ ] אין `console.log` של נתוני משתמש
* [ ] קלט מתאומת ב-zod / validator
* [ ] queries מוגנים מ-SQL injection (ORM בלבד)
* [ ] תלויות חדשות — `pnpm audit` נקי

---

## 9. שחרור (לתחזוקת ליבה בלבד)

תהליך השחרור מאוטומט דרך GitHub Actions:

1. PR לתוך `develop` ממוזג
2. כשמוכנים — PR מ-`develop` לתוך `main`
3. אחרי merge: tag `vX.Y.Z` נוצר אוטומטית
4. Action בונה image ל-GHCR ומפרסם release notes

---

## 10. צוות

* **משה דושינסקי** — Lead, ארכיטקטורה (<moshe@syncup.co.il>)
* **bot-sync-up** — Bot למיזוגים אוטומטיים

קוד התנהגות: <https://www.contributor-covenant.org/version/2/1/code_of_conduct/>

</div>
