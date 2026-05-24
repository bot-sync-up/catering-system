/**
 * Mailchimp plugin — סנכרון אנשי קשר ושליחה ל-Mailchimp.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'mailchimp',
    name: 'Mailchimp',
    nameHe: 'Mailchimp',
    category: 'marketing',
    version: '1.0.0',
    vendor: 'Intuit Mailchimp',
    description: 'Sync contacts and send campaigns via Mailchimp',
    descriptionHe: 'סנכרון אנשי קשר ושליחת קמפיינים ב-Mailchimp',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:api.mailchimp.com', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
      audienceId: { type: 'string', label: 'Audience (list) ID', labelHe: 'מזהה רשימה', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.secrets.write('apiKey', String(config.apiKey));
    await ctx.storage.set('audienceId', config.audienceId);
  },

  async uninstall(ctx) {
    await ctx.secrets.write('apiKey', '');
    await ctx.storage.delete('audienceId');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const key = await ctx.secrets.read('apiKey');
      const dc = (key ?? '').split('-')[1] ?? 'us1';
      const res = await ctx.http.request({
        method: 'GET',
        url: `https://${dc}.api.mailchimp.com/3.0/ping`,
        headers: { Authorization: `Basic ${Buffer.from(`anystring:${key}`).toString('base64')}` },
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

  async handleWebhook(ctx, event) {
    await ctx.events.emit('marketing.mailchimp', event.payload);
  },
});
