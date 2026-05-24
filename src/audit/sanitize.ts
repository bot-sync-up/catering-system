import { SENSITIVE_FIELDS } from './types';

/**
 * Returns a deep copy of `value` with sensitive field VALUES replaced by '***'.
 * Keys are preserved so that downstream readers can see "passwordHash was set"
 * without ever seeing the hash itself.
 *
 * Handles plain objects, arrays, Dates, BigInt, Buffer.
 */
export function sanitize(value: unknown): unknown {
  return walk(value, new WeakSet());
}

function walk(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `<Buffer ${value.length}B>`;
  if (Array.isArray(value)) return value.map((v) => walk(v, seen));

  if (typeof value === 'object') {
    if (seen.has(value as object)) return '<circular>';
    seen.add(value as object);

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.has(k)) {
        out[k] = '***';
      } else {
        out[k] = walk(v, seen);
      }
    }
    return out;
  }
  return value;
}

/**
 * Compute a shallow diff suitable for storage.
 * Only fields that actually changed are kept — keeps audit rows small.
 */
export function diff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): { old: Record<string, unknown>; new: Record<string, unknown> } {
  const oldOut: Record<string, unknown> = {};
  const newOut: Record<string, unknown> = {};
  if (!before && !after) return { old: oldOut, new: newOut };

  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  for (const k of keys) {
    const a = before ? (before as Record<string, unknown>)[k] : undefined;
    const b = after ? (after as Record<string, unknown>)[k] : undefined;
    if (!shallowEqual(a, b)) {
      oldOut[k] = a;
      newOut[k] = b;
    }
  }
  return { old: oldOut, new: newOut };
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a === 'object' && typeof b === 'object' && a && b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
