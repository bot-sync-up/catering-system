/**
 * RNG דטרמיניסטי — Mulberry32. seed קבוע = פלט קבוע.
 */
let state = 0xcafef00d >>> 0;

export function setRngSeed(seed: number | string): void {
  if (typeof seed === "string") {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(31, h) + seed.charCodeAt(i);
    }
    state = h >>> 0;
  } else {
    state = (seed >>> 0) || 1;
  }
}

export function rand(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function pickMany<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export function chance(probability: number): boolean {
  return rand() < probability;
}

export function randDecimal(min: number, max: number, decimals = 2): number {
  const value = rand() * (max - min) + min;
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}
