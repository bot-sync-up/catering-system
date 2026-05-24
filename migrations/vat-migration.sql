-- =============================================================================
-- vat-migration.sql
-- -----------------------------------------------------------------------------
-- מיגרציית מע"מ: 17% → 18% החל מ-1/1/2025
--
-- מטרה: עדכון רשומות Invoice / Receipt / InvoiceLine "פתוחות" שתאריך החיוב
--       שלהן הוא ב-1/1/2025 ואחריו, אך עדיין נושאות vatRate=17.
--
-- אסטרטגיה: שמירה על net (סכום ללא מע"מ) ועדכון של vatAmount + grossAmount.
--           רשומות שסטטוסן closed/paid/cancelled לא נוגעים בהן (אלו דיווחים
--           היסטוריים סופיים).
--
-- בטיחות:
--   1. הרץ את כל הסקריפט בתוך טרנזקציה אחת (BEGIN/COMMIT)
--   2. בצע גיבוי לפני ההרצה!
--   3. הרץ קודם את ה-SELECT בסעיף 0 לבדיקת היקף השפעה
--   4. הסקריפט idempotent - שניתן להרצה חוזרת בלי נזק
--
-- מתאים ל-PostgreSQL. ל-MySQL/SQL Server יש להמיר תחביר ROUND/דקדוק טרנזקציה.
-- =============================================================================

BEGIN;

-- =========================================================================
-- 0. דוח לפני (Dry-Run): כמה רשומות יושפעו?
-- =========================================================================
DO $$
DECLARE
  invoice_count INT;
  line_count INT;
  receipt_count INT;
BEGIN
  SELECT COUNT(*) INTO invoice_count
  FROM "Invoice"
  WHERE "invoiceDate" >= DATE '2025-01-01'
    AND "vatRate" = 0.17
    AND "status" IN ('open', 'draft');

  SELECT COUNT(*) INTO line_count
  FROM "InvoiceLine" il
  JOIN "Invoice" i ON i.id = il."invoiceId"
  WHERE i."invoiceDate" >= DATE '2025-01-01'
    AND il."vatRate" = 0.17
    AND i."status" IN ('open', 'draft');

  SELECT COUNT(*) INTO receipt_count
  FROM "Receipt"
  WHERE "receiptDate" >= DATE '2025-01-01'
    AND "vatRate" = 0.17
    AND "status" IN ('open', 'draft');

  RAISE NOTICE 'VAT migration - יושפעו: % חשבוניות, % שורות חשבונית, % קבלות',
    invoice_count, line_count, receipt_count;
END $$;

-- =========================================================================
-- 1. גיבוי לטבלאות-עזר (rollback safety net)
-- =========================================================================
CREATE TABLE IF NOT EXISTS "vat_migration_backup_invoice" AS
SELECT id, "vatRate", "vatAmount", "grossAmount", "netAmount", NOW() AS backed_up_at
FROM "Invoice"
WHERE "invoiceDate" >= DATE '2025-01-01'
  AND "vatRate" = 0.17
  AND "status" IN ('open', 'draft');

CREATE TABLE IF NOT EXISTS "vat_migration_backup_invoice_line" AS
SELECT il.id, il."invoiceId", il."vatRate", il."vatAmount", il."grossAmount", il."netAmount", NOW() AS backed_up_at
FROM "InvoiceLine" il
JOIN "Invoice" i ON i.id = il."invoiceId"
WHERE i."invoiceDate" >= DATE '2025-01-01'
  AND il."vatRate" = 0.17
  AND i."status" IN ('open', 'draft');

CREATE TABLE IF NOT EXISTS "vat_migration_backup_receipt" AS
SELECT id, "vatRate", "vatAmount", "grossAmount", "netAmount", NOW() AS backed_up_at
FROM "Receipt"
WHERE "receiptDate" >= DATE '2025-01-01'
  AND "vatRate" = 0.17
  AND "status" IN ('open', 'draft');

-- =========================================================================
-- 2. עדכון שורות חשבונית (InvoiceLine) - לפני האם, כדי שהאם תתאם
-- =========================================================================
UPDATE "InvoiceLine" il
SET
  "vatRate"    = 0.18,
  "vatAmount"  = ROUND( (il."netAmount" * 0.18)::numeric, 2 ),
  "grossAmount"= ROUND( (il."netAmount" * 1.18)::numeric, 2 ),
  "updatedAt"  = NOW()
FROM "Invoice" i
WHERE il."invoiceId" = i.id
  AND i."invoiceDate" >= DATE '2025-01-01'
  AND il."vatRate" = 0.17
  AND i."status" IN ('open', 'draft');

-- =========================================================================
-- 3. עדכון חשבוניות (Invoice) - שיעור, סיכומים
-- =========================================================================
UPDATE "Invoice"
SET
  "vatRate"     = 0.18,
  "vatAmount"   = ROUND( ("netAmount" * 0.18)::numeric, 2 ),
  "grossAmount" = ROUND( ("netAmount" * 1.18)::numeric, 2 ),
  "updatedAt"   = NOW(),
  "vatMigratedAt" = NOW()
WHERE "invoiceDate" >= DATE '2025-01-01'
  AND "vatRate" = 0.17
  AND "status" IN ('open', 'draft');

-- =========================================================================
-- 4. עדכון קבלות (Receipt) פתוחות
-- =========================================================================
UPDATE "Receipt"
SET
  "vatRate"     = 0.18,
  "vatAmount"   = ROUND( ("netAmount" * 0.18)::numeric, 2 ),
  "grossAmount" = ROUND( ("netAmount" * 1.18)::numeric, 2 ),
  "updatedAt"   = NOW()
WHERE "receiptDate" >= DATE '2025-01-01'
  AND "vatRate" = 0.17
  AND "status" IN ('open', 'draft');

-- =========================================================================
-- 5. הגדרת ברירת מחדל חדשה ל-DB (אם קיים DEFAULT 0.17 על העמודה)
-- הערה: רץ רק אם המבנה תומך - אם נכשל, אל תפיל את הטרנזקציה
-- =========================================================================
DO $$
BEGIN
  BEGIN
    ALTER TABLE "Invoice"     ALTER COLUMN "vatRate" SET DEFAULT 0.18;
    ALTER TABLE "InvoiceLine" ALTER COLUMN "vatRate" SET DEFAULT 0.18;
    ALTER TABLE "Receipt"     ALTER COLUMN "vatRate" SET DEFAULT 0.18;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'דילוג על שינוי DEFAULT - %', SQLERRM;
  END;
END $$;

-- =========================================================================
-- 6. דוח אחרי
-- =========================================================================
DO $$
DECLARE
  updated_inv INT;
  updated_lines INT;
  updated_rec INT;
BEGIN
  SELECT COUNT(*) INTO updated_inv FROM "Invoice"
   WHERE "vatMigratedAt" >= NOW() - INTERVAL '5 minutes';
  SELECT COUNT(*) INTO updated_lines FROM "vat_migration_backup_invoice_line";
  SELECT COUNT(*) INTO updated_rec   FROM "vat_migration_backup_receipt";

  RAISE NOTICE 'VAT migration הסתיים: % חשבוניות, % שורות, % קבלות עודכנו',
    updated_inv, updated_lines, updated_rec;
END $$;

COMMIT;

-- =============================================================================
-- ROLLBACK (במקרה הצורך - הרץ ידנית, לא חלק מהטרנזקציה למעלה)
-- -----------------------------------------------------------------------------
-- UPDATE "Invoice" i
-- SET "vatRate" = b."vatRate", "vatAmount" = b."vatAmount", "grossAmount" = b."grossAmount"
-- FROM "vat_migration_backup_invoice" b
-- WHERE i.id = b.id;
--
-- UPDATE "InvoiceLine" il
-- SET "vatRate" = b."vatRate", "vatAmount" = b."vatAmount", "grossAmount" = b."grossAmount"
-- FROM "vat_migration_backup_invoice_line" b
-- WHERE il.id = b.id;
--
-- UPDATE "Receipt" r
-- SET "vatRate" = b."vatRate", "vatAmount" = b."vatAmount", "grossAmount" = b."grossAmount"
-- FROM "vat_migration_backup_receipt" b
-- WHERE r.id = b.id;
-- =============================================================================
