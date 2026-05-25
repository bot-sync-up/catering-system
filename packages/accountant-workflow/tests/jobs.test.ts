import { describe, it, expect, vi } from 'vitest';
import { MonthlyReportJobs } from '../src/jobs/MonthlyReportJobs';
import { AccountantWorkflow } from '../src/AccountantWorkflow';
import { InMemoryFs } from '../src/storage/inMemoryFs';
import { loadAccountantConfig } from '../src/config';
import { sampleBusiness, sampleInputs } from './__fixtures__/sampleData';

describe('MonthlyReportJobs.handle', () => {
  it('monthly -> מריץ runMonthly של ה-workflow', async () => {
    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'manual' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs: new InMemoryFs(),
    });
    const loadData = vi.fn().mockResolvedValue(sampleInputs);
    const jobs = new MonthlyReportJobs({ workflow: wf, loadDataForPeriod: loadData });

    const res = await jobs.handle({
      type: 'monthly',
      period: { period: '2026-03', year: 2026, month: 3 },
    });
    expect(res.processed).toBe(5);
    expect(loadData).toHaveBeenCalledWith({ period: '2026-03', year: 2026, month: 3 }, 'monthly');
  });

  it('annual -> מריץ runAnnual', async () => {
    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'manual' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs: new InMemoryFs(),
    });
    const loadData = vi.fn().mockResolvedValue(sampleInputs);
    const jobs = new MonthlyReportJobs({ workflow: wf, loadDataForPeriod: loadData });

    const res = await jobs.handle({
      type: 'annual',
      period: { period: '2025', year: 2025 },
    });
    expect(res.processed).toBe(2);
  });

  it('weekly-summary -> מפעיל sendWeeklySummary', async () => {
    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'manual' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs: new InMemoryFs(),
    });
    const spy = vi.spyOn(wf, 'sendWeeklySummary').mockResolvedValue(undefined);
    const jobs = new MonthlyReportJobs({
      workflow: wf,
      loadDataForPeriod: vi.fn(),
    });
    const res = await jobs.handle({ type: 'weekly-summary' });
    expect(res.processed).toBe(1);
    expect(spy).toHaveBeenCalled();
  });
});
