import { AdapterFactory } from '../../src/adapters/factory';
import { ICountAdapter } from '../../src/adapters/icount-adapter';
import { GreenInvoiceAdapter } from '../../src/adapters/green-invoice-adapter';
import { RivhitAdapter } from '../../src/adapters/rivhit-adapter';
import { ProviderName } from '../../src/types';

describe('AdapterFactory', () => {
  const config = { apiKey: 'k', companyId: 'c', maxRetries: 0 };

  it('creates iCount adapter', () => {
    const adapter = AdapterFactory.create(ProviderName.ICOUNT, config);
    expect(adapter).toBeInstanceOf(ICountAdapter);
    expect(adapter.name).toBe(ProviderName.ICOUNT);
  });

  it('creates GreenInvoice adapter', () => {
    const adapter = AdapterFactory.create(ProviderName.GREEN_INVOICE, config);
    expect(adapter).toBeInstanceOf(GreenInvoiceAdapter);
    expect(adapter.name).toBe(ProviderName.GREEN_INVOICE);
  });

  it('creates Rivhit adapter', () => {
    const adapter = AdapterFactory.create(ProviderName.RIVHIT, config);
    expect(adapter).toBeInstanceOf(RivhitAdapter);
    expect(adapter.name).toBe(ProviderName.RIVHIT);
  });

  it('throws on unknown provider', () => {
    expect(() => AdapterFactory.create('unknown' as ProviderName, config)).toThrow();
  });
});
