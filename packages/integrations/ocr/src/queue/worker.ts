import 'dotenv/config';
import { makeWorker } from './queue.js';
import { ConsoleNotifier } from '../notifications/alerts.js';
import { InMemorySupplierRepo } from '../matching/suppliers.js';
import { iCountFromEnv } from '../icount/client.js';
import type { CatalogRepo } from '../matching/items.js';
import type { PORepo } from '../matching/po.js';
import type { InventoryRepo } from '../matching/inventory.js';

/**
 * Default worker entrypoint - wires the pipeline with in-memory repos
 * for local dev. In production each repo is replaced by a DB-backed
 * implementation.
 */
const catalog: CatalogRepo = {
  async findBySku() { return null; },
  async searchByDesc() { return []; },
  async upsert(i) { return i; },
};
const pos: PORepo = {
  async findById() { return null; },
  async findOpenForSupplier() { return []; },
};
const inventory: InventoryRepo = {
  async adjust() {},
  async setLastPrice() {},
};

const worker = makeWorker({
  suppliers: new InMemorySupplierRepo(),
  catalog,
  pos,
  inventory,
  notifier: new ConsoleNotifier(),
  iCount: iCountFromEnv(),
});

worker.on('completed', (job, result) => {
  // eslint-disable-next-line no-console
  console.log(`[worker] ${job.id} -> ${result.status} (${result.invoice?.invoiceNum ?? '-'})`);
});
worker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] ${job?.id} failed: ${err.message}`);
});

// eslint-disable-next-line no-console
console.log('[worker] OCR worker started');
