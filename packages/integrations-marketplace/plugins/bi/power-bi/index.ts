/**
 * Power BI plugin — push datasets ל-Power BI דרך REST API.
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'power-bi',
    name: 'Power BI',
    nameHe: 'Power BI',
    category: 'bi',
    version: '1.0.0',
    vendor: 'Microsoft',
    description: 'Push streaming datasets to Power BI',
    descriptionHe: 'דחיפת נתונים ל-Power BI Streaming Dataset',
    authType: 'oauth2',
    permissions: ['network:api.powerbi.com', 'secrets:read', 'storage:read', 'storage:write'],
    scopes: ['https://analysis.windows.net/powerbi/api/Dataset.ReadWrite.All'],
    configSchema: {
      workspaceId: { type: 'string', label: 'Workspace ID', labelHe: 'מזהה Workspace', required: true },
      datasetId: { type: 'string', label: 'Dataset ID', labelHe: 'מזהה Dataset', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('workspaceId', config.workspaceId);
    await ctx.storage.set('datasetId', config.datasetId);
  },

  async uninstall(ctx) {
    await ctx.storage.delete('workspaceId');
    await ctx.storage.delete('datasetId');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  actions: {
    pushRows: {
      name: 'pushRows',
      description: 'Push rows to a Power BI table',
      descriptionHe: 'דחיפת שורות לטבלת Power BI',
      async execute(ctx, params) {
        const ws = await ctx.storage.get<string>('workspaceId');
        const ds = await ctx.storage.get<string>('datasetId');
        const res = await ctx.http.request({
          method: 'POST',
          url: `https://api.powerbi.com/v1.0/myorg/groups/${ws}/datasets/${ds}/tables/${params.tableName}/rows`,
          body: { rows: params.rows },
        });
        return res.data;
      },
    },
  },
});
