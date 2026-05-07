import nock from 'nock';

import { RestClient } from '../../src/client/rest-client';
import {
  CustomerSyncService,
  InMemoryCustomerStore,
} from '../../src/services/customer-sync.service';

describe('CustomerSyncService', () => {
  const baseUrl = 'https://api.test.icount.local/api/v3.php';
  let store: InMemoryCustomerStore;
  let service: CustomerSyncService;

  beforeEach(() => {
    nock.cleanAll();
    store = new InMemoryCustomerStore();
    const client = new RestClient({
      apiKey: 'k',
      companyId: 'c',
      baseUrl,
      maxRetries: 0,
    });
    service = new CustomerSyncService(client, store);
  });

  it('creates a new customer when not in store', async () => {
    nock(baseUrl).post('/client/create').reply(200, { client_id: 'cli_42' });

    const customer = await service.sync({
      name: 'חברה חדשה',
      taxId: '111222333',
      email: 'a@b.co.il',
    });

    expect(customer.id).toBe('cli_42');
    expect(await store.findByTaxId('111222333')).toBeTruthy();
  });

  it('updates an existing customer (looked up by tax id)', async () => {
    await store.upsert({ id: 'cli_99', name: 'ישן', taxId: '999888777', country: 'IL' });

    nock(baseUrl).post('/client/update').reply(200, { id: 'cli_99' });

    const customer = await service.sync({
      name: 'חדש',
      taxId: '999888777',
    });

    expect(customer.id).toBe('cli_99');
    expect(customer.name).toBe('חדש');
  });
});
