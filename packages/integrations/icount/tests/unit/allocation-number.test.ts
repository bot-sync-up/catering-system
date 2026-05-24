import nock from 'nock';

import { RestClient } from '../../src/client/rest-client';
import { AllocationNumberService } from '../../src/services/allocation-number.service';
import { AllocationNumberError, DocumentType } from '../../src/types';

describe('AllocationNumberService', () => {
  const baseUrl = 'https://api.test.icount.local/api/v3.php';
  let client: RestClient;
  let service: AllocationNumberService;

  beforeEach(() => {
    nock.cleanAll();
    client = new RestClient({
      apiKey: 'k',
      companyId: 'c',
      baseUrl,
      maxRetries: 0,
    });
    service = new AllocationNumberService({ client });
  });

  describe('isAllocationNumberRequired', () => {
    it('requires allocation for tax invoice above 2024 threshold', () => {
      expect(
        AllocationNumberService.isAllocationNumberRequired(
          DocumentType.TAX_INVOICE,
          25_000,
          '2024-06-01',
        ),
      ).toBe(true);
    });

    it('does not require for receipt regardless of amount', () => {
      expect(
        AllocationNumberService.isAllocationNumberRequired(
          DocumentType.RECEIPT,
          100_000,
          '2024-06-01',
        ),
      ).toBe(false);
    });

    it('does not require below threshold', () => {
      expect(
        AllocationNumberService.isAllocationNumberRequired(
          DocumentType.TAX_INVOICE,
          1_000,
          '2024-06-01',
        ),
      ).toBe(false);
    });

    it('uses 2025 lower threshold (20k)', () => {
      expect(
        AllocationNumberService.isAllocationNumberRequired(
          DocumentType.TAX_INVOICE,
          20_000,
          '2025-03-01',
        ),
      ).toBe(true);
    });

    it('uses 2027 lowest threshold (5k)', () => {
      expect(
        AllocationNumberService.isAllocationNumberRequired(
          DocumentType.TAX_INVOICE,
          5_500,
          '2027-03-01',
        ),
      ).toBe(true);
    });
  });

  describe('issue', () => {
    it('returns allocation number on success', async () => {
      nock(baseUrl).post('/allocation_number/get').reply(200, {
        status: true,
        allocation_number: '12345-67890',
        issued_at: '2024-06-01T10:00:00Z',
        signature: 'abcdef',
      });

      const result = await service.issue({
        documentType: DocumentType.TAX_INVOICE,
        totalAmount: 30_000,
        vatAmount: 4_500,
        issueDate: '2024-06-01',
      });

      expect(result.allocationNumber).toBe('12345-67890');
      expect(result.isValid).toBe(true);
      expect(result.signature).toBe('abcdef');
    });

    it('throws when totalAmount is invalid', async () => {
      await expect(
        service.issue({
          documentType: DocumentType.TAX_INVOICE,
          totalAmount: 0,
          vatAmount: 0,
          issueDate: '2024-06-01',
        }),
      ).rejects.toBeInstanceOf(AllocationNumberError);
    });

    it('throws when API returns failure', async () => {
      nock(baseUrl).post('/allocation_number/get').reply(200, {
        status: false,
        error: 'Customer tax id required',
      });

      await expect(
        service.issue({
          documentType: DocumentType.TAX_INVOICE,
          totalAmount: 30_000,
          vatAmount: 4_500,
          issueDate: '2024-06-01',
        }),
      ).rejects.toBeInstanceOf(AllocationNumberError);
    });
  });

  describe('validate', () => {
    it('returns true for valid allocation number', async () => {
      nock(baseUrl).post('/allocation_number/validate').reply(200, { valid: true });
      expect(await service.validate('12345-67890')).toBe(true);
    });

    it('returns false for empty string', async () => {
      expect(await service.validate('')).toBe(false);
    });

    it('returns false on API error', async () => {
      nock(baseUrl).post('/allocation_number/validate').reply(500, {});
      expect(await service.validate('xxx')).toBe(false);
    });
  });
});
