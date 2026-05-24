import type { SupportedLocale } from './types';
import { getBCP47 } from './formatNumber';

export type DateInput = Date | number | string;

function toDate(input: DateInput): Date {
  if (input instanceof Date) return input;
  return new Date(input);
}

export function formatDate(
  input: DateInput,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return '—';
  // עברית — שימוש בלוח גרגוריאני (לא עברי) ב-default כדי לא להפתיע
  return new Intl.DateTimeFormat(getBCP47(locale), options).format(d);
}

export function formatTime(input: DateInput, locale: SupportedLocale): string {
  return formatDate(input, locale, { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(input: DateInput, locale: SupportedLocale): string {
  return formatDate(input, locale, { dateStyle: 'medium', timeStyle: 'short' });
}

/** "לפני 3 שעות" / "in 3 hours" */
export function formatRelative(
  input: DateInput,
  locale: SupportedLocale,
  now: DateInput = new Date(),
): string {
  const target = toDate(input).getTime();
  const base = toDate(now).getTime();
  const diffMs = target - base;
  const absMs = Math.abs(diffMs);

  const rtf = new Intl.RelativeTimeFormat(getBCP47(locale), { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 3600 * 1000],
    ['month', 30 * 24 * 3600 * 1000],
    ['week', 7 * 24 * 3600 * 1000],
    ['day', 24 * 3600 * 1000],
    ['hour', 3600 * 1000],
    ['minute', 60 * 1000],
    ['second', 1000],
  ];

  for (const [unit, ms] of units) {
    if (absMs >= ms || unit === 'second') {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(0, 'second');
}

/** לוח עברי — לתאריכים יהודיים (חגים, יום הולדת עברי וכו') */
export function formatHebrewDate(input: DateInput): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}
