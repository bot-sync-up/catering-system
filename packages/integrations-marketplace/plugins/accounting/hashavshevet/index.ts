/**
 * Hashavshevet plugin — חיבור לחשבשבת דרך CSV (יבוא/יצוא).
 *
 * חשבשבת לא חושפת REST API מלא — לכן העברת נתונים מתבצעת ע"י
 * ייצוא לקבצי CSV/DBF שמועלים למערכת, או דרך תיקיית "החלפה".
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'hashavshevet',
    name: 'Hashavshevet',
    nameHe: 'חשבשבת',
    category: 'accounting',
    version: '1.0.0',
    vendor: 'Hashavshevet H.Y. Ltd.',
    description: 'Hashavshevet integration via CSV/DBF file exchange',
    descriptionHe: 'אינטגרציה לחשבשבת באמצעות יצוא/יבוא קבצי CSV/DBF',
    authType: 'none',
    permissions: ['storage:read', 'storage:write'],
    configSchema: {
      exchangeMode: {
        type: 'select',
        label: 'Exchange mode',
        labelHe: 'אופן החלפה',
        required: true,
        default: 'csv-upload',
        options: [
          { value: 'csv-upload', label: 'Manual CSV upload', labelHe: 'העלאת CSV ידנית' },
          { value: 'shared-folder', label: 'Shared folder polling', labelHe: 'תיקייה משותפת' },
        ],
      },
      sharedFolderPath: {
        type: 'string',
        label: 'Shared folder path',
        labelHe: 'נתיב תיקייה משותפת',
        required: false,
      },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('exchangeMode', config.exchangeMode);
    if (config.sharedFolderPath) {
      await ctx.storage.set('sharedFolderPath', config.sharedFolderPath);
    }
    ctx.logger.info('Hashavshevet exchange configured', { mode: config.exchangeMode });
  },

  async uninstall(ctx) {
    await ctx.storage.delete('exchangeMode');
    await ctx.storage.delete('sharedFolderPath');
  },

  async healthCheck(ctx) {
    const mode = await ctx.storage.get<string>('exchangeMode');
    return {
      status: mode ? ('ok' as const) : ('degraded' as const),
      message: mode ? undefined : 'No exchange mode configured',
      checkedAt: new Date(),
    };
  },

  actions: {
    importCsv: {
      name: 'importCsv',
      description: 'Import a CSV file exported from Hashavshevet',
      descriptionHe: 'יבוא קובץ CSV שיוצא מחשבשבת',
      async execute(ctx, params) {
        const path = String(params.filePath);
        ctx.logger.info('Importing Hashavshevet CSV', { path });
        await ctx.events.emit('accounting.csv_imported', { path });
        return { ok: true };
      },
    },
  },
});
