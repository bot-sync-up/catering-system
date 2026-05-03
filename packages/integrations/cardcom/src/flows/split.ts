import { CardComClient } from '../client/CardComClient';
import { SplitChargeInput, SplitChargeInputSchema, ChargeResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Split payments: a single customer-facing charge is split between multiple
 * receiving parties. We charge the full sum once (preferring token) and
 * record per-party allocations in IntegrationLogs / DB. CardCom's "Split"
 * is implemented at booking level; the parent app must persist the breakdown.
 */
export interface SplitChargeResult extends ChargeResult {
  parties: Array<{ partyExternalId: string; amount: number }>;
}

export async function splitCharge(
  client: CardComClient,
  input: SplitChargeInput
): Promise<SplitChargeResult> {
  const i = SplitChargeInputSchema.parse(input);
  const total = i.parties.reduce((s, p) => s + p.amount, 0);
  if (Math.abs(total - i.amount) > 0.01) {
    throw new Error(
      `splitCharge: parties sum ${total} != amount ${i.amount}`
    );
  }
  logger.info(
    { parties: i.parties.length, total: i.amount },
    'split charge starting'
  );
  const charge = await client.charge({
    amount: i.amount,
    numOfPayments: i.numOfPayments,
    token: i.token,
    cardOwner: i.cardOwner,
    productName: i.productName,
    isoCoinId: i.isoCoinId,
    documentToCreate: i.documentToCreate,
    extra: {
      ...(i.extra ?? {}),
      // Pass parties metadata for CardCom to log
      SplitPartiesJson: JSON.stringify(i.parties),
    },
  });
  return {
    ...charge,
    parties: i.parties.map((p) => ({ partyExternalId: p.partyExternalId, amount: p.amount })),
  };
}
