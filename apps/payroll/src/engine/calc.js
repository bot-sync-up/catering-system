/**
 * מנוע חישוב שכר
 * Payroll Calculation Engine
 */

'use strict';

const {
  createPayrollItem,
  createDeduction,
  createPayrollRecord,
  PAY_ITEM_TYPES,
  DEDUCTION_TYPES,
  PAYROLL_SETTINGS_2026,
} = require('../schemas');

const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ============================================================================
// חישוב שעות נוספות - פיצול ל-125% / 150% / 175%
// ============================================================================
/**
 * @param {Object} params
 * @param {Array<{date:string, hours:number, isShabbat?:boolean, isHoliday?:boolean}>} params.workDays
 * @param {number} params.hourlyRate
 * @param {number} params.standardDailyHours - שעות תקן יומיות (ברירת מחדל 8.6)
 */
function calculateHoursBreakdown({ workDays, hourlyRate, standardDailyHours = 8.6 }) {
  const items = [];
  let totalRegular = 0;
  let totalOT125 = 0;
  let totalOT150 = 0;
  let totalShabbatBase = 0;
  let totalShabbatOT = 0;
  let totalHolidayBase = 0;
  let totalHolidayOT = 0;

  for (const day of workDays) {
    const hours = Number(day.hours) || 0;
    if (hours <= 0) continue;

    if (day.isShabbat) {
      // שבת - תעריף 150% לכל השעות עד 8.6, מעבר לכך 175%
      const baseHours = Math.min(hours, standardDailyHours);
      const otHours = Math.max(0, hours - standardDailyHours);
      totalShabbatBase += baseHours;
      totalShabbatOT += otHours;
    } else if (day.isHoliday) {
      const baseHours = Math.min(hours, standardDailyHours);
      const otHours = Math.max(0, hours - standardDailyHours);
      totalHolidayBase += baseHours;
      totalHolidayOT += otHours;
    } else {
      // יום רגיל
      if (hours <= standardDailyHours) {
        totalRegular += hours;
      } else {
        const overtime = hours - standardDailyHours;
        totalRegular += standardDailyHours;
        // 2 שעות ראשונות 125%, מעבר לכך 150%
        const ot125 = Math.min(overtime, 2);
        const ot150 = Math.max(0, overtime - 2);
        totalOT125 += ot125;
        totalOT150 += ot150;
      }
    }
  }

  if (totalRegular > 0) {
    items.push(createPayrollItem({
      type: PAY_ITEM_TYPES.REGULAR_HOURS,
      description: 'שעות עבודה רגילות',
      quantity: round(totalRegular),
      rate: hourlyRate,
    }));
  }

  if (totalOT125 > 0) {
    items.push(createPayrollItem({
      type: PAY_ITEM_TYPES.OVERTIME_125,
      description: 'שעות נוספות 125%',
      quantity: round(totalOT125),
      rate: round(hourlyRate * 1.25),
    }));
  }

  if (totalOT150 > 0) {
    items.push(createPayrollItem({
      type: PAY_ITEM_TYPES.OVERTIME_150,
      description: 'שעות נוספות 150%',
      quantity: round(totalOT150),
      rate: round(hourlyRate * 1.50),
    }));
  }

  if (totalShabbatBase > 0) {
    items.push(createPayrollItem({
      type: PAY_ITEM_TYPES.SHABBAT,
      description: 'עבודה בשבת (150%)',
      quantity: round(totalShabbatBase),
      rate: round(hourlyRate * 1.50),
    }));
  }

  if (totalShabbatOT > 0) {
    items.push(createPayrollItem({
      type: PAY_ITEM_TYPES.OVERTIME_175,
      description: 'נוספות בשבת (175%)',
      quantity: round(totalShabbatOT),
      rate: round(hourlyRate * 1.75),
    }));
  }

  if (totalHolidayBase > 0) {
    items.push(createPayrollItem({
      type: PAY_ITEM_TYPES.HOLIDAY,
      description: 'עבודה בחג (150%)',
      quantity: round(totalHolidayBase),
      rate: round(hourlyRate * 1.50),
    }));
  }

  if (totalHolidayOT > 0) {
    items.push(createPayrollItem({
      type: PAY_ITEM_TYPES.OVERTIME_175,
      description: 'נוספות בחג (175%)',
      quantity: round(totalHolidayOT),
      rate: round(hourlyRate * 1.75),
    }));
  }

  return {
    items,
    breakdown: {
      regular: round(totalRegular),
      overtime125: round(totalOT125),
      overtime150: round(totalOT150),
      shabbatBase: round(totalShabbatBase),
      shabbatOT: round(totalShabbatOT),
      holidayBase: round(totalHolidayBase),
      holidayOT: round(totalHolidayOT),
      total: round(
        totalRegular + totalOT125 + totalOT150 +
        totalShabbatBase + totalShabbatOT +
        totalHolidayBase + totalHolidayOT
      ),
    },
  };
}

