/**
 * Google Ads Conversion plugin — שליחת אירועי המרה (offline conversions).
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'google-ads-conversion',
    name: 'Google Ads Conversion',
    nameHe: 'המרות גוגל אדס',
    category: 'marketing',
    version: '1.0.0',
    vendor: 'Google',
    description: 'Upload offline conversions to Google Ads',
    descriptionHe: 'העלאת המרות אופליין ל-Google Ads',
    authType: 'oauth2',
    permissions: ['network:googleads.googleapis.com', 'secrets:read', 'storage:read', 'storage:write'],
    scopes: ['https://www.googleapis.com/auth/adwords'],
    configSchema: {
      customerId: { type: 'string', label: 'Customer ID', labelHe: 'מזהה לקוח אדס', required: true },
      conversionActionId: { type: 'string', label: 'Conversion Action ID', labelHe: 'מזהה פעולת המרה', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('customerId', config.customerId);
    await ctx.storage.set('conversionActionId', config.conversionActionId);
  },

  async uninstall(ctx) {
    await ctx.storage.delete('customerId');
    await ctx.storage.delete('conversionActionId');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  actions: {
    uploadConversion: {
      name: 'uploadConversion',
      description: 'Upload a single offline conversion',
      descriptionHe: 'העלאת המרה אופליין בודדת',
      async execute(ctx, params) {
        const customerId = await ctx.storage.get<string>('customerId');
        const res = await ctx.http.request({
          method: 'POST',
          url: `https://googleads.googleapis.com/v15/customers/${customerId}:uploadClickConversions`,
          body: params,
        });
        return res.data;
      },
    },
  },
});
