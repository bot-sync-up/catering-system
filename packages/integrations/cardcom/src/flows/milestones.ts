import { CardComClient } from '../client/CardComClient';
import {
  MilestonePlanInput,
  MilestonePlanInputSchema,
  MilestoneStage,
} from '../types';
import { logger } from '../utils/logger';

export interface MilestonePlanRecord {
  planId: string;
  customerExternalId: string;
  totalAmount: number;
  stages: Array<{
    stage: MilestoneStage;
    amount: number;
    dueDate: string;
    status: 'pending' | 'charged' | 'failed';
    transactionId?: string;
    chargedAt?: Date;
    index: number;
  }>;
}

export function buildMilestonePlan(input: MilestonePlanInput): MilestonePlanRecord {
  const i = MilestonePlanInputSchema.parse(input);
  const sum =
    i.deposit.amount +
    i.intermediates.reduce((s, x) => s + x.amount, 0) +
    i.final.amount;
  if (Math.abs(sum - i.totalAmount) > 0.01) {
    throw new Error(`milestone plan: parts ${sum} != total ${i.totalAmount}`);
  }
  const stages: MilestonePlanRecord['stages'] = [];
  let idx = 0;
  stages.push({
    stage: 'deposit',
    amount: i.deposit.amount,
    dueDate: i.deposit.dueDate,
    status: 'pending',
    index: idx++,
  });
  for (const inter of i.intermediates) {
    stages.push({
      stage: 'intermediate',
      amount: inter.amount,
      dueDate: inter.dueDate,
      status: 'pending',
      index: idx++,
    });
  }
  stages.push({
    stage: 'final',
    amount: i.final.amount,
    dueDate: i.final.dueDate,
    status: 'pending',
    index: idx++,
  });
  return {
    planId: `mp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    customerExternalId: i.customerExternalId,
    totalAmount: i.totalAmount,
    stages,
  };
}

export async function chargeMilestone(
  client: CardComClient,
  plan: MilestonePlanRecord,
  stageIndex: number,
  token: string
): Promise<MilestonePlanRecord> {
  const stage = plan.stages[stageIndex];
  if (!stage) throw new Error(`stage ${stageIndex} not found`);
  if (stage.status === 'charged') {
    logger.info({ stageIndex }, 'milestone already charged; skipping');
    return plan;
  }
  // Enforce strict order: previous stage must be charged
  if (stageIndex > 0 && plan.stages[stageIndex - 1].status !== 'charged') {
    throw new Error('milestone: previous stage not yet charged');
  }
  try {
    const res = await client.charge({
      amount: stage.amount,
      numOfPayments: 1,
      token,
      productName: `Milestone ${stage.stage} (${plan.planId})`,
      isoCoinId: 1,
      documentToCreate: 'TaxInvoiceAndReceipt',
    });
    stage.status = 'charged';
    stage.transactionId = res.transactionId;
    stage.chargedAt = new Date();
  } catch (e) {
    stage.status = 'failed';
    throw e;
  }
  return plan;
}
