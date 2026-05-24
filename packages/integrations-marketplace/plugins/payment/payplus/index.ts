/**
 * PayPlus plugin — סליקה ב-PayPlus.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'payplus',
    name: 'PayPlus',
    nameHe: 'PayPlus',
    category: 'payment',
    version: '1.0.0',
    vendor: 'PayPlus',
    description: 'PayPlus checkout and tokenization',
    descriptionHe: 'סליקה ו-tokenization של PayPlus',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:restapi.payplus.co.il', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
      secretKey: { type: 'secret', label: 'Secret Key', labelHe: 'מפתח סודי', required: true },
      paymentPageUid: { type: 'string', label: 'Payment page UID', labelHe: 'UID דף תשלום', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.secrets.write('apiKey', String(config.apiKey));
    await ctx.secrets.write('secretKey', String(config.secretKey));
    await ctx.storage.set('paymentPageUid', config.paymentPageUid);
  },

  async uninstall(ctx) {
    await ctx.secrets.write('apiKey', '');
    await ctx.secrets.write('secretKey', '');
    await ctx.storage.delete('paymentPageUid');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  async handleWebhook(ctx, event) {
    await ctx.events.emit('payment.payplus', event.payload);
  },
});