// ============================================================================
// חישוב מס הכנסה לפי מדרגות
// ============================================================================
/**
 * חישוב מס הכנסה ברוטו (לפני נקודות זיכוי)
 */
function calculateIncomeTaxGross(taxableIncome, settings = PAYROLL_SETTINGS_2026) {
  let tax = 0;
  let prevCeiling = 0;
  for (const bracket of settings.incomeTaxBrackets) {
    if (taxableIncome <= prevCeiling) break;
    const inBracket = Math.min(taxableIncome, bracket.upTo) - prevCeiling;
    tax += inBracket * bracket.rate;
    prevCeiling = bracket.upTo;
    if (taxableIncome <= bracket.upTo) break;
  }
  return round(tax);
}

/**
 * חישוב מס הכנסה סופי (אחרי נקודות זיכוי)
 */
function calculateIncomeTax(taxableIncome, taxCreditPoints, settings = PAYROLL_SETTINGS_2026) {
  const grossTax = calculateIncomeTaxGross(taxableIncome, settings);
  const credit = taxCreditPoints * settings.taxCreditPointValue;
  return Math.max(0, round(grossTax - credit));
}

// ============================================================================
// חישוב ביטוח לאומי + מס בריאות
// ============================================================================
function calculateBituachLeumiAndHealth(taxableIncome, settings = PAYROLL_SETTINGS_2026) {
  const cfg = settings.bituachLeumi;
  const ceiling = cfg.monthlyCeiling;
  const threshold = cfg.reducedRateThreshold;
  const cappedIncome = Math.min(taxableIncome, ceiling);

  const lowPart = Math.min(cappedIncome, threshold);
  const highPart = Math.max(0, cappedIncome - threshold);

  // עובד
  const blEmp = lowPart * cfg.employee.reducedRate + highPart * cfg.employee.regularRate;
  const healthEmp = lowPart * cfg.employee.health_reducedRate + highPart * cfg.employee.health_regularRate;

  // מעסיק
  const blEmpr = lowPart * cfg.employer.reducedRate + highPart * cfg.employer.regularRate;

  return {
    bituachLeumiEmployee: round(blEmp),
    healthTaxEmployee: round(healthEmp),
    bituachLeumiEmployer: round(blEmpr),
  };
}

// ============================================================================
// חישוב פנסיה / פיצויים / קרן השתלמות
// ============================================================================
function calculatePensionAndCompensation(pensionableIncome, employee, settings = PAYROLL_SETTINGS_2026) {
  const cfg = settings.pension;
  const cappedIncome = Math.min(pensionableIncome, cfg.pensionableCeiling);

  if (!employee.hasPension) {
    return {
      pensionEmployee: 0,
      pensionEmployer: 0,
      compensation: 0,
    };
  }

  return {
    pensionEmployee: round(cappedIncome * cfg.employeeRate),
    pensionEmployer: round(cappedIncome * cfg.employerRate),
    compensation: round(cappedIncome * cfg.compensationRate),
  };
}

