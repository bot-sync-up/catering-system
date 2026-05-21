<div dir="rtl" lang="he">

# מדיניות אבטחה (Security Policy)

## גרסאות נתמכות

עדכוני אבטחה ניתנים לגרסה האחרונה בלבד, ול-LTS של הגרסה הקודמת.

| גרסה | סטטוס | תמיכה עד |
| ---: | ---: | ---: |
| 0.1.x | ✅ Active | 2027-05-21 |
| < 0.1 | ❌ — | — |

---

## 🔐 איך לדווח על פגיעות

> **אל תפתח Issue ציבורי לפגיעויות אבטחה.**

יש לנו 3 ערוצים מאובטחים:

### 1. אימייל מוצפן (מועדף)

שלח אימייל ל-<security@syncup.co.il>.

לאימייל רגיש — חתום עם המפתח PGP שלנו (fingerprint: `0xDEADBEEFCAFE1234` — זמין ב-keyserver `keys.openpgp.org` ובמיקום `.well-known/security.txt` של האתר).

### 2. GitHub Security Advisory (Private)

<https://github.com/bot-sync-up/catering/security/advisories/new>

ערוץ זה גלוי רק לצוות התחזוקה ולך עד שהפגיעות מתוקנת.

### 3. HackerOne (לבאונטיז מורשים)

אם נרשמת לתוכנית הבאונטי שלנו — תיק חדש ב-<https://hackerone.com/syncup>.

---

## 📋 מה לכלול בדיווח

```
1. תיאור הפגיעות
2. רכיב / endpoint / קובץ ספציפי
3. צעדים לשחזור (PoC)
4. השפעה צפויה (CVE-style: Confidentiality / Integrity / Availability)
5. גרסת המערכת (commit SHA)
6. גרסת ה-OS / browser / runtime
7. אם פרסמת — לאן (CVE? blog?)
```

תמורת PoC נדיב — אנו מקבלים screenshot, וידיאו או קוד בטוח (ללא ניצול אמיתי על מערכות בייצור של לקוחות).

---

## ⏱️ זמני תגובה

| שלב | זמן יעד |
| ---: | ---: |
| תגובה ראשונית | 24 שעות |
| confirmation / triage | 3 ימי עסקים |
| תיקון לחומרה Critical | 7 ימים |
| תיקון לחומרה High | 14 ימים |
| תיקון לחומרה Medium | 30 ימים |
| תיקון לחומרה Low | best-effort |

---

## 🏷️ דירוג חומרה (CVSS 3.1)

* **Critical (9.0–10.0)** — RCE ללא אימות, escalation לסיסמה ל-root, גישה לכל הנתונים
* **High (7.0–8.9)** — RCE מאומת, SQL injection, leakage של נתוני לקוחות
* **Medium (4.0–6.9)** — XSS, CSRF, IDOR מוגבל
* **Low (0.1–3.9)** — disclosure של מידע לא רגיש, rate-limit weak

---

## 🎁 הכרה ובאונטיז

### תוכנית באונטי (Beta)

| חומרה | תגמול |
| ---: | ---: |
| Critical | $500–$2,000 |
| High | $200–$500 |
| Medium | $50–$200 |
| Low | תודה ב-Hall of Fame |

> ⚠️ באונטיז זמינים לדיווחים original, ייחודיים, ולא לדפלקטים של פגיעויות כבר ידועות.

### Hall of Fame

אתה תקבל הכרה ציבורית ב-<https://syncup.co.il/security/hall-of-fame> (אלא אם ביקשת anonymity).

---

## 🚫 מה לא בסקופ

* פגיעויות בשירותי צד-שלישי (Postgres, Redis, Nginx) — דווח ל-vendor שלהם
* DoS / DDoS על שרתינו (במקום זה — דווח על pattern שמאפשר DoS)
* פיזיקלי / social engineering נגד עובדים
* missing security headers בלי PoC אקטיבי
* פגיעויות שמצריכות root local על מכונת הקורבן
* clickjacking על דפים בלי actions sensitive
* CSRF על endpoints ללא state change

---

## ✅ Coordinated Disclosure

* אנו נשמור על דיסקרטיות מלאה עד לתיקון.
* לאחר תיקון ו-deploy ללקוחות (typical 30–90 ימים) — נפרסם CVE / advisory.
* תקבל קרדיט בפרסום (אם רצית).
* אנו לא נוקטים בצעדים משפטיים נגד חוקרים תמי-לב שעבדו בגבולות מדיניות זו.

---

## 🛡️ הגנות מובנות במערכת

לחסכון בזמן שלך — כך אנו כבר עכשיו מגנים:

* HTTPS only (HSTS)
* Content Security Policy strict
* CSRF tokens על כל POST/PUT/DELETE
* rate-limiting על endpoints רגישים (login, signup, password reset)
* bcrypt לסיסמאות (cost=12)
* JWTs עם expiration קצר + refresh tokens
* Prisma ORM — מונע SQL injection by-design
* CSP nonce
* fail2ban על ניסיונות SSH
* unattended-upgrades לעדכוני kernel

---

## 📞 איש קשר ראשי

**משה דושינסקי** · CTO · Sync Up
<security@syncup.co.il>

</div>
