/**
 * software1346.ts — הצהרת תוכנה מאושרת
 * רשות המסים בישראל — מס' תוכנה מאושרת: 1346
 *
 * תוכנה מאושרת היא תוכנה שעברה אישור של רשות המסים
 * לצורך הנפקת חשבוניות מס וניהול ספרי חשבונות.
 *
 * מסמכי החובה נדרשים לכלול:
 *   - מספר התוכנה המאושרת
 *   - שם החברה המפעילה
 *   - גרסת התוכנה
 *   - חתימה דיגיטלית (אופציונלי, בעתיד חובה)
 *
 * מקור: הוראות ניהול ספרים, נספח ב' לתקנות
 */

import { createHash } from 'crypto';

export const APPROVED_SOFTWARE_NUMBER = '1346';

export interface Software1346Declaration {
  approved_software_number: string;   // 1346
  software_name: string;
  software_version: string;
  vendor_name: string;
  vendor_vat_id?: string;
  certification_date: string;          // ISO date
  declaration_hash: string;            // SHA-256 על השדות
  declaration_text_hebrew: string;
  declaration_text_english: string;
}

const DEFAULT_DECLARATION: Omit<Software1346Declaration, 'declaration_hash'> = {
  approved_software_number: APPROVED_SOFTWARE_NUMBER,
  software_name: 'SyncUp iCount Integration',
  software_version: '1.0.0',
  vendor_name: 'SyncUp Technologies',
  certification_date: '2024-01-01',
  declaration_text_hebrew:
    'תוכנה זו מאושרת על ידי רשות המסים בישראל ' +
    'תחת מספר תוכנה מאושרת 1346, ' +
    'בהתאם להוראות מס הכנסה (ניהול פנקסי חשבונות), התשל"ג-1973, ' +
    'ולתקנות מס ערך מוסף (ניהול פנקסי חשבונות), התשל"ו-1976.',
  declaration_text_english:
    'This software is approved by the Israeli Tax Authority ' +
    'under approved software number 1346, ' +
    'in accordance with Income Tax (Bookkeeping) Regulations, 1973, ' +
    'and VAT (Bookkeeping) Regulations, 1976.',
};

/**
 * בונה הצהרת תוכנה מאושרת מוכנה לחתימה.
 */
export function buildSoftware1346Declaration(
  overrides?: Partial<Software1346Declaration>,
): Software1346Declaration {
  const base = { ...DEFAULT_DECLARATION, ...overrides };
  const hashBase = [
    base.approved_software_number,
    base.software_name,
    base.software_version,
    base.vendor_name,
    base.certification_date,
  ].join('|');

  const declaration_hash = createHash('sha256').update(hashBase).digest('hex');
  return { ...base, declaration_hash };
}

/**
 * מחזיר את ה-headers שצריך להוסיף לכל קריאת API
 */
export function getSoftware1346Headers(softwareNumber = APPROVED_SOFTWARE_NUMBER): Record<string, string> {
  return {
    'X-Approved-Software': softwareNumber,
    'X-ITA-Software-Id': softwareNumber,
  };
}

/**
 * Validation — וודא שמסמך מכיל את שדות החובה
 */
export function validateDocumentHas1346Declaration(doc: Record<string, unknown>): boolean {
  const required = ['approved_software_number', 'software_name', 'declaration_hash'];
  return required.every(k => k in doc && Boolean(doc[k]));
}

/**
 * הצהרה לאזור התחתון של חשבונית מודפסת (footer)
 */
export function get1346InvoiceFooterHebrew(): string {
  return `תוכנה מאושרת מס' ${APPROVED_SOFTWARE_NUMBER} - רשות המסים בישראל`;
}

export function get1346InvoiceFooterEnglish(): string {
  return `Approved Software No. ${APPROVED_SOFTWARE_NUMBER} - Israeli Tax Authority`;
}
