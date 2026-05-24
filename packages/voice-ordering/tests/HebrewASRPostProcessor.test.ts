import { describe, expect, it } from 'vitest';
import { postProcessHebrewASR } from '../src/asr/HebrewASRPostProcessor.js';

describe('postProcessHebrewASR', () => {
  it('מסיר fillers', () => {
    const out = postProcessHebrewASR('אהמ אני רוצה לקבוע אהה תור');
    expect(out).not.toMatch(/אהמ/);
    expect(out).not.toMatch(/אהה/);
  });

  it('מנקה רווחים כפולים', () => {
    expect(postProcessHebrewASR('שלום   עולם')).toBe('שלום עולם');
  });

  it('ממיר מספרים בעברית למספרים', () => {
    const out = postProcessHebrewASR('שלוש מאות אורחים', { normalizeNumbers: true });
    expect(out).toMatch(/300/);
  });

  it('ממיר תאריכים בעברית ל-ISO', () => {
    const ref = new Date('2026-05-24T00:00:00');
    const out = postProcessHebrewASR('האירוע מחר בערב', { normalizeDates: true, referenceDate: ref });
    expect(out).toMatch(/2026-05-25/);
  });
});
