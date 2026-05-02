import type { InvoiceItem } from '../vision/schema.js';

export interface CatalogItem {
  sku: string;
  supplierId: string;
  desc: string;
  aliases?: string[];
  lastPrice?: number;
  unit?: string;
}

export interface CatalogRepo {
  findBySku(supplierId: string, sku: string): Promise<CatalogItem | null>;
  searchByDesc(supplierId: string, desc: string): Promise<CatalogItem[]>;
  upsert(item: CatalogItem): Promise<CatalogItem>;
}

export interface ItemMatch {
  invoiceItem: InvoiceItem;
  match: CatalogItem | null;
  confidence: number; // 0..1
  priceDelta?: number; // (new - old) / old, signed
}

/**
 * Naive Hebrew/English token Jaccard similarity. Good enough for a
 * first cut; swap for embeddings later.
 */
function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2),
  );
}

export async function matchItems(
  repo: CatalogRepo,
  supplierId: string,
  items: InvoiceItem[],
): Promise<ItemMatch[]> {
  const out: ItemMatch[] = [];
  for (const it of items) {
    let match: CatalogItem | null = null;
    let confidence = 0;

    if (it.sku) {
      match = await repo.findBySku(supplierId, it.sku);
      if (match) confidence = 1;
    }
    if (!match) {
      const candidates = await repo.searchByDesc(supplierId, it.desc);
      let best: { c: CatalogItem; s: number } | null = null;
      for (const c of candidates) {
        const s = Math.max(
          similarity(it.desc, c.desc),
          ...(c.aliases ?? []).map((a) => similarity(it.desc, a)),
        );
        if (!best || s > best.s) best = { c, s };
      }
      if (best && best.s >= 0.5) {
        match = best.c;
        confidence = best.s;
      }
    }

    let priceDelta: number | undefined;
    if (match?.lastPrice && match.lastPrice > 0) {
      priceDelta = (it.price - match.lastPrice) / match.lastPrice;
    }

    out.push({ invoiceItem: it, match, confidence, priceDelta });
  }
  return out;
}
