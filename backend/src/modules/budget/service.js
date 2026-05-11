const prisma = require('../../db/prisma');

/**
 * Build Budget vs Actual report.
 * If month is null — annual breakdown by CoA for the year.
 */
async function budgetVsActual(year, month) {
  const budgets = await prisma.budget.findMany({
    where: { year, ...(month ? { month } : {}) },
    include: { coa: true },
  });

  // Aggregate actuals
  const dateStart = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const dateEnd = month ? new Date(year, month, 0, 23, 59, 59) : new Date(year + 1, 0, 1);
  const expenses = await prisma.expense.findMany({
    where: { expenseDate: { gte: dateStart, lt: dateEnd } },
    select: { coaId: true, amount: true },
  });

  const actualByCoa = {};
  for (const e of expenses) {
    actualByCoa[e.coaId] = (actualByCoa[e.coaId] || 0) + Number(e.amount);
  }

  const threshold = Number(process.env.VARIANCE_THRESHOLD_PERCENT || 10);
  const rows = budgets.map((b) => {
    const actual = actualByCoa[b.coaId] || 0;
    const budgetAmt = Number(b.amount);
    const variance = actual - budgetAmt;
    const variancePct = budgetAmt > 0 ? (variance / budgetAmt) * 100 : 0;
    return {
      coaId: b.coaId,
      coaCode: b.coa.code,
      coaName: b.coa.nameHe,
      budget: budgetAmt,
      actual,
      variance,
      variancePct,
      overrun: variancePct > threshold,
    };
  });

  // CoAs spent without budget
  const budgetedCoaIds = new Set(budgets.map((b) => b.coaId));
  for (const coaId of Object.keys(actualByCoa)) {
    if (!budgetedCoaIds.has(coaId)) {
      const coa = await prisma.coA.findUnique({ where: { id: coaId } });
      rows.push({
        coaId,
        coaCode: coa?.code,
        coaName: coa?.nameHe,
        budget: 0,
        actual: actualByCoa[coaId],
        variance: actualByCoa[coaId],
        variancePct: Infinity,
        overrun: true,
        noBudget: true,
      });
    }
  }

  const totals = rows.reduce(
    (acc, r) => ({
      budget: acc.budget + r.budget,
      actual: acc.actual + r.actual,
      variance: acc.variance + r.variance,
    }),
    { budget: 0, actual: 0, variance: 0 }
  );

  return { year, month, threshold, rows, totals };
}

/**
 * Check whether actual exceeds budget for given period/coa; create alert if so.
 */
async function checkVariance(year, month, coaId) {
  const budget = await prisma.budget.findFirst({
    where: {
      coaId,
      year,
      OR: [{ month }, { month: null }],
    },
    orderBy: { month: 'desc' }, // prefer monthly over annual
  });
  if (!budget) return { ok: true, reason: 'no budget' };

  const start = budget.month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const end = budget.month ? new Date(year, month, 0, 23, 59, 59) : new Date(year + 1, 0, 1);

  const sum = await prisma.expense.aggregate({
    where: { coaId, expenseDate: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const actual = Number(sum._sum.amount || 0);
  const budgetAmt = Number(budget.amount);
  if (budgetAmt <= 0) return { ok: true };

  const variancePct = ((actual - budgetAmt) / budgetAmt) * 100;
  const threshold = Number(process.env.VARIANCE_THRESHOLD_PERCENT || 10);

  if (variancePct < threshold) return { ok: true, variancePct };

  const level = variancePct >= 30 ? 'CRITICAL' : variancePct >= 15 ? 'WARNING' : 'INFO';
  const message = `חריגה מתקציב: ${variancePct.toFixed(1)}% — בפועל ${actual.toFixed(2)} מתוך ${budgetAmt.toFixed(2)}`;

  await prisma.varianceAlert.create({
    data: {
      year,
      month: month || 0,
      coaId,
      budgetAmount: budgetAmt,
      actualAmount: actual,
      variancePct,
      level,
      message,
    },
  });
  return { ok: false, variancePct, level };
}

async function getAlerts(query = {}) {
  const where = {};
  if (query.year) where.year = parseInt(query.year);
  if (query.acknowledged !== undefined) where.acknowledged = query.acknowledged === 'true';
  return prisma.varianceAlert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

module.exports = { budgetVsActual, checkVariance, getAlerts };
