-- DB indexes audit — run weekly. Output is meant to be eyeballed, not auto-applied.
--
-- Usage:
--   psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -f db-indexes-audit.sql > audit-$(date +%F).txt
--
-- Sections:
--   1. Tables larger than 100 MB with seq-scan-heavy access (candidates for new indexes)
--   2. Indexes never used (candidates for DROP)
--   3. Duplicate / overlapping indexes
--   4. Indexes bloated > 50% (REINDEX CONCURRENTLY candidates)
--   5. Tables without a PK (almost always a mistake)
--   6. Slowest statements from pg_stat_statements (need pg_stat_statements extension)

\echo '=== 1. Seq-scan-heavy big tables ==='
SELECT
  schemaname || '.' || relname AS table,
  pg_size_pretty(pg_relation_size(relid)) AS size,
  seq_scan, idx_scan,
  ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 1) AS pct_seq,
  n_live_tup AS rows
FROM pg_stat_user_tables
WHERE pg_relation_size(relid) > 100 * 1024 * 1024
  AND seq_scan > idx_scan * 2
ORDER BY pg_relation_size(relid) DESC
LIMIT 30;

\echo ''
\echo '=== 2. Unused indexes (idx_scan = 0) ==='
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  idx_scan
FROM pg_stat_user_indexes
JOIN pg_index USING (indexrelid)
WHERE idx_scan = 0
  AND NOT indisunique
  AND NOT indisprimary
  AND pg_relation_size(indexrelid) > 1024 * 1024
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 50;

\echo ''
\echo '=== 3. Duplicate / overlapping indexes ==='
SELECT
  pg_size_pretty(SUM(pg_relation_size(idx))::bigint) AS size,
  (array_agg(idx))[1] AS idx1,
  (array_agg(idx))[2] AS idx2,
  (array_agg(idx))[3] AS idx3,
  (array_agg(idx))[4] AS idx4
FROM (
  SELECT indexrelid::regclass AS idx,
         (indrelid::text || E'\n' || indclass::text || E'\n' || indkey::text || E'\n' ||
          COALESCE(indexprs::text, '') || E'\n' || COALESCE(indpred::text, '')) AS key
  FROM pg_index
) sub
GROUP BY key
HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;

\echo ''
\echo '=== 4. Bloated indexes (>50% bloat estimate) ==='
SELECT
  schemaname || '.' || tablename AS table,
  indexname,
  pg_size_pretty(pg_relation_size((schemaname||'.'||indexname)::regclass)) AS size,
  ROUND(100.0 * (pg_relation_size((schemaname||'.'||indexname)::regclass) -
    (SELECT relpages FROM pg_class WHERE oid = (schemaname||'.'||indexname)::regclass) * 8192) /
    NULLIF(pg_relation_size((schemaname||'.'||indexname)::regclass), 0), 1) AS bloat_pct
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_relation_size((schemaname||'.'||indexname)::regclass) DESC
LIMIT 30;

\echo ''
\echo '=== 5. Tables without a primary key ==='
SELECT n.nspname AS schema, c.relname AS table
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_index i ON i.indrelid = c.oid AND i.indisprimary
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND i.indrelid IS NULL;

\echo ''
\echo '=== 6. Top 20 statements by total time ==='
SELECT
  ROUND(total_exec_time::numeric, 0) AS total_ms,
  calls,
  ROUND(mean_exec_time::numeric, 1) AS mean_ms,
  ROUND(100.0 * total_exec_time / SUM(total_exec_time) OVER ()::numeric, 2) AS pct,
  LEFT(REGEXP_REPLACE(query, E'\\s+', ' ', 'g'), 200) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
