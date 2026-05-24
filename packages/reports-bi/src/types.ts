/**
 * Types משותפים ל-Reports & BI
 */
import { Decimal } from "decimal.js";

export type Period = "month" | "quarter" | "year";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface TenantScope {
  tenantId: string;
}

export interface PnLBucket {
  /** תחילת התקופה (חודש/רבעון/שנה) */
  periodStart: Date;
  /** תווית תצוגה — לדוגמה "2026-05", "Q2-2026" */
  label: string;
  revenue: Decimal;
  cogs: Decimal;
  grossMargin: Decimal;
  /** באחוזים, 0..100 */
  grossMarginPct: number;
  opex: Decimal;
  ebitda: Decimal;
  /** באחוזים, 0..100 */
  ebitdaMarginPct: number;
}

export interface CashflowPoint {
  periodStart: Date;
  label: string;
  inflow: Decimal;
  outflow: Decimal;
  net: Decimal;
  /** האם זו נקודה היסטורית או חיזוי */
  kind: "actual" | "forecast";
  /** רמת ביטחון (0..1) — רלוונטי רק לחיזוי */
  confidence?: number;
}

export interface VatBucket {
  periodStart: Date;
  label: string;
  outputVat: Decimal; // מע"מ עסקאות (מכירות)
  inputVat: Decimal; // מע"מ תשומות (קניות)
  netVat: Decimal;
  /** שיעור המע"מ שהוחל (תקף 2025: 18%) */
  rate: number;
}

export interface EventProfitability {
  eventId: string;
  eventTitle: string;
  startsAt: Date;
  guestCount: number;
  revenue: Decimal;
  ingredientsCost: Decimal;
  laborCost: Decimal;
  overheadCost: Decimal;
  totalCogs: Decimal;
  grossProfit: Decimal;
  /** באחוזים, 0..100 */
  marginPct: number;
}

export interface InventoryLot {
  productId: string;
  quantity: Decimal;
  unitCost: Decimal;
  acquiredAt: Date;
}

export interface InventoryValuation {
  productId: string;
  productName: string;
  totalQuantity: Decimal;
  totalValue: Decimal;
  /** ממוצע משוקלל לפי FIFO */
  weightedAvgCost: Decimal;
  lots: InventoryLot[];
}

export interface BreakdownRow {
  key: string;
  label: string;
  revenue: Decimal;
  count: number;
  /** % מסך ההכנסות */
  sharePct: number;
}

export interface RetentionCohort {
  /** חודש כניסה */
  cohort: string;
  customers: number;
  /** מפת חודש מאז כניסה → אחוז שמירה (0..100) */
  retention: Record<number, number>;
}

export interface CustomerLtvRow {
  customerId: string;
  customerName: string;
  firstEventAt: Date | null;
  lastEventAt: Date | null;
  totalEvents: number;
  totalRevenue: Decimal;
  avgEventValue: Decimal;
  /** ימים פעילים */
  lifespanDays: number;
  /** LTV חזוי לפי lifespan + תדירות */
  predictedLtv: Decimal;
}

export interface AgingBucket {
  bucket: "0-30" | "31-60" | "61-90" | "90+";
  total: Decimal;
  invoiceCount: number;
}

export interface AgingReport {
  asOf: Date;
  buckets: AgingBucket[];
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    total: Decimal;
    oldestDays: number;
  }>;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predict: (x: number) => number;
}
