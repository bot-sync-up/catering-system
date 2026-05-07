/**
 * סכמות מערכת חישוב השכר
 * Payroll System Schemas
 *
 * הגדרות מבני הנתונים העיקריים של המערכת
 */

'use strict';

// ============================================================================
// Employee - עובד
// ============================================================================
function createEmployee({
  id,
  tz,            // תעודת זהות
  firstName,
  lastName,
  startDate,
  position,
  department,
  baseSalary = 0,           // שכר בסיס חודשי
  hourlyRate = 0,           // תעריף שעתי
  monthlyHours = 182,       // שעות תקן חודשיות
  hasPension = true,
  hasKerenHishtalmut = false,
  taxCredits = 2.25,        // נקודות זיכוי (ברירת מחדל: 2.25 לתושב ישראל)
  bankAccount = null,
  email = null,
  phone = null,
  hasDisability = false,
  numChildren = 0,
}) {
  return {
    id,
    tz,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    startDate,
    position,
    department,
    baseSalary,
    hourlyRate,
    monthlyHours,
    hasPension,
    hasKerenHishtalmut,
    taxCredits,
    bankAccount,
    email,
    phone,
    hasDisability,
    numChildren,
  };
}

// ============================================================================
// PayrollItem - פריט שכר בודד
// ============================================================================
const PAY_ITEM_TYPES = {
  BASE: 'BASE',                       // שכר בסיס
  REGULAR_HOURS: 'REGULAR_HOURS',     // שעות רגילות
  OVERTIME_125: 'OVERTIME_125',       // נוספות 125%
  OVERTIME_150: 'OVERTIME_150',       // נוספות 150%
  OVERTIME_175: 'OVERTIME_175',       // נוספות 175%
  SHABBAT: 'SHABBAT',                 // עבודה בשבת
  HOLIDAY: 'HOLIDAY',                 // עבודה בחג
  EVENT_BONUS: 'EVENT_BONUS',         // בונוס אירוע
  TRAVEL: 'TRAVEL',                   // נסיעות
  MEALS: 'MEALS',                     // אוכל
  CLOTHING: 'CLOTHING',               // ביגוד
  PHONE: 'PHONE',                     // טלפון
  BONUS: 'BONUS',                     // בונוס
  THIRTEENTH: 'THIRTEENTH',           // משכורת 13
  RECUPERATION: 'RECUPERATION',       // הבראה
  VACATION_PAY: 'VACATION_PAY',       // תשלום חופשה
  SICK_PAY: 'SICK_PAY',               // תשלום מחלה
  MILUIM_PAY: 'MILUIM_PAY',           // תגמול מילואים
  OTHER: 'OTHER',                     // אחר
};

function createPayrollItem({
  type,
  description,
  quantity = 1,
  rate = 0,
  amount = null,
  taxable = true,
  pensionable = true,
  bituachLeumiable = true,
  date = null,
}) {
  const finalAmount = amount !== null ? amount : quantity * rate;
  return {
    type,
    description,
    quantity,
    rate,
    amount: Math.round(finalAmount * 100) / 100,
    taxable,
    pensionable,
    bituachLeumiable,
    date,
  };
}

// ============================================================================
// Deduction - ניכוי
// ============================================================================
const DEDUCTION_TYPES = {
  INCOME_TAX: 'INCOME_TAX',                   // מס הכנסה
  BITUACH_LEUMI: 'BITUACH_LEUMI',             // ביטוח לאומי - עובד
  HEALTH_TAX: 'HEALTH_TAX',                   // מס בריאות
  PENSION_EMPLOYEE: 'PENSION_EMPLOYEE',       // פנסיה - חלק עובד
  PENSION_EMPLOYER: 'PENSION_EMPLOYER',       // פנסיה - חלק מעסיק
  COMPENSATION: 'COMPENSATION',               // פיצויים (מעסיק)
  KEREN_EMPLOYEE: 'KEREN_EMPLOYEE',           // קרן השתלמות עובד
  KEREN_EMPLOYER: 'KEREN_EMPLOYER',           // קרן השתלמות מעסיק
  ADVANCE: 'ADVANCE',                         // מקדמה
  LOAN: 'LOAN',                               // החזר הלוואה
  OTHER: 'OTHER',                             // אחר
};

