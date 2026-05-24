/**
 * עוזרי תאריכים — אזור זמן Asia/Jerusalem.
 * הנקודה המרכזית: now() תמיד מחזירה את "היום" באופן יציב לכל ה-seed.
 */

// "היום" של ה-seed — קבוע כדי שכל הקבצים יחושבו ביחס לאותה נקודה.
const SEED_TODAY = new Date("2026-05-19T10:00:00+03:00");

export function now(): Date {
  return new Date(SEED_TODAY);
}

export function daysAgo(days: number): Date {
  const d = new Date(SEED_TODAY);
  d.setDate(d.getDate() - days);
  return d;
}

export function daysFromNow(days: number): Date {
  const d = new Date(SEED_TODAY);
  d.setDate(d.getDate() + days);
  return d;
}

export function hoursFromNow(hours: number): Date {
  const d = new Date(SEED_TODAY);
  d.setHours(d.getHours() + hours);
  return d;
}

export function atTime(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** התחלת חודש */
export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** סוף חודש */
export function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}
