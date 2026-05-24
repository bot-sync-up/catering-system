# finance-docs

מערכת מסמכים פיננסיים בעברית RTL.

## סוגי מסמכים
- הצעת מחיר (QUOTE)
- הזמנת לקוח (ORDER) / הזמנת רכש (PO)
- חשבונית עסקה (PROFORMA)
- חשבונית מס — חיוב והקצאה (TAX_INVOICE)
- חשבונית מס + קבלה (TAX_INVOICE_RECEIPT)
- קבלה (RECEIPT)
- חשבונית זיכוי (CREDIT_NOTE)

תגיות: `OFFICIAL` / `UNOFFICIAL`.

## מחזור חיים
```
QUOTE → ORDER → PROFORMA → TAX_INVOICE → RECEIPT
                            └→ TAX_INVOICE_RECEIPT
                            TAX_INVOICE → CREDIT_NOTE
```

## יכולות
- מקדמות באחוזים או סכום קבוע + לוח תשלומים (`Installment`)
- מנוע תזכורות (BullMQ): Email / SMS / WhatsApp בקצב 7/14/30/45 ימים
- חישוב חוב אוטומטי, סטטוסים, OVERDUE לפי `dueDate`
- Aging dashboard: 0-30 / 31-60 / 61-90 / 90+
- הקפאת לקוחות אוטומטית כאשר חוב מעבר לסף ימים (ברירת מחדל 60)
- צ'קים דחויים: רישום, מעקב, התראה שבועית
- Quote → Order → Invoice עם המרות חוקיות (state machine)
- PDF templates RTL + מע"מ 17%
- RBAC: ADMIN / ACCOUNTANT / SALES / VIEWER
- API REST + UI עברית RTL

## הרצה
```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev          # שרת API + UI
npm run worker       # workers ל-BullMQ
```

## בדיקות
```bash
npm test
```

## API קצר
```
POST /api/documents                  # יצירה
POST /api/documents/:id/issue        # הנפקה + תזכורות
POST /api/documents/:id/convert      # המרה (Quote→Order וכו')
POST /api/documents/:id/credit       # זיכוי
GET  /api/documents/:id/pdf          # PDF
POST /api/payments                   # רישום תשלום
POST /api/checks                     # רישום צ'ק דחוי
GET  /api/aging                      # דוח גיול חובות
POST /api/customers/:id/freeze       # הקפאה ידנית
```
