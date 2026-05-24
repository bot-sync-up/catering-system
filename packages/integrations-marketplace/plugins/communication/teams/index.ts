/**
 * Microsoft Teams plugin — שליחת הודעות וקבלת events דרך Graph API.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'teams',
    name: 'Microsoft Teams',
    nameHe: 'Microsoft Teams',
    category: 'communication',
    version: '1.0.0',
    vendor: 'Microsoft',
    description: 'Post and receive messages in Microsoft Teams',
    descriptionHe: 'שליחה וקבלת הודעות ב-Microsoft Teams',
    authType: 'oauth2',
    requiresWebhook: true,
    permissions: ['network:graph.microsoft.com', 'secrets:read', 'storage:read', 'storage:write'],
    scopes: ['ChannelMessage.Send', 'Chat.ReadWrite'],
  },

  async install() {},
  async uninstall() {},

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  async handleWebhook(ctx, event) {
    await ctx.events.emit('comm.teams', event.payload);
  },
});
