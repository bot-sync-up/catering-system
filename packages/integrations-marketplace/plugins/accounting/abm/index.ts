/**
 * ABM plugin — חיבור ל-ABM (אבן מורן) דרך CSV/Excel.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'abm',
    name: 'ABM',
    nameHe: 'ABM (אבן מורן)',
    category: 'accounting',
    version: '1.0.0',
    vendor: 'Even Moran',
    description: 'ABM accounting via CSV/Excel exchange',
    descriptionHe: 'אינטגרציה ל-ABM באמצעות החלפת קבצי CSV/Excel',
    authType: 'none',
    permissions: ['storage:read', 'storage:write'],
    configSchema: {
      format: {
        type: 'select',
        label: 'Exchange format',
        labelHe: 'פורמט החלפה',
        required: true,
        default: 'xlsx',
        options: [
          { value: 'xlsx', label: 'Excel (.xlsx)', labelHe: 'אקסל (.xlsx)' },
          { value: 'csv', label: 'CSV', labelHe: 'CSV' },
        ],
      },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('format', config.format);
    ctx.logger.info('ABM plugin configured', { format: config.format });
  },

  async uninstall(ctx) {
    await ctx.storage.delete('format');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },
});
