-- ========================================================================
-- audit-enforcement: triggers.sql
-- אכיפת append-only ברמת מסד הנתונים — אסור UPDATE/DELETE/TRUNCATE על AuditLog.
-- אפילו DBA לא יכול לעקוף ללא הסרת ה-trigger במפורש (פעולה מבוקרת).
-- ========================================================================

-- שיטה: trigger BEFORE שמרים שגיאה (RAISE EXCEPTION) על כל ניסיון כתיבה
-- שאינו INSERT. זה לא מסתמך על הרשאות אלא אוכף לוגית.

CREATE OR REPLACE FUNCTION audit_log_block_modifications()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'AuditLog הוא append-only: פעולת % נחסמה. שורה: %',
    TG_OP, COALESCE(OLD.id::text, 'N/A')
    USING ERRCODE = 'check_violation',
          HINT = 'אם נדרשת ארכיון, השתמש ב-retention.sql בלבד.';
END;
$$;

-- חסימת UPDATE
DROP TRIGGER IF EXISTS audit_log_no_update ON "AuditLog";
CREATE TRIGGER audit_log_no_update
BEFORE UPDATE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION audit_log_block_modifications();

-- חסימת DELETE
DROP TRIGGER IF EXISTS audit_log_no_delete ON "AuditLog";
CREATE TRIGGER audit_log_no_delete
BEFORE DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION audit_log_block_modifications();

-- חסימת TRUNCATE (חייב להיות statement-level)
CREATE OR REPLACE FUNCTION audit_log_block_truncate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog הוא append-only: TRUNCATE נחסם'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_truncate ON "AuditLog";
CREATE TRIGGER audit_log_no_truncate
BEFORE TRUNCATE ON "AuditLog"
FOR EACH STATEMENT
EXECUTE FUNCTION audit_log_block_truncate();

-- אופציונלי: גם על טבלת login_attempts ושאר טבלאות הביקורת
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['LoginAttempt', 'SensitiveAccess', 'PermissionDenied']) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I_no_update ON %I', t, t);
      EXECUTE format(
        'CREATE TRIGGER %I_no_update BEFORE UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION audit_log_block_modifications()',
        t, t);
    END IF;
  END LOOP;
END $$;

-- הערה: ב-Prisma migrate, שמור קובץ זה תחת prisma/migrations/<timestamp>_audit_triggers/migration.sql
