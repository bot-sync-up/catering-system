# כיוון Connection Pool עם PgBouncer

## הבעיה

כל Node process פותח לפחות 10 חיבורי DB. ב-3 instances זה כבר 30. Postgres ב-200 max_connections נחנק מהר תחת ramp-up.

## פתרון - PgBouncer ב-transaction pooling

האפליקציה מתחברת ל-PgBouncer במקום ל-Postgres ישירות. PgBouncer מחזיק pool קטן אל ה-DB ומחלק חיבורים פר-transaction.

## חישוב

```
max_db_connections = (cores × 2) + spindles
```

לשרת 8-core SSD: ~25 חיבורי DB פעילים מספיקים לרוב הצרכים.

| Component | Setting | Value | למה |
|-----------|---------|-------|------|
| Postgres | max_connections | 100 | מספיק עם pgbouncer |
| Postgres | shared_buffers | 25% RAM | כלל אצבע |
| Postgres | effective_cache_size | 75% RAM | רמז ל-planner |
| PgBouncer | pool_mode | transaction | החיוני - מחלק פר-tx |
| PgBouncer | max_client_conn | 2000 | כמה אפליקציה רואה |
| PgBouncer | default_pool_size | 25 | חיבורי DB פר-(db,user) |
| PgBouncer | reserve_pool_size | 5 | תוספת לעומס |
| PgBouncer | server_idle_timeout | 600 | מחזור חיבורים |
| Node pg-pool | max | 10 | סך client→pgbouncer |
| Node pg-pool | idleTimeoutMillis | 30000 | |

## קובץ pgbouncer.ini

```ini
[databases]
syncup_prod = host=10.0.0.5 port=5432 dbname=syncup pool_size=25
syncup_ro   = host=10.0.0.6 port=5432 dbname=syncup pool_size=15 pool_mode=session

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction
max_client_conn = 2000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_idle_timeout = 600
server_lifetime = 3600

# ביצועים
tcp_keepalive = 1
tcp_keepidle = 60
tcp_keepintvl = 10
tcp_keepcnt = 6

# שמירה על stability
server_check_query = SELECT 1
server_check_delay = 10
query_wait_timeout = 30
client_idle_timeout = 0

# מטריקות
stats_period = 60
admin_users = pgbouncer_admin
```

## הגדרת pg client ב-Node

```ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.PG_HOST,           // pgbouncer host
  port: 6432,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  max: 10,                              // קטן! pgbouncer הוא ה-pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // חיוני ב-transaction pooling - אין session state בין txs
  statement_timeout: 30000,
  query_timeout: 30000,
});
```

## אזהרות ב-transaction pooling

ב-transaction mode **אי אפשר** להשתמש ב:
- `SET LOCAL` (תקין רק תוך transaction)
- prepared statements עם שם
- `LISTEN/NOTIFY`
- temp tables
- advisory locks ברמת session

תיקון לורקיים שמשתמשים ב-`LISTEN`: עבור ל-Redis Pub/Sub או צור client נפרד ל-`session pool`.

## מטריקות לניטור

```bash
# ב-PgBouncer admin DB
psql -h pgbouncer -p 6432 pgbouncer -U pgbouncer_admin

SHOW POOLS;        -- cl_active, cl_waiting, sv_active, sv_idle
SHOW STATS;        -- total_query_time, avg_xact_time
SHOW DATABASES;    -- pool_size effective
```

ספים להתראה:
- `cl_waiting > 0` יותר מ-30 שניות = pool קטן מדי
- `sv_active / pool_size > 0.9` = להגדיל pool
- `avg_xact_time > 100ms` = שאילתות איטיות, לא קשור לפול

## תוצאה צפויה

לפני: 30 חיבורי DB פעילים, p95 200ms, חיבורים נדחים תחת spike
אחרי: 25 חיבורי DB פעילים, p95 80ms, 0 חיבורים נדחים עד 2000 clients
