// PaymentService — apply payments, FIFO across installments, auto-status.
import type { PaymentMethod } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { round2 } from '../lib/money.js';
import { customerService } from './customers.js';

export interface RecordPaymentInput {
  documentId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt?: Date;
  checkId?: string;
  notes?: string;
}

export class PaymentService {
  async record(input: RecordPaymentInput) {
    return prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUniqueOrThrow({
        where: { id: input.documentId },
        include: { installments: { orderBy: { seq: 'asc' } } },
      });
      if (doc.status === 'CANCELLED' || doc.status === 'CREDITED') {
        throw new Error(`Cannot record payment on ${doc.status} document`);
      }

      const payment = await tx.payment.create({
        data: {
          documentId: doc.id,
          amount: input.amount,
          method: input.method,
          paidAt: input.paidAt ?? new Date(),
          reference: input.reference,
          checkId: input.checkId,
          notes: input.notes,
        },
      });

      // Apply FIFO across installments.
      let remaining = round2(input.amount);
      for (const ins of doc.installments.filter((i) => !i.paid)) {
        if (remaining <= 0) break;
        const insAmount = Number(ins.amount);
        if (remaining >= insAmount) {
          await tx.installment.update({
            where: { id: ins.id },
            data: { paid: true, paidAt: input.paidAt ?? new Date() },
          });
          remaining = round2(remaining - insAmount);
        } else {
          // partial - reduce installment amount and create a paid stub
          await tx.installment.update({
            where: { id: ins.id },
            data: { amount: round2(insAmount - remaining) },
          });
          remaining = 0;
        }
      }

      const newPaid = round2(Number(doc.paidAmount) + Number(input.amount));
      const newBalance = round2(Number(doc.total) - newPaid);
      const newStatus =
        newBalance <= 0 ? 'PAID' :
        newPaid > 0 ? 'PARTIAL_PAID' :
        doc.status;
      await tx.document.update({
        where: { id: doc.id },
        data: {
          paidAmount: newPaid,
          balance: newBalance,
          status: newStatus,
        },
      });

      // If fully paid, possibly unfreeze customer.
      if (newBalance <= 0) {
        await customerService.recheckFreezeTx(tx, doc.customerId);
      }

      return payment;
    });
  }
}

export const paymentService = new PaymentService();
