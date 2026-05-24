// DocumentService — create / issue / convert / cancel.
import type { DocStatus, DocTag, DocType } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { computeTotals, round2 } from '../lib/money.js';
import { nextDocNumber } from '../lib/numbering.js';
import { canConvert, canTransition, isTaxDoc } from '../lib/state.js';
import { config } from '../lib/config.js';

export interface ItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  vatRate?: number;
}

export interface InstallmentInput {
  seq: number;
  dueDate: Date;
  percent?: number;          // 0..1
  amount?: number;           // fixed amount (alternative to percent)
}

export interface CreateDocInput {
  orgId: string;
  customerId: string;
  type: DocType;
  tag?: DocTag;
  items: ItemInput[];
  dueDate?: Date;
  notes?: string;
  parentId?: string;
  installments?: InstallmentInput[];
  vatRate?: number;
}

export class DocumentService {
  async create(input: CreateDocInput) {
    const vatRate = input.vatRate ?? config.vatRate;
    const totals = computeTotals(input.items, vatRate);

    const installments = this.resolveInstallments(input.installments ?? [], totals.total);

    return prisma.$transaction(async (tx) => {
      const number = await nextDocNumber(tx, input.orgId, input.type);
      const doc = await tx.document.create({
        data: {
          orgId: input.orgId,
          customerId: input.customerId,
          type: input.type,
          tag: input.tag ?? 'OFFICIAL',
          status: 'DRAFT',
          number,
          dueDate: input.dueDate,
          notes: input.notes,
          parentId: input.parentId,
          subtotal: totals.subtotal,
          vatRate,
          vatAmount: totals.vatAmount,
          total: totals.total,
          balance: totals.total,
          items: {
            create: input.items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discount: it.discount ?? 0,
              vatRate: it.vatRate ?? vatRate,
              lineTotal: round2(it.quantity * it.unitPrice * (1 - (it.discount ?? 0))),
            })),
          },
          installments: installments.length
            ? { create: installments }
            : undefined,
        },
        include: { items: true, installments: true },
      });
      return doc;
    });
  }

  private resolveInstallments(rows: InstallmentInput[], total: number) {
    if (!rows.length) return [];
    return rows.map((r) => {
      let amount = r.amount;
      if (amount == null && r.percent != null) {
        amount = round2(total * r.percent);
      }
      if (amount == null) {
        throw new Error(`Installment seq ${r.seq}: must have amount or percent`);
      }
      return {
        seq: r.seq,
        dueDate: r.dueDate,
        percent: r.percent,
        amount,
        paid: false,
      };
    });
  }

  async setStatus(documentId: string, to: DocStatus) {
    const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    if (!canTransition(doc.status, to)) {
      throw new Error(`Illegal transition ${doc.status} -> ${to}`);
    }
    return prisma.document.update({ where: { id: documentId }, data: { status: to } });
  }

  async issue(documentId: string) {
    return this.setStatus(documentId, 'ISSUED');
  }

  /** Convert (e.g. Quote -> Order, Order -> Invoice). */
  async convert(sourceId: string, toType: DocType) {
    const src = await prisma.document.findUniqueOrThrow({
      where: { id: sourceId },
      include: { items: true, installments: true },
    });
    if (!canConvert(src.type, toType)) {
      throw new Error(`Cannot convert ${src.type} to ${toType}`);
    }
    return this.create({
      orgId: src.orgId,
      customerId: src.customerId,
      type: toType,
      tag: src.tag,
      parentId: src.id,
      dueDate: src.dueDate ?? undefined,
      vatRate: Number(src.vatRate),
      items: src.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount),
        vatRate: Number(i.vatRate),
      })),
      installments: src.installments.map((ins) => ({
        seq: ins.seq,
        dueDate: ins.dueDate,
        percent: ins.percent ? Number(ins.percent) : undefined,
        amount: Number(ins.amount),
      })),
    });
  }

  async cancel(documentId: string) {
    const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    if (isTaxDoc(doc.type)) {
      throw new Error('Tax documents must be reversed via CREDIT_NOTE, not cancelled');
    }
    return this.setStatus(documentId, 'CANCELLED');
  }

  /** Issue a credit note that reverses (full or partial) a tax invoice. */
  async credit(originalId: string, items?: ItemInput[]) {
    const original = await prisma.document.findUniqueOrThrow({
      where: { id: originalId },
      include: { items: true },
    });
    if (!isTaxDoc(original.type) || original.type === 'CREDIT_NOTE') {
      throw new Error('Can only credit a tax invoice');
    }
    const useItems: ItemInput[] = (items ?? original.items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      vatRate: Number(i.vatRate),
    })));
    const credit = await this.create({
      orgId: original.orgId,
      customerId: original.customerId,
      type: 'CREDIT_NOTE',
      tag: original.tag,
      parentId: original.id,
      items: useItems,
      vatRate: Number(original.vatRate),
    });
    await prisma.document.update({
      where: { id: credit.id },
      data: { creditOfId: original.id },
    });
    // Mark original as CREDITED if fully credited.
    const creditedTotal = await prisma.document.aggregate({
      where: { creditOfId: original.id },
      _sum: { total: true },
    });
    if (Number(creditedTotal._sum.total ?? 0) >= Number(original.total)) {
      await prisma.document.update({
        where: { id: original.id },
        data: { status: 'CREDITED' },
      });
    }
    return credit;
  }
}

export const documentService = new DocumentService();
