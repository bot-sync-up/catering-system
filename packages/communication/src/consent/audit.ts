import { Message, SendResult } from '../types';

/**
 * Audit log entry — one row per outbound attempt.
 *
 * Stored separately from the consent ledger so we can prove later that
 * a given message was sent (or skipped) with the consent state in force
 * at the time.
 */

export interface AuditEntry {
  timestamp: string;
  channel: string;
  provider: string;
  status: SendResult['status'];
  skippedReason?: string;
  correlationId: string;
  providerMessageId?: string;
  tenantId: string;
  userId?: string;
  recipientAddress: string;
  templateId?: string;
  /** Optional digest of body — never log full body content. */
  bodyDigest?: string;
  metadata?: Record<string, string>;
  errorCode?: string;
}

export interface AuditSink {
  append(entry: AuditEntry): Promise<void>;
}

let sink: AuditSink | null = null;
export function setAuditSink(impl: AuditSink) {
  sink = impl;
}

/** In-memory sink — tests use this, prod swaps for Postgres / S3 / Datadog. */
export class InMemoryAuditSink implements AuditSink {
  readonly entries: AuditEntry[] = [];
  async append(entry: AuditEntry) {
    this.entries.push(entry);
  }
}

export async function auditSend(message: Message, result: SendResult): Promise<void> {
  if (!sink) return;
  const recipient = Array.isArray(message.to) ? message.to[0] : message.to;
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    channel: result.channel,
    provider: result.provider,
    status: result.status,
    skippedReason: result.skippedReason,
    correlationId: result.correlationId,
    providerMessageId: result.providerMessageId,
    tenantId: recipient.tenantId,
    userId: recipient.userId,
    recipientAddress: redactAddress(recipient.address),
    templateId: message.template?.id,
    bodyDigest: message.body ? sha256Short(message.body) : undefined,
    metadata: message.metadata,
    errorCode: result.error?.code,
  };
  await sink.append(entry);
}

function redactAddress(addr: string): string {
  // Keep first 2 + last 2 chars, replace middle with "***".
  if (addr.length <= 4) return '***';
  return `${addr.slice(0, 2)}***${addr.slice(-2)}`;
}

function sha256Short(s: string): string {
  // Avoid importing crypto in hot path on every send if not needed.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto') as typeof import('crypto');
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}
