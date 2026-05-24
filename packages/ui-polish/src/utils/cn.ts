import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** מאחד class names עם תמיכה ב-Tailwind merge. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
