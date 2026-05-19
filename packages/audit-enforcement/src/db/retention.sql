-- ========================================================================
-- audit-enforcement: retention.sql
-- ארכוב אוטומטי של רשומות AuditLog ישנות מ-7 שנים (2557 ימים) ל-cold storage.
-- מנגנון: טבלה AuditLogArchive (אותה סכמה) + פונקציה שמועברת ע"י cron יומי.
-- חשוב: triggers.sql חוסם DELETE — לכן כאן אנו עוקפים זאת ע"י העברה מבוקרת
-- בתוך פונקציה SECURITY DEFINER עם הרשאות מיוחדות בלבד.
-- ========================================================================

-- 1) טבלת ארכיון (יוצרים רק אם לא קיימת — סכמה זהה ל-AuditLog)
CREATE TABLE IF NOT EXISTS "AuditLogArchive" (
  LIKE "AuditLog" INCLUDING ALL
);

-- 2) פונקציה שמעבירה רשומות ישנות. SECURITY DEFINER מאפשר לעקוף את
--    החסימה ב-triggers.sql רק אם מוגדרת הרשאה ספציפית למשתמש הפונקציה.
CREATE OR REPLACE FUNCTION archive_old_audit_logs(retention_days INTEGER DEFAULT 2557)
RETURNS TABLE(archived BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - (retention_days * INTERVAL '1 day');
  moved BIGINT := 0;
BEGIN
  -- העברה: INSERT לארכיון
  WITH old AS (
    SELECT * FROM "AuditLog" WHERE "createdAt" < cutoff
  )
  INSERT INTO "AuditLogArchive" SELECT * FROM old;
  GET DIAGNOSTICS moved = ROW_COUNT;

  -- מחיקה — חייבת לעקוף את ה-trigger. עושים זאת ע"י השבתה זמנית
  -- של ה-trigger בתוך הטרנזקציה (LOCAL).
  -- שיטה אחרת: להגדיר את המשתמש המריץ עם attribute BYPASSRLS + הסרת trigger.
  ALTER TABLE "AuditLog" DISABLE TRIGGER audit_log_no_delete;
  DELETE FROM "AuditLog" WHERE "createdAt" < cutoff;
  ALTER TABLE "AuditLog" ENABLE TRIGGER audit_log_no_delete;

  -- רישום הפעולה עצמה ביומן
  INSERT INTO "AuditLog" (
    id, model, action, "recordId", "oldValues", "newValues",
    "userId", ip, "userAgent", "requestId", "tenantId", role, channel,
    "createdAt", hash, "prevHash"
  ) VALUES (
    gen_random_uuid()::text,
    'AuditLog',
    'RETENTION_ARCHIVE',
    NULL,
    jsonb_build_object('cutoff', cutoff),
    jsonb_build_object('movedRows', moved),
    'system',
    NULL, NULL, NULL, NULL, 'SYSTEM', 'system',
    NOW(),
    encode(digest('retention-' || NOW()::text || '-' || moved::text, 'sha256'), 'hex'),
    NULL
  );

  RETURN QUERY SELECT moved;
END;
$$;

-- 3) אופציונלי: pg_cron — מצריך extension. אם זמין, הפעל יומי 03:00.
--    אחרת, BullMQ באפליקציה (ראה integrity/scheduled-check.ts לדוגמה).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    -- הסרת job קודם אם קיים
    PERFORM cron.unschedule('audit-log-retention')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'audit-log-retention');
    PERFORM cron.schedule(
      'audit-log-retention',
      '0 3 * * *',
      $cron$SELECT archive_old_audit_logs(2557);$cron$
    );
  END IF;
END $$;
