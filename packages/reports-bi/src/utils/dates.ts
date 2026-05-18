/**
 * עזרי תאריכים — חודש/רבעון/שנה לפי אזור זמן ישראל
 */
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  addMonths,
  format,
  differenceInDays,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Period, DateRange } from "../types.js";

const TZ = "Asia/Jerusalem";

export function bucketStart(d: Date, period: Period): Date {
  const zoned = toZonedTime(d, TZ);
  switch (period) {
    case "month":
      return fromZonedTime(startOfMonth(zoned), TZ);
    case "quarter":
      return fromZonedTime(startOfQuarter(zoned), TZ);
    case "year":
      return fromZonedTime(startOfYear(zoned), TZ);
  }
}

export function bucketEnd(d: Date, period: Period): Date {
  const zoned = toZonedTime(d, TZ);
  switch (period) {
    case "month":
      return fromZonedTime(endOfMonth(zoned), TZ);
    case "quarter":
      return fromZonedTime(endOfQuarter(zoned), TZ);
    case "year":
      return fromZonedTime(endOfYear(zoned), TZ);
  }
}

export function bucketLabel(d: Date, period: Period): string {
  const zoned = toZonedTime(d, TZ);
  switch (period) {
    case "month":
      return format(zoned, "yyyy-MM");
    case "quarter": {
      const q = Math.floor(zoned.getMonth() / 3) + 1;
      return `Q${q}-${zoned.getFullYear()}`;
    }
    case "year":
      return format(zoned, "yyyy");
  }
}

/** מייצר רשימת תחילות-באקטים בין from..to לפי period (כולל) */
export function generateBuckets(range: DateRange, period: Period): Date[] {
  const buckets: Date[] = [];
  let cursor = bucketStart(range.from, period);
  const last = bucketStart(range.to, period);
  while (cursor.getTime() <= last.getTime()) {
    buckets.push(cursor);
    cursor = nextBucket(cursor, period);
  }
  return buckets;
}

export function nextBucket(d: Date, period: Period): Date {
  switch (period) {
    case "month":
      return addMonths(d, 1);
    case "quarter":
      return addMonths(d, 3);
    case "year":
      return addMonths(d, 12);
  }
}

export function daysBetween(a: Date, b: Date): number {
  return differenceInDays(b, a);
}

export function formatHebrewDate(d: Date): string {
  return format(toZonedTime(d, TZ), "dd/MM/yyyy");
}
