<div dir="rtl" lang="he">

# Release Notes — v0.1.0

**תאריך**: 2026-05-21
**Codename**: "Yolo Deploy"
**Status**: Beta

---

## ✨ מה כלול בגרסה הראשונית

זו הגרסה הראשונה הפומבית של מערכת ניהול הקייטרינג. היא כוללת **חבילת התקנה מלאה** שמאפשרת להעלות סביבה רצה — מקומית או על שרת — בפקודה אחת.

### 📦 חבילת ההתקנה (`release-bundle/`)

| קובץ | תפקיד |
| ---: | ---: |
| `install-local.sh` | התקנה מקומית Linux/Mac (one-liner) |
| `install-local.ps1` | התקנה מקומית Windows (PowerShell) |
| `install-vps.sh` | התקנת VPS מלאה (Ubuntu 24.04 fresh) |
| `update.sh` | עדכון חי עם backup אוטומטי |
| `uninstall.sh` | הסרה נקייה (אופציה לשמירת נתונים) |
| `backup-now.sh` | גיבוי מיידי של DB + uploads + .env |
| `restore-from-backup.sh` | שחזור מ-backup tar |
| `bin/catering-*` | 7 קיצורים יום-יומיים |
| `INSTALL.md` · `TROUBLESHOOTING.md` | תיעוד מלא בעברית RTL |

### 🚀 התקנה ב-3 דקות

```bash
curl -fsSL https://raw.githubusercontent.com/bot-sync-up/catering/main/install-local.sh | bash
```

### 🔐 אבטחה מובנית בהתקנת VPS

* `ufw` עם פתיחה רק ל-22/80/443
* `fail2ban` מופעל אוטומטית
* `unattended-upgrades` לעדכוני אבטחה
* משתמש מערכת ייעודי (`catering`), בלי root
* `.env.production` עם secrets שנוצרים אוטומטית (40 תווים)
* קבצי .env ב-`chmod 600`
* SSL אוטומטי עם Let's Encrypt
* `sudoers.d` מוגבל לפקודות שירות בלבד

### 📊 ניטור

* Prometheus ב-`127.0.0.1:9090`
* Grafana ב-`127.0.0.1:3001`
* גישה רק דרך SSH tunnel

### 💾 גיבוי ושחזור

* גיבוי יומי אוטומטי ב-03:00 בלילה (cron)
* גיבוי ידני בלחיצה: `bash backup-now.sh`
* retention: 14 ימים
* כולל DB, Redis, uploads, storage, .env
* שחזור מאומת עם backup אוטומטי לפני שחזור

### 🛠️ פעולות יום-יום

7 קיצורים ב-`bin/`:
* `catering-start` / `catering-stop`
* `catering-status`
* `catering-logs`
* `catering-shell` (psql / redis-cli / node)
* `catering-backup`
* `catering-update`

---

## ⚠️ ידוע כעת

* **Migrations rollback** — לא נבדק במלואו בתרחישי שדה
* **multi-tenant**: לא נתמך עדיין
* **גיבוי לאחסון חיצוני** (S3/B2): לא אוטומטי — יש להוסיף ידנית ל-cron
* **kubernetes**: אין תרשימי Helm — רק docker-compose
* **בדוק רק על**: Ubuntu 24.04, macOS 14+, Windows 11 (WSL2)

---

## 🛣️ במפת הדרכים ל-v0.2.0

* התקנה מסוג terraform/ansible לסביבות multi-server
* גיבוי אוטומטי ל-S3
* תמיכה ב-multi-tenant
* dashboards של Grafana מוכנים מראש
* בדיקות חימום (warm-up) אוטומטיות אחרי deploy

---

## 🙏 תודות

לכל מי שעזר ב-beta הזה ונשלח feedback ב-issue tracker.

</div>
