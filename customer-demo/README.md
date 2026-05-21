<div dir="rtl">

# Customer Demo + Sales Materials

> כל החומרים פונים-ללקוח של Sync Up: סביבת דמו, תרחישי הדגמה, חומרי מכירה, סרטונים, provisioning, onboarding, הדרכה, תמיכה, קמפיין trial, פיילוט, ו-Customer Success.

## מבנה תיקיות

| תיקייה | תיאור | קבצים |
|---|---|---|
| `demo-environment/` | הקמת ותחזוקת tenant דמו | 4 |
| `flows/` | 10 תרחישי הדגמה End-to-End | 10 |
| `sales/` | Pitch deck, ROI calculator, case studies, ציטוטים | 8 |
| `videos/` | תסריטי סרטונים + storyboard | 5 |
| `provisioning/` | יצירת sandbox tenant + rate limits + watermark | 3 |
| `demo-site/` | אתר Next.js self-service להרשמת trial | 3 |
| `wizard/` | אשף onboarding ב-8 שלבים | 9 |
| `training/` | Quickstart, bootcamp, הדרכות לפי תפקיד | 6 |
| `support/` | FAQ-50 + Troubleshooting | 2 |
| `trial-campaign/` | קמפיין מייל drip ל-30 ימים | 7 |
| `pilot/` | תוכנית פיילוט, מדדים, חוזה | 3 |
| `customer-success/` | Playbook, Health Score, Churn Prevention | 3 |

## איך להשתמש

### למוכר חדש
1. קרא את `sales/pitch-deck.md` (15 דקות)
2. הכר את 10 התרחישים — מסומנים מ-`flows/01-...` ועד `flows/10-...`
3. שנן 3 ה-case studies
4. ראה את 4 סרטוני הוידאו (תסריטים ב-`videos/scripts/`)

### לפני פגישת מכירות
1. הקם tenant חדש: `customer-demo/demo-environment/setup.md`
2. הרץ `health-check.sh` 5 דקות לפני
3. הכן את הפלואים הרלוונטיים ללקוח שמולך

### בזמן פגישה
- פתח את הפלואים הרלוונטיים ל-prospect
- ה-OCR Magic תמיד עובד (flow 04)
- BI Dashboard (flow 07) מרשים את ה-CFO

### לאחר חתימה
- העבר את הלקוח דרך `wizard/steps/`
- הקצה CSM לפי `customer-success/playbook.md`

## שפה ועיצוב

- כל הקבצים בעברית, RTL מסודר
- שמות קבצים באנגלית (תאימות לטוב יותר)
- שמירה על טון של Sync Up: ענייני, מקצועי, ללא הגזמה

## תרומה ועדכון

עדכונים — דרך PR. כל שינוי במחירים/חוזה/תהליך מחייב אישור VP Sales או VP CS.

</div>
