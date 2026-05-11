-- =====================================================================
-- DB Index Audit — run as superuser and review weekly.
-- =====================================================================

-- 1. Missing indexes: high seq scans on big tables
SELECT
  schemaname || '.' || relname AS table,
  pg_size_pretty(pg_relation_size(relid)) AS size,
  seq_scan,
  seq_tup_read,
  idx_scan,
  CASE WHEN seq_scan > 0
       THEN round(seq_tup_read::numeric / seq_scan, 1)
  END AS avg_rows_per_seq_scan
FROM pg_stat_user_tables
WHERE pg_relation_size(relid) > 1e7   -- > 10MB
  AND seq_scan > idx_scan * 5
ORDER BY pg_relation_size(relid) DESC
LIMIT 20;

-- 2. Unused indexes (last 30d)
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- 3. Duplicate indexes
SELECT
  pg_size_pretty(SUM(pg_relation_size(idx))::bigint) AS size,
  (array_agg(idx))[1] AS idx1,
  (array_agg(idx))[2] AS idx2
FROM (
  SELECT
    indexrelid::regclass AS idx,
    (indrelid::text || E'\n' || indclass::text || E'\n' || indkey::text || E'\n' || COALESCE(indexprs::text,'') || E'\n' || COALESCE(indpred::text,'')) AS k
  FROM pg_index
) sub
GROUP BY k HAVING COUNT(*) > 1;

-- 4. Bloat
SELECT
  schemaname || '.' || relname AS table,
  n_live_tup,
  n_dead_tup,
  round(n_dead_tup::numeric / NULLIF(n_live_tup,0), 2) AS dead_ratio,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY dead_ratio DESC NULLS LAST
LIMIT 20;

-- 5. Hot queries (pg_stat_statements)
SELECT
  round(total_exec_time::numeric, 2) AS total_ms,
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round((100 * total_exec_time / SUM(total_exec_time) OVER ())::numeric, 1) AS pct,
  left(query, 200) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- 6. Tables without primary key
SELECT n.nspname || '.' || c.relname AS table
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_index i ON i.indrelid = c.oid AND i.indisprimary
WHERE c.relkind = 'r' AND n.nspname = 'public' AND i.indrelid IS NULL;
