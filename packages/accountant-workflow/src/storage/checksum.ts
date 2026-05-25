import { createHash } from 'node:crypto';

export function sha256(content: Buffer | string): string {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  return createHash('sha256').update(buf).digest('hex');
}
