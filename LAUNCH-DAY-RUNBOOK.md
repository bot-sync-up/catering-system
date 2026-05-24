<div dir="rtl">

# Launch Day Runbook — מדריך השקה

**מסמך תפעולי**: כל מי שמעורב ב-Launch חייב לקרוא במלואו.
**גרסה**: 1.0
**עדכון אחרון**: D-30
**אישור**: Launch Owner, CTO, CEO

---

## 🎯 הגדרת Launch

- **D-Day**: יום ה-Go-Live של Phase 1 (לקוח פיילוט ראשון)
- **War Room שעות**: 06:00 — 22:00 ביום D, 08:00 — 20:00 ב-D+1, D+2
- **Hypercare**: 72 שעות
- **Maintenance Window**: 03:00 — 06:00 בליל D (אם נדרש cut-over)

---

## 📅 Timeline: D-7 → D-Day → D+3

### D-7 — שבוע לפני
- [ ] Email/SMS הודעת השקה ללקוח פיילוט
- [ ] מסך תחזוקה (Maintenance) מוכן ל-deploy
- [ ] Final UAT עם לקוח פיילוט — חתימה
- [ ] Pen-test ראשון הושלם, ממצאים נסגרו
- [ ] Backup מוצלח של staging
- [ ] Code freeze — מותרים רק תיקוני באג Critical
- [ ] Press release / חומרי שיווק מוכנים (אם רלוונטי)

### D-3 — שלושה ימים לפני
- [ ] Final DR Drill — שחזור מלא במשך 4h
- [ ] War Room booked (חדר פיזי + Zoom + Slack channel `#launch-warroom`)
- [ ] Rollback Decision Tree מודפס ותלוי בקיר
- [ ] On-Call rotation למוקד 24/7 פעיל
- [ ] PagerDuty / OpsGenie תורים מאוששים
- [ ] Smoke test על staging — כל הזרימות הקריטיות ירוקות
- [ ] תזכורת שניה ללקוח פיילוט
- [ ] Final check: כל סעיפי `GO-LIVE-CHECKLIST.md` ירוקים או מאושרים סיכון

