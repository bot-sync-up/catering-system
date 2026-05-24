import { describe, expect, it } from 'vitest';
import { needsClarification } from '../src/nlu/DisambiguationDialog.js';

describe('needsClarification', () => {
  it('דורש הבהרה על "בשבת" עמום', () => {
    const q = needsClarification({}, 'נעשה את האירוע בשבת');
    expect(q?.field).toBe('date');
  });

  it('לא דורש הבהרה אם נאמר "השבת הקרובה"', () => {
    const q = needsClarification({}, 'בשבת הקרובה');
    expect(q?.field).not.toBe('date');
  });

  it('מבקש הבהרה אם eventType חסר', () => {
    const q = needsClarification({}, 'אני רוצה להזמין');
    expect(q?.field).toBe('eventType');
  });

  it('מסמן guest count לא הגיוני', () => {
    const q = needsClarification({ eventType: 'wedding', guestCount: 3 }, 'שלוש אורחים');
    expect(q?.field).toBe('guestCount');
  });
});
