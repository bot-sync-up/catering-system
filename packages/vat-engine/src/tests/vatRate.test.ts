/**
 * בדיקות vatRate - מוודא שהתאריך הקובע (1/1/2025) נשמר ושהשיעורים מדויקים.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getVATRate,
  getVATPercent,
  calcVATAmount,
  calcGrossFromNet,
  splitGross,
  configureVATSchedule,
  resetVATSchedule,
  VAT_RATES,
  VAT_TRANSITION_DATE,
} from '../vatRate';

describe('getVATRate - שיעור בסיסי', () => {
  beforeEach(() => resetVATSchedule());

  it('מחזיר 17% לפני 1/1/2025', () => {
    expect(getVATRate(new Date('2024-12-31T23:59:59Z'))).toBe(0.17);
    expect(getVATRate(new Date('2020-06-15'))).toBe(0.17);
  });

  it('מחזיר 18% החל מ-1/1/2025 (כולל)', () => {
    expect(getVATRate(new Date('2025-01-01T00:00:00Z'))).toBe(0.18);
    expect(getVATRate(new Date('2025-06-15'))).toBe(0.18);
    expect(getVATRate(new Date('2030-01-01'))).toBe(0.18);
  });

  it('קצה התאריכים - 31/12/2024 = 17%', () => {
    expect(getVATRate(new Date('2024-12-31T00:00:00Z'))).toBe(0.17);
  });

  it('VAT_TRANSITION_DATE הוא 1/1/2025', () => {
    expect(VAT_TRANSITION_DATE.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });
});

describe('getVATPercent - אחוז שלם', () => {
  it('מחזיר 17 לפני 2025', () => {
    expect(getVATPercent(new Date('2024-05-01'))).toBe(17);
  });
  it('מחזיר 18 אחרי 2025', () => {
    expect(getVATPercent(new Date('2025-05-01'))).toBe(18);
  });
});

describe('calcVATAmount - חישוב מע"מ', () => {
  it('מחשב מע"מ 17% נכון', () => {
    expect(calcVATAmount(1000, new Date('2024-06-01'))).toBe(170);
  });
  it('מחשב מע"מ 18% נכון', () => {
    expect(calcVATAmount(1000, new Date('2025-06-01'))).toBe(180);
  });
  it('מעגל ל-2 ספרות', () => {
    expect(calcVATAmount(33.33, new Date('2025-01-01'))).toBe(6.0);
  });
});

describe('calcGrossFromNet - net→gross', () => {
  it('17%: 1000 → 1170', () => {
    expect(calcGrossFromNet(1000, new Date('2024-06-01'))).toBe(1170);
  });
  it('18%: 1000 → 1180', () => {
    expect(calcGrossFromNet(1000, new Date('2025-06-01'))).toBe(1180);
  });
});

describe('splitGross - פירוק ברוטו', () => {
  it('1180 ב-18% = 1000 net + 180 vat', () => {
    const r = splitGross(1180, new Date('2025-01-15'));
    expect(r.net).toBe(1000);
    expect(r.vat).toBe(180);
    expect(r.gross).toBe(1180);
    expect(r.rate).toBe(0.18);
  });

  it('1170 ב-17% = 1000 net + 170 vat', () => {
    const r = splitGross(1170, new Date('2024-06-01'));
    expect(r.net).toBe(1000);
    expect(r.vat).toBe(170);
    expect(r.rate).toBe(0.17);
  });
});

describe('configureVATSchedule - tenant-specific', () => {
  beforeEach(() => resetVATSchedule());

  it('מאפשר תאריך מעבר שונה לכל tenant', () => {
    configureVATSchedule('tenant-late', [
      { effectiveFrom: new Date('2025-02-01'), rate: 0.18 },
      { effectiveFrom: new Date('0001-01-01'), rate: 0.17 },
    ]);

    // לפי לוח tenant-late, ב-15/1/2025 עדיין 17%
    expect(getVATRate(new Date('2025-01-15'), { tenantId: 'tenant-late' })).toBe(0.17);
    // אבל לפי לוח ברירת המחדל - כבר 18%
    expect(getVATRate(new Date('2025-01-15'))).toBe(0.18);
  });

  it('זורק שגיאה אם לוח ריק', () => {
    expect(() => configureVATSchedule('x', [])).toThrow();
  });
});

describe('VAT_RATES - קבועים', () => {
  it('מכיל את הערכים הצפויים', () => {
    expect(VAT_RATES.PRE_2025).toBe(0.17);
    expect(VAT_RATES.FROM_2025).toBe(0.18);
  });
});
