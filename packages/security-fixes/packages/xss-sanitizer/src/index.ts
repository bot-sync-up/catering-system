/**
 * XSS Sanitizer — Wrapper ל-DOMPurify עם תצורה מחמירה.
 *
 * שני מצבים:
 *  - stripAll: רק טקסט (משמש ל-input של משתמש שלא צריך HTML)
 *  - richText: HTML מצומצם עם whitelist מחמיר (לתגובות / תוכן עורך).
 *
 * אסור להעביר HTML מהשרת לדפדפן בלי לסנן.
 * אסור להעביר HTML של משתמש ל-PDF/Email טמפלייט בלי לסנן.
 *
 * המודול תומך גם בסביבה ללא DOM (Node) דרך isomorphic-dompurify.
 */
import { z } from 'zod';

export const SanitizeProfileSchema = z.enum(['stripAll', 'richText', 'inline']);
export type SanitizeProfile = z.infer<typeof SanitizeProfileSchema>;

export interface SanitizerOptions {
  profile: SanitizeProfile;
  /** המרת newlines ל-<br> בפרופיל stripAll */
  preserveNewlines?: boolean;
}

interface PurifyLike {
  sanitize(input: string, opts?: object): string;
}

let _purify: PurifyLike | null = null;

/**
 * הזרקת מימוש (DOMPurify או isomorphic-dompurify).
 * אם לא הוזרק, ייעשה fallback בטוח לבסיס regex (תרגום בלבד).
 */
export function setPurify(purify: PurifyLike): void {
  _purify = purify;
}

const PROFILES: Record<SanitizeProfile, object> = {
  stripAll: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  inline: {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'br', 'span'],
    ALLOWED_ATTR: ['dir', 'lang'],
    FORBID_ATTR: ['style', 'on*', 'href', 'src'],
    KEEP_CONTENT: true,
  },
  richText: {
    ALLOWED_TAGS: [
      'b', 'i', 'u', 'em', 'strong', 'p', 'br', 'span',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'a', 'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['href', 'title', 'dir', 'lang', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
    FORBID_ATTR: ['style', 'on*'],
    KEEP_CONTENT: true,
  },
};

/**
 * Fallback מינימלי — לא תחליף ל-DOMPurify. בשימוש רק עד שמזריקים מימוש.
 */
function basicFallback(input: string, profile: SanitizeProfile): string {
  // הסרת כל תגית
  let out = input.replace(/<[^>]*>/g, '');
  // הסרת event handlers אם הסליקה מילולית של < > השאירה משהו
  out = out.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  // הסרת javascript: scheme
  out = out.replace(/javascript:/gi, '');
  // escape <> נשארים
  out = out.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  if (profile !== 'stripAll') {
    // לא ננסה לבנות HTML מהיר בלי DOMPurify — נשאיר טקסט
  }
  return out;
}

export function sanitize(input: string, opts: SanitizerOptions): string {
  if (typeof input !== 'string') throw new Error('input חייב להיות string');
  const profile = SanitizeProfileSchema.parse(opts.profile);
  let raw = input;
  if (opts.preserveNewlines && profile === 'stripAll') {
    raw = raw.replace(/\r?\n/g, ' NL ');
  }
  const cleaned = _purify
    ? _purify.sanitize(raw, PROFILES[profile])
    : basicFallback(raw, profile);
  if (opts.preserveNewlines && profile === 'stripAll') {
    return cleaned.replace(/ NL /g, '<br>');
  }
  return cleaned;
}

export function sanitizeStripAll(input: string): string {
  return sanitize(input, { profile: 'stripAll' });
}

export function sanitizeRichText(input: string): string {
  return sanitize(input, { profile: 'richText' });
}

/**
 * סריקת payload לזיהוי דליפת HTML חי לפני שמירה ב-DB.
 */
export function containsScripts(value: string): boolean {
  return /<\s*script\b/i.test(value)
    || /on\w+\s*=/.test(value)
    || /javascript:/i.test(value);
}
