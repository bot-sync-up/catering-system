/**
 * Apple Calendar plugin — ייצוא ליומן אפל באמצעות iCal (.ics).
 *
 * אפל לא חושפת API ציבורי ליומן — לכן הפלאגין מייצא feed של ICS
 * שהמשתמש מנוי אליו ב-iOS / macOS.
 */

import { definePlugin } from '../../../src/sdk';
import type { PluginContext } from '../../../src/core/PluginContext';

export default definePlugin({
  manifest: {
    id: 'apple',
    name: 'Apple Calendar (iCal)',
    nameHe: 'יומן אפל (iCal)',
    category: 'calendar',
    version: '1.0.0',
    vendor: 'Apple',
    description: 'Export events as iCal feed for Apple Calendar subscription',
    descriptionHe: 'ייצוא אירועים כפיד iCal למנוי ביומן אפל',
    authType: 'none',
    permissions: ['storage:read', 'storage:write'],
    configSchema: {
      feedName: {
        type: 'string',
        label: 'Feed name',
        labelHe: 'שם הפיד',
        required: true,
        default: 'Sync Up Calendar',
      },
    },
  },

  async install(ctx, config) {
    const feedId = `feed_${ctx.installationId}`;
    await ctx.storage.set('feedId', feedId);
    await ctx.storage.set('feedName', config.feedName);
    ctx.logger.info('Apple iCal feed created', { feedId });
  },

  async uninstall(ctx) {
    await ctx.storage.delete('feedId');
    await ctx.storage.delete('feedName');
  },

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  actions: {
    getFeedUrl: {
      name: 'getFeedUrl',
      description: 'Get the ICS feed URL',
      descriptionHe: 'קבלת כתובת פיד ה-ICS',
      async execute(ctx) {
        const feedId = await ctx.storage.get<string>('feedId');
        return { url: `https://api.syncup.co.il/ical/${feedId}.ics` };
      },
    },
  },
});
