/**
 * Tranzila plugin — סליקה דרך טרנזילה.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'tranzila',
    name: 'Tranzila',
    nameHe: 'טרנזילה',
    category: 'payment',
    version: '1.0.0',
    vendor: 'Tranzila',
    description: 'Tranzila card processing (TranzilaToken)',
    descriptionHe: 'סליקת טרנזילה (TranzilaToken)',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:secure5.tranzila.com', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      supplier: { type: 'string', label: 'Supplier (terminal)', labelHe: 'מסוף (supplier)', required: true },
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('supplier', config.supplier);
    await ctx.secrets.write('apiKey', String(config.apiKey));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('supplier');
    await ctx.secrets.write('apiKey', '');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  async handleWebhook(ctx, event) {
    await ctx.events.emit('payment.tranzila', event.payload);
  },
});
