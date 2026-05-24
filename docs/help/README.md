# מרכז עזרה — Sync Up Catering

מאגר ידע בעברית, ניתן לחיפוש מתוך הדשבורד.

המנוע: כל קובץ Markdown בתיקייה הזו אינדקסי ב-search. קבצי `meta.json` ליד
כל מאמר מגדירים את הכותרת, ה-slug, וה-tags.

## נושאים

- [התחלת עבודה](getting-started.md)
- [ניהול הזמנות](orders.md)
- [תפריטים ופריטים](menus.md)
- [תפעול אירוע](events.md)
- [חשבוניות וגבייה](invoices.md)
- [צוות](employees.md)
- [רכבים ומשלוחים](deliveries.md)
- [חידושים: QR, AR, Passkeys](innovation.md)
- [פתרון תקלות](troubleshooting.md)
- [שאלות נפוצות](faq.md)

## חיפוש

ה-Frontend טוען את `index.json` הנוצר על ידי `scripts/build-help-index.ts`
(לא חלק מ-PR זה — סקריפט קיים בעץ הראשי). הוא בונה אינדקס Lunr עבור
חיפוש מהיר בצד-לקוח.

## וידאו

קבצי הווידאו ארוכים מדי לאחסון ב-git. במקום זאת:

- `videos/links.json` — מצביע ל-URLs ב-CDN (Bunny / Cloudflare Stream).
- בכל מאמר ניתן לשבץ `<!-- video:slug-name -->` והרנדרר יחליף ב-iframe.
