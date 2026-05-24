/**
 * Grow plugin — סליקה דרך Grow (לשעבר MeshulamPay).
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'grow',
    name: 'Grow',
    nameHe: 'Grow (משולם)',
    category: 'payment',
    version: '1.0.0',
    vendor: 'Grow',
    description: 'Grow / Meshulam payment processing',
    descriptionHe: 'סליקת Grow / משולם',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:api.meshulam.co.il', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      userId: { type: 'string', label: 'User ID', labelHe: 'מזהה משתמש', required: true },
      pageCode: { type: 'string', label: 'Page code', labelHe: 'קוד דף', required: true },
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('userId', config.userId);
    await ctx.storage.set('pageCode', config.pageCode);
    await ctx.secrets.write('apiKey', String(config.apiKey));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('userId');
    await ctx.storage.delete('pageCode');
    await ctx.secrets.write('apiKey', '');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  async handleWebhook(ctx, event) {
    await ctx.events.emit('payment.grow', event.payload);
  },
});
