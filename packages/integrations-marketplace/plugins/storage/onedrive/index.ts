/**
 * OneDrive plugin — קריאה/כתיבה דרך Microsoft Graph.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'onedrive',
    name: 'OneDrive',
    nameHe: 'OneDrive',
    category: 'storage',
    version: '1.0.0',
    vendor: 'Microsoft',
    description: 'Read and write files in OneDrive / SharePoint via Graph',
    descriptionHe: 'קריאה וכתיבה של קבצים ב-OneDrive / SharePoint דרך Graph',
    authType: 'oauth2',
    requiresWebhook: true,
    permissions: ['network:graph.microsoft.com', 'secrets:read', 'storage:read', 'storage:write'],
    scopes: ['Files.ReadWrite', 'offline_access'],
  },

  async install() {},
  async uninstall() {},

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const res = await ctx.http.request({
        method: 'GET',
        url: 'https://graph.microsoft.com/v1.0/me/drive',
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
    await ctx.events.emit('storage.onedrive.changed', event.payload);
  },
});
