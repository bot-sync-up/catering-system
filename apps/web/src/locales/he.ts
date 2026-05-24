/**
 * תרגומים לעברית — RTL
 */
export const he = {
  common: {
    appName: 'ענה את השואל',
    loading: 'טוען…',
    submit: 'שלח',
    cancel: 'ביטול',
    back: 'חזרה',
    error: 'שגיאה',
    success: 'הצלחה',
  },
  login: {
    title: 'התחברות',
    email: 'דוא"ל',
    password: 'סיסמה',
    submit: 'התחבר',
    forgotPassword: 'שכחת סיסמה?',
    signupCta: 'אין לך חשבון? הירשם',
    or: 'או',
    google: 'התחבר עם Google',
    facebook: 'התחבר עם Facebook',
    invalid: 'דוא"ל או סיסמה שגויים',
    locked: 'החשבון נעול זמנית. נסה שוב בעוד 15 דקות.',
  },
  signup: {
    title: 'הרשמה',
    fullName: 'שם מלא',
    email: 'דוא"ל',
    phone: 'טלפון',
    password: 'סיסמה',
    confirmPassword: 'אימות סיסמה',
    submit: 'צור חשבון',
    loginCta: 'כבר רשום? התחבר',
    passwordReq: 'לפחות 10 תווים, אות גדולה, קטנה, ספרה ותו מיוחד',
    mismatch: 'הסיסמאות אינן תואמות',
  },
  forgot: {
    title: 'איפוס סיסמה',
    email: 'דוא"ל',
    submit: 'שלח קישור איפוס',
    sent: 'אם הכתובת רשומה, נשלח קישור לאיפוס.',
  },
  reset: {
    title: 'הגדרת סיסמה חדשה',
    newPassword: 'סיסמה חדשה',
    confirm: 'אימות סיסמה',
    submit: 'עדכן סיסמה',
  },
  twofa: {
    title: 'אימות דו-שלבי',
    description: 'הזן את הקוד מאפליקציית האימות או מה-SMS',
    code: 'קוד אימות',
    method: { totp: 'אפליקציה', sms: 'SMS', backup: 'קוד גיבוי' },
    submit: 'אמת',
    resend: 'שלח קוד שוב',
    invalid: 'קוד שגוי',
  },
  setup2fa: {
    title: 'הפעלת אימות דו-שלבי',
    scan: 'סרוק את הקוד באפליקציית Google Authenticator / Authy',
    backupTitle: 'קודי גיבוי — שמור במקום בטוח',
    done: 'סיימתי',
  },
  errors: {
    network: 'שגיאת רשת. נסה שוב.',
    server: 'שגיאת שרת. אנא נסה מאוחר יותר.',
    invalidInput: 'נתונים שגויים',
  },
} as const;

export type I18n = typeof he;
