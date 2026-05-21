<div dir="rtl">

# מדריך התקנה — F1 Master Merge

מדריך התקנה צעד-צעד למונורפו המאוחד. כל שלב נבדק. אם נכשל — ראה [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

---

## דרישות מקדימות

| כלי | גרסה מינימלית | בדיקה |
|---|---|---|
| Node.js | 20.10.0 | `node -v` |
| pnpm | 9.0.0 | `pnpm -v` |
| Docker | 24+ | `docker -v` |
| Docker Compose | v2 (plugin) | `docker compose version` |
| Git | 2.40+ | `git -v` |
| Postgres CLI (אופציונלי) | 16 | `psql --version` |

הערה ל-Windows: השתמש ב-**Git Bash** או **WSL2**. PowerShell יעבוד עבור pnpm אבל לא עבור הסקריפט `fix-all.sh`.

---

## 1. שכפול הריפו

```bash
git clone <repo-url> catering-monorepo
cd catering-monorepo
```

---

## 2. הרצת הסקריפט המתקן

```bash
chmod +x bootstrap/scripts/fix-all.sh
./bootstrap/scripts/fix-all.sh .
```

הסקריפט:
1. מגבה את הקבצים המקוריים ל-`.bootstrap-backup-<timestamp>/`
2. מחליף את `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
3. מוסיף `.npmrc` אופטימלי
4. יוצר `tests/package.json` אם חסר
5. ממיר `"*"` deps ל-`workspace:*`
6. ממיר sub-package scripts מ-npm ל-pnpm
7. מסיר `"workspaces"` field מ-sub-package.json
8. אוכף גרסאות אחידות בכל ה-monorepo

> **חשוב**: אם הקובץ נכשל, בדוק שאתה במקום הנכון (`pwd` מחזיר את שורש המונורפו).

---

## 3. ניקוי + התקנה

```bash
# ניקוי מה-state הישן (אם קיים)
rm -rf node_modules pnpm-lock.yaml
find apps packages services -name node_modules -type d -prune -exec rm -rf {} +
find apps packages services -name .next -type d -prune -exec rm -rf {} +
find apps packages services -name dist -type d -prune -exec rm -rf {} +

# התקנה
pnpm install
```

> **ציפייה**: יידרשו ~3 איטרציות:
> - איטרציה 1: התקנה מלאה. ייתכן `ERR_PNPM_PEER_DEP_ISSUES` — תמשיך, ה-`.npmrc` הגדיר `strict-peer-dependencies=false`.
> - איטרציה 2: אחרי כל fix של באג שצץ, הרץ שוב.
> - איטרציה 3: clean install סופי.

---

## 4. הגדרת ENV

```bash
cp .env.example .env
# (אם אין .env.example — צור ידנית לפי הטמפלייט למטה)
```

טמפלייט `.env` מינימלי:

```bash
# ── Database ──
DATABASE_URL=postgresql://catering:catering@localhost:5432/catering_dev?schema=public

# ── Redis ──
REDIS_URL=redis://localhost:6379

# ── Auth ──
JWT_SECRET=__CHANGE_ME__min_32_chars_random__
JWT_REFRESH_SECRET=__CHANGE_ME__min_32_chars_random__
SESSION_SECRET=__CHANGE_ME__min_32_chars__

# ── External Services ──
CARDCOM_TERMINAL_NUMBER=
CARDCOM_USERNAME=
CARDCOM_PASSWORD=
ICOUNT_CID=
ICOUNT_USER=
ICOUNT_PASS=
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

# ── AWS / R2 ──
AWS_REGION=eu-west-1
S3_BUCKET=catering-uploads
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# ── Anthropic (OCR) ──
ANTHROPIC_API_KEY=

# ── Node Env ──
NODE_ENV=development
LOG_LEVEL=debug
```

---

## 5. הרצת Docker (Postgres + Redis)

```bash
docker compose -f deployment/docker/docker-compose.yml up -d postgres redis
```

המתן 5-10 שניות שה-Postgres יעלה לחלוטין:

```bash
docker compose -f deployment/docker/docker-compose.yml logs -f postgres
# המתן ל-"database system is ready to accept connections"
```

---

## 6. Prisma generate

```bash
pnpm db:generate
```

> אם נכשל עם "binary engine missing" — ראה TROUBLESHOOTING סעיף 2.

---

## 7. Prisma migrate

```bash
pnpm db:migrate
```

> פעם ראשונה תיווצר migration היסטוריה ריקה. אם יש שגיאה על schemas מרובים — ראה TROUBLESHOOTING סעיף 4.

---

## 8. Prisma seed

```bash
pnpm db:seed
```

הסיד יצור: tenant ברירת-מחדל, משתמש admin, 3 לקוחות לדוגמה, 5 מוצרים, 2 הזמנות.

---

## 9. הרצת dev mode

```bash
pnpm dev
```

זה ירוץ את כל ה-apps במקביל דרך turbo. הפורטים:

| App | Port |
|---|---|
| `apps/web` | 3000 |
| `apps/crm` | 3001 |
| `apps/customer-portal` | 3002 |
| `apps/bi` | 3003 |
| `apps/orders` | 3004 |
| `apps/recipes` | 3005 |
| `apps/public-site` | 3006 |
| `apps/aneh-web` | 3007 |
| `services/orchestrator` | 4000 |
| `services/ocr-api` | 4001 |
| `packages/audit` | 4002 |
| `apps/invoices` | 4003 |

> אם פורט תפוס — ערוך את הסקריפט `dev` ב-package.json של ה-app הספציפי, או הגדר `PORT=` ב-`.env`.

---

## 10. פתח את ה-Web

פתח דפדפן ל:

- **http://localhost:3000** — Web (Aneh Hashoel)
- **http://localhost:3001** — CRM
- **http://localhost:3002** — Customer Portal
- **http://localhost:3006** — Public Site (שיווק)

התחבר כ-admin:
- email: `admin@catering.local`
- password: `Admin123!`

---

## 11. בדיקת בריאות

```bash
pnpm bootstrap:health
```

הבדיקה מאמתת:
- ✅ Postgres מחובר + migrations רצו
- ✅ Redis מחובר ועונה ל-ping
- ✅ Prisma client generated
- ✅ כל ה-/health endpoints מחזירים 200
- ✅ Smoke test: יצירה+שליפה של לקוח (אם `SMOKE=1`)

> **טיפ**: הוסף `SMOKE=1 pnpm bootstrap:health` לאחר השלב הראשון.

---

## איפה הקבצים המקוריים?

הם בגיבוי תחת `.bootstrap-backup-<timestamp>/`. אם משהו השתבש קשה:

```bash
ls .bootstrap-backup-*
# חזור לקובץ הרצוי:
cp .bootstrap-backup-20250521-141500/package.json ./package.json
```

---

## מה הלאה?

- אם נכשל: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- אם הצלחת: עדכן secrets אמיתיים ב-`.env` והרץ בסביבת staging.

</div>
