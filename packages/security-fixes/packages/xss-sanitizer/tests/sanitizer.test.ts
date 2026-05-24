import { describe, it, expect } from 'vitest';
import { sanitize, sanitizeStripAll, sanitizeRichText, containsScripts, setPurify } from '../src/index';

describe('XSS Sanitizer (fallback)', () => {
  it('stripAll מסיר כל תגית', () => {
    const out = sanitizeStripAll('<script>alert(1)</script>Hello');
    expect(out).not.toContain('<script>');
    expect(out).toContain('Hello');
  });

  it('stripAll משאיר טקסט עברי', () => {
    const out = sanitizeStripAll('שלום <b>עולם</b>');
    expect(out).toContain('שלום');
    expect(out).toContain('עולם');
  });

  it('מסיר on* handlers', () => {
    const out = sanitizeStripAll('<img src=x onerror=alert(1)>');
    expect(out).not.toMatch(/onerror/i);
  });

  it('מסיר javascript:', () => {
    const out = sanitizeStripAll('javascript:alert(1)');
    expect(out).not.toMatch(/javascript:/i);
  });

  it('containsScripts מזהה script', () => {
    expect(containsScripts('<script>x</script>')).toBe(true);
    expect(containsScripts('<img onerror="alert()">')).toBe(true);
    expect(containsScripts('javascript:void')).toBe(true);
    expect(containsScripts('hello world')).toBe(false);
  });
});

describe('XSS Sanitizer (injected DOMPurify mock)', () => {
  it('משתמש במימוש שהוזרק', () => {
    const calls: string[] = [];
    setPurify({
      sanitize: (input: string) => {
        calls.push(input);
        return 'CLEANED';
      },
    });
    const out = sanitizeRichText('<p>שלום</p>');
    expect(out).toBe('CLEANED');
    expect(calls[0]).toContain('שלום');
    setPurify(null as any); // reset
  });
});

describe('preserveNewlines', () => {
  it('שומר newlines כ-<br>', () => {
    const out = sanitize('שורה 1\nשורה 2', { profile: 'stripAll', preserveNewlines: true });
    expect(out).toContain('<br>');
  });
});
