import type { IngestEnvelope } from './channels/types.js';
import { extractInvoice, type ExtractResult } from './vision/extract.js';
import { pdfToImages } from './vision/pdf.js';
import { sha256, isDuplicate, markSeen } from './storage/dedup.js';
import { resolveSupplier, type SupplierRepo } from './matching/suppliers.js';
import { matchItems, type CatalogRepo } from './matching/items.js';
import { matchPO, type PORepo } from './matching/po.js';
import { applyInventoryUpdates, type InventoryRepo } from './matching/inventory.js';
import { buildAlerts, type Notifier } from './notifications/alerts.js';
import { getExamplesForSupplier } from './learning/store.js';
import type { ICountClient } from './icount/client.js';
import type { Invoice } from './vision/schema.js';

export interface PipelineDeps {
  suppliers: SupplierRepo;
  catalog: CatalogRepo;
  pos: PORepo;
  inventory: InventoryRepo;
  notifier: Notifier;
  iCount: ICountClient | null;
}

export type PipelineStatus = 'pending-verification' | 'auto-approved' | 'rejected';

export interface PipelineResult {
  status: PipelineStatus;
  invoice: Invoice | null;
  hash: string;
  duplicate: boolean;
  alerts: ReturnType<typeof buildAlerts>;
  vision: ExtractResult | null;
  reason?: string;
}

/**
 * End-to-end ingest:
 *   envelope -> dedup -> (pdf split) -> Vision -> matching -> alerts ->
 *   verify queue (or auto-approve) -> inventory -> iCount.
 *
 * Auto-approve only fires when there are no critical alerts and item
 * matching is high-confidence; otherwise the invoice waits for a human
 * in the verify UI.
 */
export async function runPipeline(
  env: IngestEnvelope,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const hash = sha256(env.bytes);
  if (await isDuplicate(hash)) {
    const alert = {
      kind: 'duplicate' as const,
      severity: 'warn' as const,
      message: `כפילות: ${env.filename}`,
    };
    await deps.notifier.send(alert);
    return {
      status: 'rejected',
      invoice: null,
      hash,
      duplicate: true,
      alerts: [alert],
      vision: null,
      reason: 'duplicate',
    };
  }

  // Render to one or more JPEG pages.
  const pages: { bytes: Buffer; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }[] =
    env.mediaType === 'application/pdf'
      ? (await pdfToImages(env.bytes)).map((b) => ({ bytes: b, mediaType: 'image/jpeg' as const }))
      : [{ bytes: env.bytes, mediaType: env.mediaType }];

  // First page extraction; multi-page invoices we treat the first page as
  // the canonical invoice and append subsequent pages' items.
  const firstSupplierExamples = await getExamplesForSupplier('').catch(() => []);
  const head = await extractInvoice({
    imageBytes: pages[0].bytes,
    mediaType: pages[0].mediaType,
    examples: firstSupplierExamples,
    docId: hash,
  });

  // Re-extract subsequent pages with supplier-specific few-shot now that
  // we know the supplier - they go into the same invoice's items list.
  if (pages.length > 1) {
    const examples = await getExamplesForSupplier(head.invoice.supplier.taxId);
    for (let i = 1; i < pages.length; i++) {
      const more = await extractInvoice({
        imageBytes: pages[i].bytes,
        mediaType: pages[i].mediaType,
        examples,
      });
      head.invoice.items.push(...more.invoice.items);
    }
  }

  await markSeen(hash);

  const { supplier, created } = await resolveSupplier(deps.suppliers, {
    taxId: head.invoice.supplier.taxId,
    name: head.invoice.supplier.name,
  });

  const itemMatches = await matchItems(deps.catalog, supplier.id, head.invoice.items);
  const poMatch = await matchPO(deps.pos, head.invoice, supplier.id);

  const alerts = buildAlerts({
    invoice: head.invoice,
    isDuplicate: false,
    itemMatches,
    poMatch,
    supplierKnown: !created,
  });
  for (const a of alerts) await deps.notifier.send(a);

  const hasCritical = alerts.some((a) => a.severity === 'critical');
  const allMatched = itemMatches.every((m) => m.match && m.confidence >= 0.85);

  if (!hasCritical && allMatched && !created) {
    await applyInventoryUpdates(deps.inventory, itemMatches, head.invoice.invoiceNum);
    if (deps.iCount) {
      await deps.iCount.createPurchaseInvoice(head.invoice, supplier.iCountSupplierId);
    }
    return {
      status: 'auto-approved',
      invoice: head.invoice,
      hash,
      duplicate: false,
      alerts,
      vision: head,
    };
  }

  return {
    status: 'pending-verification',
    invoice: head.invoice,
    hash,
    duplicate: false,
    alerts,
    vision: head,
    reason: hasCritical ? 'critical-alerts' : created ? 'new-supplier' : 'low-confidence-items',
  };
}
