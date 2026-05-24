import { describe, expect, it } from 'vitest';
import { decideEscalation } from '../src/call/escalation.js';

const cfg = { maxFailedAttempts: 3, agentNumber: '+972500000000' };

describe('decideEscalation', () => {
  it('מסלים על בקשה מפורשת', () => {
    const d = decideEscalation({ failedAttempts: 0, explicitRequest: true }, cfg);
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe('explicit-request');
  });

  it('מסלים על זיהוי כעס', () => {
    const d = decideEscalation({ failedAttempts: 0, detectedAnger: true }, cfg);
    expect(d.shouldEscalate).toBe(true);
  });

  it('מסלים אחרי 3 ניסיונות כושלים', () => {
    const d = decideEscalation({ failedAttempts: 3 }, cfg);
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe('too-many-attempts');
  });

  it('לא מסלים במצב נורמלי', () => {
    const d = decideEscalation({ failedAttempts: 1 }, cfg);
    expect(d.shouldEscalate).toBe(false);
  });

  it('אירוע גדול מועבר למנהל אירועים', () => {
    const d = decideEscalation({ failedAttempts: 0, highValueOrder: true }, cfg);
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe('high-value');
  });
});