function createDeduction({
  type,
  description,
  amount,
  isEmployerContribution = false,
}) {
  return {
    type,
    description,
    amount: Math.round(amount * 100) / 100,
    isEmployerContribution,
  };
}

// ============================================================================
// VacationBalance - יתרת חופשה
// ============================================================================
function createVacationBalance({
  employeeId,
  year,
  openingBalance = 0,
  accrued = 0,           // נצברו השנה
  used = 0,              // נוצלו השנה
  redemption = 0,        // פדיון
}) {
  const closingBalance = openingBalance + accrued - used - redemption;
  return {
    employeeId,
    year,
    openingBalance,
    accrued,
    used,
    redemption,
    closingBalance: Math.round(closingBalance * 100) / 100,
  };
}

// ============================================================================
// SickLeave - מחלה
// ============================================================================
function createSickLeave({
  employeeId,
  year,
  openingBalance = 0,
  accrued = 0,
  used = 0,
}) {
  const closingBalance = openingBalance + accrued - used;
  return {
    employeeId,
    year,
    openingBalance,
    accrued,
    used,
    closingBalance: Math.round(closingBalance * 100) / 100,
  };
}

// ============================================================================
// Miluim - מילואים
// ============================================================================
function createMiluim({
  employeeId,
  startDate,
  endDate,
  daysCount,
  reservationOrderNumber = null,
  dailyAmount = 0,
  totalAmount = 0,
  refundedFromBituachLeumi = 0,
}) {
  return {
    employeeId,
    startDate,
    endDate,
    daysCount,
    reservationOrderNumber,
    dailyAmount,
    totalAmount: Math.round(totalAmount * 100) / 100,
    refundedFromBituachLeumi: Math.round(refundedFromBituachLeumi * 100) / 100,
  };
}