function calculateKerenHishtalmut(pensionableIncome, employee, settings = PAYROLL_SETTINGS_2026) {
  if (!employee.hasKerenHishtalmut) {
    return { kerenEmployee: 0, kerenEmployer: 0 };
  }
  const cfg = settings.kerenHishtalmut;
  const cappedIncome = Math.min(pensionableIncome, cfg.monthlyCeiling);
  return {
    kerenEmployee: round(cappedIncome * cfg.employeeRate),
    kerenEmployer: round(cappedIncome * cfg.employerRate),
  };
}

// ============================================================================
// חישוב צבירת חופשה לפי ותק
// ============================================================================
function calculateVacationAccrual(yearsOfService, settings = PAYROLL_SETTINGS_2026) {
  const table = settings.vacationAccrual;
  const years = Math.max(1, Math.min(yearsOfService, 14));
  const yearlyDays = table[years] || 25;
  return round(yearlyDays / 12); // צבירה חודשית
}

// ============================================================================
// חישוב שכר חודשי מלא
// ============================================================================
/**
 * @param {Object} params
 * @param {Object} params.employee
 * @param {number} params.year
 * @param {number} params.month
 * @param {Array} [params.workDays]
 * @param {Array} [params.additionalItems]  - פריטים נוספים (בונוסים, נסיעות...)
 * @param {number} [params.advanceAmount]
 * @param {Object} [params.vacationData]
 * @param {Object} [params.sickData]
 * @param {Object} [params.miluimData]
 * @param {Object} [params.settings]
 */
