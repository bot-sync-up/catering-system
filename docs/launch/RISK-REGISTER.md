<div dir="rtl">

# Risk Register — מאגר סיכונים

**מתודולוגיה**: כל סיכון מדורג ב-Probability (1-5) × Impact (1-5) = Score (1-25).
- 1-6: ירוק (מקובל)
- 7-15: צהוב (טיפול מתוכנן)
- 16-25: אדום (טיפול מיידי)

**עדכון**: שבועי על ידי Launch Owner.

---

## Top 10 סיכונים

### 🔴 R01 — חישוב מע"מ שגוי בחשבוניות אמיתיות
| שדה | ערך |
|---|---|
| תיאור | קוד ישן עם מע"מ 17% שלא נמחק בכל מקום; ייצור חשבונית עם מס שגוי |
| Probability | 5 (ודאי אם לא יטופל) |
| Impact | 5 (קנסות, פגיעה במוניטין, הוצאת חשבוניות מתקנות לכל הלקוחות) |
| Score | **25** |
| Owner | Finance Lead |
| Mitigation | סריקת קוד מלאה + tests מקיפים + audit על 100 חשבוניות staging + בדיקה ידנית עם רואה חשבון |
| Contingency | Feature flag לעצירת הפקת חשבוניות עד תיקון. שליחת חשבוניות מתקנות מיידית |
| Deadline סגירה | D-30 |
| Status | פתוח 🔴 |

---

### 🔴 R02 — אינטגרציה לחשבונית ירוקה / iCount נכשלת בפרודקשן
| שדה | ערך |
|---|---|
| תיאור | adapters היו stubs; חיבור אמיתי לא נבדק בנפח. ייתכן rate limit / שגיאות auth / שדות חסרים |
| Probability | 4 |
| Impact | 5 (אי אפשר להפיק חשבוניות = אי אפשר להפעיל לקוח) |
| Score | **20** |
| Owner | Backend Lead |
| Mitigation | חיבור ב-staging עם 200+ חשבוניות מבחן, אישור הספק על integration, retry+circuit breaker |
| Contingency | מצב fallback ידני — יצוא ל-PDF/CSV ושליחה ידנית לרואה חשבון |
| Deadline סגירה | D-21 |
| Status | פתוח 🔴 |

---

### 🔴 R03 — דליפת מידע / פרצת אבטחה
| שדה | ערך |
|---|---|
| תיאור | OWASP Top 10 לא נבדק לעומק. נתוני לקוחות, חשבוניות, מאגר מידע ישראלי |
| Probability | 3 |
| Impact | 5 (אובדן אמון, GDPR/פרטיות, קנסות רשות הגנת הפרטיות, תביעות) |
| Score | **15** ↗️ פוטנציאל ל-25 |
| Owner | Security Lead / CISO |
| Mitigation | Pen-test חיצוני, WAF, Rate limiting, 2FA לאדמינים, Audit log, סיווג נתונים |
| Contingency | Incident Response Plan, ביטוח סייבר, נוהל הודעה ללקוחות + רשות תוך 72h |
| Deadline סגירה | D-14 |
| Status | פתוח 🔴 |

---

### 🟡 R04 — אי-עמידה בנגישות (WCAG 2.1 AA / תקן 5568)
| שדה | ערך |
|---|---|
| תיאור | מערכת מסחרית בישראל חייבת נגישות; תביעה ייצוגית פוטנציאלית |
| Probability | 4 |
| Impact | 4 (חוקי + תדמית) |
| Score | **16** 🔴 |
| Owner | UX Lead |
| Mitigation | בדיקה ידנית + Axe + Lighthouse, יועץ נגישות חיצוני, הצהרת נגישות באתר |
| Contingency | "מצב הנגשה" מצומצם אם לא הספקנו הכל; טופס יצירת קשר נגיש |
| Deadline סגירה | D-21 |
| Status | פתוח 🔴 |

---

### 🟡 R05 — Performance — המערכת קורסת תחת עומס מקבילי
| שדה | ערך |
|---|---|
| תיאור | Load tests עוד לא בוצעו; חוסר connection pooler, N+1, sql.js |
| Probability | 4 |
| Impact | 4 (downtime, אובדן לקוח פיילוט) |
| Score | **16** 🔴 |
| Owner | Performance Lead |
| Mitigation | Load + Stress test, indexing, query optimization, PgBouncer, Redis cache, CDN |
| Contingency | Vertical scaling זמני, Rate limiting אגרסיבי, queue ל-write |
| Deadline סגירה | D-14 |
| Status | פתוח 🟡 |

