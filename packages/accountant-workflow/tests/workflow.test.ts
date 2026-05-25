import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AccountantWorkflow,
  InMemoryFilesRepository,
} from '../src/AccountantWorkflow';
import { InMemoryFs } from '../src/storage/inMemoryFs';
import { SubmissionAuditLog, InMemoryAuditStore } from '../src/audit/SubmissionAuditLog';
import { AccountantNotifier } from '../src/notifications/AccountantNotifier';
import { resetConfigForTesting, loadAccountantConfig } from '../src/config';
import { sampleBusiness, samplePeriod, annualPeriod, sampleInputs } from './__fixtures__/sampleData';
import { ForbiddenError } from '../src/rbac';

const accountant = { userId: 'u-acc', role: 'accountant' as const };
const manager = { userId: 'u-mgr', role: 'general-manager' as const };
const staff = { userId: 'u-staff', role: 'staff' as const };

describe('AccountantWorkflow', () => {
  beforeEach(() => {
    resetConfigForTesting();
  });

  it('manual mode: runMonthly מפיק 5 קבצים, שולח התראה, רושם audit', async () => {
    const fs = new InMemoryFs();
    const repo = new InMemoryFilesRepository();
    const auditStore = new InMemoryAuditStore();
    const audit = new SubmissionAuditLog(auditStore);
    const emailSend = vi.fn().mockResolvedValue(undefined);
    const notifier = new AccountantNotifier({
      email: { send: emailSend },
      contact: { email: 'acc@example.co.il' },
    });

    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'manual' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs,
      notifier,
      audit,
      repository: repo,
    });

    const results = await wf.runMonthly(samplePeriod, sampleInputs);
    expect(results).toHaveLength(5);
    expect(results.map((r) => r.formType).sort()).toEqual(
      ['BALANCE_SHEET', 'FORM102', 'INCOME_STATEMENT', 'JOURNAL_ENTRIES', 'PCN874'].sort(),
    );
    expect(emailSend).toHaveBeenCalledTimes(5);
    const events = await audit.getAll();
    expect(events.filter((e) => e.action === 'file.generated')).toHaveLength(5);
  });

  it('auto mode: runMonthly אינו מפיק כלום (גזירה למודול הישן)', async () => {
    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'auto' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs: new InMemoryFs(),
    });
    const results = await wf.runMonthly(samplePeriod, sampleInputs);
    expect(results).toEqual([]);
  });

  it('runAnnual מפיק טופס 856 + 126', async () => {
    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'manual' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs: new InMemoryFs(),
    });
    const results = await wf.runAnnual(annualPeriod, sampleInputs);
    expect(results.map((r) => r.formType).sort()).toEqual(['FORM126', 'FORM856']);
  });

  it('downloadFile מעדכן סטטוס + מתעד audit', async () => {
    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'manual' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs: new InMemoryFs(),
    });
    const [file] = await wf.runMonthly(samplePeriod, sampleInputs);
    const updated = await wf.downloadFile(file.id, accountant);
    expect(updated.status).toBe('downloaded');
    expect(updated.downloadedAt).toBeDefined();
  });

  it('markSubmitted דורש מספר אסמכתא', async () => {
    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'manual' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs: new InMemoryFs(),
    });
    const [file] = await wf.runMonthly(samplePeriod, sampleInputs);
    await expect(
      wf.markSubmitted(file.id, accountant, { submissionReference: '   ' }),
    ).rejects.toThrow(/submissionReference/);

    const updated = await wf.markSubmitted(file.id, accountant, {
      submissionReference: 'REF-123',
      submittedAt: '2026-05-12T10:00:00.000Z',
    });
    expect(updated.status).toBe('submitted');
    expect(updated.submissionReference).toBe('REF-123');
    expect(updated.submittedAt).toBe('2026-05-12T10:00:00.000Z');
  });

  it('RBAC: staff לא יכול להוריד', async () => {
    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'manual' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs: new InMemoryFs(),
    });
    const [file] = await wf.runMonthly(samplePeriod, sampleInputs);
    await expect(wf.downloadFile(file.id, staff)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('RBAC: רק מנהל יכול לשנות מצב דיווח', async () => {
    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'manual' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs: new InMemoryFs(),
    });
    await expect(wf.changeReportingMode(accountant, 'hybrid')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    const cfg = await wf.changeReportingMode(manager, 'hybrid');
    expect(cfg.TAX_REPORTING_MODE).toBe('hybrid');
  });

  it('listFiles מסנן לרו"ח רק קבצים שאינם pending', async () => {
    const wf = new AccountantWorkflow({
      config: loadAccountantConfig({ TAX_REPORTING_MODE: 'manual' } as NodeJS.ProcessEnv),
      business: sampleBusiness,
      fs: new InMemoryFs(),
    });
    await wf.runMonthly(samplePeriod, sampleInputs);
    const accFiles = await wf.listFiles(accountant);
    // כל הקבצים ב-pending בהתחלה -> רו"ח לא רואה כלום עד שהמערכת/מנהל מורידה
    expect(accFiles).toHaveLength(0);
    const mgrFiles = await wf.listFiles(manager);
    expect(mgrFiles.length).toBeGreaterThanOrEqual(5);
  });
});