function calculateMonthlyPayroll(params) {
  const {
    employee,
    year,
    month,
    workDays = [],
    additionalItems = [],
    advanceAmount = 0,
    vacationData = null,
    sickData = null,
    miluimData = null,
    settings = PAYROLL_SETTINGS_2026,
  } = params;

  const items = [];

  // 1. שכר בסיס (אם קיים)
  if (employee.baseSalary && employee.baseSalary > 0) {
    items.push(createPayrollItem({
      type: PAY_ITEM_TYPES.BASE,
      description: 'שכר בסיס חודשי',
      quantity: 1,
      rate: employee.baseSalary,
      amount: employee.baseSalary,
    }));
  }

  // 2. שעות עבודה (פירוט)
  if (workDays.length > 0 && employee.hourlyRate > 0) {
    const hoursResult = calculateHoursBreakdown({
      workDays,
      hourlyRate: employee.hourlyRate,
      standardDailyHours: settings.defaults.dailyWorkHours,
    });
    items.push(...hoursResult.items);
  }

  // 3. פריטים נוספים (בונוסים, נסיעות, אוכל וכד')
  for (const it of additionalItems) {
    items.push(createPayrollItem(it));
  }

  // 4. תגמול מילואים (פטור ממס בחלקו, אך חייב בביטוח לאומי)
  if (miluimData && miluimData.totalAmount > 0) {
    items.push(createPayrollItem({
      type: PAY_ITEM_TYPES.MILUIM_PAY,
      description: `תגמול מילואים (${miluimData.daysCount} ימים)`,
      quantity: miluimData.daysCount,
      rate: miluimData.dailyAmount,
      amount: miluimData.totalAmount,
      taxable: true,
      pensionable: false,
      bituachLeumiable: true,
    }));
  }

  // חישוב סיכומי הכנסה
  const grossSalary = items.reduce((s, i) => s + i.amount, 0);
  const taxableIncome = items.filter(i => i.taxable).reduce((s, i) => s + i.amount, 0);
  const pensionableIncome = items.filter(i => i.pensionable).reduce((s, i) => s + i.amount, 0);
  const blIncome = items.filter(i => i.bituachLeumiable).reduce((s, i) => s + i.amount, 0);

  // === חישוב ניכויים ===
  const deductions = [];

  // מס הכנסה
  const incomeTax = calculateIncomeTax(taxableIncome, employee.taxCredits || 0, settings);
  if (incomeTax > 0) {
    deductions.push(createDeduction({
      type: DEDUCTION_TYPES.INCOME_TAX,
      description: 'מס הכנסה',
      amount: incomeTax,
    }));
  }

  // ביטוח לאומי + מס בריאות
  const bl = calculateBituachLeumiAndHealth(blIncome, settings);
  if (bl.bituachLeumiEmployee > 0) {
    deductions.push(createDeduction({
      type: DEDUCTION_TYPES.BITUACH_LEUMI,
      description: 'ביטוח לאומי - עובד',
      amount: bl.bituachLeumiEmployee,
    }));
  }
  if (bl.healthTaxEmployee > 0) {
    deductions.push(createDeduction({
      type: DEDUCTION_TYPES.HEALTH_TAX,
      description: 'מס בריאות',
      amount: bl.healthTaxEmployee,
    }));
  }
  // ביטוח לאומי - חלק מעסיק (קוסט מעסיק)
  if (bl.bituachLeumiEmployer > 0) {
    deductions.push(createDeduction({
      type: DEDUCTION_TYPES.BITUACH_LEUMI,
      description: 'ביטוח לאומי - מעסיק',
      amount: bl.bituachLeumiEmployer,
      isEmployerContribution: true,
    }));
  }

  // פנסיה ופיצויים
  const pension = calculatePensionAndCompensation(pensionableIncome, employee, settings);
  if (pension.pensionEmployee > 0) {
    deductions.push(createDeduction({
      type: DEDUCTION_TYPES.PENSION_EMPLOYEE,
      description: 'פנסיה - חלק עובד 6%',
      amount: pension.pensionEmployee,
    }));
  }
  if (pension.pensionEmployer > 0) {
    deductions.push(createDeduction({
      type: DEDUCTION_TYPES.PENSION_EMPLOYER,
      description: 'פנסיה - חלק מעסיק 6.5%',
      amount: pension.pensionEmployer,
      isEmployerContribution: true,
    }));
  }
  if (pension.compensation > 0) {
    deductions.push(createDeduction({
      type: DEDUCTION_TYPES.COMPENSATION,
      description: 'פיצויים - מעסיק 8.33%',
      amount: pension.compensation,
      isEmployerContribution: true,
    }));
  }

  // קרן השתלמות
  const keren = calculateKerenHishtalmut(pensionableIncome, employee, settings);
  if (keren.kerenEmployee > 0) {
    deductions.push(createDeduction({
      type: DEDUCTION_TYPES.KEREN_EMPLOYEE,
      description: 'קרן השתלמות - עובד 2.5%',
      amount: keren.kerenEmployee,
    }));
  }
  if (keren.kerenEmployer > 0) {
    deductions.push(createDeduction({
      type: DEDUCTION_TYPES.KEREN_EMPLOYER,
      description: 'קרן השתלמות - מעסיק 7.5%',
      amount: keren.kerenEmployer,
      isEmployerContribution: true,
    }));
  }

  // מקדמה
  if (advanceAmount > 0) {
    deductions.push(createDeduction({
      type: DEDUCTION_TYPES.ADVANCE,
      description: 'מקדמה',
      amount: advanceAmount,
    }));
  }

  const totalWorkingHours = workDays.reduce((s, d) => s + (Number(d.hours) || 0), 0);

  return createPayrollRecord({
    employeeId: employee.id,
    employee,
    year,
    month,
    items,
    deductions,
    vacationBalance: vacationData,
    sickLeave: sickData,
    miluim: miluimData,
    workingDays: workDays.length || settings.defaults.workingDaysPerMonth,
    workingHours: round(totalWorkingHours),
  });
}

module.exports = {
  calculateHoursBreakdown,
  calculateIncomeTax,
  calculateIncomeTaxGross,
  calculateBituachLeumiAndHealth,
  calculatePensionAndCompensation,
  calculateKerenHishtalmut,
  calculateVacationAccrual,
  calculateMonthlyPayroll,
};
