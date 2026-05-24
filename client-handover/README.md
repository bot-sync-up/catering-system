<div dir="rtl">

# Pack העברה ללקוח — סקירה כללית

מסמך זה הוא מפת הניווט המלאה ל-Pack ההעברה. כל מסמך עומד בפני עצמו, אך מומלץ לקרוא לפי הסדר.

## מבנה התיקיות

```
client-handover/
├── 01-system-overview.md            סקירה עסקית + KPIs
├── 02-architecture.md               תרשימי ארכיטקטורה
├── 03-modules-catalog.md            קטלוג 25 המודולים
├── 04-user-guide-manager.md         מדריך למנהל
├── 05-user-guide-kitchen.md         מדריך למטבח
├── 06-user-guide-driver.md          מדריך לנהג
├── 07-user-guide-customer-portal.md מדריך לפורטל לקוח
├── 08-admin-guide.md                מדריך אדמין מערכת
├── 09-integration-keys.md           איך לקבל מפתחות API
├── 10-pricing-and-plans.md          תוכניות ותמחור
│
├── training/                        חומרי הדרכה
│   ├── admin-training-curriculum.md
│   ├── staff-training-curriculum.md
│   ├── exercises/                   10 תרגילים
│   ├── quiz/                        בחנים
│   └── videos/                      סקריפטים לסרטונים
│
├── scripts/                         סקריפטי Onboarding
│   ├── import-existing-customers.ts
│   ├── import-menus.ts
│   ├── import-suppliers.ts
│   └── setup-tenant.ts
│
├── legal/                           מסמכים משפטיים
│   ├── SLA.md
│   ├── Terms-of-Service.md
│   ├── Privacy-Policy.md
│   ├── DPA-Annex.md
│   └── Acceptance-Criteria.md
│
├── ops/                             תפעול שוטף
│   ├── support-channels.md
│   ├── escalation-matrix.md
│   ├── maintenance-windows.md
│   └── business-continuity.md
│
├── marketing/                       שיווק
│   ├── sales-deck-outline.md
│   ├── website-copy.md
│   └── email-templates.md
│
└── kpis/                            מדדים ודיווח
    ├── monthly-report-template.md
    └── quarterly-business-review.md
```

## איך לקרוא את ה-Pack?

### למנהל הלקוח (PO)
1. `01-system-overview.md`
2. `10-pricing-and-plans.md`
3. `legal/SLA.md` + `Acceptance-Criteria.md`
4. `kpis/` הכל

### לאדמין המערכת
1. `02-architecture.md`
2. `08-admin-guide.md`
3. `09-integration-keys.md`
4. `training/admin-training-curriculum.md`
5. `ops/` הכל

### לצוות העובדים
- כל אחד את ה-`04-...` עד `07-...` הרלוונטי לתפקידו
- `training/staff-training-curriculum.md`

### ל-Implementation Specialist
1. `scripts/` — לפי סדר ביצוע
2. `08-admin-guide.md`
3. `09-integration-keys.md`

### לצוות תמיכה
- `ops/support-channels.md`
- `ops/escalation-matrix.md`
- `08-admin-guide.md`

## גרסה

**Pack Version**: 1.0
**Pack Date**: 2026
**שפת מקור**: עברית (RTL)

## עדכונים

ה-Pack מתעדכן עם כל שדרוג גרסה משמעותי. גרסת ה-Pack מסונכרנת עם גרסת המערכת.

</div>
