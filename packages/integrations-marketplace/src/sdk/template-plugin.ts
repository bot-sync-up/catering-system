/**
 * תבנית פלאגין — להעתקה לפתיחת פלאגין חדש.
 * החליפו את MY_PROVIDER בשם הספק שלכם.
 */

import { definePlugin, helpers } from './index';
import type { PluginContext } from '../core/PluginContext';

export default definePlugin({
  manifest: {
    id: 'my-provider',
    name: 'My Provider',
    nameHe: 'הספק שלי',
    category: 'operations',
    version: '0.1.0',
    vendor: 'Example Inc.',
    description: 'Example plugin template',
    descriptionHe: 'תבנית פלאגין לדוגמה',
    authType: 'api-key',
    permissions: ['network:my-provider.com', 'storage:read', 'storage:write'],
    configSchema: {
      apiKey: {
        type: 'secret',
        label: 'API Key',
        labelHe: 'מפתח API',
        required: true,
      },
      baseUrl: {
        type: 'string',
        label: 'Base URL',
        labelHe: 'כתובת בסיס',
        required: false,
        default: 'https://api.my-provider.com',
      },
    },
  },

  async install(ctx: PluginContext, config: Record<string, unknown>): Promise<void> {
    ctx.logger.info('Installing my-provider plugin', { org: ctx.organizationId });
    await ctx.secrets.write('apiKey', String(config.apiKey));
    await ctx.storage.set('baseUrl', config.baseUrl ?? 'https://api.my-provider.com');
  },

  async uninstall(ctx: PluginContext): Promise<void> {
    await ctx.secrets.write('apiKey', '');
    await ctx.storage.delete('baseUrl');
  },

  async healthCheck(ctx: PluginContext) {
    const started = Date.now();
    try {
      const baseUrl = (await ctx.storage.get<string>('baseUrl')) ?? '';
      const res = await helpers.retry(() =>
        ctx.http.request({ method: 'GET', url: `${baseUrl}/health`, timeoutMs: 5000 })
      );
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
});
