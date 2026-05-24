import { prisma } from '../prisma';

export interface EventCOGSRow {
  eventId: string;
  eventName: string;
  customer?: string | null;
  revenue: number;
  ingredients: number;
  labor: number;
  overhead: number;
  totalCogs: number;
  grossProfit: number;
  margin: number;
}

/**
 * COGS per event (לאירוע) — sums:
 *   ingredients = StockMovement(CONSUME) qty*unitCost for event
 *   labor       = LaborEntry hours*rate
 *   overhead    = OverheadAllocation amount
 * Revenue = Event.revenue + invoices linked to event.
 */
export async function cogsPerEvent(opts: { from?: Date; to?: Date } = {}): Promise<EventCOGSRow[]> {
  const events = await prisma.event.findMany({
    where: {
      startsAt: {
        ...(opts.from ? { gte: opts.from } : {}),
        ...(opts.to ? { lte: opts.to } : {}),
      },
    },
    include: {
      customer: true,
      stockMovements: { where: { type: 'CONSUME' } },
      laborEntries: true,
      overheadAlloc: true,
      invoices: { where: { status: { not: 'VOID' } } },
    },
  });

  return events.map(e => {
    const ingredients = e.stockMovements.reduce(
      (s, m) => s + Math.abs(Number(m.qty)) * Number(m.unitCost),
      0,
    );
    const labor = e.laborEntries.reduce(
      (s, l) => s + Number(l.hours) * Number(l.rate),
      0,
    );
    const overhead = e.overheadAlloc.reduce((s, o) => s + Number(o.amount), 0);
    const totalCogs = ingredients + labor + overhead;
    const invoiceRev = e.invoices.reduce((s, i) => s + Number(i.subtotal), 0);
    const revenue = Number(e.revenue) + invoiceRev;
    const grossProfit = revenue - totalCogs;
    const margin = revenue > 0 ? grossProfit / revenue : 0;

    return {
      eventId: e.id,
      eventName: e.name,
      customer: e.customer?.name,
      revenue: round(revenue),
      ingredients: round(ingredients),
      labor: round(labor),
      overhead: round(overhead),
      totalCogs: round(totalCogs),
      grossProfit: round(grossProfit),
      margin: Math.round(margin * 10000) / 10000,
    };
  });
}

function round(n: number) { return Math.round(n * 100) / 100; }
