import type { IngestEnvelope } from './types.js';

/**
 * Channel 2 - Mobile capture. The mobile app POSTs a photo (already
 * compressed client-side). This adapter builds an envelope from a
 * multipart upload buffer.
 */
export interface MobileUpload {
  bytes: Buffer;
  mimeType: string;
  filename: string;
  uploaderId: string;
  capturedAt?: string;
}

export function mobileEnvelope(u: MobileUpload): IngestEnvelope {
  const mediaType = normalizeMobileMime(u.mimeType);
  return {
    bytes: u.bytes,
    mediaType,
    filename: u.filename,
    source: 'mobile',
    meta: {
      uploaderId: u.uploaderId,
      capturedAt: u.capturedAt ?? new Date().toISOString(),
    },
  };
}

function normalizeMobileMime(mt: string): IngestEnvelope['mediaType'] {
  const m = mt.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'image/jpeg';
  if (m.includes('png')) return 'image/png';
  if (m.includes('webp')) return 'image/webp';
  if (m.includes('pdf')) return 'application/pdf';
  // Many phones submit HEIC; we expect the client to convert. Reject loudly.
  throw new Error(`Unsupported mobile mime type: ${mt}`);
}
