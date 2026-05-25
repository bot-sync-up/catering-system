import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadAccountantConfig,
  getConfig,
  setReportingMode,
  resetConfigForTesting,
  AccountantConfigSchema,
} from '../src/config';

describe('AccountantConfig', () => {
  beforeEach(() => resetConfigForTesting());

  it('ברירת מחדל: manual + יום 10 לחודש', () => {
    const cfg = loadAccountantConfig({});
    expect(cfg.TAX_REPORTING_MODE).toBe('manual');
    expect(cfg.ACCOUNTANT_NOTIFY_DAY_OF_MONTH).toBe(10);
    expect(cfg.ACCOUNTANT_TZ).toBe('Asia/Jerusalem');
    expect(cfg.ACCOUNTANT_ARCHIVE_YEARS).toBe(7);
  });

  it('פרס TAX_REPORTING_MODE מ-ENV', () => {
    const cfg = loadAccountantConfig({ TAX_REPORTING_MODE: 'hybrid' } as NodeJS.ProcessEnv);
    expect(cfg.TAX_REPORTING_MODE).toBe('hybrid');
  });

  it('דוחה ערך לא חוקי', () => {
    expect(() =>
      loadAccountantConfig({ TAX_REPORTING_MODE: 'wrong' } as NodeJS.ProcessEnv),
    ).toThrow();
  });

  it('דוחה אימייל לא חוקי', () => {
    expect(() =>
      AccountantConfigSchema.parse({ ACCOUNTANT_EMAIL: 'not-email' }),
    ).toThrow();
  });

  it('setReportingMode עדכון runtime', () => {
    getConfig();
    const next = setReportingMode('hybrid');
    expect(next.TAX_REPORTING_MODE).toBe('hybrid');
    expect(getConfig().TAX_REPORTING_MODE).toBe('hybrid');
  });
});
