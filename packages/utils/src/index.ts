export const APP_NAME = 'ענה את השואל';

export function formatHebrewDate(date: Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function isRTL(text: string): boolean {
  const rtlChars = /[֑-߿יִ-﷽ﹰ-ﻼ]/;
  return rtlChars.test(text);
}

export function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
