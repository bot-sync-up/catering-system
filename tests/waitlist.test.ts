import { describe, it, expect } from 'vitest';
import { promoteFromWaitlist } from '../src/domain/waitlist/waitlist';

const eventDate = new Date('2026-07-01');

const entry = (id: string, position: number, guestCount: number) => ({
  id,
  customerId: `cust-${id}`,
  guestCount,
  position,
  promoted: false,
  eventDate,
});

describe('Waitlist promotion', () => {
  it('מקדם את הראשון בתור אם יש מספיק מקום', () => {
    const r = promoteFromWaitlist(
      [entry('a', 1, 4), entry('b', 2, 3)],
      4
    );
    expect(r.promoted.map((p) => p.id)).toEqual(['a']);
    expect(r.remainingFreeSlots).toBe(0);
  });

  it('מדלג על entry גדול מדי וממשיך לבא בתור', () => {
    const r = promoteFromWaitlist(
      [entry('a', 1, 10), entry('b', 2, 3), entry('c', 3, 2)],
      5
    );
    expect(r.promoted.map((p) => p.id)).toEqual(['b', 'c']);
    expect(r.remainingFreeSlots).toBe(0);
  });

  it('כשאין מספיק מקום — לא מקדם אף אחד', () => {
    const r = promoteFromWaitlist([entry('a', 1, 10)], 4);
    expect(r.promoted).toHaveLength(0);
    expect(r.remainingFreeSlots).toBe(4);
  });

  it('מתעלם מ-entries שכבר קודמו', () => {
    const promoted = { ...entry('a', 1, 2), promoted: true };
    const r = promoteFromWaitlist([promoted, entry('b', 2, 3)], 5);
    expect(r.promoted.map((p) => p.id)).toEqual(['b']);
  });
});