### D-1 — יום לפני
- [ ] **08:00** — All Hands Briefing (30 דק') — כל הצוות
- [ ] **10:00** — Pre-launch dry run על production-mirror
- [ ] **14:00** — סקירת ממצאי dry run, החלטה Go/No-Go ראשונית
- [ ] **16:00** — תזכורת אחרונה ללקוח: "מחר אנו עולים"
- [ ] **18:00** — סנכרון אחרון של נתונים מהמערכת הישנה (delta sync)
- [ ] **20:00** — Final code freeze, כל הצוות מקבל שעות מנוחה
- [ ] **23:00** — DevOps on-call נכנס לערנות

### D-Day — יום ההשקה

#### 03:00 — Maintenance Window Start
- [ ] DevOps Lead מעלה מסך תחזוקה
- [ ] Take final DB snapshot (rollback point)
- [ ] Stop application services
- [ ] Run final migration scripts (idempotent)
- [ ] Validate migration with checksum suite

#### 04:30 — Application Deploy
- [ ] Deploy production build via CI/CD
- [ ] Health checks: כל ה-services חוזרים `200 OK`
- [ ] Smoke tests אוטומטיים רצים — כולם ירוקים
- [ ] Logs check: אין ERROR/FATAL בלוגים

#### 05:30 — Pre-Open Checks
- [ ] DBA: בדיקת connections, indexes, replica lag
- [ ] Security: WAF פעיל, Rate limiting פעיל
- [ ] Frontend: דפים נטענים, RTL נכון, fonts בעברית
- [ ] Integrations: ping ל-חשבונית ירוקה, SendGrid, InforU
- [ ] בדיקת חשבונית טסט אמיתית (סכום ₪1, מבוטלת אחר כך)

#### 06:00 — Go / No-Go Decision
- [ ] War Room מתאסף
- [ ] Launch Owner שואל כל Lead: "מוכן? Go או No-Go?"
- [ ] רוב מוחלט נדרש ל-Go
- [ ] חתימה ב-Slack channel: `LAUNCH APPROVED — GO`

#### 06:15 — Maintenance Off
- [ ] DevOps מוריד מסך תחזוקה
- [ ] DNS עדכון אם רלוונטי (TTL נמוך מוגדר מראש)
- [ ] CDN cache invalidation
- [ ] Status page: עדכון "All Systems Operational"

#### 07:00 — Live Monitoring Phase 1 (Hour 1)
- [ ] צפייה אינטנסיבית ב-dashboards
- [ ] Launch Owner מתעד כל באג / behavior חריג
- [ ] תקשורת עם לקוח פיילוט — בדיקת זמינות

#### 08:00 — לקוח פיילוט מתחיל פעולה
- [ ] טלפון פתיחה עם איש קשר אצל הלקוח
- [ ] Walk-through ראשוני של זרימה
- [ ] לוגים נצפים בזמן אמת — feed שלהם

#### 10:00 — בדיקת KPIs ראשונה
- [ ] Uptime: 100% צפוי
- [ ] Errors: < 5 ב-3 שעות
- [ ] P95 latency: < 1500ms
- [ ] חשבוניות אמיתיות הופקו: 1+ צפוי

#### 14:00 — Mid-Day Sync
- [ ] War Room briefing (15 דק')
- [ ] עדכון מצב לכל Lead
- [ ] בדיקה: יש Go-No-Go שני להמשיך?

#### 18:00 — End of Business Day
- [ ] לקוח פיילוט מסכם יום
- [ ] איסוף פידבק ראשוני
- [ ] תיעוד כל באג / בקשת שינוי

#### 22:00 — End of War Room Day 1
- [ ] On-call ממשיך בלילה
- [ ] War Room חוזר ב-08:00 D+1

---

### D+1, D+2 — Hypercare ימים 2-3
- War Room פעיל 08:00-20:00
- Daily sync ב-09:00 ו-17:00
- כל באג מטופל בעדיפות עליונה
- תקשורת שקופה ללקוח פיילוט

### D+3 — End of Hypercare
- [ ] סיכום 72 שעות — מסמך post-launch
- [ ] החלטה: האם להמשיך ל-Phase 2?
- [ ] שחרור War Room
- [ ] חזרה למצב on-call רגיל

### D+7 — שבוע אחרי
- [ ] Retrospective מלא (90 דק')
- [ ] עדכון Runbook לפי lessons learned
- [ ] תכנון Phase 1 → Phase 2

---

## 🏛 War Room — מבנה והרכב

### מיקום
- חדר פיזי במשרד (עם 4 מסכים על הקיר)
- Zoom רץ ברציפות
- Slack channel `#launch-warroom`
- WhatsApp group לתקשורת חירום

### תפקידים חובה בנוכחות

| תפקיד | אחריות עיקרית |
|---|---|
| **Launch Owner** (Incident Commander) | החלטות, Go/No-Go, escalation |
| **CTO** | החלטות טכניות גבוהות |
| **DevOps Lead** | Deploy, infra, rollback |
| **Backend Lead** | תקלות API, integrations |
| **Frontend Lead** | תקלות UI |
| **DBA** | DB performance, data integrity |
| **QA Lead** | Smoke tests, validation |
| **Security Lead** | Monitoring התקפות, anomalies |
| **Support Lead** | מוקד תמיכה, תקשורת לקוחות |
| **Product Manager** | תקשורת עם לקוח פיילוט |
| **Marketing** (D-day בלבד) | תקשורת חיצונית, social |
| **Scribe** | תיעוד הכל ב-doc משותף בזמן אמת |

### תקשורת
- Slack `#launch-warroom` — הצ'אנל הראשי
- Slack `#launch-incidents` — רק incidents
- Phone Bridge — תמיד פתוח
- Status page פנימי — מי איפה עכשיו

---

## 🔄 Rollback Plan

### מתי לבצע Rollback (Triggers)

| Trigger | פעולה |
|---|---|
| 2+ באגים Critical חדשים תוך שעה | סקירת Launch Owner, decision תוך 15 דק' |
| Uptime נופל מתחת ל-95% במשך 30 דק' | Rollback מיידי |
| Data corruption מתגלה | Rollback מיידי + הקפאת DB |
| אירוע אבטחה (Data leak) | Take down + Incident Response |
| לקוח פיילוט מבקש בכתב | סקירה, decision תוך 30 דק' |
| חישוב מע"מ שגוי בחשבונית | הקפאת חשבוניות + תיקון מהיר או Rollback |

### Rollback Procedure (תהליך)

#### Phase A — הקפאה (תוך 5 דק')
1. Launch Owner מודיע ב-Slack: `🚨 ROLLBACK INITIATED`
2. DevOps מעלה מסך תחזוקה
3. הקפאת queues אסינכרוניות
4. Snapshot של מצב נוכחי (לחקירה)

#### Phase B — החזרת קוד (תוך 15 דק')
1. Re-deploy של גרסה קודמת ידועה כיציבה
2. Health checks עוברים
3. Smoke tests עוברים

#### Phase C — החזרת נתונים (תוך 60 דק')
1. אם DB השתנה — restore מ-snapshot של D-Day 03:00
2. אבטחת מידע שנוצר אחרי 06:00 (חשבוניות, אירועים) ב-staging לבדיקה
3. Validation suite

#### Phase D — חזרה למצב קודם (תוך 90 דק')
1. החזרה למערכת ישנה (אם רלוונטי)
2. עדכון DNS (אם השתנה)
3. הודעה ללקוח פיילוט: "החזרנו למצב קודם, נחקור ונחזור"
4. Status page: "Maintenance"
5. הודעה פנימית לכל הצוות

#### Phase E — חקירה
1. Post-mortem תוך 48h
2. Root cause analysis
3. תכנית תיקון
4. Retry של Launch לא לפני שבועיים

---

## 📝 Templates לתקשורת

### 1. הודעת השקה ללקוחות (D-7)

```
שלום [שם לקוח],

אנו שמחים להודיע שבעוד שבוע, ב-[תאריך], נשיק את המערכת החדשה של [שם המערכת].

זמן השקה: [תאריך] בשעה 06:00.
זמן השבתה צפוי: 03:00 — 06:00 (3 שעות).
מה לעשות: דבר. המערכת תהיה זמינה מ-06:00.

לכל שאלה — צוות התמיכה זמין במייל support@example.co.il
או בטלפון 03-XXXXXXX.

בברכה,
צוות [שם החברה]
```

### 2. הודעת הצלחה (D-Day, 12:00)

```
שלום [שם לקוח],

ההשקה הושלמה בהצלחה. המערכת פעילה ויציבה.

אם תיתקלו במשהו לא צפוי — צרו קשר מיד:
- מוקד 24/7: 03-XXXXXXX
- WhatsApp דחוף: 050-XXXXXXX

תודה על שיתוף הפעולה.

בברכה,
[שם Launch Owner]
```

### 3. הודעת Rollback (אם נדרש)

```
שלום [שם לקוח],

זיהינו תקלה בלתי צפויה לאחר השקת המערכת. כדי להבטיח את היציבות והאמינות שלכם,
החלטנו לבצע החזרה זמנית למצב הקודם.

זמן הפעלה מחדש צפוי: [תאריך משוער].

אנו מתנצלים על אי-הנוחות. תיעדנו את התקלה ונחזור עם פתרון.

לעדכונים: status.example.co.il

בברכה,
[שם Launch Owner]
```

### 4. הודעה פנימית — Incident

```
🚨 INCIDENT — [תאריך/שעה]
חומרה: P1 / P2 / P3
תיאור: [תיאור קצר]
השפעה: [מה לא עובד]
Owner: [שם]
ETA: [זמן משוער לפתרון]
Next update: [שעה]
```

### 5. הודעת סיום Hypercare (D+3)

```
שלום צוות,

72 השעות הראשונות אחרי ההשקה הסתיימו.
- Uptime: XX%
- Tickets: X (X נסגרו, X פתוחים)
- חשבוניות בפועל: X
- באגים שטופלו: X

War Room מסתיים. חוזרים למצב on-call רגיל.
Post-mortem ביום [תאריך] בשעה [שעה].

תודה לכולם!
[Launch Owner]
```

---

## 🆘 Emergency Contacts

| תפקיד | שם | טלפון | מייל |
|---|---|---|---|
| Launch Owner | [שם] | 050-XXX | launch@example.co.il |
| CTO | [שם] | 050-XXX | cto@example.co.il |
| DevOps On-Call | [שם] | 050-XXX | devops-oncall@example.co.il |
| DBA | [שם] | 050-XXX | dba@example.co.il |
| Security On-Call | [שם] | 050-XXX | security@example.co.il |
| Customer Pilot Contact | [שם] | 050-XXX | [client] |
| Hosting Provider Support | AWS/GCP | XXX | XXX |
| חשבונית ירוקה Support | XXX | XXX | XXX |

---

## ✅ Final Checklist — Pre Go-Live (D-Hour 0)

- [ ] War Room פעיל, כל Leads נוכחים
- [ ] Backup נלקח לפני 2h מקסימום
- [ ] Migration עבר ב-staging פעמיים
- [ ] Smoke tests ירוקים
- [ ] Health checks ירוקים
- [ ] Integrations ענו בזמן הבדיקה
- [ ] Rollback Plan מודפס בקיר
- [ ] לקוח פיילוט יודע מה צפוי
- [ ] Status Page מעודכן
- [ ] Monitoring + Alerts פעילים
- [ ] On-Call rotation מוגדר
- [ ] Communication templates זמינים
- [ ] Launch Owner נתן GO רשמי

---

## 🎉 הודעת הצלחה לצוות

שמרו את זה למקרה הצורך:

```
🎉 LAUNCH SUCCESS!

[תאריך] — המערכת חיה.
לקוח פיילוט: [שם]
חשבוניות ראשונות: X
Uptime יום ראשון: XX%

עוברים ל-Hypercare. ברוכים הבאים ל-Production.

תודה לצוות הנפלא ❤️
[Launch Owner]
```

</div>
