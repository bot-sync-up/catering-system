-- Run once when the cluster initializes. Idempotent.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Hebrew text search config (uses simple dictionary; replace with hunspell if installed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'hebrew') THEN
    CREATE TEXT SEARCH CONFIGURATION hebrew (COPY = simple);
  END IF;
END
$$;