// ============================================================================
// PayrollRecord - רשומת שכר חודשית
// ============================================================================
function createPayrollRecord({
  employeeId,
  employee = null,
  year,
  month,
  items = [],
  deductions = [],
  vacationBalance = null,
  sickLeave = null,
  miluim = null,
  workingDays = 22,
  workingHours = 0,
  generatedAt = new Date().toISOString(),
}) {
  // חישוב סיכומים
  const grossSalary = items.reduce((sum, item) => sum + item.amount, 0);
  const taxableIncome = items
    .filter(i => i.taxable)
    .reduce((sum, item) => sum + item.amount, 0);
  const pensionableIncome = items
    .filter(i => i.pensionable)
    .reduce((sum, item) => sum + item.amount, 0);

  const employeeDeductions = deductions
    .filter(d => !d.isEmployerContribution)
    .reduce((sum, d) => sum + d.amount, 0);
  const employerContributions = deductions
    .filter(d => d.isEmployerContribution)
    .reduce((sum, d) => sum + d.amount, 0);

  const netSalary = grossSalary - employeeDeductions;
  const employerCost = grossSalary + employerContributions;

  return {
    employeeId,
    employee,
    year,
    month,
    items,
    deductions,
    vacationBalance,
    sickLeave,
    miluim,
    workingDays,
    workingHours,
    generatedAt,
    summary: {
      grossSalary: Math.round(grossSalary * 100) / 100,
      taxableIncome: Math.round(taxableIncome * 100) / 100,
      pensionableIncome: Math.round(pensionableIncome * 100) / 100,
      employeeDeductions: Math.round(employeeDeductions * 100) / 100,
      employerContributions: Math.round(employerContributions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      employerCost: Math.round(employerCost * 100) / 100,
    },
  };
}

// ============================================================================
// PayrollSettings - הגדרות מערכת + מדרגות מס 2026
// ============================================================================
const PAYROLL_SETTINGS_2026 = {
  year: 2026,

  // מדרגות מס הכנסה 2026 - הערכה מבוססת על המגמות הידועות
  // (המדרגות מתעדכנות שנתית. ערכים אלו מהווים בסיס לחישוב.)
  incomeTaxBrackets: [
    { upTo: 7010,    rate: 0.10 },
    { upTo: 10060,   rate: 0.14 },
    { upTo: 16150,   rate: 0.20 },
    { upTo: 22440,   rate: 0.31 },
    { upTo: 46690,   rate: 0.35 },
    { upTo: 60130,   rate: 0.47 },
    { upTo: Infinity, rate: 0.50 },
  ],

  // נקודת זיכוי חודשית (₪)
  taxCreditPointValue: 247,

  // ביטוח לאומי + מס בריאות 2026
  bituachLeumi: {
    // התקרה לביטוח לאומי לחודש
    monthlyCeiling: 49030,
    // שכר מינימום למדרגה הראשונה (כ-60% מהשכר הממוצע במשק)
    reducedRateThreshold: 7522,
    // עובד
    employee: {
      reducedRate: 0.0040,    // 0.4% עד הסף הנמוך
      regularRate: 0.0700,    // 7% מעל הסף
      health_reducedRate: 0.0310,  // מס בריאות 3.1%
      health_regularRate: 0.0500,  // מס בריאות 5%
    },
    // מעסיק
    employer: {
      reducedRate: 0.0345,
      regularRate: 0.0760,
    },
  },

  // הפרשות פנסיה
  pension: {
    employeeRate: 0.060,       // 6% עובד
    employerRate: 0.065,       // 6.5% מעסיק
    compensationRate: 0.0833,  // 8.33% פיצויים
    pensionableCeiling: 49030, // תקרה
  },

  // קרן השתלמות
  kerenHishtalmut: {
    employeeRate: 0.025,       // 2.5%
    employerRate: 0.075,       // 7.5%
    monthlyCeiling: 15712,     // תקרה לפטור ממס
  },

  // ערכי ברירת מחדל
  defaults: {
    monthlyWorkHours: 182,
    weeklyWorkHours: 42,
    dailyWorkHours: 8.6,
    workingDaysPerMonth: 22,
    minimumWage: 5880,         // שכר מינימום חודשי 2026 (הערכה)
    minimumHourlyWage: 32.30,  // שכר מינימום שעתי 2026 (הערכה)
  },

  // צבירת חופשה לפי ותק
  vacationAccrual: {
    // ימים בשנה לפי שנת ותק (לעובד 5 ימים בשבוע)
    1: 12, 2: 12, 3: 12, 4: 12,
    5: 14, 6: 16, 7: 18, 8: 19,
    9: 20, 10: 21, 11: 22, 12: 23,
    13: 24, 14: 25, // מקסימום
  },

  // צבירת מחלה (1.5 ימים לחודש, מקסימום 90)
  sickAccrual: {
    monthlyDays: 1.5,
    maxAccumulation: 90,
  },

  // אחוזי שעות נוספות
  overtimeRates: {
    rate125: 1.25,  // שעתיים ראשונות נוספות
    rate150: 1.50,  // משעה שלישית
    rate175: 1.75,  // שבת/חג נוספות
  },

  // תעריף ימי שבת/חג (150% לכל השעות)
  shabbatRate: 1.50,
  holidayRate: 1.50,
};

module.exports = {
  // factories
  createEmployee,
  createPayrollItem,
  createDeduction,
  createVacationBalance,
  createSickLeave,
  createMiluim,
  createPayrollRecord,

  // enums
  PAY_ITEM_TYPES,
  DEDUCTION_TYPES,

  // settings
  PAYROLL_SETTINGS_2026,
};
