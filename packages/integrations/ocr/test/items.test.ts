import { describe, it, expect } from 'vitest';
import { matchItems, type CatalogItem, type CatalogRepo } from '../src/matching/items.js';

const repo: CatalogRepo = {
  catalog: [
    { sku: 'MON24', supplierId: 's1', desc: 'מסך מחשב 24 אינץ', lastPrice: 800 },
    { sku: 'KBD', supplierId: 's1', desc: 'מקלדת אלחוטית', lastPrice: 120 },
  ] as CatalogItem[],
  async findBySku(sup, sku) {
    return this.catalog.find((c) => c.supplierId === sup && c.sku === sku) ?? null;
  },
  async searchByDesc(sup) {
    return this.catalog.filter((c) => c.supplierId === sup);
  },
  async upsert(i) { return i; },
} as CatalogRepo & { catalog: CatalogItem[] };

describe('matchItems', () => {
  it('matches by sku with confidence 1', async () => {
    const out = await matchItems(repo, 's1', [{ desc: 'משהו אחר', qty: 1, price: 900, vat: 0.17, sku: 'MON24' }]);
    expect(out[0].match?.sku).toBe('MON24');
    expect(out[0].confidence).toBe(1);
    expect(out[0].priceDelta).toBeCloseTo((900 - 800) / 800);
  });

  it('falls back to fuzzy desc match', async () => {
    const out = await matchItems(repo, 's1', [{ desc: 'מסך מחשב 24', qty: 1, price: 800, vat: 0.17 }]);
    expect(out[0].match?.sku).toBe('MON24');
  });

  it('returns no match below threshold', async () => {
    const out = await matchItems(repo, 's1', [{ desc: 'דבר לא קשור בכלל', qty: 1, price: 1, vat: 0.17 }]);
    expect(out[0].match).toBeNull();
  });
});
