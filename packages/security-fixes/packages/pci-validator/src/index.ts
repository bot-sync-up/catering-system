/**
 * PCI-DSS Validator
 *
 * דרישה PCI-DSS 3.4 + 3.5: PAN (Primary Account Number) ו-CVV
 * אסורים בשמירה אצל merchant. רק טוקנים מ-PSP.
 * נדרש לבדוק שלא דלפו לתוך:
 *   - JSON Payloads / API responses
 *   - לוגים
 *   - DB tokens / cache
 *   - JWT custom claims
 *
 * נקודה קריטית: Luhn check + ספרים פתוחים — לא רק regex.
 */
import { z } from 'zod';

export const PciFindingSchema = z.object({
  kind: z.enum(['pan', 'cvv', 'cardholder_field']),
  location: z.string(),
  preview: z.string(),
});

export type PciFinding = z.infer<typeof PciFindingSchema>;

const PAN_BIN_RANGES = [
  /^4\d{12}(\d{3})?(\d{3})?$/,           // Visa 13/16/19
  /^5[1-5]\d{14}$/,                       // MasterCard
  /^2(2[2-9]\d|[3-6]\d{2}|7[01]\d|720)\d{12}$/, // MasterCard 2-series
  /^3[47]\d{13}$/,                        // Amex
  /^6(?:011|5\d{2})\d{12}$/,              // Discover
  /^3(?:0[0-5]|[68]\d)\d{11}$/,           // Diners
  /^(?:2131|1800|35\d{3})\d{11}$/,        // JCB
];

const PAN_REGEX = /\b(?:\d[ -]?){13,19}\b/g;
const CVV_FIELD_REGEX = /\b(cvv|cvc|cvv2|cid|security[_-]?code)\b/i;
const SENSITIVE_FIELDS = new Set([
  'cardnumber', 'card_number', 'pan', 'cvv', 'cvc', 'cvv2',
  'cardholder', 'card_holder', 'expirydate', 'expiry_date', 'expmonth', 'expyear',
]);

/**
 * Luhn check על מספר כרטיס פוטנציאלי.
 */
export function luhnCheck(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function looksLikePan(candidate: string): boolean {
  const digits = candidate.replace(/[ -]/g, '');
  if (!luhnCheck(digits)) return false;
  return PAN_BIN_RANGES.some((re) => re.test(digits));
}

/**
 * סורק string לכל סימן ל-PAN/CVV.
 */
export function scanString(value: string, location: string = 'root'): PciFinding[] {
  const findings: PciFinding[] = [];
  const matches = value.match(PAN_REGEX) || [];
  for (const m of matches) {
    if (looksLikePan(m)) {
      const digits = m.replace(/[ -]/g, '');
      findings.push({
        kind: 'pan',
        location,
        preview: `${digits.slice(0, 6)}...${digits.slice(-4)}`,
      });
    }
  }
  return findings;
}

/**
 * סריקה רקורסיבית של object — בודק גם שמות שדות וגם ערכים.
 */
export function scanObject(value: unknown, path: string = '$'): PciFinding[] {
  const findings: PciFinding[] = [];

  const visit = (v: unknown, p: string): void => {
    if (v === null || v === undefined) return;

    if (typeof v === 'string') {
      findings.push(...scanString(v, p));
      return;
    }
    if (typeof v === 'number' || typeof v === 'boolean') return;

    if (Array.isArray(v)) {
      v.forEach((el, i) => visit(el, `${p}[${i}]`));
      return;
    }

    if (typeof v === 'object') {
      for (const [k, val] of Object.entries(v as object)) {
        const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (SENSITIVE_FIELDS.has(lowerKey)) {
          findings.push({
            kind: lowerKey.includes('cvv') || lowerKey.includes('cvc') ? 'cvv' : 'cardholder_field',
            location: `${p}.${k}`,
            preview: `<field name "${k}" present>`,
          });
        }
        if (CVV_FIELD_REGEX.test(k)) {
          findings.push({ kind: 'cvv', location: `${p}.${k}`, preview: `<field "${k}">` });
        }
        visit(val, `${p}.${k}`);
      }
    }
  };

  visit(value, path);
  return findings;
}

/**
 * שימוש קלאסי: pre-commit / runtime middleware.
 * זורק אם נמצאה דליפת PAN/CVV.
 */
export function assertPciSafe(payload: unknown, context: string = 'payload'): void {
  const findings = scanObject(payload, context);
  if (findings.length > 0) {
    const list = findings.map((f) => `${f.kind}@${f.location} (${f.preview})`).join('; ');
    throw new Error(`PCI VIOLATION ב-${context}: ${list}`);
  }
}
