-- אתחול Postgres — מערכת קייטרינג
-- רץ אוטומטית בעת הרמת ה-container בפעם הראשונה

-- אזור זמן ישראל
SET TIME ZONE 'Asia/Jerusalem';

-- הרחבות נדרשות
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- חיפוש עברית fuzzy
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- מסד shadow ל-Prisma migrations
CREATE DATABASE catering_shadow WITH OWNER catering;
