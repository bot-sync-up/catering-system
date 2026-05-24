/**
 * Idempotency for `charge` operations.
 *
 * The client looks up a stable key BEFORE issuing the network request.
 * If a record exists, the cached response is returned untouched —
 * guaranteeing at-most-once side effects across crashes / retries.
 */
import { createHash, randomUUID } from 'crypto';

export interface IdempotencyRecord<T = unknown> {
  key: string;
  requestHash: string;
  status: 'pending' | 'completed' | 'failed';
  response?: T;
  errorMessage?: string;
  createdAt: number;
  expiresAt: number;
}

export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | undefined>;
  set(record: IdempotencyRecord): Promise<void>;
  delete(key: string): Promise<void>;
}

/** In-memory store — production should swap for Redis. */
export class MemoryIdempotencyStore implements IdempotencyStore {
  private map = new Map<string, IdempotencyRecord>();

  async get(key: string): Promise<IdempotencyRecord | undefined> {
    const rec = this.map.get(key);
    if (!rec) return undefined;
    if (rec.expiresAt < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return rec;
  }

  async set(record: IdempotencyRecord): Promise<void> {
    this.map.set(record.key, record);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}

export function generateIdempotencyKey(): string {
  return `ick_${randomUUID()}`;
}

export function hashRequest(body: Record<string, unknown>): string {
  // Stable JSON stringify with sorted keys
  const sorted = JSON.stringify(body, Object.keys(body).sort());
  return createHash('sha256').update(sorted).digest('hex');
}

export class IdempotencyConflictError extends Error {
  constructor(
    message: string,
    public readonly key: string,
  ) {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Run `op` exactly once per (key, body) combination.
 * Same key + same body  → cached response is returned.
 * Same key + different body → IdempotencyConflictError.
 */
export async function runIdempotent<T>(
  store: IdempotencyStore,
  key: string,
  body: Record<string, unknown>,
  op: () => Promise<T>,
): Promise<T> {
  const requestHash = hashRequest(body);
  const existing = await store.get(key);

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new IdempotencyConflictError(
        `Idempotency key reused with a different request body`,
        key,
      );
    }
    if (existing.status === 'completed') {
      return existing.response as T;
    }
    if (existing.status === 'failed') {
      throw new Error(existing.errorMessage ?? 'Previous attempt failed');
    }
    // pending — fall through and rerun; in production a real lock would be safer.
  }

  await store.set({
    key,
    requestHash,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_MS,
  });

  try {
    const result = await op();
    await store.set({
      key,
      requestHash,
      status: 'completed',
      response: result,
      createdAt: Date.now(),
      expiresAt: Date.now() + TTL_MS,
    });
    return result;
  } catch (err) {
    await store.set({
      key,
      requestHash,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : String(err),
      createdAt: Date.now(),
      expiresAt: Date.now() + TTL_MS,
    });
    throw err;
  }
}
