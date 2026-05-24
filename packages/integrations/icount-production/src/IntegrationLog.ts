/**
 * IntegrationLog — persistence layer ל-IntegrationLogEntry
 *
 * תומך ב:
 *   - in-memory (default, dev)
 *   - SQL (Postgres via interface)
 *   - R2/S3 (archival)
 */

import { IntegrationLogEntry } from './types';

export interface IIntegrationLogStore {
  append(entry: IntegrationLogEntry): Promise<void>;
  query(filter: LogFilter): Promise<IntegrationLogEntry[]>;
  count(filter: LogFilter): Promise<number>;
}

export interface LogFilter {
  provider?: string;
  operation?: string;
  success?: boolean;
  cid?: string;
  fromTs?: string;
  toTs?: string;
  limit?: number;
  offset?: number;
}

export class InMemoryLogStore implements IIntegrationLogStore {
  private readonly entries: IntegrationLogEntry[] = [];

  async append(entry: IntegrationLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async query(filter: LogFilter): Promise<IntegrationLogEntry[]> {
    let arr = this.entries.filter(e => this.matches(e, filter));
    if (filter.offset) arr = arr.slice(filter.offset);
    if (filter.limit) arr = arr.slice(0, filter.limit);
    return arr;
  }

  async count(filter: LogFilter): Promise<number> {
    return this.entries.filter(e => this.matches(e, filter)).length;
  }

  private matches(e: IntegrationLogEntry, f: LogFilter): boolean {
    if (f.provider && e.provider !== f.provider) return false;
    if (f.operation && e.operation !== f.operation) return false;
    if (f.success !== undefined && e.success !== f.success) return false;
    if (f.cid && e.cid !== f.cid) return false;
    if (f.fromTs && e.timestamp < f.fromTs) return false;
    if (f.toTs && e.timestamp > f.toTs) return false;
    return true;
  }

  /** for tests */
  clear(): void {
    this.entries.length = 0;
  }
  all(): IntegrationLogEntry[] {
    return [...this.entries];
  }
}

/**
 * Helper — sink function שאפשר להעביר ל-queue
 */
export function createLogSink(store: IIntegrationLogStore) {
  return async (e: IntegrationLogEntry): Promise<void> => {
    await store.append(e);
  };
}
