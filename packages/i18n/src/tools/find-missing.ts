#!/usr/bin/env tsx
/**
 * find-missing — מאתר מפתחות שחסרים בכל שפה ביחס לשפת ה-baseline (he).
 *
 * שימוש:
 *   tsx tools/find-missing.ts [--base he] [--locales-dir ./locales]
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SUPPORTED_LOCALES, NAMESPACES, type SupportedLocale, type Namespace } from '../types';

export interface MissingReport {
  locale: SupportedLocale;
  namespace: Namespace;
  missingKeys: string[];
  extraKeys: string[];
}

/** מפלס אובייקט מקונן ל-{"a.b.c": "value"} */
export function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

async function loadNamespace(localesDir: string, locale: string, ns: string): Promise<Record<string, string>> {
  try {
    const raw = await readFile(join(localesDir, locale, `${ns}.json`), 'utf8');
    return flatten(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function findMissing(
  localesDir: string,
  baseline: SupportedLocale = 'he',
): Promise<MissingReport[]> {
  const reports: MissingReport[] = [];

  for (const ns of NAMESPACES) {
    const baseKeys = new Set(Object.keys(await loadNamespace(localesDir, baseline, ns)));

    for (const locale of SUPPORTED_LOCALES) {
      if (locale === baseline) continue;
      const localeKeys = new Set(Object.keys(await loadNamespace(localesDir, locale, ns)));

      // מפתחות שב-baseline אבל לא בשפה הזו
      const missing = Array.from(baseKeys).filter((k) => !localeKeys.has(k));
      // מפתחות שיש כאן אבל לא ב-baseline (יתום / outdated)
      const extra = Array.from(localeKeys).filter((k) => !baseKeys.has(k));

      if (missing.length || extra.length) {
        reports.push({ locale, namespace: ns, missingKeys: missing, extraKeys: extra });
      }
    }
  }

  return reports;
}

async function main() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--locales-dir');
  const localesDir = resolve(dirIdx >= 0 ? args[dirIdx + 1]! : 'src/locales');
  const baseIdx = args.indexOf('--base');
  const base = (baseIdx >= 0 ? args[baseIdx + 1] : 'he') as SupportedLocale;

  const reports = await findMissing(localesDir, base);
  if (reports.length === 0) {
    console.log('✓ אין מפתחות חסרים. כל השפות מסונכרנות עם', base);
    return;
  }

  for (const r of reports) {
    console.log(`\n[${r.locale}] ${r.namespace}`);
    if (r.missingKeys.length) {
      console.log(`  חסרים (${r.missingKeys.length}):`);
      r.missingKeys.forEach((k) => console.log(`    - ${k}`));
    }
    if (r.extraKeys.length) {
      console.log(`  עודפים (${r.extraKeys.length}):`);
      r.extraKeys.forEach((k) => console.log(`    + ${k}`));
    }
  }
  process.exit(reports.some((r) => r.missingKeys.length) ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
