/**
 * IntegrationLogs - מודל לוגים לציות וביקורת
 * נדרש על פי דרישות רשות המסים (1346) - תיעוד מלא של פעולות
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from './logger';

const log = createLogger('integration-logs');

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  AUDIT = 'audit',
}

export enum OperationType {
  CREATE_INVOICE = 'create_invoice',
  CREATE_RECEIPT = 'create_receipt',
  CREATE_QUOTE = 'create_quote',
  GET_ALLOCATION = 'get_allocation_number',
  GET_VAT_REPORT = 'get_vat_report',
  LIST_TRANSACTIONS = 'list_transactions',
  SYNC_CUSTOMER = 'sync_customer',
  WEBHOOK_RECEIVED = 'webhook_received',
  CANCEL_DOCUMENT = 'cancel_document',
}

export interface IntegrationLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  operation: OperationType;
  provider: string;
  success: boolean;
  durationMs?: number;
  documentId?: string;
  documentNumber?: string;
  allocationNumber?: string;
  customerId?: string;
  amount?: number;
  errorCode?: string;
  errorMessage?: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IntegrationLogStore {
  write(entry: IntegrationLogEntry): Promise<void>;
  query(filter: Partial<IntegrationLogEntry>): Promise<IntegrationLogEntry[]>;
}

/**
 * In-memory store. Production deployments should swap with Postgres/Mongo adapter.
 */
export class InMemoryLogStore implements IntegrationLogStore {
  private entries: IntegrationLogEntry[] = [];

  async write(entry: IntegrationLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async query(filter: Partial<IntegrationLogEntry>): Promise<IntegrationLogEntry[]> {
    return this.entries.filter((entry) => {
      for (const key of Object.keys(filter) as Array<keyof IntegrationLogEntry>) {
        if (filter[key] !== undefined && entry[key] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  clear(): void {
    this.entries = [];
  }

  count(): number {
    return this.entries.length;
  }
}

export class IntegrationLogger {
  constructor(private readonly store: IntegrationLogStore) {}

  async log(
    operation: OperationType,
    provider: string,
    data: Partial<IntegrationLogEntry>,
  ): Promise<IntegrationLogEntry> {
    const entry: IntegrationLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level: data.level ?? (data.success ? LogLevel.INFO : LogLevel.ERROR),
      operation,
      provider,
      success: data.success ?? true,
      ...data,
    };

    await this.store.write(entry);
    log.info({ entry: { id: entry.id, op: operation, success: entry.success } }, 'integration log');
    return entry;
  }

  async audit(
    operation: OperationType,
    provider: string,
    data: Partial<IntegrationLogEntry>,
  ): Promise<IntegrationLogEntry> {
    return this.log(operation, provider, { ...data, level: LogLevel.AUDIT });
  }

  async query(filter: Partial<IntegrationLogEntry>): Promise<IntegrationLogEntry[]> {
    return this.store.query(filter);
  }
}
