#!/usr/bin/env tsx
/**
 * extract-keys — סורק קוד מקור ומחלץ קריאות ל-t('namespace:key') / t('key').
 *
 * שימוש:
 *   tsx tools/extract-keys.ts --src ../../apps --out ./extracted-keys.json
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

interface ExtractedKey {
  namespace: string;
  key: string;
  files: string[];
}

const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.next', 'build', 'coverage']);

// תופס: t('key'), t("ns:key"), useTranslation('ns'), i18n.t('key')
const T_CALL = /(?:^|[^\w$])t\(\s*(['"`])([^'"`]+?)\1/g;
const NS_USE = /useTranslation\(\s*(['"`])([^'"`]+?)\1/g;

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, out);
    } else if (EXTS.has(extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

export async function extractKeys(srcDir: string): Promise<ExtractedKey[]> {
  const files = await walk(resolve(srcDir));
  const map = new Map<string, ExtractedKey>();

  for (const file of files) {
    const src = await readFile(file, 'utf8');
    // ברירת מחדל ל-namespace: common אלא אם נקבע ב-useTranslation
    let defaultNs = 'common';
    const nsMatch = NS_USE.exec(src);
    if (nsMatch?.[2]) defaultNs = nsMatch[2];
    NS_USE.lastIndex = 0;

    let m: RegExpExecArray | null;
    while ((m = T_CALL.exec(src))) {
      const raw = m[2]!;
      const [ns, ...rest] = raw.includes(':') ? raw.split(':') : [defaultNs, raw];
      const key = rest.join(':');
      const id = `${ns}::${key}`;
      const existing = map.get(id);
      if (existing) {
        if (!existing.files.includes(file)) existing.files.push(file);
      } else {
        map.set(id, { namespace: ns!, key, files: [file] });
      }
    }
    T_CALL.lastIndex = 0;
  }

  return Array.from(map.values()).sort((a, b) =>
    a.namespace === b.namespace ? a.key.localeCompare(b.key) : a.namespace.localeCompare(b.namespace),
  );
}

async function main() {
  const args = process.argv.slice(2);
  const srcIdx = args.indexOf('--src');
  const outIdx = args.indexOf('--out');
  const srcDir = srcIdx >= 0 ? args[srcIdx + 1]! : 'src';
  const outFile = outIdx >= 0 ? args[outIdx + 1]! : 'extracted-keys.json';

  const keys = await extractKeys(srcDir);
  await writeFile(outFile, JSON.stringify(keys, null, 2), 'utf8');
  console.log(`extracted ${keys.length} keys → ${outFile}`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
