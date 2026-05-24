// לוח חגים יהודיים-מוסלמיים-לאומיים לישראל
// תאריכים גרגוריאניים מחושבים מראש לשנים 2025-2030
// (בייצור: להתחבר ל-API של hebcal.com או ספריה כמו @hebcal/core)

export type HolidayType =
  | "jewish"
  | "muslim"
  | "national"
  | "christian";

export interface Holiday {
  name: string; // עברית
  nameEn: string;
  type: HolidayType;
  date: string; // YYYY-MM-DD
  /** -1, 0, +1: השפעה על ביקוש לקייטרינג */
  demandImpact: -1 | 0 | 1 | 2;
  notes?: string;
}

// קבצי תאריכים מקובעים. בייצור — לחשב אוטומטית.
export const HOLIDAYS_2025_2030: Holiday[] = [
  // === 2025 ===
  { name: "פסח", nameEn: "Passover", type: "jewish", date: "2025-04-13", demandImpact: 2, notes: "סדר משפחתי, ביקוש שיא לקייטרינג כשר לפסח" },
  { name: "חג השבועות", nameEn: "Shavuot", type: "jewish", date: "2025-06-02", demandImpact: 2, notes: "ארוחות חלביות מסורתיות" },
  { name: "ראש השנה", nameEn: "Rosh Hashanah", type: "jewish", date: "2025-09-23", demandImpact: 2 },
  { name: "יום כיפור", nameEn: "Yom Kippur", type: "jewish", date: "2025-10-02", demandImpact: -1, notes: "צום — ירידה בביקוש" },
  { name: "סוכות", nameEn: "Sukkot", type: "jewish", date: "2025-10-07", demandImpact: 2 },
  { name: "חנוכה", nameEn: "Hanukkah", type: "jewish", date: "2025-12-14", demandImpact: 1 },
  { name: "ראמדן (תחילה)", nameEn: "Ramadan Start", type: "muslim", date: "2025-02-28", demandImpact: 1, notes: "אפטר לאוכלוסייה הערבית" },
  { name: "עיד אל-פיטר", nameEn: "Eid al-Fitr", type: "muslim", date: "2025-03-30", demandImpact: 2 },
  { name: "עיד אל-אדחא", nameEn: "Eid al-Adha", type: "muslim", date: "2025-06-06", demandImpact: 2 },
  { name: "יום העצמאות", nameEn: "Independence Day", type: "national", date: "2025-05-01", demandImpact: 2, notes: "מנגלים, אירועי חברה" },
  { name: "ל\"ג בעומר", nameEn: "Lag BaOmer", type: "jewish", date: "2025-05-16", demandImpact: 1 },

  // === 2026 ===
  { name: "פסח", nameEn: "Passover", type: "jewish", date: "2026-04-02", demandImpact: 2 },
  { name: "חג השבועות", nameEn: "Shavuot", type: "jewish", date: "2026-05-22", demandImpact: 2 },
  { name: "ראש השנה", nameEn: "Rosh Hashanah", type: "jewish", date: "2026-09-12", demandImpact: 2 },
  { name: "יום כיפור", nameEn: "Yom Kippur", type: "jewish", date: "2026-09-21", demandImpact: -1 },
  { name: "סוכות", nameEn: "Sukkot", type: "jewish", date: "2026-09-26", demandImpact: 2 },
  { name: "חנוכה", nameEn: "Hanukkah", type: "jewish", date: "2026-12-04", demandImpact: 1 },
  { name: "ראמדן (תחילה)", nameEn: "Ramadan Start", type: "muslim", date: "2026-02-17", demandImpact: 1 },
  { name: "עיד אל-פיטר", nameEn: "Eid al-Fitr", type: "muslim", date: "2026-03-20", demandImpact: 2 },
  { name: "עיד אל-אדחא", nameEn: "Eid al-Adha", type: "muslim", date: "2026-05-27", demandImpact: 2 },
  { name: "יום העצמאות", nameEn: "Independence Day", type: "national", date: "2026-04-22", demandImpact: 2 },
  { name: "ל\"ג בעומר", nameEn: "Lag BaOmer", type: "jewish", date: "2026-05-05", demandImpact: 1 },

  // === 2027 ===
  { name: "פסח", nameEn: "Passover", type: "jewish", date: "2027-04-22", demandImpact: 2 },
  { name: "חג השבועות", nameEn: "Shavuot", type: "jewish", date: "2027-06-11", demandImpact: 2 },
  { name: "ראש השנה", nameEn: "Rosh Hashanah", type: "jewish", date: "2027-10-02", demandImpact: 2 },
  { name: "סוכות", nameEn: "Sukkot", type: "jewish", date: "2027-10-16", demandImpact: 2 },
  { name: "חנוכה", nameEn: "Hanukkah", type: "jewish", date: "2027-12-25", demandImpact: 1 },
];

const _byDate = new Map<string, Holiday[]>();
for (const h of HOLIDAYS_2025_2030) {
  const arr = _byDate.get(h.date) ?? [];
  arr.push(h);
  _byDate.set(h.date, arr);
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getHolidaysOn(date: Date): Holiday[] {
  return _byDate.get(toIsoDate(date)) ?? [];
}

/**
 * מחזיר את החג הקרוב ביותר (קדימה או אחורה) ואת המרחק בימים.
 */
export function nearestHoliday(
  date: Date,
  withinDays = 14,
): { holiday: Holiday; daysUntil: number } | null {
  const target = date.getTime();
  let best: { holiday: Holiday; daysUntil: number } | null = null;
  for (const h of HOLIDAYS_2025_2030) {
    const dh = new Date(h.date).getTime();
    const days = Math.round((dh - target) / 86_400_000);
    if (Math.abs(days) <= withinDays) {
      if (!best || Math.abs(days) < Math.abs(best.daysUntil)) {
        best = { holiday: h, daysUntil: days };
      }
    }
  }
  return best;
}

/**
 * מחזיר מקדם השפעת חג על ביקוש לתאריך נתון.
 * 1.0 = רגיל, >1 = ביקוש מוגבר, <1 = ירידה.
 */
export function holidayDemandMultiplier(date: Date): number {
  const onDay = getHolidaysOn(date);
  if (onDay.length > 0) {
    const maxImpact = Math.max(...onDay.map((h) => h.demandImpact));
    return 1 + maxImpact * 0.35;
  }
  const near = nearestHoliday(date, 5);
  if (near && near.holiday.demandImpact > 0 && near.daysUntil > 0) {
    // ביקוש להזמנות עולה בימים שלפני חג
    return 1 + (near.holiday.demandImpact * 0.15) / Math.max(1, near.daysUntil);
  }
  return 1.0;
}
