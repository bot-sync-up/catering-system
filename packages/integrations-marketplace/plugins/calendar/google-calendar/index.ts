/**
 * Google Calendar plugin — סנכרון אירועים דו-כיווני עם Google Calendar דרך OAuth2.
 */

import { definePlugin } from '../../../src/sdk';
import type { PluginContext } from '../../../src/core/PluginContext';

export default definePlugin({
  manifest: {
    id: 'google-calendar',
    name: 'Google Calendar',
    nameHe: 'גוגל קלנדר',
    category: 'calendar',
    version: '1.0.0',
    vendor: 'Google',
    description: 'Two-way sync with Google Calendar via OAuth2',
    descriptionHe: 'סנכרון דו-כיווני עם גוגל קלנדר באמצעות OAuth2',
    authType: 'oauth2',
    requiresWebhook: true,
    permissions: ['network:googleapis.com', 'storage:read', 'storage:write', 'secrets:read'],
    scopes: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    configSchema: {
      calendarId: {
        type: 'string',
        label: 'Calendar ID',
        labelHe: 'מזהה יומן',
        required: false,
        default: 'primary',
      },
      syncDirection: {
        type: 'select',
        label: 'Sync direction',
        labelHe: 'כיוון סנכרון',
        required: true,
        default: 'two-way',
        options: [
          { value: 'two-way', label: 'Two-way', labelHe: 'דו-כיווני' },
          { value: 'push', label: 'Push only', labelHe: 'דחיפה בלבד' },
          { value: 'pull', label: 'Pull only', labelHe: 'משיכה בלבד' },
        ],
      },
    },
  },

  async install(ctx: PluginContext, config) {
    ctx.logger.info('Installing google-calendar', { org: ctx.organizationId });
    await ctx.storage.set('calendarId', config.calendarId ?? 'primary');
    await ctx.storage.set('syncDirection', config.syncDirection ?? 'two-way');
    // הרשמה ל-watch channel של גוגל מתבצעת לאחר השלמת OAuth
  },

  async uninstall(ctx: PluginContext) {
    const channelId = await ctx.storage.get<string>('channelId');
    if (channelId) {
      ctx.logger.info('Stopping Google watch channel', { channelId });
    }
    await ctx.storage.delete('calendarId');
    await ctx.storage.delete('syncDirection');
  },

  async healthCheck(ctx: PluginContext) {
    const started = Date.now();
    try {
      const res = await ctx.http.request({
        method: 'GET',
        url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        timeoutMs: 5000,
      });
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

  async handleWebhook(ctx: PluginContext, event) {
    ctx.logger.info('Google Calendar push notification', { type: event.type });
    // משיכת השינויים מאז ה-syncToken האחרון
    await ctx.events.emit('calendar.changed', event.payload);
  },

  actions: {
    createEvent: {
      name: 'createEvent',
      description: 'Create a new calendar event',
      descriptionHe: 'יצירת אירוע יומן חדש',
      async execute(ctx, params) {
        const calendarId = (await ctx.storage.get<string>('calendarId')) ?? 'primary';
        const res = await ctx.http.request({
          method: 'POST',
          url: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          body: params,
        });
        return res.data;
      },
    },
  },
});
