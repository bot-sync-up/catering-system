/**
 * Google Drive plugin — קריאה/כתיבה דרך Drive API v3.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'google-drive',
    name: 'Google Drive',
    nameHe: 'Google Drive',
    category: 'storage',
    version: '1.0.0',
    vendor: 'Google',
    description: 'Read and write files in Google Drive',
    descriptionHe: 'קריאה וכתיבה של קבצים ב-Google Drive',
    authType: 'oauth2',
    requiresWebhook: true,
    permissions: ['network:www.googleapis.com', 'secrets:read', 'storage:read', 'storage:write'],
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    configSchema: {
      rootFolderId: { type: 'string', label: 'Root folder ID', labelHe: 'מזהה תיקיית שורש', required: false },
    },
  },

  async install(ctx, config) {
    if (config.rootFolderId) await ctx.storage.set('rootFolderId', config.rootFolderId);
  },

  async uninstall(ctx) {
    await ctx.storage.delete('rootFolderId');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const res = await ctx.http.request({
        method: 'GET',
        url: 'https://www.googleapis.com/drive/v3/about?fields=user',
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
    await ctx.events.emit('storage.drive.changed', event.payload);
  },
});
