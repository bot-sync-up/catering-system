/**
 * Teneo plugin — אינטגרציה לפלטפורמת Teneo Conversational AI.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'teneo',
    name: 'Teneo',
    nameHe: 'Teneo',
    category: 'operations',
    version: '1.0.0',
    vendor: 'Artificial Solutions',
    description: 'Conversational AI orchestration via Teneo',
    descriptionHe: 'אורקסטרציה של AI שיחתי דרך Teneo',
    authType: 'api-key',
    permissions: ['network:*.teneo.ai', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      engineUrl: { type: 'string', label: 'Engine URL', labelHe: 'כתובת מנוע', required: true },
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('engineUrl', config.engineUrl);
    await ctx.secrets.write('apiKey', String(config.apiKey));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('engineUrl');
    await ctx.secrets.write('apiKey', '');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },
});
