-- E2E test seed (idempotent).
-- Truncates ONLY test rows (metadata->>'e2e' = 'true') then inserts baseline data.

BEGIN;

DELETE FROM payments WHERE metadata->>'e2e' = 'true';
DELETE FROM invoices WHERE metadata->>'e2e' = 'true';
DELETE FROM orders   WHERE metadata->>'e2e' = 'true';
DELETE FROM events   WHERE metadata->>'e2e' = 'true';
DELETE FROM customers WHERE metadata->>'e2e' = 'true';

-- Test users (passwords are bcrypt hashes of the values in fixtures/users.json)
INSERT INTO users (email, password_hash, role, full_name, is_2fa_enabled, totp_secret, metadata)
VALUES
  ('admin@test.local',    '$2b$10$E2E.placeholder.hash.admin......................', 'admin',          'מנהל מערכת',  true,  'JBSWY3DPEHPK3PXP', '{"e2e":"true"}'),
  ('agent@test.local',    '$2b$10$E2E.placeholder.hash.agent......................', 'sales_agent',    'סוכן מכירות',  false, NULL,             '{"e2e":"true"}'),
  ('kitchen@test.local',  '$2b$10$E2E.placeholder.hash.kitchen....................', 'kitchen_manager','מנהל מטבח',    false, NULL,             '{"e2e":"true"}'),
  ('payroll@test.local',  '$2b$10$E2E.placeholder.hash.payroll....................', 'payroll_clerk',  'פקיד שכר',    false, NULL,             '{"e2e":"true"}'),
  ('customer@test.local', '$2b$10$E2E.placeholder.hash.customer...................', 'customer',       'ישראל ישראלי', false, NULL,             '{"e2e":"true"}'),
  ('school@test.local',   '$2b$10$E2E.placeholder.hash.school.....................', 'customer',       'בית ספר אהבת תורה', false, NULL,         '{"e2e":"true"}'),
  ('employee@test.local', '$2b$10$E2E.placeholder.hash.employee...................', 'employee',       'דוד כהן',     false, NULL,             '{"e2e":"true"}')
ON CONFLICT (email) DO UPDATE SET metadata = EXCLUDED.metadata;

-- Baseline catalog: menus
INSERT INTO menus (id, name, price_per_person, kosher_level, metadata) VALUES
  ('MENU-WEDDING-PREMIUM', 'תפריט חתונה פרימיום', 320, 'מהדרין', '{"e2e":"true"}'),
  ('MENU-WEDDING-CLASSIC', 'תפריט חתונה קלאסי',  250, 'רבנות',  '{"e2e":"true"}'),
  ('MENU-SCHOOL-DAILY',    'תפריט בית ספר יומי',  22, 'מהדרין', '{"e2e":"true"}'),
  ('MENU-BARMITZVAH',      'תפריט בר מצווה',     180, 'מהדרין', '{"e2e":"true"}'),
  ('MENU-BUSINESS',        'תפריט כנס עסקי',     145, 'רבנות',  '{"e2e":"true"}')
ON CONFLICT (id) DO NOTHING;

-- Baseline leads (for RBAC test - agent should only see their own)
INSERT INTO leads (id, owner_email, customer_name, phone, metadata) VALUES
  ('LEAD-1001', 'agent@test.local',  'משפחת לוי',     '0501112222', '{"e2e":"true"}'),
  ('LEAD-1002', 'agent@test.local',  'משפחת כהן',     '0503334444', '{"e2e":"true"}'),
  ('LEAD-1003', 'admin@test.local',  'משפחת אברהמי',  '0505556666', '{"e2e":"true"}')
ON CONFLICT (id) DO NOTHING;

COMMIT;
