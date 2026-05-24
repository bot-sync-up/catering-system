/**
 * Core types for the unified communication layer.
 *
 * A Message is the single canonical shape that flows through the system.
 * Channel-specific providers know how to translate it into their own
 * wire format (SendGrid JSON, 019 XML, Meta Cloud API, etc.).
 */

export type Channel = 'email' | 'sms' | 'whatsapp' | 'push';

export type Priority = 'critical' | 'transactional' | 'marketing';

export interface Recipient {
  /** Channel-appropriate address: email / phone / device push token. */
  address: string;
  /** Optional friendly name for headers (mostly relevant for email). */
  name?: string;
  /** Tenant the recipient belongs to. Required for consent + rate limiting. */
  tenantId: string;
  /** Recipient user id in our system (for consent + audit). */
  userId?: string;
  /** Preferred locale, e.g. "he-IL" / "en-US". Defaults to "he-IL". */
  locale?: string;
}

export interface Attachment {
  filename: string;
  /** Base64-encoded content OR a publicly fetchable URL. */
  content?: string;
  url?: string;
  contentType?: string;
  /** "attachment" | "inline" — only honored by email channels. */
  disposition?: 'attachment' | 'inline';
  /** Content-ID for inline images. */
  cid?: string;
}

export interface TemplateRef {
  /** Logical template id, e.g. "orderConfirmation". */
  id: string;
  /** Dynamic merge fields. */
  data?: Record<string, unknown>;
}

export interface Message {
  channel: Channel;
  to: Recipient | Recipient[];
  subject?: string;
  /** Plain-text body. Required unless `template` is provided. */
  body?: string;
  /** HTML body (email only). */
  html?: string;
  attachments?: Attachment[];
  /** Use a server-side or local template instead of inline body. */
  template?: TemplateRef;
  /** Per-tenant priority — drives queue lane + retry budget. */
  priority?: Priority;
  /** Optional ISO timestamp — schedule for later. */
  scheduledAt?: string;
  /** Caller-supplied id for idempotency / dedup. */
  idempotencyKey?: string;
  /** Free-form metadata for audit / analytics (max 50 keys, 256B values). */
  metadata?: Record<string, string>;
  /** Override consent check (only for system / OTP messages). */
  bypassConsent?: boolean;
  /** Allow sending during quiet hours (only critical messages). */
  bypassQuietHours?: boolean;
}

export interface SendResult {
  channel: Channel;
  provider: string;
  /** Provider-side message id (for status correlation). */
  providerMessageId?: string;
  /** Our internal correlation id (also written to AuditLog). */
  correlationId: string;
  /** "queued" — accepted but not yet sent; "sent" — handed off to provider. */
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  /** Reason if skipped (e.g. "no_consent", "quiet_hours", "rate_limited"). */
  skippedReason?: string;
  /** Reported cost in agorot (₪/100). Useful for cost tracking. */
  costAgorot?: number;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  raw?: unknown;
}

export interface ProviderConfig {
  /** Stable provider name used in logs + cost tracker. */
  name: string;
  /** Channel this provider handles. */
  channel: Channel;
  /** Lower = preferred. UnifiedSender uses this for routing + fallback order. */
  priority: number;
  /** Per-send estimated cost in agorot — used for cost optimization. */
  estimatedCostAgorot?: number;
  /** Set to false to soft-disable a provider without removing it. */
  enabled?: boolean;
}
