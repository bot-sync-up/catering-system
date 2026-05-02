/**
 * Supplier registry. In production this is a DB row; here we model it as
 * a typed in-memory table that can be swapped for any persistence layer.
 */
export interface Supplier {
  id: string;
  taxId: string; // ח.פ
  name: string;
  aliases?: string[]; // common DBA / typos
  defaultVat?: number;
  iCountSupplierId?: string;
}

export interface SupplierRepo {
  findByTaxId(taxId: string): Promise<Supplier | null>;
  findByName(name: string): Promise<Supplier | null>;
  upsert(s: Supplier): Promise<Supplier>;
  list(): Promise<Supplier[]>;
}

export class InMemorySupplierRepo implements SupplierRepo {
  private byTax = new Map<string, Supplier>();
  private byName = new Map<string, Supplier>();

  async findByTaxId(taxId: string): Promise<Supplier | null> {
    return this.byTax.get(taxId) ?? null;
  }
  async findByName(name: string): Promise<Supplier | null> {
    const k = norm(name);
    return this.byName.get(k) ?? null;
  }
  async upsert(s: Supplier): Promise<Supplier> {
    this.byTax.set(s.taxId, s);
    this.byName.set(norm(s.name), s);
    for (const a of s.aliases ?? []) this.byName.set(norm(a), s);
    return s;
  }
  async list(): Promise<Supplier[]> {
    return [...this.byTax.values()];
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolve a supplier from the OCR'd invoice. Prefers ח.פ (authoritative),
 * falls back to fuzzy name match, finally creates a new entry.
 */
export async function resolveSupplier(
  repo: SupplierRepo,
  ocr: { taxId: string; name: string },
): Promise<{ supplier: Supplier; created: boolean }> {
  const byTax = await repo.findByTaxId(ocr.taxId);
  if (byTax) return { supplier: byTax, created: false };

  const byName = await repo.findByName(ocr.name);
  if (byName && byName.taxId === ocr.taxId) {
    return { supplier: byName, created: false };
  }

  const supplier = await repo.upsert({
    id: `sup_${ocr.taxId}`,
    taxId: ocr.taxId,
    name: ocr.name,
  });
  return { supplier, created: true };
}
