<div dir="rtl">

# Runbook: תגובה לאירוע אבטחה (Incident Response)

## מטרה
פרוצדורה מסודרת מרגע גילוי אירוע ועד סגירתו, התואמת ל-NIST SP 800-61 ולתקנות הגנת הפרטיות (חובת דיווח לרשם בתוך 24 שעות).

## רמות חומרה

| רמה | קריטריונים | זמן תגובה |
|---|---|---|
| **P1 — קריטי** | דליפת PII, חדירה לפרודקשן, deface, ransom | **15 דק׳** |
| **P2 — גבוה** | חשבון מנהל פרוץ, DoS, פגיעה בכספים | **1 שעה** |
| **P3 — בינוני** | חשבון משתמש בודד, סריקה אקטיבית | **4 שעות** |
| **P4 — נמוך** | סריקה פסיבית, ניסיון login כושל מרובה | **יום עבודה** |

## תפקידים

| תפקיד | אחריות | איש קשר |
|---|---|---|
| **Incident Commander (IC)** | החלטות, תיאום | _שם + טלפון_ |
| **Tech Lead** | חקירה טכנית, מיגור | _שם_ |
| **Comms Lead** | לקוחות, רשויות, תקשורת | _שם_ |
| **Legal** | חובות דיווח | _עו"ד_ |
| **CISO/בעלים** | אישורים, escalation | _שם_ |

## שלבים

### 1. גילוי (Detection) — 0 דק׳
מקורות:
- התרעת Sentry/Grafana
- דיווח לקוח
- תוצאות סריקה אוטומטית
- חוקר חיצוני (responsible disclosure)

### 2. הערכה (Triage) — 5 דק׳
- [ ] האם זה אירוע אמיתי או false positive?
- [ ] קבע חומרה (P1–P4)
- [ ] פתח טיקט ב-`#incident-YYYYMMDD-NN`
- [ ] עדכן status page אם רלוונטי

### 3. הכלה (Containment) — 15 דק׳

**אסור** לפעול בחיפזון. שמור ראיות לפני כל שינוי.

#### צעדים מיידיים
```bash
# 1. צילום מצב — שמור מיד
docker logs $CONTAINER > /evidence/$INCIDENT/docker.log
kubectl logs $POD --all-containers > /evidence/$INCIDENT/k8s.log
psql -c "\copy (SELECT * FROM audit_log WHERE timestamp > NOW() - INTERVAL '2 hours') TO '/evidence/$INCIDENT/audit.csv' CSV HEADER"

# 2. snapshot של DB (אם חשוד בכתיבה זדונית)
pg_dump $DB > /evidence/$INCIDENT/db.sql

# 3. נטרל חשבונות חשודים — לא למחוק
psql -c "UPDATE users SET disabled_at = NOW() WHERE id IN (...)"

# 4. בטל JWT secret (force-logout כולם)
kubectl set env deployment/api JWT_SECRET=$(openssl rand -hex 32)

# 5. חסום IPs ב-WAF
aws wafv2 update-ip-set --addresses '[...]'
```

### 4. מיגור (Eradication) — 1-4 שעות
- [ ] זהה root cause (לא רק symptom)
- [ ] תקן את הפגיעות (patch / config / code)
- [ ] סרוק כל המערכת לוודא שאין דלת אחורית
- [ ] רוטציה של כל הסודות שהיו exposed

### 5. שחזור (Recovery) — שעות-ימים
- [ ] שחזר משירותים מ-snapshot נקי (לפני האירוע)
- [ ] בדיקות תקינות
- [ ] ניטור מוגבר ל-72 שעות
- [ ] שחרור הדרגתי (canary)

### 6. דיווח חיצוני

#### חובת דיווח לרשם הגנת הפרטיות
**תוך 24 שעות** מרגע הגילוי, אם:
- דלפו פרטי אמצעי תשלום, ת"ז, או פרטים רגישים אחרים
- מעל 10 רשומות נחשפו

טופס: https://www.gov.il/he/service/notify-data-breach

**מינימום מידע בדיווח:**
1. מועד וטיב האירוע
2. כמות + סוג רשומות שנפגעו
3. צעדים שננקטו
4. אנשי קשר

#### דיווח ללקוחות
- אם PII דלף → תוך 72 שעות
- תוכן: מה קרה, מה לא דלף, מה לעשות
- ערוצים: דוא"ל + SMS + הודעה באפליקציה

#### דיווח לרשויות נוספות
| גורם | מתי |
|---|---|
| מערך הסייבר הלאומי | אירוע ברמה לאומית/CII |
| בנק ישראל | פגיעה במערכות תשלום |
| משטרת ישראל (יחידת סייבר) | פשע סייבר |
| Cardcom/iCount/PCI | אם דלף מספר כרטיס |

### 7. סקירה לאחר האירוע (Post-mortem) — תוך שבוע

תבנית:
1. **Timeline** — שעון מדויק של כל אירוע
2. **What happened** — תיאור עובדתי
3. **Root cause** — 5 Whys
4. **Impact** — כספי, פרטיות, מוניטין
5. **What went well**
6. **What went wrong**
7. **Action items** — עם בעלים ותאריכי יעד

**חשוב:** Blameless. מטרה: ללמוד, לא להאשים.

## ערכת חירום
- VPN חירום (פיזי, לא רשת רגילה)
- מספרי טלפון של אנשי המפתח (מודפס)
- גישת admin חירום (key vault)
- רשימת ספקים: hosting, DNS, CDN, payment gateway

## תרגול
פעם ברבעון: tabletop exercise + טסט עצירת אסון מלא.

</div>
