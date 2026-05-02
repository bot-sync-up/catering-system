import type { IngestEnvelope } from './types.js';

/**
 * Channel 3 - PDF uploaded from the browser. Single PDF, single
 * envelope. Multi-page PDFs are split downstream by the vision
 * pipeline (one image per page).
 */
export function browserPdfEnvelope(opts: {
  bytes: Buffer;
  filename: string;
  uploaderId?: string;
}): IngestEnvelope {
  return {
    bytes: opts.bytes,
    mediaType: 'application/pdf',
    filename: opts.filename,
    source: 'browser-pdf',
    meta: opts.uploaderId ? { uploaderId: opts.uploaderId } : undefined,
  };
}
