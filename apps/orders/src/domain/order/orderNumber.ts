/**
 * יצירת מספר הזמנה לתצוגה — ORD-YYMMDD-XXXX
 */

export function generateOrderNumber(now: Date = new Date()): string {
  const yy = String(now.getFullYear() % 100).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `ORD-${yy}${mm}${dd}-${rand}`;
}
