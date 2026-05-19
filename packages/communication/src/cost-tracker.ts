/**
 * Cost tracking — keep a running tally per (tenant, provider) so we can
 * surface monthly cost in the dashboard and trigger budget alerts.
 *
 * Storage is pluggable. In dev we use an in-memory ledger; prod swaps
 * in Postgres / ClickHouse / your-warehouse-of-choice.
 */

export interface CostEntry {
  tenantId: string;
  provider: string;
  agorot: number;
  timestamp: string;
}

export interface CostStore {
  append(entry: CostEntry): Promise<void>;
  totalForTenant(tenantId: string, sinceIso?: string): Promise<number>;
}

export class InMemoryCostStore implements CostStore {
  readonly entries: CostEntry[] = [];
  async append(entry: CostEntry) {
    this.entries.push(entry);
  }
  async totalForTenant(tenantId: string, sinceIso?: string) {
    return this.entries
      .filter((e) => e.tenantId === tenantId && (!sinceIso || e.timestamp >= sinceIso))
      .reduce((s, e) => s + e.agorot, 0);
  }
}

let store: CostStore = new InMemoryCostStore();
export function setCostStore(impl: CostStore) {
  store = impl;
}

export async function trackCost(tenantId: string, provider: string, agorot: number): Promise<void> {
  await store.append({
    tenantId,
    provider,
    agorot,
    timestamp: new Date().toISOString(),
  });
}

export async function totalCostForTenant(tenantId: string, sinceIso?: string): Promise<number> {
  return store.totalForTenant(tenantId, sinceIso);
}
