/** כלי עזר לעברית: ניקוד, ולידציה, ושינוי כיווניות. */

const HEBREW_RANGE = /[֐-׿]/;

export function isHebrew(text: string): boolean {
  return HEBREW_RANGE.test(text);
}

/** מסיר ניקוד (טעמים/נקודות) מטקסט עברי. */
export function stripNikud(text: string): string {
  return text.replace(/[֑-ׇ]/g, '');
}

/** מספר לפורמט שקלים: 1234.5 → "₪ 1,234.50" */
export function formatILS(amount: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

/** מעצב מספר טלפון ישראלי: 0501234567 → 050-123-4567 */
export function formatIsraeliPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith('0')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return raw;
}

/** ולידציה לתעודת זהות ישראלית (אלגוריתם לוהן). */
export function isValidIsraeliId(id: string): boolean {
  const digits = id.replace(/\D/g, '').padStart(9, '0');
  if (digits.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let v = parseInt(digits[i]!, 10) * ((i % 2) + 1);
    if (v > 9) v -= 9;
    sum += v;
  }
  return sum % 10 === 0;
}

/** ולידציה למספר עוסק/ח.פ ישראלי (9 ספרות, מבוסס לוהן מותאם). */
export function isValidBusinessId(id: string): boolean {
  const digits = id.replace(/\D/g, '');
  if (digits.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let v = parseInt(digits[i]!, 10) * ((i % 2) + 1);
    if (v > 9) v -= 9;
    sum += v;
  }
  return sum % 10 === 0;
}

/** ולידציה לטלפון ישראלי (קווי או נייד). */
export function isValidIsraeliPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && /^05\d{8}$/.test(digits)) return true;
  if (digits.length === 9 && /^0[2-489]\d{7}$/.test(digits)) return true;
  return false;
}
