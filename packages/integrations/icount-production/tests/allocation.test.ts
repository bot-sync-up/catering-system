/**
 * tests/allocation.test.ts
 * Test ספי הקצאה לפי מודל ישראל
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AllocationManager,
  ALLOCATION_THRESHOLDS_ILS,
  AllocationRequiredError,
} from '../src/allocation/AllocationManager';
import { DocumentType } from '../src/types';

function makeMockClient(allocResp: any = { allocation_num: 'A-123', status: 'approved' }) {
  return {
    getAllocationNumber: vi.fn().mockResolvedValue(allocResp),
  } as any;
}

describe('AllocationManager — ספי מודל ישראל', () => {
  it('הסף לשנת 2024 הוא 25,000 ₪', () => {
    expect(ALLOCATION_THRESHOLDS_ILS[2024]).toBe(25_000);
  });

  it('הסף לשנת 2025 הוא 20,000 ₪', () => {
    expect(ALLOCATION_THRESHOLDS_ILS[2025]).toBe(20_000);
  });

  it('הסף לשנת 2026 הוא 10,000 ₪', () => {
    expect(ALLOCATION_THRESHOLDS_ILS[2026]).toBe(10_000);
  });

  it('הסף לשנת 2027 הוא 5,000 ₪', () => {
    expect(ALLOCATION_THRESHOLDS_ILS[2027]).toBe(5_000);
  });

  describe('isAllocationRequired', () => {
    let mgr: AllocationManager;
    beforeEach(() => {
      mgr = new AllocationManager({ client: makeMockClient() });
    });

    it('דורש הקצאה לחשבונית מס מעל הסף', () => {
      expect(mgr.isAllocationRequired(30_000, 2024, DocumentType.TAX_INVOICE)).toBe(true);
      expect(mgr.isAllocationRequired(25_000, 2024, DocumentType.TAX_INVOICE)).toBe(true);
    });

    it('לא דורש הקצאה לחשבונית מס מתחת לסף', () => {
      expect(mgr.isAllocationRequired(24_999, 2024, DocumentType.TAX_INVOICE)).toBe(false);
    });

    it('לא דורש הקצאה לקבלה', () => {
      expect(mgr.isAllocationRequired(100_000, 2024, DocumentType.RECEIPT)).toBe(false);
    });

    it('לא דורש הקצאה להצעת מחיר', () => {
      expect(mgr.isAllocationRequired(100_000, 2024, DocumentType.QUOTE)).toBe(false);
    });

    it('דורש הקצאה גם לחשבונית זיכוי מעל הסף', () => {
      expect(mgr.isAllocationRequired(10_000, 2026, DocumentType.CREDIT_NOTE)).toBe(true);
    });

    it('שנה 2027 — סף 5,000', () => {
      expect(mgr.isAllocationRequired(5_000, 2027, DocumentType.TAX_INVOICE)).toBe(true);
      expect(mgr.isAllocationRequired(4_999, 2027, DocumentType.TAX_INVOICE)).toBe(false);
    });

    it('שנים עתידיות יורשות את הסף האחרון', () => {
      expect(mgr.isAllocationRequired(5_000, 2030, DocumentType.TAX_INVOICE)).toBe(true);
    });
  });

  describe('assertAllocationIfNeeded', () => {
    it('מחזיר null כשלא נדרש', async () => {
      const mgr = new AllocationManager({ client: makeMockClient() });
      const result = await mgr.assertAllocationIfNeeded(1_000, 2025, {
        doctype: DocumentType.TAX_INVOICE,
        date: '2025-06-01',
        customer_name: 'לקוח א',
      });
      expect(result).toBeNull();
    });

    it('מחזיר מספר הקצאה כשנדרש', async () => {
      const client = makeMockClient({ allocation_num: 'A-9999', status: 'approved' });
      const mgr = new AllocationManager({ client });
      const result = await mgr.assertAllocationIfNeeded(30_000, 2025, {
        doctype: DocumentType.TAX_INVOICE,
        date: '2025-06-01',
        customer_name: 'לקוח ב',
        customer_vat_id: '123456789',
      });
      expect(result).toBe('A-9999');
      expect(client.getAllocationNumber).toHaveBeenCalledTimes(1);
    });

    it('זורק AllocationRequiredError כשנדחה', async () => {
      const client = makeMockClient({ allocation_num: '', status: 'rejected', reason: 'over limit' });
      const mgr = new AllocationManager({ client });
      await expect(
        mgr.assertAllocationIfNeeded(50_000, 2026, {
          doctype: DocumentType.TAX_INVOICE,
          date: '2026-01-15',
          customer_name: 'לקוח ג',
        }),
      ).rejects.toThrow(AllocationRequiredError);
    });

    it('משתמש ב-cache לבקשות זהות', async () => {
      const client = makeMockClient();
      const mgr = new AllocationManager({ client });
      const req = {
        doctype: DocumentType.TAX_INVOICE,
        date: '2025-06-01',
        customer_name: 'לקוח ד',
        customer_vat_id: '987654321',
      };
      await mgr.assertAllocationIfNeeded(30_000, 2025, req);
      await mgr.assertAllocationIfNeeded(30_000, 2025, req);
      expect(client.getAllocationNumber).toHaveBeenCalledTimes(1);
    });
  });
});
