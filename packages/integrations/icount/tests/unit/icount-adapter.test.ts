import nock from 'nock';

import { ICountAdapter } from '../../src/adapters/icount-adapter';
import { RestClient } from '../../src/client/rest-client';
import { DocumentType, VATType } from '../../src/types';

describe('ICountAdapter', () => {
  const baseUrl = 'https://api.test.icount.local/api/v3.php';
  let adapter: ICountAdapter;
  let client: RestClient;

  beforeEach(() => {
    nock.cleanAll();
    client = new RestClient({
      apiKey: 'k',
      companyId: 'c',
      baseUrl,
      maxRetries: 0,
    });
    adapter = new ICountAdapter({ client });
  });

  it('creates a small invoice without allocation number', async () => {
    nock(baseUrl)
      .post('/client/create')
      .reply(200, { client_id: 'cli_1' });
    nock(baseUrl)
      .post('/doc/create')
      .reply(200, {
        doc_id: 'doc_1',
        doc_number: 'INV-001',
        pdf_url: 'https://test.local/inv.pdf',
      });

    const result = await adapter.createInvoice({
      type: DocumentType.TAX_INVOICE,
      currency: 'ILS',
      language: 'he',
      sendByEmail: false,
      customer: { name: 'בדיקה', taxId: '123456789' },
      items: [
        {
          description: 'שירותי ייעוץ',
          quantity: 1,
          unitPrice: 500,
          vatType: VATType.STANDARD,
          vatRate: 17,
        },
      ],
    });

    expect(result.documentNumber).toBe('INV-001');
    expect(result.allocationNumber).toBeUndefined();
    expect(result.totalAmount).toBeCloseTo(585);
    expect(result.netAmount).toBe(500);
  });

  it('requests allocation number for invoice above threshold', async () => {
    nock(baseUrl)
      .post('/client/create')
      .reply(200, { client_id: 'cli_2' });
    nock(baseUrl)
      .post('/allocation_number/get')
      .reply(200, {
        status: true,
        allocation_number: 'ALLOC-9999',
        issued_at: '2024-06-01T10:00:00Z',
      });
    nock(baseUrl)
      .post('/doc/create', (body) => body.allocation_number === 'ALLOC-9999')
      .reply(200, {
        doc_id: 'doc_2',
        doc_number: 'INV-002',
      });

    const result = await adapter.createInvoice({
      type: DocumentType.TAX_INVOICE,
      currency: 'ILS',
      language: 'he',
      sendByEmail: false,
      issueDate: '2024-06-15',
      customer: { name: 'לקוח גדול', taxId: '987654321' },
      items: [
        {
          description: 'פרויקט',
          quantity: 1,
          unitPrice: 30_000,
          vatType: VATType.STANDARD,
          vatRate: 17,
        },
      ],
    });

    expect(result.allocationNumber).toBe('ALLOC-9999');
    expect(result.totalAmount).toBeCloseTo(35_100);
  });

  it('lists transactions with pagination', async () => {
    nock(baseUrl)
      .post('/doc/list')
      .reply(200, {
        total: 2,
        docs: [
          {
            doc_id: 'd1',
            doc_number: 'INV-001',
            doctype: 'tax_invoice',
            issue_date: '2024-06-01',
            total_amount: 1170,
            vat_amount: 170,
            net_amount: 1000,
            client_name: 'Acme',
          },
          {
            doc_id: 'd2',
            doc_number: 'INV-002',
            doctype: 'receipt',
            issue_date: '2024-06-02',
            total_amount: 500,
            client_name: 'Beta',
          },
        ],
      });

    const result = await adapter.listTransactions({
      fromDate: '2024-06-01',
      toDate: '2024-06-30',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].documentNumber).toBe('INV-001');
  });

  it('cancels a document', async () => {
    nock(baseUrl)
      .post('/doc/cancel')
      .reply(200, { doc_id: 'doc_x', doc_number: 'INV-X', doctype: 'tax_invoice' });

    const result = await adapter.cancelDocument('doc_x', 'duplicate');
    expect(result.status).toBe('cancelled');
  });
});
