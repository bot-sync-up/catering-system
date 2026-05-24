/**
 * Outlook Calendar plugin — סנכרון עם Microsoft Outlook/365 דרך Graph API.
 */

import { definePlugin } from '../../../src/sdk';
import type { PluginContext } from '../../../src/core/PluginContext';

export default definePlugin({
  manifest: {
    id: 'outlook',
    name: 'Outlook Calendar',
    nameHe: 'יומן אאוטלוק',
    category: 'calendar',
    version: '1.0.0',
    vendor: 'Microsoft',
    description: 'Sync events with Outlook/Microsoft 365 via Graph API',
    descriptionHe: 'סנכרון אירועים עם אאוטלוק/Microsoft 365 דרך Graph API',
    authType: 'oauth2',
    requiresWebhook: true,
    permissions: ['network:graph.microsoft.com', 'storage:read', 'storage:write', 'secrets:read'],
    scopes: ['Calendars.ReadWrite', 'offline_access'],
    configSchema: {
      mailbox: {
        type: 'string',
        label: 'Mailbox',
        labelHe: 'תיבת דואר',
        required: false,
        default: 'me',
      },
    },
  },

  async install(ctx, config) {
    ctx.logger.info('Installing outlook calendar plugin');
    await ctx.storage.set('mailbox', config.mailbox ?? 'me');
  },

  async uninstall(ctx) {
    await ctx.storage.delete('mailbox');
  },

  async healthCheck(ctx: PluginContext) {
    const started = Date.now();
    try {
      const res = await ctx.http.request({
        method: 'GET',
        url: 'https://graph.microsoft.com/v1.0/me/calendars',
        timeoutMs: 5000,
      });
      return {
        status: res.status === 200 ? ('ok' as const) : ('degraded' as const),
        checkedAt: new Date(),
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      return {
        status: 'down' as const,
        message: e instanceof Error ? e.message : 'unknown',
        checkedAt: new Date(),
      };
    }
  },

  async handleWebhook(ctx, event) {
    ctx.logger.info('Outlook change notification', { type: event.type });
    await ctx.events.emit('calendar.changed', event.payload);
  },
});
