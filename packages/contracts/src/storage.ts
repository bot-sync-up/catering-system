import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * Storage adapter. Defaults to Cloudflare R2 (S3-compatible).
 * Required env vars:
 *  - R2_ACCOUNT_ID
 *  - R2_ACCESS_KEY_ID
 *  - R2_SECRET_ACCESS_KEY
 *  - R2_BUCKET
 *  - R2_PUBLIC_BASE_URL (optional, for public PDFs)
 */
export interface ContractStorage {
  putPdf(key: string, body: Buffer): Promise<{ key: string; url?: string }>;
  getPdf(key: string): Promise<Buffer>;
}

function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export const r2Storage: ContractStorage = {
  async putPdf(key, body) {
    const client = r2Client();
    const bucket = process.env.R2_BUCKET;
    if (!client || !bucket) {
      // dev fallback — write to local data/contracts
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const out = path.join(process.cwd(), 'data', 'contracts', key);
      await fs.mkdir(path.dirname(out), { recursive: true });
      await fs.writeFile(out, body);
      return { key, url: `/api/contracts/pdf/${encodeURIComponent(key)}` };
    }
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'application/pdf',
        CacheControl: 'private, max-age=31536000',
      }),
    );
    const base = process.env.R2_PUBLIC_BASE_URL;
    return { key, url: base ? `${base.replace(/\/$/, '')}/${key}` : undefined };
  },
  async getPdf(key) {
    const client = r2Client();
    const bucket = process.env.R2_BUCKET;
    if (!client || !bucket) {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      return fs.readFile(path.join(process.cwd(), 'data', 'contracts', key));
    }
    const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks: Buffer[] = [];
    // @ts-ignore Node.js stream
    for await (const chunk of out.Body) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  },
};
