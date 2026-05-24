import { describe, it, expect } from 'vitest';
import { newId, CuidSchema } from '../src/common/id.js';

describe('id (cuid)', () => {
  it('generates valid cuid', () => {
    const id = newId();
    expect(CuidSchema.safeParse(id).success).toBe(true);
    expect(id).toMatch(/^c[a-z0-9]{8,}$/i);
  });

  it('rejects non-cuid strings', () => {
    expect(CuidSchema.safeParse('123').success).toBe(false);
    expect(CuidSchema.safeParse('hello-world').success).toBe(false);
  });
});
