/**
 * Slack plugin — שליחת הודעות וקבלת events מ-Slack.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'slack',
    name: 'Slack',
    nameHe: 'Slack',
    category: 'communication',
    version: '1.0.0',
    vendor: 'Slack Technologies',
    description: 'Post messages and receive events from Slack',
    descriptionHe: 'שליחת הודעות וקבלת אירועים מ-Slack',
    authType: 'oauth2',
    requiresWebhook: true,
    permissions: ['network:slack.com', 'secrets:read', 'storage:read', 'storage:write'],
    scopes: ['chat:write', 'channels:read', 'im:write', 'users:read'],
    configSchema: {
      defaultChannel: { type: 'string', label: 'Default channel', labelHe: 'ערוץ ברירת מחדל', required: false },
    },
  },

  async install(ctx, config) {
    if (config.defaultChannel) {
      await ctx.storage.set('defaultChannel', config.defaultChannel);
    }
  },

  async uninstall(ctx) {
    await ctx.storage.delete('defaultChannel');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const res = await ctx.http.request({
        method: 'GET',
        url: 'https://slack.com/api/auth.test',
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
    await ctx.events.emit('comm.slack', event.payload);
  },

  actions: {
    postMessage: {
      name: 'postMessage',
      description: 'Post a message to a channel',
      descriptionHe: 'שליחת הודעה לערוץ',
      async execute(ctx, params) {
        const res = await ctx.http.request({
          method: 'POST',
          url: 'https://slack.com/api/chat.postMessage',
          body: params,
        });
        return res.data;
      },
    },
  },
});
