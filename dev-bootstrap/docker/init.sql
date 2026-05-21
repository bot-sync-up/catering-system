-- init.sql
-- רץ פעם אחת כאשר ה-Postgres cluster מאותחל לראשונה.
-- אידמפוטנטי: כל ההצהרות בטוחות להרצה חוזרת.
-- הקובץ נטען אוטומטית מ-/docker-entrypoint-initdb.d/.

-- ============================================================
-- 1. Extensions על המסד הראשי (catering_dev)
-- ============================================================
\connect catering_dev

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- חיפוש מטושטש לעברית
CREATE EXTENSION IF NOT EXISTS "btree_gin";   -- אינדקסי GIN על עמודות סקלריות
CREATE EXTENSION IF NOT EXISTS "citext";      -- טקסט case-insensitive (אימיילים)
CREATE EXTENSION IF NOT EXISTS "unaccent";    -- הסרת ניקוד לחיפוש

-- Hebrew text-search config (משתמש ב-simple; להחלפה ב-hunspell אם מותקן)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'hebrew') THEN
    CREATE TEXT SEARCH CONFIGURATION hebrew (COPY = simple);
  END IF;
END
$$;

-- ============================================================
-- 2. יצירת מסדי-נתונים נוספים
-- ============================================================
-- catering_test  — מסד לטסטים אוטומטיים
-- catering_shadow — מסד הצללה ל-prisma migrate dev
-- (CREATE DATABASE לא תומך ב-IF NOT EXISTS, לכן בדיקה דרך pg_database)

SELECT 'CREATE DATABASE catering_test OWNER catering'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'catering_test')\gexec

SELECT 'CREATE DATABASE catering_shadow OWNER catering'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'catering_shadow')\gexec

-- ============================================================
-- 3. Extensions על המסדים הנוספים
-- ============================================================
\connect catering_test

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "unaccent";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'hebrew') THEN
    CREATE TEXT SEARCH CONFIGURATION hebrew (COPY = simple);
  END IF;
END
$$;

\connect catering_shadow

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "unaccent";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'hebrew') THEN
    CREATE TEXT SEARCH CONFIGURATION hebrew (COPY = simple);
  END IF;
END
$$;
