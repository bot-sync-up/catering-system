-- ========================================================================
-- audit-enforcement: rls.sql
-- Row-Level Security ל-AuditLog.
--   - GENERAL_ADMIN רואה הכל
--   - שאר התפקידים — רק רשומות עם tenant_id התואם לפרמטר session
-- ========================================================================

-- הפעלת RLS על הטבלה
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

-- מחיקת מדיניות קודמת אם קיימת
DROP POLICY IF EXISTS audit_log_admin_all ON "AuditLog";
DROP POLICY IF EXISTS audit_log_tenant_scope ON "AuditLog";
DROP POLICY IF EXISTS audit_log_insert_open ON "AuditLog";

-- GENERAL_ADMIN רואה הכל ב-SELECT
CREATE POLICY audit_log_admin_all ON "AuditLog"
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'GENERAL_ADMIN'
  );

-- שאר התפקידים — רק לפי tenant_id התואם
CREATE POLICY audit_log_tenant_scope ON "AuditLog"
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IS DISTINCT FROM 'GENERAL_ADMIN'
    AND "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- INSERT פתוח (המידלוור אחראי לכתיבה תמיד) — אבל UPDATE/DELETE חסומים ע"י triggers.sql
CREATE POLICY audit_log_insert_open ON "AuditLog"
  FOR INSERT
  WITH CHECK (true);

-- ============================
-- שימוש מהאפליקציה:
-- בתחילת כל בקשה (לפני queries):
--   SET LOCAL app.current_user_role = 'GENERAL_ADMIN';
--   SET LOCAL app.current_tenant_id = 'tenant_abc';
-- במידלוור Prisma מומלץ לעטוף ב-$transaction:
--   prisma.$transaction(async (tx) => {
--     await tx.$executeRaw`SELECT set_config('app.current_user_role', ${role}, true)`;
--     await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
--     ...
--   });
-- ============================
