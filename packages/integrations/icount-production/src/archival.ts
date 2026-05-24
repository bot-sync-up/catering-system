/**
 * archival.ts — שמירה ל-7 שנים ב-cold storage (Cloudflare R2 / S3)
 *
 * החוק הישראלי (פקודת מס הכנסה, סעיף 130) מחייב שמירת
 * ספרי חשבונות וחשבוניות למשך 7 שנים מתום שנת המס.
 *
 * המודול:
 *   - מארכב מסמכים (PDF + JSON) ל-R2
 *   - שומר את ה-IntegrationLog לשנה+
 *   - מעביר לארכיון cold אחרי 90 יום
 *   - חתימת SHA-256 לכל קובץ (immutability proof)
 *
 * R2 משתמש ב-S3 API → אותה ספרייה.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { IntegrationLogEntry, Logger } from './types';

export const ARCHIVAL_YEARS = 7;

export interface ArchivalConfig {
  endpoint: string;            // R2 endpoint
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;             // default 'auto' for R2
  keyPrefix?: string;          // default 'icount/'
  logger?: Logger;
}

export interface ArchivedDocument {
  key: string;
  hash: string;
  size: number;
  uploadedAt: string;
  retentionExpiresAt: string;
}

export class Archiver {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly logger?: Logger;

  constructor(cfg: ArchivalConfig) {
    this.s3 = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region ?? 'auto',
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
    this.bucket = cfg.bucket;
    this.prefix = cfg.keyPrefix ?? 'icount/';
    this.logger = cfg.logger;
  }

  /**
   * ארכוב מסמך (PDF/JSON) — מחזיר את ה-key + hash
   */
  async archiveDocument(params: {
    cid: string;
    docId: string | number;
    docType: string;
    year: number;
    body: Buffer | string;
    contentType: string;
  }): Promise<ArchivedDocument> {
    const buf = typeof params.body === 'string' ? Buffer.from(params.body, 'utf-8') : params.body;
    const hash = createHash('sha256').update(buf).digest('hex');
    const key = this.buildKey(params.cid, params.year, params.docType, params.docId, params.contentType);

    const retentionExpires = new Date();
    retentionExpires.setFullYear(retentionExpires.getFullYear() + ARCHIVAL_YEARS);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buf,
        ContentType: params.contentType,
        Metadata: {
          'doc-id': String(params.docId),
          'doc-type': params.docType,
          'cid': params.cid,
          'year': String(params.year),
          'sha256': hash,
          'retention-expires': retentionExpires.toISOString(),
          'approved-software': '1346',
        },
        // Object Lock — immutability for 7 years
        ObjectLockMode: 'COMPLIANCE',
        ObjectLockRetainUntilDate: retentionExpires,
      }),
    );

    this.logger?.info('[Archival] uploaded', { key, hash, size: buf.length });

    return {
      key,
      hash,
      size: buf.length,
      uploadedAt: new Date().toISOString(),
      retentionExpiresAt: retentionExpires.toISOString(),
    };
  }

  /**
   * ארכוב log חודשי (JSONL.gz)
   */
  async archiveLogs(params: {
    cid: string;
    year: number;
    month: number;
    entries: IntegrationLogEntry[];
  }): Promise<ArchivedDocument> {
    const jsonl = params.entries.map(e => JSON.stringify(e)).join('\n');
    const key = `${this.prefix}${params.cid}/${params.year}/logs/${String(params.month).padStart(2, '0')}.jsonl`;
    const buf = Buffer.from(jsonl, 'utf-8');
    const hash = createHash('sha256').update(buf).digest('hex');

    const retentionExpires = new Date();
    retentionExpires.setFullYear(retentionExpires.getFullYear() + ARCHIVAL_YEARS);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buf,
        ContentType: 'application/x-ndjson',
        Metadata: {
          'log-type': 'integration',
          'cid': params.cid,
          'year': String(params.year),
          'month': String(params.month),
          'sha256': hash,
          'entries-count': String(params.entries.length),
        },
        ObjectLockMode: 'COMPLIANCE',
        ObjectLockRetainUntilDate: retentionExpires,
      }),
    );

    return {
      key,
      hash,
      size: buf.length,
      uploadedAt: new Date().toISOString(),
      retentionExpiresAt: retentionExpires.toISOString(),
    };
  }

  /**
   * בדיקה האם מסמך קיים בארכיון
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * שליפת מסמך מהארכיון
   */
  async retrieve(key: string): Promise<Buffer> {
    const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await r.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  private buildKey(
    cid: string,
    year: number,
    docType: string,
    docId: string | number,
    contentType: string,
  ): string {
    const ext = contentType.includes('pdf') ? 'pdf'
      : contentType.includes('json') ? 'json'
      : contentType.includes('xml') ? 'xml'
      : 'bin';
    return `${this.prefix}${cid}/${year}/${docType}/${docId}.${ext}`;
  }
}
