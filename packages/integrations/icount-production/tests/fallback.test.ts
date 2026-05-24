/**
 * tests/fallback.test.ts
 * בדיקות שרשרת fallback של ה-adapters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import nock from 'nock';
import { AdapterFactory } from '../src/AdapterFactory';
import { IcountClient } from '../src/IcountClient';
import { MockAdapter } from '../src/adapters/MockAdapter';
import { DocumentType } from '../src/types';

describe('AdapterFactory — fallback chain', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it('משתמש ב-mock כשאין שום ספק אחר', async () => {
    const factory = new AdapterFactory({
      enableMockFallback: true,
    });
    const adapter = await factory.getActive();
    expect(adapter.providerName).toBe('mock');
  });

  it('מנפיק חשבונית דרך mock', async () => {
    const factory = new AdapterFactory({ enableMockFallback: true });
    const { result, provider } = await factory.execute(a =>
      a.createInvoice({
        doctype: DocumentType.TAX_INVOICE,
        client_name: 'לקוח טסט',
        items: [{ description: 'שירות', quantity: 1, unitprice: 100 }],
      }),
    );
    expect(provider).toBe('mock');
    expect(result.status).toBe(true);
    expect(result.doc_num).toBeDefined();
  });

  it('עובר ל-fallback כש-iCount נופל', async () => {
    nock('https://api.icount.co.il')
      .post(/.*/)
      .reply(500, { error: 'down' })
      .persist();

    const client = new IcountClient({
      credentials: { cid: 'C1', user: 'u', password: 'p', apiToken: 'tok' },
    });

    const factory = new AdapterFactory({
      icount: { client },
      enableMockFallback: true,
    });

    const { result, provider } = await factory.execute(a =>
      a.createInvoice({
        doctype: DocumentType.INVOICE,
        client_name: 'לקוח מבחן',
        items: [{ description: 'מוצר', quantity: 2, unitprice: 50 }],
      }),
    );

    expect(provider).toBe('mock');
    expect(result.status).toBe(true);
  });

  it('זורק שגיאה כשכל ה-adapters נופלים', async () => {
    nock('https://api.icount.co.il')
      .post(/.*/)
      .reply(500, { error: 'down' })
      .persist();

    const client = new IcountClient({
      credentials: { cid: 'C1', user: 'u', password: 'p', apiToken: 'tok' },
    });

    const mock = new MockAdapter();
    mock.setHealthy(false);

    const factory = new AdapterFactory({
      icount: { client },
      enableMockFallback: false,
    });
    // Manually inject failing mock to simulate full failure
    (factory as any).adapters.push(mock);

    await expect(
      factory.execute(a =>
        a.createInvoice({
          doctype: DocumentType.INVOICE,
          client_name: 'לקוח',
          items: [{ description: 'X', quantity: 1, unitprice: 1 }],
        }),
      ),
    ).rejects.toThrow(/All adapters failed/);
  });

  it('preferProvider מאלץ adapter ספציפי', async () => {
    const factory = new AdapterFactory({ enableMockFallback: true });
    const { provider } = await factory.execute(
      a => a.isHealthy().then(() => ({ ok: true })),
      { preferProvider: 'mock' },
    );
    expect(provider).toBe('mock');
  });
});
