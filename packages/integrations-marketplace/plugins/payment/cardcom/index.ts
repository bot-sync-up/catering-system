/**
 * Cardcom plugin — סליקה דרך Cardcom (קארדקום).
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'cardcom',
    name: 'Cardcom',
    nameHe: 'קארדקום',
    category: 'payment',
    version: '1.0.0',
    vendor: 'Cardcom',
    description: 'Israeli card processing via Cardcom Low Profile / Direct',
    descriptionHe: 'סליקת אשראי ישראלית בקארדקום (Low Profile / Direct)',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:secure.cardcom.solutions', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      terminalNumber: { type: 'string', label: 'Terminal number', labelHe: 'מספר טרמינל', required: true },
      apiName: { type: 'string', label: 'API name', labelHe: 'שם משתמש API', required: true },
      apiPassword: { type: 'secret', label: 'API password', labelHe: 'סיסמת API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('terminalNumber', config.terminalNumber);
    await ctx.storage.set('apiName', config.apiName);
    await ctx.secrets.write('apiPassword', String(config.apiPassword));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('terminalNumber');
    await ctx.storage.delete('apiName');
    await ctx.secrets.write('apiPassword', '');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const res = await ctx.http.request({
        method: 'GET',
        url: 'https://secure.cardcom.solutions/api/v11/Account/Info',
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
    await ctx.events.emit('payment.completed', event.payload);
  },

  actions: {
    createLowProfile: {
      name: 'createLowProfile',
      description: 'Open a Low Profile checkout page',
      descriptionHe: 'פתיחת דף סליקה Low Profile',
      async execute(ctx, params) {
        const terminal = await ctx.storage.get<string>('terminalNumber');
        const apiName = await ctx.storage.get<string>('apiName');
        const pwd = await ctx.secrets.read('apiPassword');
        const res = await ctx.http.request({
          method: 'POST',
          url: 'https://secure.cardcom.solutions/api/v11/LowProfile/Create',
          body: { TerminalNumber: terminal, ApiName: apiName, ApiPassword: pwd, ...params },
        });
        return res.data;
      },
    },
  },
});
