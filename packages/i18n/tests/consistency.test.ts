import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { findMissing } from '../src/tools/find-missing';
import { validate } from '../src/tools/validate-completeness';

const LOCALES_DIR = resolve(__dirname, '../src/locales');

describe('עקביות תרגומים', () => {
  it('כל מפתח שקיים ב-he חייב להיות בכל שאר השפות', async () => {
    const reports = await findMissing(LOCALES_DIR, 'he');
    const missingByLocale = reports
      .filter((r) => r.missingKeys.length > 0)
      .map((r) => `[${r.locale}/${r.namespace}] חסרים: ${r.missingKeys.join(', ')}`);
    expect(missingByLocale, missingByLocale.join('\n')).toEqual([]);
  });

  it('אין מפתחות עודפים בשפות אחרות (יתום מ-he)', async () => {
    const reports = await findMissing(LOCALES_DIR, 'he');
    // עודפים מותרים רק עבור מפתחות plural נוספים (_zero/_two/_few/_many לערבית/רוסית)
    const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
    const realExtra = reports.flatMap((r) =>
      r.extraKeys
        .filter((k) => !PLURAL_SUFFIX.test(k))
        .map((k) => `[${r.locale}/${r.namespace}] ${k}`)
    );
    expect(realExtra, realExtra.join('\n')).toEqual([]);
  });

  it('כל ערך לא ריק וכל JSON תקין', async () => {
    const issues = await validate(LOCALES_DIR);
    const blocking = issues.filter((i) =>
      i.kind === 'invalid-json' || i.kind === 'empty-value' || i.kind === 'missing-key'
    );
    expect(blocking, blocking.map((i) => `${i.locale}/${i.namespace} ${i.kind}: ${i.detail}`).join('\n')).toEqual([]);
  });
});
