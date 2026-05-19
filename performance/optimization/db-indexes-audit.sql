-- ============================================================
-- אודיט אינדקסים - מועמדים להוספה ולמחיקה
-- הרץ אחרי לפחות שבוע של תעבורה מייצגת בייצור.
-- ============================================================

-- ============================================================
-- 1. אינדקסים חסרים: עמודות שלפיהן נעשים סינונים תכופים בלי אינדקס
-- ============================================================
-- שלב א - מצא טבלאות עם הרבה seq_scan
SELECT
  schemaname,
  relname AS table_name,
  seq_scan,
  seq_tup_read,
  seq_tup_read / GREATEST(seq_scan, 1) AS avg_tuples_per_scan,
  pg_size_pretty(pg_relation_size(relid)) AS table_size
FROM pg_stat_user_tables
WHERE seq_scan > 1000
  AND seq_tup_read > 100000
ORDER BY seq_tup_read DESC;

-- שלב ב - הוצא דוגמת WHERE clauses נפוצות מ-pg_stat_statements
SELECT
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  calls,
  LEFT(query, 300) AS query
FROM pg_stat_statements
WHERE query ILIKE '%where%'
  AND mean_exec_time > 50
ORDER BY mean_exec_time * calls DESC
LIMIT 30;

-- ============================================================
-- 2. אינדקסים כפולים (overlap)
-- ============================================================
WITH idx AS (
  SELECT
    indrelid::regclass AS table_name,
    indexrelid::regclass AS index_name,
    array_to_string(indkey, ' ') AS cols,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
  FROM pg_index
)
SELECT a.table_name, a.index_name AS idx_a, b.index_name AS idx_b, a.size, b.size
FROM idx a
JOIN idx b
  ON a.table_name = b.table_name
 AND a.index_name < b.index_name
 AND (b.cols LIKE a.cols || '%' OR a.cols LIKE b.cols || '%')
ORDER BY a.table_name;

-- ============================================================
-- 3. אינדקסים לא בשימוש - מועמדים למחיקה (חוץ מ-pkey/unique)
-- ============================================================
SELECT
  s.schemaname,
  s.relname AS table_name,
  s.indexrelname AS index_name,
  s.idx_scan,
  pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size,
  i.indisunique,
  i.indisprimary
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0
  AND NOT i.indisunique
  AND NOT i.indisprimary
ORDER BY pg_relation_size(s.indexrelid) DESC;

-- ============================================================
-- 4. דוגמאות לאינדקסים שאני ממליץ עליהם בפרויקטים שלנו
-- (התאם את שמות הטבלאות והעמודות לסכמה שלך)
-- כל אינדקס מומלץ נוצר עם CONCURRENTLY כדי לא לחסום ייצור.
-- ============================================================

-- 4.1 הזמנות לפי לקוח+סטטוס+תאריך (lookup hot path)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_status_created
  ON orders (customer_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

-- 4.2 הזמנות שצריך לשלוח - partial index קטן וממוקד
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_pending_shipping
  ON orders (created_at)
  WHERE status = 'pending_shipping' AND deleted_at IS NULL;

-- 4.3 חיפוש לקוחות לפי טלפון - מנורמל
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_phone_normalized
  ON customers (regexp_replace(phone, '\D', '', 'g'));

-- 4.4 חיפוש טקסט חופשי בעברית על שם מוצר
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);
-- דורש: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 4.5 audit log לפי entity + תאריך - hot ב-dashboards
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_entity_created
  ON audit_log (entity_type, entity_id, created_at DESC);

-- 4.6 תשלומים פתוחים לפי customer
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_open
  ON payments (customer_id, due_date)
  WHERE status IN ('pending', 'failed');

-- 4.7 לאירועים - guests by event + RSVP status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_event_rsvp
  ON event_guests (event_id, rsvp_status, updated_at DESC);

-- 4.8 BRIN על audit_log גדול (sequential timestamps)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_created_brin
  ON audit_log USING brin (created_at) WITH (pages_per_range = 32);

-- ============================================================
-- 5. אחרי הוספת אינדקס - ANALYZE לרענון סטטיסטיקות
-- ============================================================
-- ANALYZE orders;
-- ANALYZE customers;
-- ANALYZE products;

-- ============================================================
-- 6. בדיקת השפעה
-- ============================================================
-- EXPLAIN (ANALYZE, BUFFERS) <שאילתה איטית מ-pg_stat_statements>;
-- חפש "Index Scan" ולא "Seq Scan", ו-"shared hit" גבוה.
