/**
 * Google Sheets plugin — דחיפה/משיכה של נתונים לגיליונות גוגל.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'google-sheets',
    name: 'Google Sheets',
    nameHe: 'גוגל שיטס',
    category: 'bi',
    version: '1.0.0',
    vendor: 'Google',
    description: 'Read and write Google Sheets via Sheets API',
    descriptionHe: 'קריאה וכתיבה לגיליונות גוגל דרך Sheets API',
    authType: 'oauth2',
    permissions: ['network:sheets.googleapis.com', 'storage:read', 'storage:write', 'secrets:read'],
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    configSchema: {
      spreadsheetId: { type: 'string', label: 'Spreadsheet ID', labelHe: 'מזהה גיליון', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('spreadsheetId', config.spreadsheetId);
  },

  async uninstall(ctx) {
    await ctx.storage.delete('spreadsheetId');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  actions: {
    appendRows: {
      name: 'appendRows',
      description: 'Append rows to a sheet',
      descriptionHe: 'הוספת שורות לגיליון',
      async execute(ctx, params) {
        const id = await ctx.storage.get<string>('spreadsheetId');
        const res = await ctx.http.request({
          method: 'POST',
          url: `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${params.range}:append?valueInputOption=USER_ENTERED`,
          body: { values: params.values },
        });
        return res.data;
      },
    },
  },
});
