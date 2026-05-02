import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FewShotExample } from '../vision/prompt.js';
import type { Invoice } from '../vision/schema.js';

const DIR = process.env.STORAGE_DIR || './storage';
const FILE = path.join(DIR, 'few-shot.json');

interface Stored {
  /** keyed by supplier taxId */
  bySupplier: Record<string, FewShotExample[]>;
}

async function load(): Promise<Stored> {
  await fs.mkdir(DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as Stored;
  } catch {
    return { bySupplier: {} };
  }
}

async function save(s: Stored): Promise<void> {
  await fs.writeFile(FILE, JSON.stringify(s, null, 2));
}

/**
 * After a human verifies an invoice, persist the (hint, gold-json) pair
 * so future invoices from the same supplier benefit from few-shot
 * priming. We cap at 3 examples per supplier to keep prompt cache hot
 * and avoid drift.
 */
export async function recordVerifiedExample(
  invoice: Invoice,
  hint?: string,
): Promise<void> {
  const store = await load();
  const arr = store.bySupplier[invoice.supplier.taxId] ?? [];
  arr.unshift({
    hint: hint || `${invoice.supplier.name} invoice`,
    json: JSON.stringify(invoice),
  });
  store.bySupplier[invoice.supplier.taxId] = arr.slice(0, 3);
  await save(store);
}

export async function getExamplesForSupplier(
  taxId: string,
): Promise<FewShotExample[]> {
  const store = await load();
  return store.bySupplier[taxId] ?? [];
}
