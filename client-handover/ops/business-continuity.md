<div dir="rtl">

# המשכיות עסקית והתאוששות מאסון (BCP + DR)

## 1. מטרה

מסמך זה מתאר כיצד נמשיך להעניק שירות ללקוחות גם במקרה של אסון או הפרעה משמעותית.

## 2. הגדרות מרכזיות

- **RPO** (Recovery Point Objective) — כמה זמן נתונים מותר לאבד. **יעד: 24 שעות** (Pro+: שעה).
- **RTO** (Recovery Time Objective) — זמן עד חזרת השירות. **יעד: 4 שעות** (Pro+: שעה).
- **MTPD** (Maximum Tolerable Period of Disruption) — עד שזה הופך למשבר אסטרטגי. **יעד: 24 שעות**.

## 3. סוגי תקלות נחשבים

| תרחיש | סבירות | השפעה | אסטרטגיה |
|---|---|---|---|
| כשל שרת בודד | גבוהה | קלה | Auto-failover |
| כשל Region | נמוכה | גבוהה | Multi-Region replication |
| נזק לנתונים (corruption) | נמוכה | גבוהה | שחזור מגיבוי |
| מתקפת Ransomware | בינונית | קריטית | גיבוי מבודד + DR |
| כשל ספק ענן רחב | נמוכה | קריטית | Multi-Cloud (Enterprise) |
| אסון טבע / שריפה ב-DC | נמוכה מאוד | קריטית | Geo-Redundant DR |
| התקפת Cyber מכוונת | בינונית | קריטית | תגובה + שחזור |

## 4. ארכיטקטורת חוסן

### 4.1 רב-זמינות (High Availability)
- **Compute**: Auto-Scaling Group עם 3+ instances בכל AZ
- **DB Primary**: PostgreSQL עם Standby סינכרוני באותו Region
- **Cache**: Redis Cluster עם 3 שכפולים
- **Storage**: S3 / GCS Cross-Region Replication

### 4.2 גיבוי
- **גיבוי חם** — Replication רציף
- **גיבוי קר** — יומי + שבועי + חודשי + שנתי
- **שמירה**: 30 ימים יומיים, 12 שבועות, 12 חודשים, 7 שנים שנתיים
- **מיקום**: Region נפרד + S3 Object Lock (מבודד מ-Ransomware)
- **הצפנה**: AES-256 + KMS Key נפרד

### 4.3 התאוששות
- **Pilot Light** — DR Region במצב מינימלי, מתאקטב תוך 30 דק'
- **Database Snapshots** — כל 6 שעות + WAL streaming
- **Documentation** — Runbook מלא ב-Confluence + Offline

## 5. תוכנית התאוששות (DR Plan)

### 5.1 שלב 1: זיהוי + הצהרת אסון (0-30 דק')
1. PagerDuty / Monitoring זיהה תקלה רחבה
2. On-Call מוודא שזה אסון אמיתי (לא תקלה זמנית)
3. הצהרת אסון ע"י Tech Lead / CTO
4. Status Page מתעדכן: "Major Incident"
5. הודעה לכל הלקוחות באימייל

### 5.2 שלב 2: הפעלת DR (30 דק' - שעתיים)
1. Spin-up Compute ב-DR Region
2. Promote DB Standby ל-Primary
3. עדכון DNS — להפנות ל-DR
4. בדיקת שירותי ליבה
5. הודעה ללקוחות שהשירות חזר

### 5.3 שלב 3: ניטור + ייצוב (שעתיים - 24 שעות)
- מוניטור מתמיד
- טיפול בבעיות שצצות
- תקשורת רציפה עם לקוחות

### 5.4 שלב 4: חזרה ל-Primary (לאחר שיקום)
- בדיקה שהאתר המקורי תקין
- העברת נתונים חזרה (Sync)
- חלון תחזוקה מתוזמן ל-Failback
- בדיקות
- Status Page: "Operational"

## 6. תרגילים (DR Drills)

- **רבעון 1** — Failover של DB בלבד
- **רבעון 2** — Failover מלא לאזור משני (טבלת בדיקה)
- **רבעון 3** — Ransomware Tabletop Exercise
- **רבעון 4** — DR מלא ללא הודעה מראש (Red Team)

לכל תרגיל מסמך RCA + עדכון Runbook.

## 7. רשימת צוות חירום

| תפקיד | אחריות |
|---|---|
| Incident Commander | קבלת החלטות, תקשורת לדרג |
| Tech Lead | טיפול טכני, ביצוע DR Plan |
| Communications Lead | תקשורת ללקוחות + תקשורת פנימית |
| Customer Success | תיאום עם לקוחות VIP |
| Legal / DPO | אם יש סוגיית דליפת נתונים |

## 8. תקשורת במשבר

### 8.1 פנימי
- Slack Channel **#war-room** פתוח לכל הצוות הרלוונטי
- שיחת Daily Standup כל 4 שעות עד פתרון
- מסמך Live Updates שמתעדכן בזמן אמת

### 8.2 חיצוני
- Status Page מתעדכן כל 30 דק'
- Email לכל הלקוחות (לפחות כל 2 שעות)
- שיחות אישיות לכל לקוח Enterprise

### 8.3 רגולטור
- ב-תוך 72 שעות אם יש פגיעה בפרטיות
- ל-רשות להגנת הפרטיות / GDPR

## 9. ביטוח

- ביטוח Cyber Liability — מכסה אירועי דליפה, כופר, דרישות לקוחות
- כיסוי E&O (Errors & Omissions) — מכסה תביעות מקצועיות
- ביטוח BI (Business Interruption) — מכסה הפסדים מהשבתה

## 10. סקירה ועדכון

- מסמך זה נסקר אחת לחצי שנה
- עדכון מיידי לאחר כל אירוע / תרגיל
- חתימת CTO אחת לשנה

## 11. צ'ק-ליסט מהיר (Cheat Sheet)

```
[ ] 0:00  — הצהרת אסון
[ ] 0:05  — Notify Team (PagerDuty/Slack)
[ ] 0:10  — Status Page Update
[ ] 0:15  — Email לכל הלקוחות
[ ] 0:30  — התחל DR Plan
[ ] 1:00  — Standby promoted
[ ] 1:30  — DNS switched
[ ] 2:00  — Smoke tests pass
[ ] 2:30  — Service restored
[ ] +24h  — Post-Mortem started
```

</div>
