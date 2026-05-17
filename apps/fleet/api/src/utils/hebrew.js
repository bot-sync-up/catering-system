// תרגומי תוויות לעברית עבור enums + הודעות

export const FUEL_HE = {
  PETROL: 'בנזין',
  DIESEL: 'דיזל',
  HYBRID: 'היברידי',
  ELECTRIC: 'חשמלי',
  GAS: 'גז',
};

export const DOC_TYPE_HE = {
  TEST: 'טסט',
  INSURANCE_MANDATORY: 'ביטוח חובה',
  INSURANCE_COMPREHENSIVE: 'ביטוח מקיף',
  LICENSE: 'רישיון רכב',
  LICENSE_DRIVER: 'רישיון נהיגה',
};

export const EXPENSE_TYPE_HE = {
  FUEL: 'דלק',
  SERVICE: 'טיפול',
  REPAIR: 'תיקון',
  FINE: 'קנס',
  PARKING: 'חנייה',
  TOLL: 'אגרה',
  WASH: 'שטיפה',
  OTHER: 'אחר',
};

export const PURPOSE_HE = {
  BUSINESS: 'עסקי',
  PRIVATE: 'פרטי',
  MIXED: 'מעורב',
};

export const ALERT_LEVEL_HE = {
  D60: '60 ימים לתפוגה',
  D30: '30 ימים לתפוגה',
  D7: '7 ימים לתפוגה',
  EXPIRED: 'פג תוקף',
};

export function formatILS(n) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n || 0);
}

export function formatDateHe(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(date);
}

export const ERR = {
  NOT_FOUND: 'לא נמצא',
  UNAUTHORIZED: 'אין הרשאה',
  VALIDATION: 'נתונים לא תקינים',
  PLATE_EXISTS: 'מספר רכב כבר קיים במערכת',
  INTERNAL: 'שגיאת מערכת',
  EMAIL_EXISTS: 'כתובת המייל כבר רשומה',
  BAD_CREDENTIALS: 'אימייל או סיסמה שגויים',
};
