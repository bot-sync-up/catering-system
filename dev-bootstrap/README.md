# dev-bootstrap

Bootstrap מלא לסביבת פיתוח של פלטפורמת **קייטרינג טעימים / ענה את השואל**.

מ-0 ל-`pnpm dev` בפקודה אחת:

```bash
cd dev-bootstrap
./scripts/start-dev.sh
```

## תוכן

```
dev-bootstrap/
├── docker/
│   ├── docker-compose.dev.yml   # Postgres + Redis + MailHog + MinIO
│   └── init.sql                 # extensions + DBs (test, shadow)
├── scripts/
│   ├── preflight.sh             # בדיקות מערכת לפני התחלה
│   ├── start-dev.sh             # bootstrap מלא בפקודה אחת
│   ├── stop-dev.sh              # עצירה (שומר נתונים)
│   ├── reset-dev.sh             # איפוס מלא (הרסני!)
│   ├── seed-demo.sh             # זריעת נתוני דמו
│   ├── verify-dev.sh            # אימות שהכל עובד
│   └── vagrant-provision.sh     # provisioning של VM (אופציונלי)
├── .env.dev.example             # תבנית .env לפיתוח
├── Vagrantfile                  # VM אופציונלי
├── BOOTSTRAP-README.md          # מדריך משתמש מלא בעברית
└── README.md                    # הקובץ הזה
```

ראו [BOOTSTRAP-README.md](BOOTSTRAP-README.md) למדריך מלא.

## הזרמים העיקריים

| פעולה                  | פקודה                                  |
| ---------------------- | -------------------------------------- |
| התחלה מאפס             | `./scripts/start-dev.sh`               |
| התחלה עם --fresh       | `./scripts/start-dev.sh --fresh`       |
| עצירה (שומר נתונים)     | `./scripts/stop-dev.sh`                |
| איפוס מלא (מוחק!)       | `./scripts/reset-dev.sh`               |
| זריעה בלבד             | `./scripts/seed-demo.sh --scale=medium`|
| אימות                  | `./scripts/verify-dev.sh`              |
| בדיקת מערכת מראש       | `./scripts/preflight.sh`               |
