import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIR = process.env.STORAGE_DIR || './storage';
const SEEN_FILE = path.join(DIR, 'seen-sha256.json');

export function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

let cache: Set<string> | null = null;

async function load(): Promise<Set<string>> {
  if (cache) return cache;
  await fs.mkdir(DIR, { recursive: true });
  try {
    const txt = await fs.readFile(SEEN_FILE, 'utf8');
    cache = new Set(JSON.parse(txt) as string[]);
  } catch {
    cache = new Set();
  }
  return cache;
}

async function persist(): Promise<void> {
  if (!cache) return;
  await fs.writeFile(SEEN_FILE, JSON.stringify([...cache]));
}

export async function isDuplicate(hash: string): Promise<boolean> {
  const set = await load();
  return set.has(hash);
}

export async function markSeen(hash: string): Promise<void> {
  const set = await load();
  set.add(hash);
  await persist();
}
