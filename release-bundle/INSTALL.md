<div dir="rtl" lang="he">

# מערכת ניהול קייטרינג — מדריך התקנה מהיר

> גרסה **v0.1.0** · עודכן 2026-05-21

ברוכים הבאים! המדריך הזה ילווה אתכם בהתקנה של מערכת ניהול הקייטרינג בשתי דרכים: התקנה מקומית למפתחים (5 דקות) או התקנה מלאה על שרת VPS (15 דקות).

---

## תוכן עניינים

1. [התקנה מקומית (Linux / Mac)](#-התקנה-מקומית-linux--mac)
2. [התקנה מקומית (Windows)](#%EF%B8%8F-התקנה-מקומית-windows)
3. [התקנה על VPS](#-התקנה-על-vps-ubuntu-2404)
4. [פעולות יום-יום](#-פעולות-יום-יום)
5. [גיבוי ושחזור](#-גיבוי-ושחזור)
6. [עדכון המערכת](#-עדכון-המערכת)
7. [הסרת המערכת](#-הסרת-המערכת)

---

## 🖥️ התקנה מקומית (Linux / Mac)

### דרישות חומרה ותוכנה

| רכיב | מינימום | מומלץ |
| ---: | ---: | ---: |
| RAM | 4GB | 8GB |
| דיסק פנוי | 10GB | 20GB SSD |
| Docker Desktop | 4.20+ | האחרונה |
| Node.js | 22 | 22 LTS |
| pnpm | 9 | 9 |

### התקנה בשורת פקודה אחת

```bash
curl -fsSL https://raw.githubusercontent.com/bot-sync-up/catering/main/install-local.sh | bash
```

הסקריפט יבצע:

1. 🟢 בדיקת תלויות (Docker / Node / pnpm / RAM / דיסק)
2. 🟢 שיבוט הריפו ל-`~/catering`
3. 🟢 הרצת `bootstrap/fix-all.sh`
4. 🟢 החלת כל ה-patches מ-`patches-apply/`
5. 🟢 יצירת `.env` מ-`.env.dev.example`
6. 🟢 `docker compose up -d` (postgres, redis, וכו')
7. 🟢 `pnpm install && pnpm db:migrate && pnpm db:seed`
8. 🟢 הפעלת `pnpm dev` ברקע (לוג: `~/catering/.yolo-logs/dev.log`)
9. 🟢 פתיחת הדפדפן ב-<http://localhost:3000>

### כניסה ראשונה

| שדה | ערך |
| ---: | ---: |
| כתובת | <http://localhost:3000> |
| משתמש | `admin@demo.local` |
| סיסמה | `admin1234` |

> ⚠️ הסיסמה הזו מיועדת לפיתוח בלבד! החלף אותה מיד בכניסה הראשונה.

---

## 🪟 התקנה מקומית (Windows)

### דרישות נוספות

* Windows 10/11 Pro או Enterprise (עבור Hyper-V), או Windows Home עם WSL2
* Docker Desktop עם WSL2 backend
* PowerShell 5.1+ (מובנה)

### פקודה אחת ב-PowerShell (כ-Admin)

```powershell
iwr https://raw.githubusercontent.com/bot-sync-up/catering/main/install-local.ps1 -UseBasicParsing | iex
```

או אם יש לך כבר את הקובץ:

```powershell
powershell -ExecutionPolicy Bypass -File .\release-bundle\install-local.ps1
```

הסקריפט בודק WSL2 / Hyper-V, מתקין pnpm דרך corepack אם צריך, ועושה את אותו תהליך כמו ב-Linux.

---

## ☁️ התקנה על VPS (Ubuntu 24.04)

### דרישות VPS

| רכיב | מינימום | מומלץ |
| ---: | ---: | ---: |
| vCPU | 2 | 4 |
| RAM | 4GB | 8GB |
| דיסק | 40GB SSD | 80GB SSD |
| מערכת הפעלה | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| גישה | SSH ל-root | SSH ל-root + מפתח |

### שלב 1 — חיבור ל-VPS והרצת ההתקנה

```bash
ssh root@your-vps.example.com
bash <(curl -fsSL https://raw.githubusercontent.com/bot-sync-up/catering/main/install-vps.sh)
```

הסקריפט ישאל אותך ל-domain ולאימייל (עבור Let's Encrypt), ואז יתקין:

1. 🟢 חבילות בסיס: Docker, Nginx, certbot, git, Node 22, pnpm 9
2. 🟢 UFW עם פתיחה רק ל-22/80/443
3. 🟢 fail2ban + unattended-upgrades
4. 🟢 משתמש מערכת `catering` (חבר ב-docker group, sudo מוגבל)
5. 🟢 שיבוט הריפו ל-`/home/catering/app`
6. 🟢 הרצת bootstrap + patches
7. 🟢 יצירת `.env.production` עם secrets חזקים (32+ תווים, openssl rand)
8. 🟢 `docker-compose.prod.yml up -d`
9. 🟢 הגדרת Nginx + Let's Encrypt SSL
10. 🟢 `systemd service` להפעלה אוטומטית בעת אתחול
11. 🟢 cron לגיבוי יומי ב-03:00
12. 🟢 Prometheus (`127.0.0.1:9090`) + Grafana (`127.0.0.1:3001`)

### שלב 2 — DNS

ודא שה-A record של ה-domain שלך מצביע ל-IP הציבורי של ה-VPS לפני הרצת הסקריפט (אחרת certbot ייכשל).

### שלב 3 — בדיקה

```bash
curl -I https://your-domain.com
```

אמור להחזיר `HTTP/2 200`.

---

## 🛠️ פעולות יום-יום

ה-bundle כולל קיצורים נוחים בתיקיית `release-bundle/bin/`:

```bash
catering-start     # הפעל את כל ה-containers
catering-stop      # עצור הכול
catering-status    # מצב כל השירותים
catering-logs      # tail על הלוגים
catering-shell     # shell ל-DB / redis / node
catering-backup    # גיבוי ידני מהיר
catering-update    # git pull + migrate + restart
```

הוסף את `release-bundle/bin` ל-PATH שלך לנוחות:

```bash
echo 'export PATH="$HOME/catering/release-bundle/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

## 💾 גיבוי ושחזור

### גיבוי ידני

```bash
bash release-bundle/backup-now.sh
# או עם תג:
bash release-bundle/backup-now.sh --tag "before-big-event"
```

הגיבוי נשמר ב-`~/backups/catering-backup-YYYYMMDD-HHMMSS[-tag].tar.gz` וכולל:
* dump של PostgreSQL (gzipped)
* dump של Redis
* תיקיית uploads/storage
* קבצי .env

retention: 14 ימים אחרונים נשמרים אוטומטית.

### שחזור

```bash
bash release-bundle/restore-from-backup.sh ~/backups/catering-backup-20260521-030000.tar.gz
```

לפני שחזור — הסקריפט יוצר גיבוי "pre-restore" אוטומטית.

---

## 🔄 עדכון המערכת

```bash
bash release-bundle/update.sh
```

מבצע: backup → git pull → patches → install → migrate → restart → health check.

לחזרה לגרסה קודמת — שחזר מהגיבוי `pre-update-*`.

---

## 🗑️ הסרת המערכת

```bash
# מחיקה מלאה (כולל DB):
bash release-bundle/uninstall.sh

# שמירת קוד ו-DB:
bash release-bundle/uninstall.sh --keep-data
```

---

## ❓ בעיות?

ראה את [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) עם 30+ בעיות נפוצות ופתרונות.

לתמיכה: <support@syncup.co.il> · WhatsApp: 050-1234567

</div>