---

### 🟡 R06 — הגירת נתונים מהמערכת הקיימת נכשלת או מאבדת מידע
| שדה | ערך |
|---|---|
| תיאור | Migration script לא נבדק בנפח אמיתי; פערי schema |
| Probability | 3 |
| Impact | 5 (אובדן היסטוריה, אובדן אמון לקוח) |
| Score | **15** 🟡 |
| Owner | DBA |
| Mitigation | dry-run 2+ פעמים ב-staging, validation suite אחרי הגירה, snapshot לפני |
| Contingency | rollback מלא תוך 30 דק', שמירת מערכת ישנה read-only למשך 90 ימים |
| Deadline סגירה | D-21 |
| Status | פתוח 🟡 |

---

### 🟡 R07 — תלות בספק חיצוני יחיד (Vendor Lock)
| שדה | ערך |
|---|---|
| תיאור | תלות עיוורת ב-Single API (חשבונית ירוקה למשל); אם down, אנחנו down |
| Probability | 3 |
| Impact | 4 |
| Score | **12** 🟡 |
| Owner | Backend Lead |
| Mitigation | adapter pattern מאפשר החלפת ספק, חוזה SLA, monitoring על ספק |
| Contingency | adapter שני (iCount) מוכן לעבור אליו בתוך 24h |
| Deadline סגירה | Phase 2 |
| Status | פתוח 🟡 |

---

### 🟡 R08 — חוסר כיסוי בדיקות גורם לרגרסיות
| שדה | ערך |
|---|---|
| תיאור | 0% coverage באזורים קריטיים = כל שינוי הוא הימור |
| Probability | 5 |
| Impact | 3 (לא Critical אבל פוגע ביציבות) |
| Score | **15** 🟡 |
| Owner | QA Lead |
| Mitigation | יעד 70% coverage ב-Phase 0, regression suite אוטומטי לילי |
| Contingency | Code freeze לקראת release, Manual QA Sprint |
| Deadline סגירה | D-21 |
| Status | פתוח 🟡 |

---

### 🟡 R09 — אובדן חבר צוות מפתח (Bus Factor)
| שדה | ערך |
|---|---|
| תיאור | חבר צוות יחיד מכיר אזור — אם עוזב, אובדן זמן |
| Probability | 2 |
| Impact | 4 |
| Score | **8** 🟡 |
| Owner | Engineering Manager |
| Mitigation | Pair programming, code reviews, תיעוד ארכיטקטוני, knowledge sharing שבועי |
| Contingency | Contractor backup מוכן להצטרף תוך שבועיים |
| Deadline סגירה | מתמשך |
| Status | פתוח 🟢 (בקרה) |

---

### 🟢 R10 — לקוח פיילוט מבטל לפני Go-Live
| שדה | ערך |
|---|---|
| תיאור | לקוח פיילוט מתאכזב מהקצב או מהיציבות ועוזב |
| Probability | 2 |
| Impact | 3 |
| Score | **6** 🟢 |
| Owner | Product Manager |
| Mitigation | תקשורת שקופה, ציפיות ברורות, הנחה כספית, שני לקוחות פיילוט |
| Contingency | לקוח Standby מאושר, transition plan |
| Deadline סגירה | מתמשך |
| Status | מנוטר 🟢 |

---

## Heat Map (Probability × Impact)

```
        Impact →
        1    2    3    4    5
   1    .    .    .    .    .
P  2    .    .   R10   .    .
r  3    .    .    .   R07  R03 R06
o  4    .    .    .   R04   R02
b  5    .    .   R08   .    R01
   ↓
```

## Risk Treatment Plan

| Score Range | Action |
|---|---|
| 16-25 | סגירה לפני Go-Live, סקירה שבועית עם הנהלה |
| 7-15 | תכנית טיפול מתועדת, סקירה דו-שבועית |
| 1-6 | בקרה תקופתית, ללא דרישה מיידית |

---

## בעלי תפקיד

- **Risk Owner Group**: Launch Owner, CTO, CISO, Finance Lead, Product Manager
- **תדירות עדכון**: כל יום שלישי, 14:00
- **Escalation**: סיכון אדום שלא נסגר תוך 2 שבועות = סקירה ברמת CEO

</div>
