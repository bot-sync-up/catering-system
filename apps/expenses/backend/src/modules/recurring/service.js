const prisma = require('../../db/prisma');

/**
 * Generate expense rows for all active recurring expenses for the given year/month.
 * Idempotent: will not duplicate if already generated for that period.
 */
async function generateForMonth(year, month) {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  const recurrings = await prisma.recurringExpense.findMany({
    where: {
      isActive: true,
      autoCreate: true,
      startDate: { lte: periodEnd },
      OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
    },
  });

  const created = [];
  for (const rec of recurrings) {
    // monthly: always generate; quarterly: only if (month - startMonth) % 3 === 0; yearly: only matching month
    if (!shouldGenerate(rec, year, month)) continue;

    const targetDay = Math.min(rec.dayOfMonth || 1, new Date(year, month, 0).getDate());
    const expenseDate = new Date(year, month - 1, targetDay);

    // dedupe: check if expense already exists for this recurring in this month
    const existing = await prisma.expense.findFirst({
      where: {
        recurringId: rec.id,
        expenseDate: { gte: periodStart, lte: periodEnd },
      },
    });
    if (existing) continue;

    const expense = await prisma.expense.create({
      data: {
        amount: rec.amount,
        currency: rec.currency,
        description: `${rec.name} — ${month}/${year}`,
        expenseDate,
        coaId: rec.coaId,
        vendorId: rec.vendorId,
        recurringId: rec.id,
        source: 'RECURRING',
        status: 'RECORDED',
      },
    });
    created.push(expense);

    await prisma.recurringExpense.update({
      where: { id: rec.id },
      data: { lastGeneratedAt: new Date() },
    });
  }
  return { generated: created.length, period: `${year}-${month}` };
}

function shouldGenerate(rec, year, month) {
  const start = new Date(rec.startDate);
  if (rec.frequency === 'MONTHLY') return true;
  if (rec.frequency === 'WEEKLY') return true; // simplified: weekly handled at finer schedule
  if (rec.frequency === 'QUARTERLY') {
    const diff = (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth());
    return diff >= 0 && diff % 3 === 0;
  }
  if (rec.frequency === 'YEARLY') {
    return start.getMonth() + 1 === month;
  }
  return false;
}

module.exports = { generateForMonth };
