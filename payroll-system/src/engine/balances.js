/**
 * חישובי צבירה וניצול - חופשה, מחלה, מילואים
 * Balance accrual and usage calculations
 */

'use strict';

const {
  createVacationBalance,
  createSickLeave,
  createMiluim,
  PAYROLL_SETTINGS_2026,
} = require('../schemas');

const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ============================================================================
// חופשה - חישוב צבירה חודשית
// ============================================================================
/**
 * @param {Object} params
 * @param {number} params.yearsOfService
 * @param {number} [params.openingBalance]
 * @param {number} [params.usedThisMonth]
 * @param {number} [params.redemption]
 * @param {Object} [params.settings]
 * @returns {Object} VacationBalance
 */
function updateVacationBalance({
  employeeId,
  year,
  yearsOfService = 1,
  openingBalance = 0,
  accruedSoFar = 0,
  usedSoFar = 0,
  usedThisMonth = 0,
  redemption = 0,
  settings = PAYROLL_SETTINGS_2026,
}) {
  const yearlyDays = settings.vacationAccrual[Math.min(yearsOfService, 14)] || 25;
  const monthlyAccrual = round(yearlyDays / 12);

  return createVacationBalance({
    employeeId,
    year,
    openingBalance,
    accrued: round(accruedSoFar + monthlyAccrual),
    used: round(usedSoFar + usedThisMonth),
    redemption,
  });
}

// ============================================================================
// מחלה - חישוב צבירה חודשית
// ============================================================================
function updateSickLeaveBalance({
  employeeId,
  year,
  openingBalance = 0,
  accruedSoFar = 0,
  usedSoFar = 0,
  usedThisMonth = 0,
  settings = PAYROLL_SETTINGS_2026,
}) {
  const monthlyAccrual = settings.sickAccrual.monthlyDays;
  const newAccrued = round(accruedSoFar + monthlyAccrual);
  const totalAvailable = openingBalance + newAccrued;
  const cappedAccrued = Math.min(newAccrued, settings.sickAccrual.maxAccumulation - openingBalance);

  return createSickLeave({
    employeeId,
    year,
    openingBalance,
    accrued: round(Math.max(0, cappedAccrued)),
    used: round(usedSoFar + usedThisMonth),
  });
}

/**
 * חישוב תשלום עבור ימי מחלה
 * יום 1 - ללא תשלום
 * ימים 2-3 - 50% מהשכר היומי
 * יום 4 ואילך - 100%
 */
function calculateSickPay({ sickDaysThisMonth, dailySalary }) {
  if (sickDaysThisMonth <= 0) return 0;
  let pay = 0;
  for (let day = 1; day <= sickDaysThisMonth; day++) {
    if (day === 1) continue;
    if (day <= 3) pay += dailySalary * 0.5;
    else pay += dailySalary;
  }
  return round(pay);
}

// ============================================================================
// מילואים
// ============================================================================
/**
 * חישוב תגמול מילואים
 * תגמול מילואים יומי = שכר ממוצע יומי של 3 חודשים אחרונים
 */
function calculateMiluimCompensation({
  employeeId,
  startDate,
  endDate,
  daysCount,
  reservationOrderNumber,
  averageDailySalary,
}) {
  const total = round(averageDailySalary * daysCount);
  return createMiluim({
    employeeId,
    startDate,
    endDate,
    daysCount,
    reservationOrderNumber,
    dailyAmount: round(averageDailySalary),
    totalAmount: total,
    refundedFromBituachLeumi: total, // המעסיק משלם, ביטוח לאומי מחזיר
  });
}

// ============================================================================
// ותק
// ============================================================================
function calculateYearsOfService(startDate, asOfDate = new Date()) {
  const start = new Date(startDate);
  const end = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  const diffMs = end.getTime() - start.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(1, Math.floor(years) + 1); // שנת ותק נוכחית
}

module.exports = {
  updateVacationBalance,
  updateSickLeaveBalance,
  calculateSickPay,
  calculateMiluimCompensation,
  calculateYearsOfService,
};
