import { describe, expect, it } from 'vitest';
import { formatCurrency, formatPrice } from '../src/formatCurrency';
import { formatDate, formatTime, formatRelative, formatHebrewDate } from '../src/formatDate';
import { formatNumber, formatPercent, formatCompactNumber } from '../src/formatNumber';

const FIXED_DATE = new Date('2026-05-24T14:30:00Z');
const NOW = new Date('2026-05-24T16:30:00Z');

describe('formatNumber snapshots', () => {
  it('פורמט בסיסי per locale', () => {
    expect(formatNumber(1234567.89, 'he')).toMatchInlineSnapshot(`"1,234,567.89"`);
    expect(formatNumber(1234567.89, 'en')).toMatchInlineSnapshot(`"1,234,567.89"`);
    expect(formatNumber(1234567.89, 'ru')).toMatchSnapshot();
    expect(formatNumber(1234567.89, 'ar')).toMatchSnapshot();
    expect(formatNumber(1234567.89, 'am')).toMatchSnapshot();
  });

  it('אחוז', () => {
    expect(formatPercent(0.155, 'he', 1)).toMatchInlineSnapshot(`"15.5%"`);
    expect(formatPercent(0.5, 'en')).toMatchInlineSnapshot(`"50%"`);
  });

  it('compact', () => {
    expect(formatCompactNumber(12500, 'en')).toMatchInlineSnapshot(`"12.5K"`);
    expect(formatCompactNumber(12500, 'he')).toMatchSnapshot();
  });
});

describe('formatCurrency snapshots', () => {
  it('ILS ברירת מחדל לעברית', () => {
    expect(formatCurrency(1500.5, 'he')).toMatchSnapshot();
  });
  it('USD לאנגלית', () => {
    expect(formatCurrency(1500.5, 'en')).toMatchInlineSnapshot(`"$1,500.50"`);
  });
  it('formatPrice מסיר אגורות', () => {
    expect(formatPrice(1500.5, 'he')).toMatchSnapshot();
    expect(formatPrice(1500.5, 'en')).toMatchInlineSnapshot(`"$1,501"`);
  });
});

describe('formatDate snapshots', () => {
  it('תאריך', () => {
    expect(formatDate(FIXED_DATE, 'he')).toMatchSnapshot();
    expect(formatDate(FIXED_DATE, 'en')).toMatchSnapshot();
    expect(formatDate(FIXED_DATE, 'ru')).toMatchSnapshot();
  });
  it('שעה', () => {
    expect(formatTime(FIXED_DATE, 'he')).toMatchSnapshot();
  });
  it('relative — "לפני שעתיים"', () => {
    expect(formatRelative(FIXED_DATE, 'he', NOW)).toMatchSnapshot();
    expect(formatRelative(FIXED_DATE, 'en', NOW)).toMatchSnapshot();
  });
  it('formatHebrewDate — תאריך לפי לוח עברי', () => {
    const result = formatHebrewDate(FIXED_DATE);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});
