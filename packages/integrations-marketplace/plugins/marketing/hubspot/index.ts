/**
 * HubSpot plugin — CRM ושיווק.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'hubspot',
    name: 'HubSpot',
    nameHe: 'HubSpot',
    category: 'marketing',
    version: '1.0.0',
    vendor: 'HubSpot',
    description: 'CRM, marketing and sales hub',
    descriptionHe: 'CRM, שיווק ומכירות',
    authType: 'oauth2',
    requiresWebhook: true,
    permissions: ['network:api.hubapi.com', 'secrets:read', 'storage:read', 'storage:write'],
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.deals.read', 'crm.objects.deals.write'],
  },

  async install(ctx) {
    ctx.logger.info('HubSpot OAuth completed');
  },

  async uninstall() {},

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const res = await ctx.http.request({
        method: 'GET',
        url: 'https://api.hubapi.com/integrations/v1/me',
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
    await ctx.events.emit('marketing.hubspot', event.payload);
  },
});
