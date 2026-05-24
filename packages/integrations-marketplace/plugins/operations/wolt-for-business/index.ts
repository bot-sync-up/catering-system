/**
 * Wolt for Business plugin — ניהול הזמנות B2B דרך Wolt Drive / API.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'wolt-for-business',
    name: 'Wolt for Business',
    nameHe: 'Wolt for Business',
    category: 'operations',
    version: '1.0.0',
    vendor: 'Wolt',
    description: 'Wolt Drive deliveries and corporate ordering',
    descriptionHe: 'משלוחי Wolt Drive והזמנות עסקיות',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:daas-public-api.wolt.com', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      merchantId: { type: 'string', label: 'Merchant ID', labelHe: 'מזהה מסחרי', required: true },
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('merchantId', config.merchantId);
    await ctx.secrets.write('apiKey', String(config.apiKey));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('merchantId');
    await ctx.secrets.write('apiKey', '');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  async handleWebhook(ctx, event) {
    await ctx.events.emit('operations.delivery', event.payload);
  },
});
