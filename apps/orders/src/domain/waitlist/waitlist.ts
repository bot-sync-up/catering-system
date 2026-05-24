/**
 * Waitlist — ניהול תור המתנה לאירועים.
 * כאשר הזמנה מבוטלת, משחררים את כמות האורחים והמערכת מנסה לקדם
 * את המוקדמים בתור עד שמילאו את הכמות.
 */

export interface WaitlistEntryLite {
  id: string;
  customerId: string;
  guestCount: number;
  position: number;
  promoted: boolean;
  eventDate: Date;
}

export interface PromotionResult {
  promoted: WaitlistEntryLite[];
  remainingFreeSlots: number;
}

/**
 * מקבל תור (entries) ממויין לפי position עולה,
 * ומחזיר אילו entries נכנסו לאירוע (לפי החופשי שהשתחרר).
 */
export function promoteFromWaitlist(
  entries: WaitlistEntryLite[],
  freedSlots: number
): PromotionResult {
  const sorted = [...entries]
    .filter((e) => !e.promoted)
    .sort((a, b) => a.position - b.position);

  const promoted: WaitlistEntryLite[] = [];
  let slots = freedSlots;

  for (const entry of sorted) {
    if (slots <= 0) break;
    if (entry.guestCount <= slots) {
      promoted.push({ ...entry, promoted: true });
      slots -= entry.guestCount;
    }
    // לא קופצים — מי שגדול מדי, נשאר בתור (יישאר לפעם הבאה),
    // וממשיכים לבדוק את הבא בתור
  }

  return { promoted, remainingFreeSlots: slots };
}
