import { describe, it, expect, vi } from 'vitest';
import { issueInvoice, AllProvidersFailedError, type InvoiceRequest, type InvoiceProvider, type AuditLog } from '../src/index';

const baseReq: InvoiceRequest = {
  externalRef: 'ORDER-1',
  customer: { name: 'דני', email: 'd@example.com' },
  lines: [{ description: 'שירות', quantity: 1, unitPriceExclVat: 100 }],
  vatRate: 0.18,
  currency: 'ILS',
  issueDate: new Date('2025-03-01'),
};

function provider(name: string, behavior: 'ok' | 'unhealthy' | 'throw'): InvoiceProvider {
  return {
    name,
    isHealthy: vi.fn().mockResolvedValue(behavior !== 'unhealthy'),
    issue: vi.fn().mockImplementation(() => {
      if (behavior === 'throw') throw new Error(`${name} broken`);
      return Promise.resolve({ provider: name, invoiceNumber: '1', pdfUrl: 'https://x', issuedAt: new Date() });
    }),
  };
}

function audit(): AuditLog {
  return { recordAttempt: vi.fn() };
}

describe('invoice fallback', () => {
  it('משתמש בספק הראשון אם תקין', async () => {
    const a = audit();
    const out = await issueInvoice(baseReq, [provider('iCount', 'ok'), provider('GreenInvoice', 'ok')], a);
    expect(out.provider).toBe('iCount');
    expect(a.recordAttempt).toHaveBeenCalledWith('ORDER-1', 'iCount', true);
  });

  it('עובר לספק הבא אם הראשון unhealthy', async () => {
    const a = audit();
    const out = await issueInvoice(
      baseReq,
      [provider('iCount', 'unhealthy'), provider('GreenInvoice', 'ok')],
      a,
    );
    expect(out.provider).toBe('GreenInvoice');
  });

  it('עובר הלאה אם הראשון זורק exception', async () => {
    const a = audit();
    const out = await issueInvoice(
      baseReq,
      [provider('iCount', 'throw'), provider('GreenInvoice', 'ok')],
      a,
    );
    expect(out.provider).toBe('GreenInvoice');
  });

  it('זורק AllProvidersFailedError אם כולם נכשלו', async () => {
    const a = audit();
    await expect(
      issueInvoice(
        baseReq,
        [provider('iCount', 'throw'), provider('GreenInvoice', 'unhealthy'), provider('Rivhit', 'throw')],
        a,
      ),
    ).rejects.toBeInstanceOf(AllProvidersFailedError);
  });

  it('שגיאת ולידציה על דרישה חסרה', async () => {
    const bad = { ...baseReq, lines: [] } as InvoiceRequest;
    await expect(issueInvoice(bad, [provider('iCount', 'ok')], audit())).rejects.toThrow();
  });
});
