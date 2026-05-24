import type { IngestEnvelope } from './types.js';

/**
 * Channel 4 - Drag & Drop batch. The browser drops N files at once;
 * each becomes an envelope tagged with a shared batchId so the verify
 * UI can group them.
 */
export interface BatchFile {
  bytes: Buffer;
  mimeType: string;
  filename: string;
}

export function batchEnvelopes(
  files: BatchFile[],
  uploaderId: string,
): IngestEnvelope[] {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return files.map((f) => ({
    bytes: f.bytes,
    mediaType: toMediaType(f.mimeType),
    filename: f.filename,
    source: 'batch',
    meta: { batchId, uploaderId },
  }));
}

function toMediaType(mt: string): IngestEnvelope['mediaType'] {
  const m = mt.toLowerCase();
  if (m.includes('pdf')) return 'application/pdf';
  if (m.includes('png')) return 'image/png';
  if (m.includes('webp')) return 'image/webp';
  if (m.includes('jpeg') || m.includes('jpg')) return 'image/jpeg';
  throw new Error(`Unsupported batch mime type: ${mt}`);
}
