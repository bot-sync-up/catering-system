import type { ItemMatch } from './items.js';

export interface InventoryRepo {
  adjust(sku: string, deltaQty: number, reason: string): Promise<void>;
  setLastPrice(sku: string, price: number): Promise<void>;
}

/**
 * After verification, push inventory & price updates for matched lines.
 * Lines without a catalog match are skipped (the verify UI is expected
 * to either create a catalog entry or drop the line).
 */
export async function applyInventoryUpdates(
  repo: InventoryRepo,
  matches: ItemMatch[],
  invoiceNum: string,
): Promise<{ updated: number; skipped: number }> {
  let updated = 0;
  let skipped = 0;
  for (const m of matches) {
    if (!m.match) {
      skipped++;
      continue;
    }
    await repo.adjust(m.match.sku, m.invoiceItem.qty, `invoice ${invoiceNum}`);
    await repo.setLastPrice(m.match.sku, m.invoiceItem.price);
    updated++;
  }
  return { updated, skipped };
}
