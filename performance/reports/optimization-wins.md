# רשימת ניצחונות אופטימיזציה

> תיעוד היסטורי של שיפורים שהוטמעו ומדדים לפני/אחרי. עוזר להראות ROI ולמנוע רגרסיות.

## תבנית פר-שיפור

```md
### [YYYY-MM-DD] כותרת קצרה

**זיהוי:** איך מצאנו את הבעיה (k6 / flame graph / pg_stat_statements / RUM).

**הבעיה:** תיאור טכני קצר.

**פתרון:** מה שונה. לינק ל-PR.

**מדדים לפני:**
- p95: __ms
- error rate: __%
- DB CPU: __%

**מדדים אחרי:**
- p95: __ms (−__%)
- error rate: __% (−__%)
- DB CPU: __% (−__%)

**ROI:** משמעות עסקית - שמירה על חיוב/CDN/חוויית משתמש.
```

---

## דוגמאות מילוי

### [2025-12-10] הוספת אינדקס על `orders(customer_id, status, created_at)`

**זיהוי:** ב-`pg_stat_statements` ראינו ש-`SELECT ... FROM orders WHERE customer_id=? AND status='active'` עושה seq_scan על 4.2M שורות, mean 320ms.

**הבעיה:** טבלת orders ללא אינדקס composite מתאים. dashboard לקוח טוען 12 שאילתות כאלה, סך p95 4.1s.

**פתרון:**
```sql
CREATE INDEX CONCURRENTLY idx_orders_customer_status_created
  ON orders (customer_id, status, created_at DESC)
  WHERE deleted_at IS NULL;
```
PR: `#1234`

**מדדים לפני:**
- order_list p95: 380ms
- dashboard TTFB: 4100ms
- DB CPU peak: 78%

**מדדים אחרי:**
- order_list p95: 38ms (−90%)
- dashboard TTFB: 920ms (−77%)
- DB CPU peak: 41% (−47%)

**ROI:** הסרת תלונות לקוחות B2B, חיסכון בצורך לעלות instance של RDS.

---

### [2025-11-22] מעבר ל-AVIF + next/image בתמונות hero

**זיהוי:** PageSpeed Insights על דף קטגוריה הראה LCP 3.8s, 87% מהזמן על תמונה.

**הבעיה:** תמונות JPG מקוריות 800KB עברו כמו שהן. ללא srcset, ללא lazy על תמונות שאינן LCP.

**פתרון:**
- כל `<img>` -> `<Image>` של Next עם width/height.
- `formats: ['image/avif', 'image/webp']` ב-`next.config.js`.
- `priority` רק על תמונת hero ראשונה, השאר lazy.

**מדדים לפני:**
- LCP (75th percentile): 3.8s
- Transfer per page: 2.1MB
- Image weight: 1.6MB

**מדדים אחרי:**
- LCP: 1.4s (−63%)
- Transfer per page: 480KB (−77%)
- Image weight: 180KB (−89%)

**ROI:** Mobile bounce rate 38% → 21%, SEO ranking שיפור ב-3 דפים מרכזיים.

---

### [2025-10-15] SWR cache למוצרים במקום cache-aside פשוט

**זיהוי:** spike test - בכל ramp ב-VUs, mean_exec_time של `findProduct` קופץ פי 4 ל-30s.

**הבעיה:** thundering herd - כש-TTL פוגע, 100 בקשות בו-זמנית טוענות מ-DB.

**פתרון:** SWR pattern עם single-flight ב-Redis. ראה `caching/redis-strategy.md`.

**מדדים לפני:**
- product_detail p95 בעת cache miss: 1800ms
- DB CPU spikes: 95% במשך 8s כל 5min
- Errors during spike: 2.3%

**מדדים אחרי:**
- product_detail p95: 45ms (תמיד מוגש מ-cache)
- DB CPU steady: 22%
- Errors during spike: 0.04%

**ROI:** ביטול תיקופי הזמנות שכשלו בגלל timeouts, חיסכון 2 שעות תמיכה בשבוע.

---

### [2025-09-08] code splitting של PaymentModal

**זיהוי:** bundle analyzer הראה ש-`cardcom-sdk` (140KB) ב-First Load JS של הקטלוג.

**הבעיה:** רק 12% מהמשתמשים מגיעים לתשלום, אבל 100% מורידים את ה-SDK.

**פתרון:** `dynamic(() => import('./PaymentModal'))` + לחיצה ראשונה טוענת.

**מדדים לפני:**
- First Load JS דף קטגוריה: 312KB
- TTI מובייל: 4.2s
- LCP: 2.8s

**מדדים אחרי:**
- First Load JS: 178KB (−43%)
- TTI: 2.6s (−38%)
- LCP: 1.9s (−32%)

**ROI:** קונברז'ן בקטלוג +6%.

---

## מסקנות מצטברות

- אל תסמוך על "המערכת מספיק מהירה" - מדוד.
- אינדקסים compound יכולים להחזיר 90% של ה-CPU בלי לגעת בקוד.
- SWR > cache-aside בכל מקרה שאפשר.
- כל KB של JS שלא מוריד מובייל = שיפור TTI לכל המשתמשים.
- אופטימיזציות תמונות (AVIF, sizing) הם low-hanging fruit עם ROI ענק.
