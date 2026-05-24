/**
 * Peppermint plugin — Helpdesk/Ticketing קוד פתוח.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'peppermint',
    name: 'Peppermint',
    nameHe: 'Peppermint',
    category: 'operations',
    version: '1.0.0',
    vendor: 'Peppermint Labs',
    description: 'Open-source ticketing and helpdesk',
    descriptionHe: 'מערכת טיקטים והלפדסק בקוד פתוח',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:*', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      baseUrl: { type: 'string', label: 'Base URL', labelHe: 'כתובת בסיס', required: true },
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('baseUrl', config.baseUrl);
    await ctx.secrets.write('apiKey', String(config.apiKey));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('baseUrl');
    await ctx.secrets.write('apiKey', '');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const url = await ctx.storage.get<string>('baseUrl');
      const res = await ctx.http.request({ method: 'GET', url: `${url}/api/v1/health`, timeoutMs: 5000 });
      return {
        status: res.status === 200 ? ('ok' as const) : ('degraded' as const),
        checkedAt: new Date(),
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      return { status: 'down' as const, message: String(e), checkedAt: new Date() };
    }
  },

  async handleWebhook(ctx, event) {
    await ctx.events.emit('ticket.event', event.payload);
  },
});
