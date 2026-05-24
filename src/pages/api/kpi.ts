import type { NextApiRequest, NextApiResponse } from 'next';
import { pnlByPeriod } from '../../lib/aggregations/pnl';
import { cashflow } from '../../lib/aggregations/cashflow';
import { simpleRetention } from '../../lib/aggregations/retention';
import { startOfYear, endOfMonth } from 'date-fns';

/**
 * Dashboard KPIs: YTD revenue, net income, current cash position, retention.
 */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const now = new Date();
  const from = startOfYear(now);
  const to = endOfMonth(now);
  const filter = { from, to };

  const [pnl, cash, ret] = await Promise.all([
    pnlByPeriod(filter),
    cashflow(filter, 6),
    simpleRetention({ from, to }),
  ]);

  const ytdRevenue = pnl.reduce((s, r) => s + r.revenue, 0);
  const ytdNet = pnl.reduce((s, r) => s + r.netIncome, 0);
  const cashPosition = cash.filter(r => !r.isForecast).at(-1)?.cumulative ?? 0;
  const forecastNext = cash.filter(r => r.isForecast).at(0)?.net ?? 0;

  res.json({
    ytdRevenue,
    ytdNet,
    ytdMargin: ytdRevenue > 0 ? ytdNet / ytdRevenue : 0,
    cashPosition,
    forecastNextMonth: forecastNext,
    retentionRate: ret.rate,
    pnl,
    cashflow: cash,
  });
}
