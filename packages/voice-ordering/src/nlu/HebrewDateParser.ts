// פיענוח ביטויי תאריך עבריים נפוצים — "מחר", "בשבת הבאה", "בעוד שבועיים"
// מחזיר ISO yyyy-mm-dd

const DAYS_OF_WEEK: Record<string, number> = {
  ראשון: 0,
  שני: 1,
  שלישי: 2,
  רביעי: 3,
  חמישי: 4,
  שישי: 5,
  שבת: 6,
};

const HEBREW_NUMS: Record<string, number> = {
  אחד: 1,
  שניים: 2,
  שלושה: 3,
  ארבעה: 4,
  חמישה: 5,
  שישה: 6,
  שבעה: 7,
  שמונה: 8,
  תשעה: 9,
  עשרה: 10,
  שבועיים: 2,
  יומיים: 2,
  חודשיים: 2,
};

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseHebrewDate(input: string, reference: Date = new Date()): string | null {
  const text = input.trim();
  const base = new Date(reference);
  base.setHours(0, 0, 0, 0);

  if (/^היום$/.test(text)) return toIso(base);
  if (/^מחר$/.test(text)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return toIso(d);
  }
  if (/^מחרתיים$/.test(text)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 2);
    return toIso(d);
  }
  if (/^אתמול$/.test(text)) {
    const d = new Date(base);
    d.setDate(d.getDate() - 1);
    return toIso(d);
  }

  // "בשבת הבאה" / "ביום שני הבא"
  const dayMatch = text.match(/ב(?:יום\s+)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\s*ה?באה?/);
  if (dayMatch) {
    const targetDow = DAYS_OF_WEEK[dayMatch[1]];
    const currentDow = base.getDay();
    let diff = targetDow - currentDow;
    if (diff <= 0) diff += 7;
    // "הבאה" => תמיד השבוע הבא, גם אם היום זה אותו יום
    if (diff < 7 && currentDow === targetDow) diff = 7;
    const d = new Date(base);
    d.setDate(d.getDate() + diff);
    return toIso(d);
  }

  // "בעוד שבועיים" / "בעוד חמישה ימים"
  const inMatch = text.match(/בעוד\s+(\S+)\s+(ימים|שבועות|חודשים|שבועיים|יומיים|חודשיים)/);
  if (inMatch) {
    const numWord = inMatch[1];
    const unit = inMatch[2];
    let qty = HEBREW_NUMS[numWord] ?? Number(numWord);
    if (!qty) {
      // אולי המספר הוא חלק מהיחידה ("שבועיים")
      qty = HEBREW_NUMS[unit] ?? 1;
    }
    const d = new Date(base);
    if (unit.startsWith('יומ') || unit === 'ימים') d.setDate(d.getDate() + qty);
    else if (unit.startsWith('שבוע')) d.setDate(d.getDate() + qty * 7);
    else if (unit.startsWith('חודש')) d.setMonth(d.getMonth() + qty);
    return toIso(d);
  }

  // dd/mm או dd.mm או dd-mm
  const numericMatch = text.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]);
    let year = numericMatch[3] ? Number(numericMatch[3]) : base.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, month - 1, day);
    if (d < base) d.setFullYear(d.getFullYear() + 1);
    return toIso(d);
  }

  return null;
}
