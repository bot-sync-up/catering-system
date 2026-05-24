/**
 * Discord plugin — שליחת הודעות וקבלת events דרך Bot/Webhook.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'discord',
    name: 'Discord',
    nameHe: 'Discord',
    category: 'communication',
    version: '1.0.0',
    vendor: 'Discord',
    description: 'Send messages and receive events via Discord bot',
    descriptionHe: 'שליחת הודעות וקבלת אירועים דרך בוט Discord',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:discord.com', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      botToken: { type: 'secret', label: 'Bot Token', labelHe: 'טוקן בוט', required: true },
      guildId: { type: 'string', label: 'Guild (server) ID', labelHe: 'מזהה שרת', required: false },
    },
  },

  async install(ctx, config) {
    await ctx.secrets.write('botToken', String(config.botToken));
    if (config.guildId) await ctx.storage.set('guildId', config.guildId);
  },

  async uninstall(ctx) {
    await ctx.secrets.write('botToken', '');
    await ctx.storage.delete('guildId');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const token = await ctx.secrets.read('botToken');
      const res = await ctx.http.request({
        method: 'GET',
        url: 'https://discord.com/api/v10/users/@me',
        headers: { Authorization: `Bot ${token}` },
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
    await ctx.events.emit('comm.discord', event.payload);
  },

  actions: {
    sendChannelMessage: {
      name: 'sendChannelMessage',
      description: 'Send a message to a channel',
      descriptionHe: 'שליחת הודעה לערוץ',
      async execute(ctx, params) {
        const token = await ctx.secrets.read('botToken');
        const res = await ctx.http.request({
          method: 'POST',
          url: `https://discord.com/api/v10/channels/${params.channelId}/messages`,
          headers: { Authorization: `Bot ${token}` },
          body: { content: params.content },
        });
        return res.data;
      },
    },
  },
});
