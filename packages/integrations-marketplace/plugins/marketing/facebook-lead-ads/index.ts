/**
 * Facebook Lead Ads plugin — קליטת לידים מ-Meta בזמן אמת.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'facebook-lead-ads',
    name: 'Facebook Lead Ads',
    nameHe: 'לידים מפייסבוק',
    category: 'marketing',
    version: '1.0.0',
    vendor: 'Meta',
    description: 'Receive Lead Ads in real time via Meta Graph webhook',
    descriptionHe: 'קליטת לידים מפייסבוק בזמן אמת דרך Meta Graph webhook',
    authType: 'oauth2',
    requiresWebhook: true,
    permissions: ['network:graph.facebook.com', 'secrets:read', 'storage:read', 'storage:write'],
    scopes: ['leads_retrieval', 'pages_manage_metadata', 'pages_show_list'],
    configSchema: {
      pageId: { type: 'string', label: 'Facebook Page ID', labelHe: 'מזהה דף פייסבוק', required: true },
      formIds: { type: 'string', label: 'Form IDs (comma)', labelHe: 'מזהי טפסים (בפסיק)', required: false },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('pageId', config.pageId);
    if (config.formIds) await ctx.storage.set('formIds', config.formIds);
  },

  async uninstall(ctx) {
    await ctx.storage.delete('pageId');
    await ctx.storage.delete('formIds');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  async handleWebhook(ctx, event) {
    // משיכת פרטי הליד באמצעות leadgen_id
    await ctx.events.emit('marketing.lead', event.payload);
  },
});
