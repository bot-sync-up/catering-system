import { describe, it, expect } from 'vitest';
import {
  canTransition,
  assertTransition,
  ALLOWED_TRANSITIONS,
} from '../src/domain/order/stateMachine';
import { nextStatus } from '../src/domain/order/engine';

describe('Order state machine — transitions', () => {
  it('draft -> pending חוקי', () => {
    expect(canTransition('draft', 'pending')).toBe(true);
  });

  it('draft -> approved לא חוקי', () => {
    expect(canTransition('draft', 'approved')).toBe(false);
  });

  it('approved -> delivering לא חוקי (חייב לעבור preparing)', () => {
    expect(canTransition('approved', 'delivering')).toBe(false);
  });

  it('completed הוא מצב סופי', () => {
    expect(ALLOWED_TRANSITIONS.completed).toEqual([]);
  });

  it('cancelled הוא מצב סופי', () => {
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
  });

  it('assertTransition זורק על מעבר לא חוקי', () => {
    expect(() => assertTransition('completed', 'pending')).toThrow();
  });

  it('Flow מלא: draft → pending → approved → preparing → delivering → completed', () => {
    let s: string = 'draft';
    s = nextStatus(s as never, { type: 'SUBMIT' });
    expect(s).toBe('pending');
    s = nextStatus(s as never, { type: 'APPROVE', actor: 'admin1' });
    expect(s).toBe('approved');
    s = nextStatus(s as never, { type: 'START_PREPARING' });
    expect(s).toBe('preparing');
    s = nextStatus(s as never, { type: 'START_DELIVERY' });
    expect(s).toBe('delivering');
    s = nextStatus(s as never, { type: 'COMPLETE' });
    expect(s).toBe('completed');
  });

  it('Waitlist flow: pending → waitlisted → approved', () => {
    let s = nextStatus('pending', { type: 'WAITLIST' });
    expect(s).toBe('waitlisted');
    s = nextStatus(s, { type: 'PROMOTE_FROM_WAITLIST' });
    expect(s).toBe('approved');
  });

  it('CANCEL מותר מכל מצב לא סופי', () => {
    for (const from of ['draft', 'pending', 'waitlisted', 'approved', 'preparing', 'delivering'] as const) {
      expect(canTransition(from, 'cancelled')).toBe(true);
    }
  });
});
