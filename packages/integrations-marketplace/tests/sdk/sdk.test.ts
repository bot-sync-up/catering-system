import { describe, it, expect } from 'vitest';
import { definePlugin, helpers } from '../../src/sdk';

describe('definePlugin', () => {
  it('returns the plugin when valid', () => {
    const p = definePlugin({
      manifest: {
        id: 'test',
        name: 'Test',
        nameHe: 'בדיקה',
        category: 'operations',
        version: '0.1.0',
        vendor: 'V',
        description: 'd',
        descriptionHe: 'ת',
        authType: 'none',
        permissions: ['storage:read'],
      },
      async install() {},
      async uninstall() {},
      async healthCheck() {
        return { status: 'ok' as const, checkedAt: new Date() };
      },
    });
    expect(p.manifest.id).toBe('test');
  });

  it('throws when manifest is missing id', () => {
    expect(() =>
      definePlugin({
        // @ts-expect-error testing runtime validation
        manifest: {},
        async install() {},
        async uninstall() {},
        async healthCheck() {
          return { status: 'ok', checkedAt: new Date() };
        },
      })
    ).toThrow();
  });
});

describe('helpers.validateIsraeliId', () => {
  it('accepts valid ID', () => {
    expect(helpers.validateIsraeliId('000000018')).toBe(true);
  });
  it('rejects invalid ID', () => {
    expect(helpers.validateIsraeliId('123456789')).toBe(false);
  });
});

describe('helpers.retry', () => {
  it('retries until success', async () => {
    let tries = 0;
    const result = await helpers.retry(async () => {
      tries++;
      if (tries < 3) throw new Error('not yet');
      return 'ok';
    }, 5, 1);
    expect(result).toBe('ok');
    expect(tries).toBe(3);
  });
});
