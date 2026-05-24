/**
 * Common envelope every channel emits. The pipeline only cares about
 * (bytes, mediaType, source) - it doesn't know whether the file came
 * from email, mobile upload, browser PDF, or batch drag-and-drop.
 */
export interface IngestEnvelope {
  /** Raw bytes - either an image (jpeg/png) or a PDF. */
  bytes: Buffer;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  filename: string;
  /** Channel of origin, for audit. */
  source: 'imap' | 'mobile' | 'browser-pdf' | 'batch';
  /** Free-form metadata: messageId, sender, uploaderId, etc. */
  meta?: Record<string, string>;
}
