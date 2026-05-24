-- Migration: 001_audit_log
-- Greenfield setup for the audit log system.
-- After Prisma generates base table DDL, this migration installs:
--   1. Append-only triggers blocking UPDATE / DELETE on audit_logs
--   2. Row-Level Security (RLS) policies for read access
--   3. Helper functions for setting session context (current user / tenant)
--   4. Replication-safe statement-level forbid for TRUNCATE

-- ===========================================================================
-- 1. Session context helpers
--    The application sets app.current_user_id / app.current_tenant_id /
--    app.current_role at the start of every transaction (via Prisma $extends).
-- ===========================================================================

CREATE OR REPLACE FUNCTION audit_set_context(
    p_user_id   TEXT,
    p_tenant_id TEXT,
    p_role      TEXT
) RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id',   COALESCE(p_user_id,   ''), TRUE);
    PERFORM set_config('app.current_tenant_id', COALESCE(p_tenant_id, ''), TRUE);
    PERFORM set_config('app.current_role',      COALESCE(p_role,      ''), TRUE);
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- 2. Append-only enforcement — block UPDATE / DELETE / TRUNCATE
-- ===========================================================================

CREATE OR REPLACE FUNCTION audit_block_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'audit_logs is append-only — % is forbidden (row id=%)',
        TG_OP, COALESCE(OLD.id::TEXT, 'n/a')
        USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION audit_block_modification();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION audit_block_modification();

-- TRUNCATE is statement-level
CREATE OR REPLACE FUNCTION audit_block_truncate()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only — TRUNCATE is forbidden'
        USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_truncate ON audit_logs;
CREATE TRIGGER audit_logs_no_truncate
    BEFORE TRUNCATE ON audit_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION audit_block_truncate();

-- ===========================================================================
-- 3. Stamp timestamp server-side (defence in depth — never trust the client)
-- ===========================================================================

CREATE OR REPLACE FUNCTION audit_force_server_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.timestamp := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_force_ts ON audit_logs;
CREATE TRIGGER audit_logs_force_ts
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION audit_force_server_timestamp();

-- ===========================================================================
-- 4. Row-Level Security — only GENERAL_ADMIN may SELECT, scoped to tenant
-- ===========================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_select ON audit_logs;
CREATE POLICY audit_logs_admin_select
    ON audit_logs
    FOR SELECT
    USING (
        current_setting('app.current_role', TRUE) = 'GENERAL_ADMIN'
        AND (
            tenant_id IS NULL
            OR tenant_id = current_setting('app.current_tenant_id', TRUE)
            OR current_setting('app.current_tenant_id', TRUE) = ''
        )
    );

-- INSERT policy — anyone authenticated may insert (the application enforces who);
-- SELECT is the sensitive direction.
DROP POLICY IF EXISTS audit_logs_any_insert ON audit_logs;
CREATE POLICY audit_logs_any_insert
    ON audit_logs
    FOR INSERT
    WITH CHECK (TRUE);

-- Explicit deny for UPDATE/DELETE through RLS as well (belt & suspenders;
-- triggers above are the real enforcement).
DROP POLICY IF EXISTS audit_logs_no_update_policy ON audit_logs;
CREATE POLICY audit_logs_no_update_policy
    ON audit_logs
    FOR UPDATE
    USING (FALSE);

DROP POLICY IF EXISTS audit_logs_no_delete_policy ON audit_logs;
CREATE POLICY audit_logs_no_delete_policy
    ON audit_logs
    FOR DELETE
    USING (FALSE);

-- ===========================================================================
-- 5. Revoke dangerous grants from the application role
--    (run as the DB super user — replace 'app_user' as appropriate)
-- ===========================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM app_user';
        EXECUTE 'GRANT  SELECT, INSERT             ON audit_logs TO   app_user';
    END IF;
END
$$;
