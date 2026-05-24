/**
 * Green Invoice plugin — חיבור ל-Green Invoice עם JWT (id+secret).
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'greeninvoice',
    name: 'Green Invoice',
    nameHe: 'חשבונית ירוקה',
    category: 'accounting',
    version: '1.0.0',
    vendor: 'Green Invoice',
    description: 'Israeli digital invoices and receipts',
    descriptionHe: 'חשבוניות וקבלות דיגיטליות בחשבונית ירוקה',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:api.greeninvoice.co.il', 'storage:read', 'storage:write', 'secrets:read', 'secrets:write'],
    configSchema: {
      apiKeyId: { type: 'string', label: 'API Key ID', labelHe: 'מזהה מפתח API', required: true },
      apiKeySecret: { type: 'secret', label: 'API Key Secret', labelHe: 'סיסמת מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('apiKeyId', String(config.apiKeyId));
    await ctx.secrets.write('apiKeySecret', String(config.apiKeySecret));
    // קבלת JWT
    const res = await ctx.http.request({
      method: 'POST',
      url: 'https://api.greeninvoice.co.il/api/v1/account/token',
      body: { id: config.apiKeyId, secret: config.apiKeySecret },
    });
    const token = (res.data as { token?: string }).token;
    if (token) await ctx.secrets.write('jwt', token);
    ctx.logger.info('Green Invoice installed');
  },

  async uninstall(ctx) {
    await ctx.storage.delete('apiKeyId');
    await ctx.secrets.write('apiKeySecret', '');
    await ctx.secrets.write('jwt', '');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const jwt = await ctx.secrets.read('jwt');
      const res = await ctx.http.request({
        method: 'GET',
        url: 'https://api.greeninvoice.co.il/api/v1/businesses/me',
        headers: { Authorization: `Bearer ${jwt}` },
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
    await ctx.events.emit('accounting.document_event', event.payload);
  },
});
