/**
 * Cibus plugin — ניהול כרטיסי תן ביס/סיבוס לעובדים, דוחות וטעינות.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'cibus',
    name: 'Cibus',
    nameHe: 'סיבוס (Cibus)',
    category: 'operations',
    version: '1.0.0',
    vendor: 'Pluxee Israel',
    description: 'Manage Cibus employee meal cards — loads and reports',
    descriptionHe: 'ניהול כרטיסי סיבוס לעובדים — טעינות ודוחות',
    authType: 'api-key',
    permissions: ['network:api.cibus.co.il', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      employerId: { type: 'string', label: 'Employer ID', labelHe: 'מזהה מעסיק', required: true },
      apiKey: { type: 'secret', label: 'API Key', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('employerId', config.employerId);
    await ctx.secrets.write('apiKey', String(config.apiKey));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('employerId');
    await ctx.secrets.write('apiKey', '');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },
});
