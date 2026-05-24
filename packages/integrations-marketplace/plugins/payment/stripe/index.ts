/**
 * Stripe plugin — סליקה גלובלית של Stripe.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'stripe',
    name: 'Stripe',
    nameHe: 'Stripe',
    category: 'payment',
    version: '1.0.0',
    vendor: 'Stripe',
    description: 'Global card processing with Stripe Checkout and PaymentIntents',
    descriptionHe: 'סליקה גלובלית עם Stripe (Checkout / PaymentIntents)',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:api.stripe.com', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      secretKey: { type: 'secret', label: 'Secret Key (sk_)', labelHe: 'מפתח סודי (sk_)', required: true },
      publishableKey: { type: 'string', label: 'Publishable Key (pk_)', labelHe: 'מפתח פומבי (pk_)', required: true },
      webhookSecret: { type: 'secret', label: 'Webhook signing secret', labelHe: 'סוד חתימת webhook', required: false },
    },
  },

  async install(ctx, config) {
    await ctx.secrets.write('secretKey', String(config.secretKey));
    await ctx.storage.set('publishableKey', config.publishableKey);
    if (config.webhookSecret) {
      await ctx.secrets.write('webhookSecret', String(config.webhookSecret));
    }
  },

  async uninstall(ctx) {
    await ctx.secrets.write('secretKey', '');
    await ctx.secrets.write('webhookSecret', '');
    await ctx.storage.delete('publishableKey');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const key = await ctx.secrets.read('secretKey');
      const res = await ctx.http.request({
        method: 'GET',
        url: 'https://api.stripe.com/v1/balance',
        headers: { Authorization: `Bearer ${key}` },
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
    await ctx.events.emit('payment.stripe', event.payload);
  },
});
