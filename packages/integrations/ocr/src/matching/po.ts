import type { Invoice, InvoiceItem } from '../vision/schema.js';

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: { sku?: string; desc: string; qty: number; unitPrice: number }[];
  total: number;
  status: 'open' | 'partial' | 'closed';
}

export interface PORepo {
  findById(id: string): Promise<PurchaseOrder | null>;
  findOpenForSupplier(supplierId: string): Promise<PurchaseOrder[]>;
}

export interface POMatchLine {
  invoice: InvoiceItem;
  po?: PurchaseOrder['items'][number];
  qtyDelta?: number;
  priceDelta?: number;
}

export interface POMatchResult {
  po: PurchaseOrder | null;
  totalDelta: number; // (invoice.total - po.total) / po.total, NaN if no PO
  lines: POMatchLine[];
  reason: 'matched' | 'no-po-ref' | 'po-not-found' | 'no-open-po';
}

export async function matchPO(
  repo: PORepo,
  invoice: Invoice,
  supplierId: string,
): Promise<POMatchResult> {
  let po: PurchaseOrder | null = null;
  let reason: POMatchResult['reason'] = 'no-po-ref';

  if (invoice.poRef) {
    po = await repo.findById(invoice.poRef);
    reason = po ? 'matched' : 'po-not-found';
  } else {
    const open = await repo.findOpenForSupplier(supplierId);
    if (open.length === 1) {
      po = open[0];
      reason = 'matched';
    } else if (open.length === 0) {
      reason = 'no-open-po';
    }
  }

  const lines: POMatchLine[] = invoice.items.map((it) => {
    if (!po) return { invoice: it };
    const candidate =
      (it.sku && po.items.find((p) => p.sku === it.sku)) ||
      po.items.find(
        (p) => p.desc.trim().toLowerCase() === it.desc.trim().toLowerCase(),
      );
    if (!candidate) return { invoice: it };
    return {
      invoice: it,
      po: candidate,
      qtyDelta: it.qty - candidate.qty,
      priceDelta: candidate.unitPrice
        ? (it.price - candidate.unitPrice) / candidate.unitPrice
        : undefined,
    };
  });

  const totalDelta = po ? (invoice.total - po.total) / po.total : NaN;
  return { po, totalDelta, lines, reason };
}
