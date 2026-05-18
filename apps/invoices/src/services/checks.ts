// PostdatedCheck service — register, deposit, mark cleared/bounced.
import type { CheckStatus } from '@prisma/client';
import { prisma } from '../lib/db.js';

export interface RegisterCheckInput {
  customerId: string;
  bank: string;
  branch?: string;
  account?: string;
  checkNumber: string;
  amount: number;
  dueDate: Date;
  documentId?: string;
  notes?: string;
}

export class CheckService {
  register(input: RegisterCheckInput) {
    return prisma.postdatedCheck.create({ data: input });
  }

  setStatus(id: string, status: CheckStatus, notes?: string) {
    return prisma.postdatedCheck.update({
      where: { id },
      data: { status, notes },
    });
  }

  /** Checks due within `days` days (default 7), still pending. */
  upcoming(days = 7) {
    const limit = new Date(Date.now() + days * 24 * 3600 * 1000);
    return prisma.postdatedCheck.findMany({
      where: { status: 'PENDING', dueDate: { lte: limit } },
      orderBy: { dueDate: 'asc' },
      include: { customer: true },
    });
  }
}

export const checkService = new CheckService();
