import { describe, it, expect } from 'vitest';
import { PluginSandbox } from '../../src/core/PluginSandbox';
import googleCalendar from '../../plugins/calendar/google-calendar';

describe('PluginSandbox', () => {
  const sb = new PluginSandbox();

  it('runs fn within timeout', async () => {
    const result = await sb.run(googleCalendar, async () => 42);
    expect(result).toBe(42);
  });

  it('rejects when timeout exceeded', async () => {
    await expect(
      sb.run(googleCalendar, () => new Promise(r => setTimeout(r, 200)), { timeoutMs: 50 })
    ).rejects.toThrow(/timeout/);
  });

  it('wraps errors with plugin id prefix', async () => {
    await expect(
      sb.run(googleCalendar, async () => { throw new Error('boom'); })
    ).rejects.toThrow(/google-calendar.*boom/);
  });

  it('assertPermission throws when permission missing', () => {
    expect(() => sb.assertPermission(googleCalendar, 'admin:root')).toThrow();
  });

  it('assertPermission passes when permission present', () => {
    expect(() => sb.assertPermission(googleCalendar, 'storage:read')).not.toThrow();
  });
});
