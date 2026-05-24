<!--
מסמך זה הוא RTL עברית. רוב הלקוחות (GitHub, VSCode, ChatGPT/Claude) מציגים עברית בכיוון נכון אוטומטית.
-->

# הקמת סביבת פיתוח לוקאלית — קייטרינג טעימים / ענה את השואל

מדריך מלא להפעלת הסביבה על המחשב שלכם — מאפס ועד אפליקציה פועלת — בפחות מ-10 דקות.

> **TL;DR:**
> ```bash
> cd dev-bootstrap
> ./scripts/start-dev.sh
> pnpm dev
> ```

---

## תוכן עניינים

1. [דרישות מוקדמות](#1-דרישות-מוקדמות)
2. [pre-flight checks](#2-pre-flight-checks)
3. [התקנה — צעד אחר צעד](#3-התקנה--צעד-אחר-צעד)
4. [אימות שהכל עובד](#4-אימות-שהכל-עובד)
5. [שימוש יומיומי](#5-שימוש-יומיומי)
6. [Troubleshooting](#6-troubleshooting)
7. [מה הלאה — לקראת staging](#7-מה-הלאה--לקראת-staging)

---

## 1. דרישות מוקדמות

לפני שמתחילים — ודאו שכל אלה מותקנים:

| כלי              | גרסת מינימום | בדיקה                | התקנה                                        |
| ---------------- | ------------ | -------------------- | -------------------------------------------- |
| Node.js          | 22.x         | `node -v`            | https://nodejs.org/en/download               |
| pnpm             | 9.x          | `pnpm -v`            | `npm i -g pnpm@latest`                       |
| Docker Desktop   | 4.x          | `docker --version`   | https://www.docker.com/products/docker-desktop |
| Docker Compose v2| 2.x          | `docker compose version` | מגיע עם Docker Desktop                  |
| git              | 2.x          | `git --version`      | https://git-scm.com                          |

**משאבים מינימליים:**
- RAM: 8GB (מומלץ 16GB)
- שטח דיסק פנוי: 10GB
- מערכת הפעלה: Windows 10/11, macOS 12+, או Linux (Ubuntu 22.04+ מומלץ)

> **Windows:** השתמשו ב-**Git Bash** או ב-**WSL2** להרצת סקריפטי `.sh`. ב-PowerShell טהור הסקריפטים לא ירוצו.

---

## 2. pre-flight checks

יש סקריפט שבודק שהמערכת שלכם מוכנה:

```bash
./scripts/preflight.sh
```

הסקריפט יבדוק:
- גרסת Node ≥ 22
- גרסת pnpm ≥ 9
- ש-Docker מותקן ורץ
- שהפורטים 3000, 5432, 6379, 1025, 8025, 9000, 9001 פנויים
- שיש לפחות 4GB RAM ו-10GB דיסק פנוי

אם הסקריפט מסיים בהצלחה — אפשר להמשיך. אם לא — תקנו את הנקודות שצוינו וריצו שוב.

---

## 3. התקנה — צעד אחר צעד

### צעד 1 — clone הרפו

```bash
git clone https://github.com/sync-up/catering-taamim.git
cd catering-taamim
```

> **placeholder לצילום מסך:** `[screenshot: clone הרפו ב-terminal]`

### צעד 2 — העתיקו את ה-`.env`

```bash
cp dev-bootstrap/.env.dev.example .env
```

> סקריפט `start-dev.sh` יעשה את זה אוטומטית אם הקובץ לא קיים.

### צעד 3 — הריצו את ה-bootstrap

מתיקיית `dev-bootstrap/`:

```bash
cd dev-bootstrap
./scripts/start-dev.sh
```

הסקריפט יבצע:

1. הרצת `preflight.sh` (אם כל הבדיקות עוברות, ממשיך)
2. הרמת **Postgres + Redis + MailHog + MinIO** דרך Docker Compose
3. המתנה ש-Postgres ו-Redis יהיו זמינים (עד 60 שניות)
4. `pnpm install` בשורש המונורפו
5. `pnpm db:generate` (Prisma client)
6. `pnpm db:migrate` (יצירת/עדכון schema)
7. `pnpm db:seed -- --tenant=demo --scale=small`

זמן הרצה משוער: **3–5 דקות** בפעם הראשונה (image pulls), **30 שניות** בפעמים הבאות.

> **placeholder לצילום מסך:** `[screenshot: start-dev.sh בריצה מלאה עם ✓ ירוקים]`

### צעד 4 — הפעילו את האפליקציה

```bash
pnpm dev
```

האפליקציה תהיה זמינה ב-[http://localhost:3000](http://localhost:3000).

---

## 4. אימות שהכל עובד

הריצו את סקריפט האימות:

```bash
./scripts/verify-dev.sh
```

הוא בודק:

| בדיקה                          | מה זה אומר                          |
| ------------------------------ | ----------------------------------- |
| ✓ Postgres `pg_isready`        | המסד עלה                            |
| ✓ Postgres `SELECT 1`          | מקבל חיבורים                        |
| ✓ Extensions טעונים            | uuid-ossp, pgcrypto, pg_trgm, וכו'  |
| ✓ catering_test, catering_shadow | מסדים נוספים נוצרו                |
| ✓ Redis PING                   | זיכרון מטמון פעיל                   |
| ✓ Redis SET/GET                | round-trip עובד                     |
| ✓ MailHog API                  | פורט 8025 משיב                      |
| ✓ MinIO live                   | אובייקט-סטור זמין                   |
| ✓ Prisma query                 | Prisma client מחובר                 |
| ✓ INSERT + SELECT              | flow מקצה-לקצה עובד                 |

אם הכל ירוק — **הסביבה תקינה ומוכנה.**

> **placeholder לצילום מסך:** `[screenshot: verify-dev.sh עם כל ה-✓ ירוקים]`

### גישה לכלי ניהול

| שירות      | כתובת                                 | פרטי כניסה                                  |
| ---------- | ------------------------------------- | ------------------------------------------- |
| אפליקציה    | http://localhost:3000                 | demo@taamim.test / `demo1234`               |
| MailHog UI | http://localhost:8025                 | (ללא סיסמה)                                 |
| MinIO console | http://localhost:9001              | catering / `dev_password_change_in_prod`    |
| Postgres   | postgresql://localhost:5432/catering_dev | catering / `dev_password_change_in_prod`  |
| Redis      | redis://localhost:6379                | (ללא סיסמה)                                 |

---

## 5. שימוש יומיומי

### עצירה (בלי למחוק נתונים)

```bash
./scripts/stop-dev.sh
```

הקונטיינרים נעצרים, ה-volumes נשארים. כשתפעילו שוב — הנתונים יחזרו.

### איפוס מלא (מוחק את כל המסד!)

```bash
./scripts/reset-dev.sh
```

ידרוש מכם להקליד `RESET` כדי לאשר. לאחר מכן ריצו שוב `./scripts/start-dev.sh`.

### זריעה בלבד (בלי לגעת ב-Docker)

```bash
./scripts/seed-demo.sh --scale=medium
```

ערכי `--scale`:
- `small` — ~50 משתמשים, ~100 הזמנות (פיתוח רגיל)
- `medium` — ~500 משתמשים, ~2,000 הזמנות (בדיקות עומס קל)
- `large` — ~5,000 משתמשים, ~50,000 הזמנות (בדיקות ביצועים)

### בדיקה יומית של הסביבה

```bash
./scripts/verify-dev.sh
```

מומלץ להריץ אחרי `git pull` או החלפת branch.

### Migration חדש

```bash
pnpm --filter @aneh/db exec prisma migrate dev --name my_change
```

ה-shadow DB (`catering_shadow`) ישמש אוטומטית.

---

## 6. Troubleshooting

### Windows

**שגיאה:** `'.scripts/start-dev.sh' is not recognized`
- **סיבה:** אתם ב-PowerShell/cmd.
- **פתרון:** פתחו **Git Bash** (מגיע עם Git for Windows) או השתמשו ב-WSL2:
  ```bash
  wsl
  cd /mnt/c/Users/<you>/catering-taamim
  ./dev-bootstrap/scripts/start-dev.sh
  ```

**שגיאה:** `EACCES` / `Permission denied` על סקריפט
- **פתרון ב-WSL/Git Bash:**
  ```bash
  chmod +x dev-bootstrap/scripts/*.sh
  ```

**שגיאה:** `port is already allocated`
- **פתרון:** עצרו שירות מתחרה, או שנו את הפורט ב-`docker-compose.dev.yml`.
  ```powershell
  # מצא מי תופס פורט 5432
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5432).OwningProcess
  ```

### macOS

**שגיאה:** `Cannot connect to the Docker daemon`
- **פתרון:** ודאו ש-Docker Desktop רץ (אייקון בסרגל העליון).
- בדקו: `docker info`

**שגיאה:** `qemu: uncaught target signal 11` (Apple Silicon, M1/M2/M3)
- **פתרון:** ה-images שלנו תומכים ב-arm64. אם בכל זאת — נסו:
  ```bash
  export DOCKER_DEFAULT_PLATFORM=linux/amd64
  ./scripts/start-dev.sh
  ```

### Linux

**שגיאה:** `Got permission denied while trying to connect to the Docker daemon socket`
- **פתרון:** הוסיפו את עצמכם לקבוצת docker:
  ```bash
  sudo usermod -aG docker $USER
  newgrp docker
  ```

**שגיאה:** `pg_isready: command not found` בתוך הקונטיינר
- **לא אמור לקרות** — אנחנו משתמשים ב-postgres:16-alpine שכולל את זה. אם קורה: `docker compose -f docker/docker-compose.dev.yml pull`

### כל המערכות

**הסקריפט נתקע ב-"ממתין למסד הנתונים..."**
- בדקו לוגים: `docker logs catering_postgres`
- אם רואים `database "catering_dev" does not exist` — הריצו `./scripts/reset-dev.sh` (volume פגום).

**`pnpm db:migrate` נכשל עם `P1001: Can't reach database`**
- ודאו ש-Docker רץ: `docker ps | grep catering_postgres`
- ודאו ש-`.env` קיים ושה-`DATABASE_URL` נכון.
- נסו: `psql postgresql://catering:dev_password_change_in_prod@localhost:5432/catering_dev -c 'SELECT 1'`

**Prisma מתלונן על shadow database**
- ודאו ש-`SHADOW_DATABASE_URL` קיים ב-`.env`.
- ודאו שמסד `catering_shadow` קיים:
  ```bash
  docker exec catering_postgres psql -U catering -l | grep catering_shadow
  ```

**זריעה נכשלת באמצע**
- הריצו שוב: `./scripts/seed-demo.sh`. הסקריפט אידמפוטנטי.
- אם עדיין נכשל: `./scripts/reset-dev.sh` ואז `./scripts/start-dev.sh`.

---

## 7. מה הלאה — לקראת staging

הסביבה הלוקאלית מספיקה ל-90% מהפיתוח. כשמגיעים לשלב staging:

1. **`.env.staging`** — קובץ נפרד עם סודות אמיתיים (sandbox של ספקים).
2. **`docker-compose.prod.yml`** — קיים תחת `production-pack/docker/` עם:
   - Postgres עם WAL archiving
   - Redis עם persistence ו-password
   - Nginx + SSL
   - Prometheus + Grafana + Loki לתצפיתיות
3. **CI/CD** — workflow ב-`.github/workflows/deploy.yml` מקים את כל הסטאק על VPS.
4. **גיבויים** — `scripts/backup-db.sh` יומי, העלאה ל-R2.
5. **טסטים אוטומטיים** — `pnpm test` מריץ vitest כנגד `catering_test`.

הקובץ הזה (`BOOTSTRAP-README.md`) דן רק בפיתוח לוקאלי. ל-staging/production ראו `production-pack/README.md`.

---

## הערות אבטחה

- **כל הסיסמאות בקבצים אלו (כולל `dev_password_change_in_prod`) הן לדמו בלבד.**
- **לעולם אל תשתמשו ב-`.env.dev.example` או ב-`init.sql` בייצור.**
- ב-`.env.dev.example` ה-`JWT_SECRET` הוא מחרוזת ידועה — לא להעתיק לפרוד.
- MinIO/MailHog פתוחים ללא TLS וללא auth (פרט ל-MinIO root) — רק לפיתוח לוקאלי.

---

נתקלתם בבעיה שלא במדריך? פתחו issue ב-GitHub עם:
1. פלט מלא של `./scripts/verify-dev.sh`
2. מערכת הפעלה + גרסת Docker
3. הצעדים שהובילו לבעיה
