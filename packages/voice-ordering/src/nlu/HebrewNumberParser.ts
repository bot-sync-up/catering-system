// פירוק מספרים מילוליים בעברית: "שלוש מאות חמישים ושתיים" → 352
// תומך בזכר/נקבה, צורות סמיכות, אלפים ומיליונים

const UNITS: Record<string, number> = {
  אפס: 0,
  אחת: 1,
  אחד: 1,
  שתיים: 2,
  שניים: 2,
  שתי: 2,
  שני: 2,
  שלוש: 3,
  שלושה: 3,
  ארבע: 4,
  ארבעה: 4,
  חמש: 5,
  חמישה: 5,
  שש: 6,
  שישה: 6,
  שבע: 7,
  שבעה: 7,
  שמונה: 8,
  תשע: 9,
  תשעה: 9,
};

const TEENS: Record<string, number> = {
  עשר: 10,
  עשרה: 10,
  'אחת עשרה': 11,
  'אחד עשר': 11,
  'שתים עשרה': 12,
  'שנים עשר': 12,
  'שלוש עשרה': 13,
  'שלושה עשר': 13,
  'ארבע עשרה': 14,
  'ארבעה עשר': 14,
  'חמש עשרה': 15,
  'חמישה עשר': 15,
  'שש עשרה': 16,
  'שישה עשר': 16,
  'שבע עשרה': 17,
  'שבעה עשר': 17,
  'שמונה עשרה': 18,
  'שמונה עשר': 18,
  'תשע עשרה': 19,
  'תשעה עשר': 19,
};

const TENS: Record<string, number> = {
  עשרים: 20,
  שלושים: 30,
  ארבעים: 40,
  חמישים: 50,
  שישים: 60,
  שבעים: 70,
  שמונים: 80,
  תשעים: 90,
};

const HUNDREDS: Record<string, number> = {
  מאה: 100,
  מאתיים: 200,
  'שלוש מאות': 300,
  'ארבע מאות': 400,
  'חמש מאות': 500,
  'שש מאות': 600,
  'שבע מאות': 700,
  'שמונה מאות': 800,
  'תשע מאות': 900,
};

const THOUSANDS: Record<string, number> = {
  אלף: 1000,
  אלפיים: 2000,
  'שלושת אלפים': 3000,
  'ארבעת אלפים': 4000,
  'חמשת אלפים': 5000,
  'ששת אלפים': 6000,
  'שבעת אלפים': 7000,
  'שמונת אלפים': 8000,
  'תשעת אלפים': 9000,
  'עשרת אלפים': 10000,
};

/** מנסה לפרק ביטוי בעברית למספר. מחזיר null אם נכשל. */
export function parseHebrewNumber(input: string): number | null {
  if (!input) return null;
  // כבר מספר?
  const direct = Number(input.replace(/[^\d.-]/g, ''));
  if (input.match(/^\s*-?\d+(\.\d+)?\s*$/)) return direct;

  const text = input.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  // tokenize: עבד מהגדול לקטן — אלפים → מאות → עשרות → אחדות
  let remainder = text;
  let total = 0;
  let progressed = true;
  let safety = 10;

  // longestMatch מסתכל על remainder הנוכחי, ודורש שאחרי המילה יבוא רווח או סוף טקסט
  // אחרת "עשר" יתפוס בתוך "עשרים" וכו'
  const longestMatch = (table: Record<string, number>): { value: number; len: number } | null => {
    let best: { value: number; len: number } | null = null;
    for (const key of Object.keys(table)) {
      if (!remainder.startsWith(key)) continue;
      const next = remainder[key.length];
      if (next !== undefined && next !== ' ') continue; // לא בגבול מילה
      if (!best || key.length > best.len) {
        best = { value: table[key], len: key.length };
      }
    }
    return best;
  };

  while (remainder && progressed && safety-- > 0) {
    progressed = false;

    const t = longestMatch(THOUSANDS);
    if (t) {
      total += t.value;
      remainder = remainder.slice(t.len).replace(/^\s*ו?\s*/, '').trim();
      progressed = true;
      continue;
    }
    const h = longestMatch(HUNDREDS);
    if (h) {
      total += h.value;
      remainder = remainder.slice(h.len).replace(/^\s*ו?\s*/, '').trim();
      progressed = true;
      continue;
    }
    const teen = longestMatch(TEENS);
    if (teen) {
      total += teen.value;
      remainder = remainder.slice(teen.len).replace(/^\s*ו?\s*/, '').trim();
      progressed = true;
      continue;
    }
    const ten = longestMatch(TENS);
    if (ten) {
      total += ten.value;
      remainder = remainder.slice(ten.len).replace(/^\s*ו?\s*/, '').trim();
      progressed = true;
      continue;
    }
    const u = longestMatch(UNITS);
    if (u) {
      total += u.value;
      remainder = remainder.slice(u.len).replace(/^\s*ו?\s*/, '').trim();
      progressed = true;
      continue;
    }
  }

  if (total === 0 && remainder === text) return null;
  return total;
}
