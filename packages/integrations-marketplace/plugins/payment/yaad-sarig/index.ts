/**
 * Yaad Sarig plugin — סליקה דרך יעד שריג (Hyp).
 */

import { definePlugin } from '../../../src/sdk';

export default definePlugin({
  manifest: {
    id: 'yaad-sarig',
    name: 'Yaad Sarig (Hyp)',
    nameHe: 'יעד שריג',
    category: 'payment',
    version: '1.0.0',
    vendor: 'Hyp',
    description: 'Yaad Sarig card processing (Hyp)',
    descriptionHe: 'סליקת יעד שריג',
    authType: 'api-key',
    permissions: ['network:icom.yaad.net', 'secrets:read', 'secrets:write', 'storage:read', 'storage:write'],
    configSchema: {
      masof: { type: 'string', label: 'Masof number', labelHe: 'מספר מסוף', required: true },
      passp: { type: 'secret', label: 'PassP', labelHe: 'PassP', required: true },
      keyApi: { type: 'secret', label: 'KeyAPI', labelHe: 'מפתח API', required: true },
    },
  },

  async install(ctx, config) {
    await ctx.storage.set('masof', config.masof);
    await ctx.secrets.write('passp', String(config.passp));
    await ctx.secrets.write('keyApi', String(config.keyApi));
  },

  async uninstall(ctx) {
    await ctx.storage.delete('masof');
    await ctx.secrets.write('passp', '');
    await ctx.secrets.write('keyApi', '');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },
});
