/**
 * Webhook handler — HMAC-SHA256 signature verification + anti-replay nonce store.
 *
 * Security properties:
 *   1. Constant-time HMAC comparison (timingSafeEqual)
 *   2. 5-minute timestamp window (clock skew tolerant)
 *   3. Nonce store backed by Redis (or in-memory for tests) — replays rejected
 *   4. Signature includes timestamp + body to defeat substitution attacks
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { CardcomWebhookError } from '../errors';
import { normalize, type CanonicalEvent } from './events';

const REPLAY_WINDOW_SEC = 5 * 60; // 5 minutes

export interface NonceStore {
  /** Returns true if the nonce was previously seen. */
  hasSeen(nonce: string): Promise<boolean>;
  /** Records a nonce with TTL (seconds). */
  record(nonce: string, ttlSec: number): Promise<void>;
}

/** In-memory NonceStore — tests / single-instance dev only. */
export class MemoryNonceStore implements NonceStore {
  private seen = new Map<string, number>();

  async hasSeen(nonce: string): Promise<boolean> {
    const exp = this.seen.get(nonce);
    if (!exp) return false;
    if (exp < Date.now()) {
      this.seen.delete(nonce);
      return false;
    }
    return true;
  }

  async record(nonce: string, ttlSec: number): Promise<void> {
    this.seen.set(nonce, Date.now() + ttlSec * 1000);
  }
}

/**
 * Redis-backed NonceStore. Uses SETNX with EX to atomically claim a nonce.
 */
export class RedisNonceStore implements NonceStore {
  constructor(
    private readonly redis: {
      set(key: string, value: string, mode: 'NX', ex: 'EX', ttl: number): Promise<string | null>;
      exists(key: string): Promise<number>;
    },
    private readonly prefix = 'cardcom:wh:nonce:',
  ) {}

  async hasSeen(nonce: string): Promise<boolean> {
    return (await this.redis.exists(this.prefix + nonce)) === 1;
  }

  async record(nonce: string, ttlSec: number): Promise<void> {
    const res = await this.redis.set(this.prefix + nonce, '1', 'NX', 'EX', ttlSec);
    if (res === null) {
      // The key already existed — a concurrent verify saw it first.
      throw new CardcomWebhookError('Replay detected (nonce already used)');
    }
  }
}

export interface WebhookHandlerOptions {
  signingSecret: string;
  nonceStore: NonceStore;
  /** Override replay-window (seconds). Default 300. */
  replayWindowSec?: number;
  /** Override clock — useful for tests. */
  now?: () => number;
}

export interface VerifyInput {
  /** Raw request body as a string. MUST be the exact bytes Cardcom sent. */
  rawBody: string;
  /** Signature header sent by Cardcom (hex HMAC-SHA256). */
  signature: string;
  /** Timestamp header sent by Cardcom (unix seconds, as string). */
  timestamp: string;
  /** Nonce header sent by Cardcom (random string). */
  nonce: string;
  /** Event type header. */
  eventType: string;
}

/**
 * The signing input is `${timestamp}.${nonce}.${rawBody}` — including the nonce
 * binds the signature to a single delivery, the timestamp prevents stale
 * replays even if the nonce store is wiped.
 */
export function computeSignature(rawBody: string, timestamp: string, nonce: string, secret: string): string {
  const payload = `${timestamp}.${nonce}.${rawBody}`;
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

export class CardcomWebhookHandler {
  private readonly signingSecret: string;
  private readonly nonceStore: NonceStore;
  private readonly replayWindowSec: number;
  private readonly now: () => number;

  constructor(opts: WebhookHandlerOptions) {
    if (!opts.signingSecret || opts.signingSecret.length < 16) {
      throw new CardcomWebhookError('signingSecret must be at least 16 chars');
    }
    this.signingSecret = opts.signingSecret;
    this.nonceStore = opts.nonceStore;
    this.replayWindowSec = opts.replayWindowSec ?? REPLAY_WINDOW_SEC;
    this.now = opts.now ?? Date.now;
  }

  /**
   * Verify signature + timestamp + nonce, then normalize the body to a canonical event.
   * Throws CardcomWebhookError on any failure (signature, replay, malformed payload).
   */
  async verifyAndParse(input: VerifyInput): Promise<CanonicalEvent> {
    const { rawBody, signature, timestamp, nonce, eventType } = input;

    if (!rawBody || !signature || !timestamp || !nonce || !eventType) {
      throw new CardcomWebhookError('Missing required webhook headers');
    }

    // 1. Timestamp window
    const tsSec = Number(timestamp);
    if (!Number.isFinite(tsSec)) {
      throw new CardcomWebhookError('Invalid timestamp');
    }
    const ageSec = Math.abs(this.now() / 1000 - tsSec);
    if (ageSec > this.replayWindowSec) {
      throw new CardcomWebhookError(`Timestamp outside replay window (age ${ageSec}s)`);
    }

    // 2. HMAC — constant-time compare
    const expected = computeSignature(rawBody, timestamp, nonce, this.signingSecret);
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new CardcomWebhookError('Signature mismatch');
    }

    // 3. Nonce — anti-replay
    if (await this.nonceStore.hasSeen(nonce)) {
      throw new CardcomWebhookError('Replay detected (nonce already used)');
    }
    // Record nonce with TTL = window + small grace
    await this.nonceStore.record(nonce, this.replayWindowSec + 60);

    // 4. Parse + normalize
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new CardcomWebhookError('Body is not valid JSON');
    }

    return normalize(eventType, parsed);
  }
}
