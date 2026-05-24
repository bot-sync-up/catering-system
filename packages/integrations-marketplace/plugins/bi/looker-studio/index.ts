/**
 * Looker Studio plugin — חשיפת Community Connector ל-Looker Studio.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'looker-studio',
    name: 'Looker Studio',
    nameHe: 'Looker Studio',
    category: 'bi',
    version: '1.0.0',
    vendor: 'Google',
    description: 'Expose data as a Looker Studio Community Connector',
    descriptionHe: 'חשיפת נתונים כ-Looker Studio Community Connector',
    authType: 'api-key',
    permissions: ['network:datastudio.google.com', 'storage:read', 'storage:write', 'secrets:read'],
    configSchema: {
      connectorId: { type: 'string', label: 'Connector ID', labelHe: 'מזהה Connector', required: true },
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('connectorId', config.connectorId);
    await ctx.secrets.write('apiKey', String(config.apiKey));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('connectorId');
    await ctx.secrets.write('apiKey', '');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },
});
