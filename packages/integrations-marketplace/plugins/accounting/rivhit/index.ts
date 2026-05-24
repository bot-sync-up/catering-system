/**
 * Rivhit plugin — חיבור ל-Rivhit (ריווחית) עם API token לפי חברה.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'rivhit',
    name: 'Rivhit',
    nameHe: 'ריווחית',
    category: 'accounting',
    version: '1.0.0',
    vendor: 'Rivhit Systems',
    description: 'Israeli ERP and accounting — invoices, receipts, customers',
    descriptionHe: 'ERP וחשבונאות ישראלית — חשבוניות, קבלות, לקוחות',
    authType: 'api-key',
    permissions: ['network:api.rivhit.co.il', 'storage:read', 'storage:write', 'secrets:read', 'secrets:write'],
    configSchema: {
      apiToken: { type: 'secret', label: 'API Token', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.secrets.write('apiToken', String(config.apiToken));
    ctx.logger.info('Rivhit installed');
  },

  async uninstall(ctx) {
    await ctx.secrets.write('apiToken', '');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const token = await ctx.secrets.read('apiToken');
      const res = await ctx.http.request({
        method: 'POST',
        url: 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc/Customer.List',
        body: { api_token: token, page: 1, per_page: 1 },
        timeoutMs: 5000,
      });
      return {
        status: res.status === 200 ? ('ok' as const) : ('degraded' as const),
        checkedAt: new Date(),
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      return { status: 'down' as const, message: String(e), checkedAt: new Date() };
    }
  },
});
