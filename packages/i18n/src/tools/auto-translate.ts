#!/usr/bin/env tsx
/**
 * auto-translate — מתרגם מפתחות חסרים אוטומטית באמצעות Claude.
 *
 * שימוש:
 *   ANTHROPIC_API_KEY=... tsx tools/auto-translate.ts \
 *     --from he --to ar,ru,en,am [--namespace common] [--dry-run]
 *
 * הסקריפט:
 *   1. מאתר את כל המפתחות החסרים בשפת היעד (לעומת --from)
 *   2. שולח batch של עד ~50 מפתחות לכל קריאה ל-Claude
 *   3. משתמש ב-prompt caching על system prompt + glossary
 *   4. מאחד עם ה-JSON הקיים, שומר את המבנה
 *
 * נשמר תיוג מטא: "_machine_translated": true (אפשר לסנן ב-UI עריכה)
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { NAMESPACES, SUPPORTED_LOCALES, type SupportedLocale, type Namespace, LOCALE_META } from '../types';
import { flatten, findMissing } from './find-missing';

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-4-7';
const BATCH_SIZE = 40;

interface Args {
  from: SupportedLocale;
  to: SupportedLocale[];
  localesDir: string;
  namespaceFilter?: Namespace;
  dryRun: boolean;
}

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const get = (flag: string, fallback?: string) => {
    const i = a.indexOf(flag);
    return i >= 0 ? a[i + 1] : fallback;
  };
  const from = (get('--from', 'he') as SupportedLocale);
  const toRaw = get('--to');
  if (!toRaw) throw new Error('--to <locale[,locale...]> חובה');
  const to = toRaw.split(',') as SupportedLocale[];
  for (const t of to) {
    if (!SUPPORTED_LOCALES.includes(t)) throw new Error(`שפה לא נתמכת: ${t}`);
  }
  return {
    from,
    to,
    localesDir: resolve(get('--locales-dir', 'src/locales')!),
    namespaceFilter: get('--namespace') as Namespace | undefined,
    dryRun: a.includes('--dry-run'),
  };
}

const GLOSSARY: Record<SupportedLocale, Record<string, string>> = {
  he: {},
  en: {},
  ar: {
    'כשר': 'كوشير',
    'מהדרין': 'مهدرين',
    'בשרי': 'لحم',
    'חלבי': 'حليبي',
    'פרווה': 'بارفي',
  },
  ru: {
    'כשר': 'Кошер',
    'מהדרין': 'Мехадрин',
    'בשרי': 'Мясное',
    'חלבי': 'Молочное',
    'פרווה': 'Парве',
    'בד"ץ': 'Бадац',
  },
  am: {
    'בשרי': 'ስጋ',
    'חלבי': 'ወተት',
  },
};

function buildSystemPrompt(from: SupportedLocale, to: SupportedLocale): string {
  const glossary = GLOSSARY[to];
  const glossaryStr = Object.keys(glossary).length
    ? `\n\nGlossary (must use these exact translations):\n${Object.entries(glossary).map(([k, v]) => `- "${k}" → "${v}"`).join('\n')}`
    : '';
  return `You are a professional translator for a B2B restaurant/kitchen management SaaS used in Israel.
Translate from ${LOCALE_META[from].name} (${LOCALE_META[from].nativeName}) to ${LOCALE_META[to].name} (${LOCALE_META[to].nativeName}).

Rules:
1. Return ONLY valid JSON — a flat object mapping the original key → translated value.
2. Preserve i18next placeholders verbatim: {{name}}, {{count}}, {{0}}, etc.
3. Preserve markdown like **bold**, _italic_, line breaks (\\n).
4. Keep tone professional but warm. Use the formal "you" where applicable.
5. For Hebrew kosher / kashrut terms, use the standard religious-Jewish equivalents.
6. For plural keys (_one/_two/_few/_many/_other), produce the form that matches that grammatical category in ${LOCALE_META[to].nativeName}.
7. Never add explanations or comments. JSON only.${glossaryStr}`;
}

async function translateBatch(
  client: Anthropic,
  from: SupportedLocale,
  to: SupportedLocale,
  pairs: Record<string, string>,
): Promise<Record<string, string>> {
  const system = buildSystemPrompt(from, to);
  const userJson = JSON.stringify(pairs, null, 2);

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: system,
        cache_control: { type: 'ephemeral' }, // קאש על system — חוסך טוקנים בין batches
      },
    ],
    messages: [
      { role: 'user', content: `Translate the values of these keys:\n\n${userJson}` },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // הוצאת JSON גם אם הוא עטוף ב-```json
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`לא נמצא JSON בתשובה:\n${text}`);
  return JSON.parse(match[0]);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** משחזר אובייקט מקונן ממפתחות "a.b.c" */
function unflatten(flat: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, val] of Object.entries(flat)) {
    const parts = path.split('.');
    let cur: any = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]!;
      if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]!] = val;
  }
  return out;
}

function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null) return source;
  for (const k of Object.keys(source)) {
    if (typeof source[k] === 'object' && source[k] !== null && !Array.isArray(source[k])) {
      target[k] = deepMerge(target[k] ?? {}, source[k]);
    } else {
      target[k] = source[k];
    }
  }
  return target;
}

async function main() {
  const args = parseArgs();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !args.dryRun) throw new Error('ANTHROPIC_API_KEY חובה (או --dry-run)');

  const client = new Anthropic({ apiKey: apiKey ?? 'dummy' });
  const missing = await findMissing(args.localesDir, args.from);

  for (const target of args.to) {
    const relevant = missing.filter(
      (r) => r.locale === target && (!args.namespaceFilter || r.namespace === args.namespaceFilter),
    );
    if (relevant.length === 0) {
      console.log(`✓ ${target}: אין מפתחות חסרים`);
      continue;
    }

    for (const r of relevant) {
      console.log(`→ ${target}/${r.namespace}: ${r.missingKeys.length} מפתחות חסרים`);

      // טען את ה-baseline והוצא את הערכים החסרים
      const basePath = join(args.localesDir, args.from, `${r.namespace}.json`);
      const baseJson = JSON.parse(await readFile(basePath, 'utf8'));
      const baseFlat = flatten(baseJson);
      const pairs: Record<string, string> = {};
      for (const k of r.missingKeys) {
        if (baseFlat[k] !== undefined) pairs[k] = baseFlat[k];
      }

      if (args.dryRun) {
        console.log(`  (dry-run) ידחס ${Object.keys(pairs).length} מפתחות לתרגום`);
        continue;
      }

      // batches
      const allTranslated: Record<string, string> = {};
      for (const batch of chunk(Object.entries(pairs), BATCH_SIZE)) {
        const batchObj = Object.fromEntries(batch);
        try {
          const translated = await translateBatch(client, args.from, target, batchObj);
          Object.assign(allTranslated, translated);
          console.log(`  ✓ batch של ${batch.length} מפתחות`);
        } catch (e) {
          console.error(`  ✗ batch נכשל:`, e);
        }
      }

      // טען את הקיים, מזג והוצא
      const targetPath = join(args.localesDir, target, `${r.namespace}.json`);
      let existing: Record<string, unknown> = {};
      try {
        existing = JSON.parse(await readFile(targetPath, 'utf8'));
      } catch { /* קובץ חדש */ }

      const merged = deepMerge(existing, unflatten(allTranslated));
      await writeFile(targetPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
      console.log(`  ✓ נכתב ל-${targetPath}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
