const HEBREW_DAYS = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

export function hebrewDayOfWeek(date: Date): string {
  return HEBREW_DAYS[date.getDay()] ?? "";
}

export function isHebrewText(text: string): boolean {
  return /[֐-׿]/.test(text);
}
