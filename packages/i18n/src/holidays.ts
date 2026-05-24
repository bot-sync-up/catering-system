/**
 * חגי ישראל — מטא-דאטה למידע בלוח, סינון משלוחים בכשרות, ועוד.
 *
 * הערה: התאריך הגרגוריאני משתנה כל שנה. הקובץ הזה מספק:
 *   1. רשימת חגים עם שמות וסיווג
 *   2. פונקציה getHolidayOnDate(date) — מזהה אם תאריך מסוים הוא ערב חג / חג / חוה"מ
 *
 * זיהוי לפי לוח עברי בעזרת Intl (ca=hebrew). אין צורך בספרייה חיצונית.
 */

export type HolidayCategory =
  | 'shalosh-regalim' // שלושת הרגלים
  | 'noraim'          // ימים נוראים
  | 'rabani';         // חג דרבנן (חנוכה/פורים)

export type HolidayKind =
  | 'yom-tov'   // חג, אסור במלאכה
  | 'chol-moed' // חול המועד
  | 'erev'      // ערב חג
  | 'taanit'    // צום
  | 'national'; // יום עצמאות וכד'

export interface Holiday {
  id: string;
  he: string;
  en: string;
  ar: string;
  ru: string;
  category: HolidayCategory | 'national';
  kind: HolidayKind;
  /** חודש עברי לפי Intl ('Tishri'…'Elul'/'Adar I'/'Adar II') */
  hebrewMonth: string;
  /** יום בחודש עברי (התחלת החג) */
  hebrewDay: number;
  /** מספר ימים (כולל) — לדוגמה פסח = 7 בא"י / 8 בחו"ל. אנחנו נשתמש ב-7 כברירת מחדל לישראל. */
  durationDays: number;
}

export const HOLIDAYS: readonly Holiday[] = [
  {
    id: 'pesach', he: 'פסח', en: 'Passover', ar: 'عيد الفصح', ru: 'Песах',
    category: 'shalosh-regalim', kind: 'yom-tov',
    hebrewMonth: 'Nisan', hebrewDay: 15, durationDays: 7,
  },
  {
    id: 'shavuot', he: 'שבועות', en: 'Shavuot', ar: 'عيد الأسابيع', ru: 'Шавуот',
    category: 'shalosh-regalim', kind: 'yom-tov',
    hebrewMonth: 'Sivan', hebrewDay: 6, durationDays: 1,
  },
  {
    id: 'sukkot', he: 'סוכות', en: 'Sukkot', ar: 'عيد العرش', ru: 'Суккот',
    category: 'shalosh-regalim', kind: 'yom-tov',
    hebrewMonth: 'Tishri', hebrewDay: 15, durationDays: 7,
  },
  {
    id: 'rosh-hashana', he: 'ראש השנה', en: 'Rosh Hashanah', ar: 'رأس السنة العبرية', ru: 'Рош ха-Шана',
    category: 'noraim', kind: 'yom-tov',
    hebrewMonth: 'Tishri', hebrewDay: 1, durationDays: 2,
  },
  {
    id: 'yom-kippur', he: 'יום כיפור', en: 'Yom Kippur', ar: 'يوم الغفران', ru: 'Йом-Киппур',
    category: 'noraim', kind: 'taanit',
    hebrewMonth: 'Tishri', hebrewDay: 10, durationDays: 1,
  },
  {
    id: 'chanukah', he: 'חנוכה', en: 'Hanukkah', ar: 'حانوكا', ru: 'Ханука',
    category: 'rabani', kind: 'national',
    hebrewMonth: 'Kislev', hebrewDay: 25, durationDays: 8,
  },
  {
    id: 'purim', he: 'פורים', en: 'Purim', ar: 'بوريم', ru: 'Пурим',
    category: 'rabani', kind: 'national',
    hebrewMonth: 'Adar II', hebrewDay: 14, durationDays: 1,
  },
  {
    id: 'tisha-bav', he: 'תשעה באב', en: "Tisha B'Av", ar: 'تساعة بآب', ru: 'Тиша бе-Ав',
    category: 'noraim', kind: 'taanit',
    hebrewMonth: 'Av', hebrewDay: 9, durationDays: 1,
  },
  // יום העצמאות — תאריך גרגוריאני קבוע באפריל/מאי, אבל לפי לוח עברי 5 באייר (עם דחיות)
  {
    id: 'yom-haatzmaut', he: 'יום העצמאות', en: 'Independence Day', ar: 'يوم الاستقلال', ru: 'День Независимости',
    category: 'national', kind: 'national',
    hebrewMonth: 'Iyar', hebrewDay: 5, durationDays: 1,
  },
];

interface HebrewParts {
  day: number;
  month: string;
  year: number;
}

function getHebrewParts(date: Date): HebrewParts {
  const parts = new Intl.DateTimeFormat('en-u-ca-hebrew', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    day: parseInt(get('day'), 10),
    month: get('month'),
    year: parseInt(get('year'), 10),
  };
}

export interface HolidayMatch {
  holiday: Holiday;
  /** האם זה היום הראשון של החג */
  isFirstDay: boolean;
  /** האם זה ערב החג (יום לפני) */
  isErev: boolean;
  /** האם זה חול המועד (יום 2–7 של פסח / יום 2–7 של סוכות) */
  isCholHamoed: boolean;
}

/** בודק אם תאריך גרגוריאני נופל בחג. מחזיר null אם אין חג. */
export function getHolidayOnDate(date: Date): HolidayMatch | null {
  const today = getHebrewParts(date);
  const yesterday = getHebrewParts(new Date(date.getTime() + 86400000)); // המחר — לזיהוי "ערב חג"

  for (const h of HOLIDAYS) {
    // התחלת החג היום?
    if (today.month === h.hebrewMonth && today.day === h.hebrewDay) {
      return { holiday: h, isFirstDay: true, isErev: false, isCholHamoed: false };
    }
    // ערב חג (המחר הוא היום הראשון)?
    if (yesterday.month === h.hebrewMonth && yesterday.day === h.hebrewDay) {
      return { holiday: h, isFirstDay: false, isErev: true, isCholHamoed: false };
    }
    // חול המועד (יום 2..durationDays-1 בפסח/סוכות)
    if (
      (h.id === 'pesach' || h.id === 'sukkot') &&
      today.month === h.hebrewMonth &&
      today.day > h.hebrewDay &&
      today.day < h.hebrewDay + h.durationDays
    ) {
      return { holiday: h, isFirstDay: false, isErev: false, isCholHamoed: true };
    }
  }
  return null;
}

/** שם החג בשפה הנדרשת */
export function holidayName(h: Holiday, locale: 'he' | 'en' | 'ar' | 'ru' | 'am'): string {
  // אין תרגום אמהרית מובחן — נשתמש באנגלית
  if (locale === 'am') return h.en;
  return h[locale];
}
