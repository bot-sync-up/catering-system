/**
 * Waze for Business plugin — שליחת אירועי תנועה/סגירות + Waze Transport SDK.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'waze-business',
    name: 'Waze for Business',
    nameHe: 'Waze for Business',
    category: 'operations',
    version: '1.0.0',
    vendor: 'Waze',
    description: 'Waze Partner integration — closures, alerts and transport',
    descriptionHe: 'אינטגרציית Waze לעסקים — סגירות, התראות ותחבורה',
    authType: 'api-key',
    permissions: ['network:partnerhub.waze.com', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      partnerId: { type: 'string', label: 'Partner ID', labelHe: 'מזהה שותף', required: true },
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('partnerId', config.partnerId);
    await ctx.secrets.write('apiKey', String(config.apiKey));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('partnerId');
    await ctx.secrets.write('apiKey', '');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },
});
