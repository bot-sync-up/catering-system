#!/usr/bin/env tsx
/**
 * validate-completeness — בודק שכל namespace × locale הוא JSON תקין,
 * שכל המפתחות החובה קיימים, ושכללי הריבוי מתאימים לשפה.
 *
 * exit code 0 = הכול תקין, אחרת שגיאה.
 */
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SUPPORTED_LOCALES, NAMESPACES, type SupportedLocale, type Namespace } from '../types';
import { pluralSuffixes } from '../pluralizer';
import { flatten, findMissing } from './find-missing';

export interface ValidationIssue {
  locale: SupportedLocale;
  namespace: Namespace;
  kind: 'invalid-json' | 'missing-key' | 'missing-plural' | 'unused-plural' | 'empty-value';
  detail: string;
}

const REQUIRED_BASE_KEYS = ['common.ok', 'common.cancel', 'common.error', 'errors.generic'];

export async function validate(localesDir: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // 1. JSON תקין + ערכים לא ריקים
  for (const locale of SUPPORTED_LOCALES) {
    for (const ns of NAMESPACES) {
      const path = join(localesDir, locale, `${ns}.json`);
      let parsed: Record<string, unknown>;
      try {
        const raw = await readFile(path, 'utf8');
        parsed = JSON.parse(raw);
      } catch (e: any) {
        issues.push({ locale, namespace: ns, kind: 'invalid-json', detail: e?.message ?? String(e) });
        continue;
      }
      const flat = flatten(parsed);
      for (const [key, val] of Object.entries(flat)) {
        if (!val || val.trim() === '') {
          issues.push({ locale, namespace: ns, kind: 'empty-value', detail: key });
        }
      }
    }
  }

  // 2. מפתחות חסרים ביחס ל-baseline
  const missing = await findMissing(localesDir, 'he');
  for (const r of missing) {
    for (const k of r.missingKeys) {
      issues.push({ locale: r.locale, namespace: r.namespace, kind: 'missing-key', detail: k });
    }
  }

  // 3. כללי plural — מפתחות שמסתיימים ב-_one/_other וכו'
  for (const locale of SUPPORTED_LOCALES) {
    const expected = new Set(pluralSuffixes(locale));
    for (const ns of NAMESPACES) {
      const path = join(localesDir, locale, `${ns}.json`);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(await readFile(path, 'utf8'));
      } catch { continue; }
      const flat = flatten(parsed);
      // group by base key
      const groups = new Map<string, Set<string>>();
      for (const key of Object.keys(flat)) {
        const m = key.match(/^(.+)_(zero|one|two|few|many|other)$/);
        if (!m) continue;
        const base = m[1]!;
        const cat = m[2]!;
        if (!groups.has(base)) groups.set(base, new Set());
        groups.get(base)!.add(cat);
      }
      for (const [base, cats] of groups) {
        for (const exp of expected) {
          if (!cats.has(exp)) {
            issues.push({
              locale, namespace: ns, kind: 'missing-plural',
              detail: `${base}_${exp} (נדרש ל-${locale})`,
            });
          }
        }
        for (const cat of cats) {
          if (!expected.has(cat as any)) {
            issues.push({
              locale, namespace: ns, kind: 'unused-plural',
              detail: `${base}_${cat} (לא בשימוש ב-${locale})`,
            });
          }
        }
      }
    }
  }

  // 4. מפתחות חובה גלובליים
  for (const locale of SUPPORTED_LOCALES) {
    const allKeys = new Set<string>();
    for (const ns of NAMESPACES) {
      const path = join(localesDir, locale, `${ns}.json`);
      try {
        const parsed = JSON.parse(await readFile(path, 'utf8'));
        for (const k of Object.keys(flatten(parsed))) {
          allKeys.add(`${ns}.${k}`);
        }
      } catch { /* כבר דווח למעלה */ }
    }
    for (const req of REQUIRED_BASE_KEYS) {
      if (!allKeys.has(req)) {
        const [ns, ...rest] = req.split('.');
        issues.push({
          locale, namespace: ns as Namespace, kind: 'missing-key',
          detail: `${rest.join('.')} (חובה)`,
        });
      }
    }
  }

  return issues;
}

async function main() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--locales-dir');
  const localesDir = resolve(dirIdx >= 0 ? args[dirIdx + 1]! : 'src/locales');

  const issues = await validate(localesDir);
  if (issues.length === 0) {
    console.log('✓ כל התרגומים תקינים ומלאים');
    return;
  }
  console.log(`✗ ${issues.length} בעיות:`);
  for (const i of issues) {
    console.log(`  [${i.locale}/${i.namespace}] ${i.kind}: ${i.detail}`);
  }
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
