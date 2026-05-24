/**
 * iCount plugin — חיבור ל-iCount (חשבונית ישראלית) דרך API token.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'icount',
    name: 'iCount',
    nameHe: 'iCount',
    category: 'accounting',
    version: '1.0.0',
    vendor: 'iCount',
    description: 'Israeli invoicing — create invoices, receipts and credit notes',
    descriptionHe: 'הפקת חשבוניות, קבלות והודעות זיכוי ב-iCount',
    authType: 'api-key',
    requiresWebhook: true,
    permissions: ['network:api.icount.co.il', 'storage:read', 'storage:write', 'secrets:read', 'secrets:write'],
    configSchema: {
      companyId: {
        type: 'string',
        label: 'Company ID',
        labelHe: 'מזהה חברה',
        required: true,
      },
      apiToken: {
        type: 'secret',
        label: 'API Token',
        labelHe: 'מפתח API',
        required: true,
      },
      defaultVat: {
        type: 'number',
        label: 'Default VAT %',
        labelHe: 'מע"מ ברירת מחדל',
        required: false,
        default: 17,
      },
    },
  },

  async install(ctx, config) {
    await ctx.secrets.write('apiToken', String(config.apiToken));
    await ctx.storage.set('companyId', config.companyId);
    await ctx.storage.set('defaultVat', config.defaultVat ?? 17);
    ctx.logger.info('iCount installed', { companyId: config.companyId });
  },

  async uninstall(ctx) {
    await ctx.secrets.write('apiToken', '');
    await ctx.storage.delete('companyId');
    await ctx.storage.delete('defaultVat');
  },

  async healthCheck(ctx) {
    const started = Date.now();
    try {
      const token = await ctx.secrets.read('apiToken');
      const companyId = await ctx.storage.get<string>('companyId');
      const res = await ctx.http.request({
        method: 'POST',
        url: 'https://api.icount.co.il/api/v3.php/client/info',
        body: { cid: companyId, sid: token },
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
    ctx.logger.info('iCount webhook', { type: event.type });
    await ctx.events.emit('accounting.document_created', event.payload);
  },

  actions: {
    createInvoice: {
      name: 'createInvoice',
      description: 'Create a tax invoice',
      descriptionHe: 'הפקת חשבונית מס',
      async execute(ctx, params) {
        const token = await ctx.secrets.read('apiToken');
        const companyId = await ctx.storage.get<string>('companyId');
        const res = await ctx.http.request({
          method: 'POST',
          url: 'https://api.icount.co.il/api/v3.php/doc/create',
          body: { cid: companyId, sid: token, doctype: 'invoice', ...params },
        });
        return res.data;
      },
    },
    createReceipt: {
      name: 'createReceipt',
      description: 'Create a receipt',
      descriptionHe: 'הפקת קבלה',
      async execute(ctx, params) {
        const token = await ctx.secrets.read('apiToken');
        const companyId = await ctx.storage.get<string>('companyId');
        const res = await ctx.http.request({
          method: 'POST',
          url: 'https://api.icount.co.il/api/v3.php/doc/create',
          body: { cid: companyId, sid: token, doctype: 'receipt', ...params },
        });
        return res.data;
      },
    },
  },
});
