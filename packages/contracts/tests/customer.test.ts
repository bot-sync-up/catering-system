import { describe, it, expect } from 'vitest';
import { CustomerSchema } from '../src/entities/Customer.js';
import { newId } from '../src/common/id.js';

describe('Customer', () => {
  const now = new Date().toISOString();

  it('accepts a minimal B2C customer', () => {
    const r = CustomerSchema.safeParse({
      id: newId(),
      type: 'B2C',
      status: 'ACTIVE',
      displayName: 'יוסי כהן',
      contacts: [],
      addresses: [],
      tags: [],
      creditTermsDays: 0,
      createdAt: now,
      updatedAt: now,
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid customer type', () => {
    const r = CustomerSchema.safeParse({
      id: newId(),
      type: 'X',
      displayName: 'foo',
      contacts: [],
      addresses: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    expect(r.success).toBe(false);
  });

  it('accepts INSTITUTION with name', () => {
    const r = CustomerSchema.safeParse({
      id: newId(),
      type: 'INSTITUTION',
      displayName: 'ישיבת מיר',
      institutionName: 'ישיבת מיר',
      contacts: [],
      addresses: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    expect(r.success).toBe(true);
  });
});
