import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { IngestEnvelope } from './types.js';

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  folder?: string;
  pollSeconds?: number;
}

/**
 * Channel 1 - IMAP. Polls a mailbox, picks up unseen messages with
 * PDF/image attachments, returns ingest envelopes, and marks the
 * message as Seen so we don't re-process it.
 */
export class ImapChannel {
  private client: ImapFlow;
  constructor(private cfg: ImapConfig) {
    this.client = new ImapFlow({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 993,
      auth: { user: cfg.user, pass: cfg.pass },
      logger: false,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }
  async close(): Promise<void> {
    await this.client.logout();
  }

  /**
   * Drain unseen attachments once. Returns one envelope per attachment.
   * Caller is responsible for queueing.
   */
  async drainOnce(): Promise<IngestEnvelope[]> {
    const folder = this.cfg.folder ?? 'INBOX';
    const lock = await this.client.getMailboxLock(folder);
    const out: IngestEnvelope[] = [];
    try {
      for await (const msg of this.client.fetch(
        { seen: false },
        { source: true, envelope: true, uid: true },
      )) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        for (const att of parsed.attachments ?? []) {
          const ct = att.contentType.toLowerCase();
          const env = mapAttachment(ct, att.content as Buffer, att.filename ?? 'attachment');
          if (!env) continue;
          env.meta = {
            messageId: parsed.messageId ?? '',
            from: parsed.from?.text ?? '',
            subject: parsed.subject ?? '',
          };
          out.push(env);
        }
        await this.client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
    return out;
  }
}

function mapAttachment(
  contentType: string,
  bytes: Buffer,
  filename: string,
): IngestEnvelope | null {
  if (contentType.startsWith('image/jpeg'))
    return { bytes, mediaType: 'image/jpeg', filename, source: 'imap' };
  if (contentType.startsWith('image/png'))
    return { bytes, mediaType: 'image/png', filename, source: 'imap' };
  if (contentType.startsWith('image/webp'))
    return { bytes, mediaType: 'image/webp', filename, source: 'imap' };
  if (contentType === 'application/pdf')
    return { bytes, mediaType: 'application/pdf', filename, source: 'imap' };
  return null;
}

export function imapFromEnv(): ImapChannel | null {
  const { IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS, IMAP_FOLDER } = process.env;
  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) return null;
  return new ImapChannel({
    host: IMAP_HOST,
    port: Number(IMAP_PORT || 993),
    user: IMAP_USER,
    pass: IMAP_PASS,
    folder: IMAP_FOLDER,
    pollSeconds: Number(process.env.IMAP_POLL_SECONDS || 120),
  });
}
