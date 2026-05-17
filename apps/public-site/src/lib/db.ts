// Lightweight JSON-backed data layer. Swap to Postgres/Drizzle in production.
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  await ensureDir();
  const full = path.join(DATA_DIR, file);
  try {
    const raw = await fs.readFile(full, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(file: string, data: T): Promise<void> {
  await ensureDir();
  const full = path.join(DATA_DIR, file);
  await fs.writeFile(full, JSON.stringify(data, null, 2), 'utf8');
}

export async function appendJson<T>(file: string, item: T): Promise<void> {
  const arr = await readJson<T[]>(file, []);
  arr.push(item);
  await writeJson(file, arr);
}
