# SECURITY-RUNBOOK — תגובה לאירועי אבטחה

<div dir="rtl">

> מסמך מבצעי. עדכן כל רבעון. החזק עותק מודפס בכספת של IT.

## אחראים ומספרי טלפון

| תפקיד | שם | טלפון | מייל |
|------|----|------|-----|
| Security Lead | {{NAME}} | {{PHONE}} | {{EMAIL}} |
| DPO | {{DPO_NAME}} | {{DPO_PHONE}} | {{DPO_EMAIL}} |
| CTO | {{CTO_NAME}} | {{CTO_PHONE}} | {{CTO_EMAIL}} |
| יועץ משפטי | {{LEGAL_NAME}} | {{LEGAL_PHONE}} | {{LEGAL_EMAIL}} |
| ספק SOC חיצוני | — | — | — |

חובת דיווח חיצונית:

- **רשם מאגרי המידע (רמו"ט)**: דליפת מידע אישי — תוך 72 שעות.
- **מערך הסייבר הלאומי**: אירוע סייבר חמור — מיידית.
- **משטרת ישראל יחידת לה"ב 433**: פליליות.

---

## שלבי תגובה (NIST IR)

### 1. גילוי (Detect)

אינדיקטורים שיש לחפש:
- התראות SIEM (לוגי 5xx מסיביים, login failures, גודל responses חריג).
- דיווח לקוח/עובד.
- ניוז על דליפה ציבורית של המוצר.

מי שמגלה: יוצר מיידית tag לאירוע ב-`incidents/<YYYY-MM-DD>-<short>.md`.

### 2. בידוד (Contain)

קומפוננטה נחשדת — אילו פעולות?

| חשד | פעולה |
|-----|-------|
| גניבת JWT secret | rotate ב-`packages/jwt-config`: `generateSecret()` חדש, invalidate כל ה-tokens (bump kid). |
| דליפת DB | revoke credentials ב-RDS / Atlas, block IP במסד נתונים. |
| compromise של עובד | suspend ב-IDP (Okta/Google), revoke כל ה-tokens, נעילת admin. |
| מפתח KMS חשוד | KMS rotation דרך הקונסול; envelope ישנים עדיין יפתחו ע"י הענן. |
| stored XSS | `UPDATE rows SET content = sanitizeRichText(content) WHERE ...`. |
| מספרי כרטיס בלוגים | להריץ `scanObject` על כל ה-log shippers; מחיקה מבקר logs (CloudWatch / Loki). |

### 3. הדברה (Eradicate)

- patch כל המכונות.
- עדכן rules ב-WAF / CDN.
- חפש backdoors: `find / -name "*.php" -mtime -30`, סקירת cron jobs, סקירת secrets בקוד.
- שינוי kid של JWT (כל הטוקנים בלתי תקפים).

### 4. שחזור (Recover)

- שחזור מ-backup רק לאחר אישור שה-backup לא נגוע.
- בדיקה ש-`@security-fixes/pci-validator` נקי על ה-prod payload.
- מוניטור ל-72 שעות לאחר חזרה לשגרה.

### 5. סיכום (Lessons Learned)

- post-mortem תוך שבוע.
- עדכון runbook זה.
- הוספת alert חדש ב-SIEM.

---

## תרחישים נפוצים

### A. דליפת PII (חוק הגנת הפרטיות)

1. הקפא חשבונות שדלפו (lockedUntil = +24h ב-`@security-fixes/otp`).
2. רשום ב-`audit_logs` כל לקוח שמידע שלו ידוע שדלף.
3. **תוך 72 שעות** הגש דיווח לרמו"ט בקישור:
   https://www.gov.il/he/service/data_security_incident_report
4. שלח הודעה ללקוחות שנפגעו (חובה לפי תיקון 13).
5. עבור על `DEFAULT_ISRAEL_POLICIES` ובדוק אם יש מה לאנון משם.

### B. דליפת מפתח JWT

1. ב-Vault / AWS Secrets Manager:
   ```bash
   node -e "console.log(require('@security-fixes/jwt-config').generateSecret())"
   ```
2. עדכן `JWT_ACCESS_SECRET` ו-`JWT_REFRESH_SECRET` (שונים!).
3. רימרץ את כל ה-services (`kubectl rollout restart`).
4. כל המשתמשים יידרשו להיכנס מחדש.
5. revoke כל ה-refresh tokens ב-DB: `UPDATE refresh_tokens SET revoked = true`.

### C. brute-force על login

1. בדוק 2FA enforcement: כל admins חייבים `evaluate().allow === true`.
2. הוסף rate-limit חזק יותר ב-WAF.
3. אם זוהה IP — block ב-Cloudflare.
4. סקירת לוגי OTP: לקוחות מוטרדים → reset.

### D. אירוע פגיעה ב-PCI

1. נטר ב-PCI: `assertPciSafe(payload)` חייב להחזיר תקין על כל payload יוצא/נכנס.
2. אם נמצא PAN ב-log → grep `git log -p -- '*.log'` להבין מתי הגיע.
3. דווח לחברת הסליקה (PSP) ולחברת הכרטיסים תוך 24 שעות.
4. הקפיא שמירה של payloads ל-30 יום מינימום עד סיום חקירה.

### E. compromise של ספק חשבוניות

הספק הרגיל (iCount) נפל. `@security-fixes/invoicing-fallback` יזרום
אוטומטית ל-GreenInvoice → Rivhit. אם כולם נפלו:

1. תכבה שיגור חיוב חדש זמנית.
2. רשום ב-DB את החשבוניות הנדרשות עם `status='pending_external'`.
3. אחרי שהספק חוזר — קרא `issueInvoice` בקוד backfill.
4. שלח ללקוחות חשבונית עם דאחיר מס מציין מועד שירות.

---

## רשימת תיוג שבועית

- [ ] `npm audit` בכל workspace, לטפל ב-high+critical.
- [ ] בדיקה ש-`JWT_ACCESS_SECRET` לא `changeme` (Grep ב-secrets).
- [ ] שינוי לסיסמת admin בכל service אחת לרבעון.
- [ ] בדיקה ש-`verifyChain` (consent-ledger) תקין על כל המשתמשים האחרונים.
- [ ] backups של DB ניתנים לשחזור — בדיקה פעם בחודש.
- [ ] cron archival רץ בהצלחה — בדיקת לוג.

## רשימת תיוג חודשית

- [ ] טופס 102 הוגש לרשות המסים עד 15 לחודש.
- [ ] בדיקה שאף SAR לא עבר 25 יום בלי מענה.
- [ ] בדיקה שכל admin עם `roles=['admin']` חתום על 2FA פעיל.
- [ ] בדיקת KMS rotation status (לפי מדיניות KMS).

## רשימת תיוג שנתית

- [ ] טופס 106 לעובדים עד 31.3.
- [ ] טופס 126 לפי לוח שנה.
- [ ] חידוש רישום במאגרי המידע ברמו"ט.
- [ ] ביקורת חיצונית — PT + privacy audit.
- [ ] עדכון `PRIVACY-POLICY.md` בהתאם לשינויי חוק.

---

## כלים זמינים ב-monorepo

```ts
// תיקון מהיר של secret חלש שזוהה ב-PR:
import { generateSecret } from '@security-fixes/jwt-config';
console.log(generateSecret(64));

// בדיקת payload לפני שליחה ב-CI:
import { assertPciSafe } from '@security-fixes/pci-validator';
assertPciSafe(JSON.parse(payload), 'ci.payload');

// אנונימיזציה ידנית של חשבון בעקבות בקשה:
import { eraseSubject, DEFAULT_ISRAEL_POLICIES } from '@security-fixes/privacy';
await eraseSubject(userId, DEFAULT_ISRAEL_POLICIES, driver);

// אימות שרשרת הסכמות:
import { verifyChain } from '@security-fixes/consent-ledger';
const r = await verifyChain(userId, store);
if (!r.valid) console.error('CHAIN BROKEN at', r.brokenAt);
```

</div>
