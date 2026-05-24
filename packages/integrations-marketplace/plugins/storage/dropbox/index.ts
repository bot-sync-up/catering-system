/**
 * Dropbox plugin — קריאה/כתיבה ל-Dropbox דרך OAuth2 + API v2.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'dropbox',
    name: 'Dropbox',
    nameHe: 'Dropbox',
    category: 'storage',
    version: '1.0.0',
    vendor: 'Dropbox',
    description: 'Read and write files in Dropbox',
    descriptionHe: 'קריאה וכתיבה של קבצים ב-Dropbox',
    authType: 'oauth2',
    requiresWebhook: true,
    permissions: ['network:api.dropboxapi.com', 'network:content.dropboxapi.com', 'secrets:read', 'storage:read', 'storage:write'],
    scopes: ['files.content.read', 'files.content.write', 'files.metadata.read'],
    configSchema: {
      rootFolder: { type: 'string', label: 'Root folder', labelHe: 'תיקיית שורש', required: false, default: '/' },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('rootFolder', config.rootFolder ?? '/');
  },

  async uninstall(ctx) {
    await ctx.storage.delete('rootFolder');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const res = await ctx.http.request({
        method: 'POST',
        url: 'https://api.dropboxapi.com/2/users/get_current_account',
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
    await ctx.events.emit('storage.dropbox.changed', event.payload);
  },
});
