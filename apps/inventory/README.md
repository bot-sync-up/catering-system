# מערכת ניהול מלאי (Inventory)

מערכת ניהול מלאי דו-רמתית בעברית עם RTL. מיועדת למטבחים מוסדיים ומסעדות.

## יכולות

- **רמה כפולה**: חומרי גלם (Raw) + מנות מוכנות (Dish), עם BOM (Bill Of Materials).
- **שני מיקומים**: מטבח + מחסן, עם העברות פנימיות.
- **תפוגה + FIFO**: כל נכנס נשמר ב-Lot עם תאריך תפוגה. שליפה לפי FIFO (הקרוב לתפוגה ראשון).
- **סף מינימלי + התראות**: לכל מוצר min/reorder point. התראה אוטומטית כשעוברים את הסף.
- **Reorder → PO אוטומטי**: יצירת טיוטת הזמנת רכש (Purchase Order) למוצרים מתחת לסף.
- **ספירה תקופתית (Cycle Count)**: יצירת רשימת ספירה, רישום ספירה בפועל, התאמות אוטומטיות.
- **שערוך סוף שנה**: דו"ח PDF עם שווי מלאי לפי FIFO לתאריך נתון.
- **Waste**: רישום פחת עם סיבה (פג תוקף, נשפך, נשרף, נזרק וכו').
- **ברקודים**: יצירת ברקוד EAN-13 לכל מוצר, הדפסה מסודרת על דף A4 (PDF).

## הפעלה

```bash
cd inventory
npm install
npm run seed   # נתוני דמה
npm start      # http://localhost:3000
```

## ארכיטקטורה

- Node.js + Express
- SQLite (better-sqlite3) — קובץ אחד `data/inventory.db`
- EJS לתבניות, RTL עברית
- API JSON תחת `/api/*`
- שכבת שירות (`lib/services/`) מפרידה לוגיקה עסקית מ-routes

## מבנה הסכימה

| טבלה | תפקיד |
|---|---|
| `Product` | מוצר (raw / dish), ברקוד, יחידת מידה, סף מינ' |
| `Location` | מיקומים (מטבח/מחסן) |
| `StockLevel` | מצב מלאי כולל לכל מוצר/מיקום |
| `Lot` | מנת קבלה ספציפית (FIFO + תפוגה) |
| `InventoryMovement` | תנועה: IN / OUT / ADJUST / WASTE / TRANSFER |
| `BOM` | מתכון: dish ⇽ raw + כמות |
| `Supplier` | ספק |
| `PurchaseOrder` + `POLine` | הזמנת רכש |
| `CycleCount` + `CycleCountLine` | ספירה תקופתית |
| `WasteReason` | סיבות פחת |
| `Alert` | התראות |

## נקודות API עיקריות

- `GET/POST /api/products`
- `POST /api/movements` — תנועה ידנית
- `POST /api/dishes/:id/produce` — ייצור מנה (קורא BOM, מפחית רכיבים)
- `POST /api/transfers` — העברה בין מיקומים
- `GET /api/alerts`
- `POST /api/po/auto` — יצירת PO אוטומטי לכל המוצרים מתחת לסף
- `POST /api/cyclecount` / `POST /api/cyclecount/:id/finalize`
- `GET /api/valuation.pdf?date=YYYY-MM-DD`
- `GET /api/barcodes.pdf?ids=1,2,3`
