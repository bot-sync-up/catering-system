/**
 * ActiveCampaign plugin.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    nameHe: 'ActiveCampaign',
    category: 'marketing',
    version: '1.0.0',
    vendor: 'ActiveCampaign',
    description: 'Marketing automation and CRM',
    descriptionHe: 'אוטומציית שיווק ו-CRM',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:*.api-us1.com', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      apiUrl: { type: 'string', label: 'API URL', labelHe: 'כתובת API', required: true },
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('apiUrl', config.apiUrl);
    await ctx.secrets.write('apiKey', String(config.apiKey));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('apiUrl');
    await ctx.secrets.write('apiKey', '');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  async handleWebhook(ctx, event) {
    await ctx.events.emit('marketing.activecampaign', event.payload);
  },
});
