<div dir="rtl">

# תרגיל 6 — ייבוא 20 לקוחות מ-CSV

## מטרה
לתרגל ייבוא Bulk של לקוחות.

## זמן
20 דקות

## הוראות

### חלק א' — הכנת ה-CSV

צור קובץ `customers.csv` עם הכותרות הבאות (UTF-8 with BOM):

```csv
name,phone,email,tax_id,address,city,type,price_list
"אבי כהן",052-1111111,avi@a.com,123456789,"רחוב הרצל 1","תל אביב",business,Standard
"בני לוי",054-2222222,beni@b.com,234567890,"דיזנגוף 50","תל אביב",private,Standard
```

צור 20 שורות. אפשר להעתיק מ-Google Sheets.

### חלק ב' — הרצת הסקריפט

1. גש לשרת ה-Ops (או רוץ מקומית):
```bash
node scripts/import-existing-customers.ts --file customers.csv --tenant acme
```
2. עקוב אחר הלוג — אמור להציג:
   - "Parsed 20 rows"
   - "Validated 20 rows"
   - "Imported 20 customers"

### חלק ג' — אימות

1. **CRM ← Customers** — ודא 20 רשומות חדשות
2. בחר לקוח אקראי — ודא שכל הפרטים תקינים
3. הרץ פעם נוספת — מצופה הודעה: "0 imported, 20 duplicates skipped"

## טיפים
- אם יש שגיאות — הסקריפט יוצר `errors.csv` עם השורות הבעייתיות
- ת.ז./ח.פ. עוברים ולידציה אוטומטית

## קריטריון הצלחה
20 לקוחות במערכת + טיפול ב-duplicates.

</div>
