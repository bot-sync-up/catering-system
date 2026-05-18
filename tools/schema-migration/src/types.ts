/**
 * טיפוסים מרכזיים עבור כלי המיגרציה
 *
 * המיגרציה עוברת שלושה שלבים: Extract → Transform → Load.
 * כל פריט נושא `__meta` עם מזהה מקור (sourceModule + originalId) כדי לאפשר
 * ביצוע idempotent (upsert) ו־rollback לפי batch_id.
 */

import type { Decimal } from "decimal.js";

/** המודולים הישנים שאנו ממירים מהם נתונים. */
export type SourceModule =
  | "crm"
  | "orders"
  | "finance-docs"
  | "hr"
  | "fleet"
  | "expenses"
  | "inventory"
  | "marketing";

/** המודלים החדשים בסכמה המאוחדת שאליהם אנו טוענים. */
export type TargetModel =
  | "Tenant"
  | "User"
  | "Customer"
  | "ContactPerson"
  | "Address"
  | "Order"
  | "OrderItem"
  | "Event"
  | "Invoice"
  | "Receipt"
  | "Payment"
  | "Expense"
  | "PettyCash"
  | "BankTransaction"
  | "Employee"
  | "Shift"
  | "TimeEntry"
  | "PayrollRecord"
  | "Vehicle"
  | "Delivery"
  | "Supplier"
  | "Product"
  | "InventoryMovement"
  | "Campaign"
  | "Lead"
  | "AuditLog";

/** מטה־דאטה של פריט מקור — מנוצל לכל extract/transform/load. */
export interface SourceMeta {
  /** המודול הישן שממנו הגיע הפריט. */
  sourceModule: SourceModule;
  /** המזהה המקורי בפורמט הישן (cuid/serial/string). */
  originalId: string;
  /** שם הטבלה הישנה (לצרכי דיווח). */
  sourceTable: string;
  /** zaman חילוץ. */
  extractedAt: Date;
  /** batch_id לרולבק. */
  batchId: string;
}

/** רשומת מקור גנרית — payload חופשי + meta. */
export interface ExtractedRecord<TPayload = Record<string, unknown>> {
  __meta: SourceMeta;
  payload: TPayload;
}

/** רשומה מנורמלת מוכנה ל־load. */
export interface TransformedRecord<TData = Record<string, unknown>> {
  __meta: SourceMeta;
  targetModel: TargetModel;
  /** המזהה החדש (UUID). אם undefined — ייוצר בטעינה. */
  newId?: string;
  data: TData;
  /** מפתח טבעי עבור upsert (למשל: { tenantId, taxId }). */
  upsertKey?: Record<string, unknown>;
  /** התרעות שאינן עוצרות (למשל שדה לא ידוע). */
  warnings: string[];
}

/** תוצאת טעינה לאחר INSERT/UPSERT. */
export interface LoadResult {
  __meta: SourceMeta;
  targetModel: TargetModel;
  newId: string;
  action: "inserted" | "updated" | "skipped";
  error?: string;
}

/** קונפיגורציה גלובלית של ריצת מיגרציה. */
export interface MigrationConfig {
  /** סוג המקור — קובע אילו extractors להפעיל. */
  source: SourceModule | "all";
  /** מזהה דייר יעד (UUID). חובה — אין נתון בלי tenant. */
  targetTenantId: string;
  /** ריצת ניסיון בלבד — אין כתיבה ל־DB. */
  dryRun: boolean;
  /** הגבלת מספר שורות לכל extractor (לבדיקות). */
  limit?: number;
  /** האם להמשיך גם אם שורה כושלת. */
  continueOnError: boolean;
  /** מזהה batch ייחודי לריצה זו (לרולבק). */
  batchId: string;
  /** מחרוזת חיבור DB יעד. */
  targetDatabaseUrl: string;
  /** מחרוזות חיבור DB מקור (key = sourceModule). */
  sourceDatabaseUrls: Partial<Record<SourceModule, string>>;
  /** רמת לוג. */
  verbose: boolean;
}

/** סטטיסטיקת ריצה — שמורה ב־report.json. */
export interface MigrationReport {
  batchId: string;
  startedAt: string;
  finishedAt: string;
  config: Omit<MigrationConfig, "targetDatabaseUrl" | "sourceDatabaseUrls">;
  perModel: Record<
    string,
    {
      extracted: number;
      transformed: number;
      loaded: number;
      skipped: number;
      errors: number;
      durationMs: number;
    }
  >;
  errors: Array<{
    sourceModule: string;
    originalId: string;
    targetModel: string;
    message: string;
    stack?: string;
  }>;
  totals: {
    extracted: number;
    transformed: number;
    loaded: number;
    skipped: number;
    errors: number;
  };
}

/** ממיר Decimal → string/number כדי לאפשר JSON. */
export type DecimalLike = Decimal | string | number;
