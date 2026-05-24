/**
 * Finance app subscription registration.
 *
 * 3 adapters מאזינים בצד finance:
 *  - FinanceToIcountAdapter   (invoice.issued → iCount sync)
 *  - FinanceToCardcomAdapter  (invoice.due    → CardCom charge)
 *  - CardcomToFinanceAdapter  (payment.captured → invoice.paid)
 */

import type { EventBus } from '@catering/event-bus';
import {
  FinanceToIcountAdapter,
  FinanceToCardcomAdapter,
  CardcomToFinanceAdapter,
  type IcountClient,
  type CardcomClient,
  type FinanceClient,
} from '@catering/integration-adapters';

export interface FinanceSubscriptionDeps {
  bus: EventBus;
  redisUrl: string;
  icount: IcountClient;
  cardcom: CardcomClient;
  finance: FinanceClient;
  glAccount?: string;
}

export interface FinanceSubscriptionHandle {
  stop: () => Promise<void>;
}

export async function registerFinanceSubscriptions(
  deps: FinanceSubscriptionDeps,
): Promise<FinanceSubscriptionHandle> {
  const financeToIcount = new FinanceToIcountAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    icount: deps.icount,
    glAccount: deps.glAccount,
  });
  const financeToCardcom = new FinanceToCardcomAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    cardcom: deps.cardcom,
  });
  const cardcomToFinance = new CardcomToFinanceAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    finance: deps.finance,
  });

  await Promise.all([
    financeToIcount.start(),
    financeToCardcom.start(),
    cardcomToFinance.start(),
  ]);

  return {
    stop: async () => {
      await Promise.all([
        financeToIcount.stop(),
        financeToCardcom.stop(),
        cardcomToFinance.stop(),
      ]);
    },
  };
}
