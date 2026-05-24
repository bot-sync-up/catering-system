<div dir="rtl">

# מדריך Deployment — Pipeline צעד־צעד

מסמך זה מפרט כל שלב ב-pipeline של פריסה ל-staging, כולל קלטים, פלטים,
ובדיקות בכל שלב. שימושי כשמדבגים תקלה בשלב ספציפי.

---

## תרשים ה-pipeline

```
┌─────────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐
│ Git push    │───▶│ Build &  │───▶│ Push    │───▶│ Sync env │───▶│ Compose │───▶│ Migrate  │
│ (branch=    │    │ test     │    │ images  │    │ + cfg    │    │ pull+up │    │ + smoke  │
│  staging)   │    │          │    │ (GHCR)  │    │ (SCP)    │    │ (SSH)   │    │          │
└─────────────┘    └──────────┘    └─────────┘    └──────────┘    └─────────┘    └────┬─────┘
                                                                                      │
                                                                                      ▼
                                                                                ┌──────────┐
                                                                                │ Notify   │
                                                                                │ Slack    │
                                                                                └──────────┘
```

---

## שלב 1 — Trigger

**מקור:** push ל-`staging` branch או `gh workflow run staging-deploy.yml`.

**קלטים:**
- `inputs.tag` (אופציונלי) — Git SHA / tag ספציפי. ברירת מחדל: `HEAD::7`.
- `inputs.skip_tests` (boolean) — דילוג על smoke.

**concurrency:** `staging-deploy` עם `cancel-in-progress: false` — דחיסת
פריסות מקבילות.

---

## שלב 2 — Build & Push

מתבצע במטריצה: `[api, portal, admin, worker]`.

**שלבים פנימיים:**

1. `actions/checkout@v4` — ביטול cache בכל פעם, אבל buildx משתמש ב-GHA cache.
2. `docker/setup-buildx-action@v3`.
3. `docker/login-action@v3` ל-GHCR עם `GITHUB_TOKEN`.
4. `docker/build-push-action@v6`:
   - `context: services/<svc>`
   - `cache-from/to: type=gha,scope=<svc>` — מאיץ ~5x.
   - `build-args: GIT_SHA=<tag>` — מוטמע ב-`/health`.
   - tags: `:<sha>` + `:staging`.

**בדיקה ידנית בכשל:**

```bash
docker buildx build -f services/api/Dockerfile services/api --load -t test-api
docker run --rm test-api node -e "console.log(process.env.GIT_SHA)"
```

---

## שלב 3 — Render `.env.staging`

ה-CI ממיר את `.env.staging.example` ל-`.env.staging` בעזרת sed:

```bash
sed -i "s|SECRETS_PLACEHOLDER_DB_URL|${{ secrets.STAGING_DB_URL }}|g" ...
```

**שגיאות נפוצות:**

- secret חסר בריפוזיטורי → ערך ריק → התקלה תוצף בזמן ריצה. הוסיפו `set -e`
  ו-`grep -v PLACEHOLDER` כבדיקת sanity.
- מפתחות עם תווים מיוחדים (`/`, `&`) — sed יקרוס. השתמשו ב-`|` כמפריד.

---

## שלב 4 — SCP של compose + env

```bash
scp docker-compose.staging.yml deploy@host:/opt/catering-staging/docker-compose.yml
scp .env.staging                deploy@host:/opt/catering-staging/.env
```

**הרשאות:**

- המפתח ב-`STAGING_SSH_KEY` אמור להיות עם הרשאה `0600`.
- המשתמש `deploy` חייב להיות ב-`docker` group.

---

## שלב 5 — Pull + Up

```bash
ssh deploy@host "cd /opt/catering-staging && \
  export TAG=<tag> && \
  docker compose pull && \
  docker compose up -d --remove-orphans"
```

**מה זה עושה:**

- מושך images חדשים מ-GHCR.
- מבצע recreate חכם של containers ששינו את ה-image.
- שומר רשת `staging_net` ו-volumes (Postgres data, Redis snapshot).
- `--remove-orphans` מוחק שירותים שירדו מ-compose.

**בדיקת בריאות:**

ה-`healthcheck` ב-`docker-compose.staging.yml` ירוץ אוטומטית; שירות נחשב
"unhealthy" אחרי 3 כשלונות → `docker compose ps` יראה את הסטטוס.

---

## שלב 6 — Migrations

```bash
docker compose run --rm api npm run migrate:up
```

**אסטרטגיה:**

- migrations צריכות להיות **idempotent** ולעבוד גם על schema קיימת.
- שינויי schema "destructive" (DROP COLUMN) — דרך 2 פריסות:
  1. פריסה 1: הקוד מתעלם מהעמודה אבל היא קיימת.
  2. פריסה 2: DROP COLUMN.

**במקרה כשל:**

- ה-pipeline מסיים ב-`exit 1`.
- אין rollback אוטומטי של schema — צריך לרוץ `rollback-staging.sh`
  ולהריץ `migrate:down` ידנית אם יש.

---

## שלב 7 — Smoke tests

`scripts/smoke-test.sh` מבצע 5 בדיקות (health, login, create-order,
payment, cleanup). הסקריפט מחזיר `exit 0/1`.

**הגדלת כיסוי:** הוסיפו בדיקות ל-`smoke-test.sh` תוך שמירה על זמן ריצה
מתחת ל-30 שניות.

---

## שלב 8 — Notify Slack

על הצלחה: הודעה ל-`#staging-deploys`.
על כשל: הודעה ב-`#staging-alerts` + לינק לרץ של Actions.

הוספת fields:

```bash
curl -X POST -H 'Content-Type: application/json' \
  --data "{
    \"text\":\":white_check_mark: deploy ${TAG}\",
    \"blocks\":[{
      \"type\":\"section\",
      \"fields\":[
        {\"type\":\"mrkdwn\",\"text\":\"*Tag:* ${TAG}\"},
        {\"type\":\"mrkdwn\",\"text\":\"*By:* ${GITHUB_ACTOR}\"}
      ]
    }]
  }" \
  "${SLACK_WEBHOOK_URL}"
```

---

## זמני הרצה טיפוסיים

| שלב            | זמן       |
|----------------|-----------|
| Build (cached) | ~90s לכל שירות במקביל |
| Push           | ~20s לכל שירות |
| SCP            | ~3s       |
| Compose up     | ~15s      |
| Migrations     | ~5-30s    |
| Smoke          | ~12s      |
| **סה״כ**       | **~3-4 דק׳** |

---

## נספח — Pipeline ידני בלי CI

אם CI מושבת או יש צורך בדחיפות:

```bash
export STAGING_HOST=... STAGING_USER=deploy STAGING_SSH_KEY=~/.ssh/id_ed25519
export REGISTRY=ghcr.io/<org>/catering SLACK_WEBHOOK_URL=...

git checkout staging
git pull
./scripts/deploy-staging.sh
```

לפריסת hot-fix מהיר ללא בדיקות (לא מומלץ אבל אפשרי):

```bash
./scripts/deploy-staging.sh --skip-tests
```

</div>
