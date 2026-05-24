# אסטרטגיית Partitioning ל-Postgres

טבלאות שגדלות בלי הפסקה: `audit_log`, `orders`, `payments`. אחרי כמה מיליוני שורות אינדקסים נהיים איטיים, VACUUM כבד, ושאילתות צריכות לסרוק יותר ויותר.

הפתרון - declarative partitioning (PostgreSQL 11+) לפי תאריך.

## audit_log - partition לפי חודש (RANGE)

```sql
-- 1. צור טבלה חדשה כ-partitioned
CREATE TABLE audit_log_new (
  id           BIGSERIAL,
  entity_type  TEXT NOT NULL,
  entity_id    BIGINT NOT NULL,
  action       TEXT NOT NULL,
  actor_id     BIGINT,
  payload      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 2. אינדקסים מקומיים על השורש - יורשים לכל partition חדש
CREATE INDEX ON audit_log_new (entity_type, entity_id, created_at DESC);
CREATE INDEX ON audit_log_new USING brin (created_at);

-- 3. צור partitions ל-12 חודשים קדימה
DO $$
DECLARE
  m DATE := DATE_TRUNC('month', NOW())::DATE;
BEGIN
  FOR i IN 0..12 LOOP
    EXECUTE format(
      'CREATE TABLE audit_log_y%sm%s PARTITION OF audit_log_new
         FOR VALUES FROM (%L) TO (%L)',
      TO_CHAR(m + (i || ' month')::INTERVAL, 'YYYY'),
      TO_CHAR(m + (i || ' month')::INTERVAL, 'MM'),
      m + (i || ' month')::INTERVAL,
      m + ((i+1) || ' month')::INTERVAL
    );
  END LOOP;
END $$;

-- 4. backfill מהטבלה הישנה ב-chunks
INSERT INTO audit_log_new
  SELECT * FROM audit_log WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01';
-- חזור על זה לכל חודש, או השתמש ב-pg_partman לאוטומציה.

-- 5. החלפה אטומית
BEGIN;
  ALTER TABLE audit_log RENAME TO audit_log_old;
  ALTER TABLE audit_log_new RENAME TO audit_log;
COMMIT;

-- 6. אחרי וידוא - DROP
-- DROP TABLE audit_log_old;
```

## orders - partition לפי tenant + month (composite)

לקוחות B2B עם הרבה הזמנות = partition לכל tenant גדול.

```sql
CREATE TABLE orders_new (
  id           BIGSERIAL,
  tenant_id    BIGINT NOT NULL,
  customer_id  BIGINT NOT NULL,
  status       TEXT NOT NULL,
  total_cents  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id, created_at)
) PARTITION BY LIST (tenant_id);

-- partitions פר-tenant גדול
CREATE TABLE orders_tenant_1 PARTITION OF orders_new FOR VALUES IN (1)
  PARTITION BY RANGE (created_at);
CREATE TABLE orders_tenant_2 PARTITION OF orders_new FOR VALUES IN (2)
  PARTITION BY RANGE (created_at);

-- שאר ה-tenants הקטנים ב-default
CREATE TABLE orders_default PARTITION OF orders_new DEFAULT
  PARTITION BY RANGE (created_at);

-- מתחת לכל אחד - חודשי
CREATE TABLE orders_tenant_1_2026_05 PARTITION OF orders_tenant_1
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
-- ...
```

## payments - partition לפי שנה + status

```sql
CREATE TABLE payments_new (
  id           BIGSERIAL,
  order_id     BIGINT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status       TEXT NOT NULL,
  provider     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- שנתי - payments גודלים לאט יותר מ-audit
CREATE TABLE payments_y2025 PARTITION OF payments_new
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE payments_y2026 PARTITION OF payments_new
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

## אוטומציה - pg_partman

במקום ליצור partitions ידנית:

```sql
CREATE EXTENSION pg_partman;

SELECT partman.create_parent(
  p_parent_table => 'public.audit_log',
  p_control => 'created_at',
  p_type => 'range',
  p_interval => '1 month',
  p_premake => 12
);

-- cron יומי יוצר partitions חדשים ומשלב ישנים
SELECT partman.run_maintenance(p_analyze := true);
```

## ארכוב + drop של partitions ישנים

```sql
-- 1. detach partition של חודש ישן
ALTER TABLE audit_log DETACH PARTITION audit_log_y2024m01;

-- 2. export ל-S3/cold storage
COPY audit_log_y2024m01 TO PROGRAM
  'aws s3 cp - s3://syncup-archive/audit_log_y2024m01.csv.gz --content-encoding gzip'
  WITH (FORMAT CSV, HEADER true);

-- 3. DROP
DROP TABLE audit_log_y2024m01;
```

## תועלת מצופה

- **שאילתות עם WHERE על created_at**: partition pruning מקצץ סריקה פי 10-50.
- **VACUUM**: רץ פר-partition, לא חוסם את כל הטבלה.
- **DROP של ישן**: O(1) במקום `DELETE` כבד.
- **אינדקסים**: קטנים פר-partition = מהירים יותר ונכנסים ל-shared_buffers.

## אזהרות

- כל שאילתה חייבת לכלול את עמודת ה-partition key (`created_at`) ב-WHERE, אחרת יסרוק את כל ה-partitions.
- `UNIQUE constraint` חייב לכלול את ה-partition key.
- `pg_dump` יוצר את כל ה-partitions, בקופי גדול עדיף לעבוד עם pgbackrest.
- planner overhead - אל תיצור > 1000 partitions בלי `enable_partition_pruning`.
