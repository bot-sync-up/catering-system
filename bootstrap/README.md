<div dir="rtl">

# bootstrap/ — ערכת ההתקנה למונורפו F1

ערכת קבצים מבוססת-ניסוח שמטרתה: להפוך את F1 Master Merge (`agent-ae12d76f8b5390803`) למונורפו שמתקין נקי ב-`pnpm install` ועובד מקצה לקצה.

## תוכן

| קובץ | תפקיד |
|---|---|
| [INVENTORY.md](./INVENTORY.md) | מפת המבנה המלאה — 21 apps + 31 packages + 2 services |
| [CONFLICTS.md](./CONFLICTS.md) | כל הקונפליקטים שזיהיתי + פתרון מדויק לכל אחד |
| [INSTALL.md](./INSTALL.md) | מדריך התקנה צעד-צעד (RTL עברית) |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | באגים נפוצים + פתרונות |
| `config/package.json.fixed` | package.json ראשי עם overrides אחידים |
| `config/pnpm-workspace.yaml.fixed` | workspace declaration עם כל ה-nested apps |
| `config/tsconfig.base.json.fixed` | TypeScript paths שמתאימים לשמות החבילות האמיתיים |
| `config/.npmrc` | תצורת pnpm — auto-install-peers, strict=false, וכו' |
| `config/tests-package.json` | tests/package.json טמפלייט (כי המקור חסר) |
| `scripts/fix-all.sh` | מיישם את כל ה-fixes על monorepo אמיתי |
| `scripts/health-check.ts` | בדיקת בריאות מקיפה אחרי התקנה |

## שימוש מהיר

```bash
# 1. שכפל את ה-F1 monorepo (לא worktree זה)
git clone <f1-repo-url> catering-monorepo
cd catering-monorepo

# 2. הרץ את הסקריפט המתקן
chmod +x ../path/to/this/bootstrap/scripts/fix-all.sh
../path/to/this/bootstrap/scripts/fix-all.sh .

# 3. התקן
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 4. בדוק
pnpm bootstrap:health
```

ראה [INSTALL.md](./INSTALL.md) להוראות מלאות.

## מה הקבצים הללו עושים?

### package.json.fixed
מגדיר **pnpm.overrides** אחידים שכופים גרסה יחידה לכל המונורפו:
- React 19.0.0 (לכל ה-web/server)
- Next 15.1.3
- TypeScript 5.6.3
- Prisma 5.22.0
- zod 3.23.8
- bullmq 5.34.0
- date-fns 4.1.0
- tRPC 11.0.0-rc.648
- ועוד 8 חבילות

### pnpm-workspace.yaml.fixed
מצהיר על **34 workspace globs**, כולל nested apps (`expenses/backend`, `fleet/api`, `hr/server`, `marketing/server`, `menus/server`, ועוד 6) שהיו חבויים מ-pnpm במקור.

### tsconfig.base.json.fixed
מתקן **8 path aliases שבורים** (TS פנה ל-`@catering/db` כשבפועל החבילה היא `@aneh-hashoel/db`), ומוסיף 12 paths חדשים שחסרו.

### .npmrc
מאפשר התקנה במונורפו עם React 18 ו-19 בצדדים שונים בלי peer-conflict שיחסום install.

### fix-all.sh
8 שלבים:
1. גיבוי קבצים מקוריים
2. החלפת package.json/tsconfig/pnpm-workspace.yaml
3. הוספת .npmrc
4. יצירת tests/package.json
5. תיקון workspace dependencies (`*` → `workspace:*`)
6. המרת npm-workspaces ל-pnpm filter
7. אכיפת version pins על dependencies מובלעות
8. תיקון peerDependencies של חבילות UI

### health-check.ts
בודק 7 שכבות בריאות אחרי התקנה:
1. Workspace integrity (אין `*` deps שנותרו)
2. Prisma client generated
3. Postgres connect + migrations
4. Redis ping
5. HTTP /health של כל app
6. Smoke test (יצירה+שליפה של לקוח)

</div>
