/**
 * יומן ביקורת: יצירת קובץ, הורדה, סימון "הוגש" עם מספר אסמכתא, אישור רשות.
 * שמירת היסטוריה למשך 7 שנים (תקנות).
 * המימוש פתוח להחלפה: ניתן להזריק store מבוסס Postgres/Prisma על ידי הזרקת AuditStore.
 */
import { randomUUID } from 'node:crypto';
import { AuditEvent } from '../types';

export interface AuditStore {
  append(event: AuditEvent): Promise<void>;
  list(filter?: { fileId?: string; actor?: string; from?: string; to?: string }): Promise<AuditEvent[]>;
}

export class InMemoryAuditStore implements AuditStore {
  private events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }

  async list(filter: {
    fileId?: string;
    actor?: string;
    from?: string;
    to?: string;
  } = {}): Promise<AuditEvent[]> {
    return this.events.filter((e) => {
      if (filter.fileId && e.fileId !== filter.fileId) return false;
      if (filter.actor && e.actor !== filter.actor) return false;
      if (filter.from && e.timestamp < filter.from) return false;
      if (filter.to && e.timestamp > filter.to) return false;
      return true;
    });
  }
}

export class SubmissionAuditLog {
  constructor(private readonly store: AuditStore = new InMemoryAuditStore()) {}

  async record(
    action: AuditEvent['action'],
    actor: string,
    options: { fileId?: string; submissionReference?: string; metadata?: Record<string, unknown> } = {},
  ): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      actor,
      action,
      fileId: options.fileId,
      submissionReference: options.submissionReference,
      metadata: options.metadata,
    };
    await this.store.append(event);
    return event;
  }

  async getHistoryForFile(fileId: string): Promise<AuditEvent[]> {
    return this.store.list({ fileId });
  }

  async getAll(filter?: Parameters<AuditStore['list']>[0]): Promise<AuditEvent[]> {
    return this.store.list(filter);
  }
}
