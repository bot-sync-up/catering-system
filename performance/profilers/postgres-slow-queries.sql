-- ============================================================
-- ניתוח שאילתות איטיות ב-Postgres
-- דורש pg_stat_statements (postgresql.conf: shared_preload_libraries='pg_stat_statements')
-- ============================================================

-- 1. הפעלת התוסף (חד-פעמי)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;

-- 2. איפוס סטטיסטיקות לפני ריצת בדיקה
SELECT pg_stat_statements_reset();
SELECT pg_stat_reset();

-- ============================================================
-- אחרי הבדיקה: 20 שאילתות הכי איטיות לפי total_exec_time
-- ============================================================
SELECT
  ROUND((100.0 * total_exec_time / SUM(total_exec_time) OVER ())::numeric, 2) AS pct_total,
  calls,
  ROUND(mean_exec_time::numeric, 2)   AS mean_ms,
  ROUND(stddev_exec_time::numeric, 2) AS stddev_ms,
  ROUND(total_exec_time::numeric, 2)  AS total_ms,
  ROUND((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2) AS cache_hit_pct,
  rows,
  LEFT(query, 200) AS query_snippet
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat%'
ORDER BY total_exec_time DESC
LIMIT 20;

-- ============================================================
-- שאילתות עם p95 גבוה (זנב ארוך)
-- ============================================================
SELECT
  calls,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  ROUND(max_exec_time::numeric, 2)  AS max_ms,
  ROUND(stddev_exec_time::numeric, 2) AS stddev_ms,
  rows / NULLIF(calls, 0) AS avg_rows,
  LEFT(query, 200) AS query_snippet
FROM pg_stat_statements
WHERE calls > 50
ORDER BY max_exec_time DESC
LIMIT 20;

-- ============================================================
-- שאילתות שעושות הרבה I/O דיסק (cache miss)
-- ============================================================
SELECT
  ROUND((100.0 * shared_blks_read / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2) AS miss_pct,
  shared_blks_read AS blks_read,
  shared_blks_hit  AS blks_hit,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  LEFT(query, 200) AS query_snippet
FROM pg_stat_statements
WHERE shared_blks_read > 1000
ORDER BY shared_blks_read DESC
LIMIT 20;

-- ============================================================
-- אינדקסים לא בשימוש (מועמדים למחיקה)
-- ============================================================
SELECT
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 30;

-- ============================================================
-- טבלאות שעושות sequential scan כשיש להן הרבה שורות
-- ============================================================
SELECT
  schemaname,
  relname AS table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup,
  ROUND((100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0))::numeric, 2) AS seq_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
  AND seq_scan > idx_scan
ORDER BY seq_tup_read DESC
LIMIT 20;

-- ============================================================
-- bloat - טבלאות שצריכות VACUUM FULL
-- ============================================================
SELECT
  relname AS table_name,
  n_live_tup,
  n_dead_tup,
  ROUND((100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0))::numeric, 2) AS dead_pct,
  last_autovacuum,
  last_vacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;

-- ============================================================
-- חיבורים פתוחים + שאילתות שרצות עכשיו
-- ============================================================
SELECT
  state,
  COUNT(*) AS connections,
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - state_change)))::numeric, 1) AS avg_age_seconds
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connections DESC;

-- שאילתות שרצות יותר מ-30 שניות
SELECT
  pid,
  NOW() - query_start AS duration,
  state,
  wait_event_type,
  wait_event,
  LEFT(query, 200) AS query_snippet
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '30 seconds'
ORDER BY duration DESC;

-- ============================================================
-- cache hit ratio כללי (חייב להיות >0.95)
-- ============================================================
SELECT
  'index_hit_ratio'::text AS metric,
  ROUND((SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0))::numeric, 4) AS ratio
FROM pg_statio_user_indexes
UNION ALL
SELECT
  'table_hit_ratio',
  ROUND((SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0))::numeric, 4)
FROM pg_statio_user_tables;
