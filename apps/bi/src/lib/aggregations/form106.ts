import { prisma } from '../prisma';

export interface Form106Row {
  employeeId: string;
  taxId: string;
  name: string;
  year: number;
  totalGross: number;
  totalTax: number;
  totalSocialSecurity: number;
  totalHealthInsurance: number;
  totalPension: number;
  netPaid: number;
}

/**
 * Annual Form 106 — Israeli "טופס 106" employee tax summary.
 * One row per employee per year.
 */
export async function form106ForYear(year: number, employeeId?: string): Promise<Form106Row[]> {
  const where: any = { periodYear: year };
  if (employeeId) where.employeeId = employeeId;

  const grouped = await prisma.payslip.groupBy({
    by: ['employeeId'],
    where,
    _sum: {
      gross: true,
      taxWithheld: true,
      socialSecurity: true,
      healthInsurance: true,
      pension: true,
    },
  });

  const employees = await prisma.employee.findMany({
    where: { id: { in: grouped.map(g => g.employeeId) } },
  });
  const empMap = new Map(employees.map(e => [e.id, e]));

  return grouped.map(g => {
    const e = empMap.get(g.employeeId)!;
    const totalGross = Number(g._sum.gross ?? 0);
    const totalTax = Number(g._sum.taxWithheld ?? 0);
    const totalSS = Number(g._sum.socialSecurity ?? 0);
    const totalHI = Number(g._sum.healthInsurance ?? 0);
    const totalPension = Number(g._sum.pension ?? 0);
    return {
      employeeId: e.id,
      taxId: e.taxId,
      name: e.name,
      year,
      totalGross,
      totalTax,
      totalSocialSecurity: totalSS,
      totalHealthInsurance: totalHI,
      totalPension,
      netPaid: totalGross - totalTax - totalSS - totalHI - totalPension,
    };
  });
}
