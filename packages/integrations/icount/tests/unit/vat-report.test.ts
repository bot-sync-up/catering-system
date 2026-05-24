import nock from 'nock';

import { RestClient } from '../../src/client/rest-client';
import { VATReportService } from '../../src/services/vat-report.service';
import { DocumentType, ICountValidationError } from '../../src/types';

describe('VATReportService', () => {
  const baseUrl = 'https://api.test.icount.local/api/v3.php';
  let service: VATReportService;

  beforeEach(() => {
    nock.cleanAll();
    const client = new RestClient({
      apiKey: 'k',
      companyId: 'c',
      baseUrl,
      maxRetries: 0,
    });
    service = new VATReportService(client);
  });

  it('throws on missing dates', async () => {
    await expect(
      service.generate({ fromDate: '', toDate: '' }),
    ).rejects.toBeInstanceOf(ICountValidationError);
  });

  it('returns parsed VAT report', async () => {
    nock(baseUrl).post('/reports/vat').reply(200, {
      total_sales: 100_000,
      total_vat: 17_000,
      total_net: 83_000,
      total_refunds: 5_000,
      vat_to_pay: 12_000,
      lines: [
        {
          date: '2024-06-01',
          doc_number: 'INV-001',
          doc_type: 'tax_invoice',
          customer_tax_id: '123456789',
          customer_name: 'Acme',
          net_amount: 1000,
          vat_amount: 170,
          total_amount: 1170,
          allocation_number: 'A-1',
        },
      ],
    });

    const report = await service.generate({
      fromDate: '2024-06-01',
      toDate: '2024-06-30',
    });

    expect(report.totalSales).toBe(100_000);
    expect(report.lines).toHaveLength(1);
    expect(report.lines[0].documentType).toBe(DocumentType.TAX_INVOICE);
    expect(report.lines[0].allocationNumber).toBe('A-1');
  });

  it('formats PCN874 output', () => {
    const report = service.formatAsPCN874({
      fromDate: '2024-06-01',
      toDate: '2024-06-30',
      totalSales: 1170,
      totalVAT: 170,
      totalNet: 1000,
      totalRefunds: 0,
      vatToPay: 170,
      documentCount: 1,
      lines: [
        {
          date: '2024-06-15',
          documentNumber: 'INV-001',
          documentType: DocumentType.TAX_INVOICE,
          customerTaxId: '123456789',
          customerName: 'Acme',
          netAmount: 1000,
          vatAmount: 170,
          totalAmount: 1170,
          allocationNumber: 'A-1',
        },
      ],
      generatedAt: new Date().toISOString(),
    });

    expect(report).toContain('A|20240601|20240630');
    expect(report).toContain('B|20240615|INV-001|320');
    expect(report).toContain('Z|');
  });
});
