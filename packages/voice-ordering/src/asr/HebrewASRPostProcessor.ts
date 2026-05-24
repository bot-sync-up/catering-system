// פוסט-עיבוד לטקסטים שיצאו מ-ASR: ניקוי, נורמליזציה של מספרים ותאריכים בעברית
import { parseHebrewNumber } from '../nlu/HebrewNumberParser.js';
import { parseHebrewDate } from '../nlu/HebrewDateParser.js';

const NUMBER_RE =
  /(?:אפס|אחת?|שתיים|שניים|שלוש(?:ה)?|ארבע(?:ה)?|חמש(?:ה)?|שש(?:ה)?|שבע(?:ה)?|שמונה|תשע(?:ה)?|עשר(?:ה|ים)?|מאה|מאות|אלף|אלפיים|אלפים|מיליון)(?:\s+(?:ו?(?:אחת?|שתיים|שלוש(?:ה)?|ארבע(?:ה)?|חמש(?:ה)?|שש(?:ה)?|שבע(?:ה)?|שמונה|תשע(?:ה)?|עשר(?:ה|ים)?|מאה|מאות|אלף|אלפיים|אלפים)))*/g;

const DATE_PHRASES = [
  /מחרתיים/g,
  /אתמול/g,
  /היום/g,
  /מחר/g,
  /בשבת ה?באה/g,
  /ביום ראשון ה?בא/g,
  /ביום שני ה?בא/g,
  /ביום שלישי ה?בא/g,
  /ביום רביעי ה?בא/g,
  /ביום חמישי ה?בא/g,
  /ביום שישי ה?בא/g,
  /בעוד\s+\S+\s+(?:ימים|שבועות|חודשים)/g,
];

export interface PostProcessOptions {
  normalizeNumbers?: boolean;
  normalizeDates?: boolean;
  removeFillers?: boolean;
  referenceDate?: Date;
}

// JS \b לא עובד עם תווי עברית — נשתמש בגבולות "תחילת מילה" באמצעות lookahead על רווח/תחילה/סוף
const FILLERS = [
  /(^|\s)אהמ?(?=\s|$)/g,
  /(^|\s)אהה(?=\s|$)/g,
  /(^|\s)איי(?=\s|$)/g,
  /(^|\s)אוקיי(?=\s|$)/g,
  /(^|\s)אמ(?=\s|$)/g,
];

export function postProcessHebrewASR(text: string, opts: PostProcessOptions = {}): string {
  let out = text;

  if (opts.removeFillers ?? true) {
    for (const f of FILLERS) out = out.replace(f, '$1');
  }

  // נקה רווחים כפולים וסימני פיסוק חופפים
  out = out.replace(/\s+/g, ' ').trim();
  out = out.replace(/\s+([,.!?])/g, '$1');

  if (opts.normalizeNumbers ?? true) {
    out = out.replace(NUMBER_RE, (match) => {
      const n = parseHebrewNumber(match);
      return n != null ? String(n) : match;
    });
  }

  if (opts.normalizeDates ?? true) {
    for (const re of DATE_PHRASES) {
      out = out.replace(re, (m) => {
        const d = parseHebrewDate(m, opts.referenceDate);
        return d ? d : m;
      });
    }
  }

  return out;
}
