/**
 * בדיקות גנריות לכל הפלאגינים — ולידציית מניפסט וזרימת
 * install/uninstall/healthCheck תחת mockContext.
 *
 * כל פלאגין מקבל קונפיג מינימלי תקין שמתאים ל-configSchema שלו.
 */

import { describe, it, expect } from 'vitest';
import type { IPlugin } from '../../src/core/IPlugin';
import { mockContext } from '../helpers/mockContext';

import googleCalendar from '../../plugins/calendar/google-calendar';
import outlook from '../../plugins/calendar/outlook';
import apple from '../../plugins/calendar/apple';

import icount from '../../plugins/accounting/icount';
import greeninvoice from '../../plugins/accounting/greeninvoice';
import rivhit from '../../plugins/accounting/rivhit';
import hashavshevet from '../../plugins/accounting/hashavshevet';
import abm from '../../plugins/accounting/abm';

import cardcom from '../../plugins/payment/cardcom';
import tranzila from '../../plugins/payment/tranzila';
import payplus from '../../plugins/payment/payplus';
import yaadSarig from '../../plugins/payment/yaad-sarig';
import grow from '../../plugins/payment/grow';
import stripe from '../../plugins/payment/stripe';

import powerBi from '../../plugins/bi/power-bi';
import googleSheets from '../../plugins/bi/google-sheets';
import excelExport from '../../plugins/bi/excel-export';
import lookerStudio from '../../plugins/bi/looker-studio';

import mailchimp from '../../plugins/marketing/mailchimp';
import activecampaign from '../../plugins/marketing/activecampaign';
import hubspot from '../../plugins/marketing/hubspot';
import fbLeadAds from '../../plugins/marketing/facebook-lead-ads';
import googleAdsConv from '../../plugins/marketing/google-ads-conversion';

import wazeBusiness from '../../plugins/operations/waze-business';
import wolt from '../../plugins/operations/wolt-for-business';
import cibus from '../../plugins/operations/cibus';
import teneo from '../../plugins/operations/teneo';
import peppermint from '../../plugins/operations/peppermint';

import slack from '../../plugins/communication/slack';
import teams from '../../plugins/communication/teams';
import discord from '../../plugins/communication/discord';

import dropbox from '../../plugins/storage/dropbox';
import googleDrive from '../../plugins/storage/google-drive';
import onedrive from '../../plugins/storage/onedrive';

type PluginCase = { plugin: IPlugin; config: Record<string, unknown> };

const cases: PluginCase[] = [
  { plugin: googleCalendar, config: { calendarId: 'primary', syncDirection: 'two-way' } },
  { plugin: outlook, config: { mailbox: 'me' } },
  { plugin: apple, config: { feedName: 'My Feed' } },

  { plugin: icount, config: { companyId: 'c1', apiToken: 't', defaultVat: 17 } },
  { plugin: greeninvoice, config: { apiKeyId: 'k', apiKeySecret: 's' } },
  { plugin: rivhit, config: { apiToken: 't' } },
  { plugin: hashavshevet, config: { exchangeMode: 'csv-upload' } },
  { plugin: abm, config: { format: 'xlsx' } },

  { plugin: cardcom, config: { terminalNumber: '1000', apiName: 'a', apiPassword: 'p' } },
  { plugin: tranzila, config: { supplier: 'sup', apiKey: 'k' } },
  { plugin: payplus, config: { apiKey: 'k', secretKey: 's', paymentPageUid: 'uid' } },
  { plugin: yaadSarig, config: { masof: '0010', passp: 'p', keyApi: 'k' } },
  { plugin: grow, config: { userId: 'u', pageCode: 'p', apiKey: 'k' } },
  { plugin: stripe, config: { secretKey: 'sk_test', publishableKey: 'pk_test' } },

  { plugin: powerBi, config: { workspaceId: 'w', datasetId: 'd' } },
  { plugin: googleSheets, config: { spreadsheetId: 's' } },
  { plugin: excelExport, config: {} },
  { plugin: lookerStudio, config: { connectorId: 'c', apiKey: 'k' } },

  { plugin: mailchimp, config: { apiKey: 'k-us1', audienceId: 'a' } },
  { plugin: activecampaign, config: { apiUrl: 'https://ac.example', apiKey: 'k' } },
  { plugin: hubspot, config: {} },
  { plugin: fbLeadAds, config: { pageId: 'p' } },
  { plugin: googleAdsConv, config: { customerId: 'c', conversionActionId: 'a' } },

  { plugin: wazeBusiness, config: { partnerId: 'p', apiKey: 'k' } },
  { plugin: wolt, config: { merchantId: 'm', apiKey: 'k' } },
  { plugin: cibus, config: { employerId: 'e', apiKey: 'k' } },
  { plugin: teneo, config: { engineUrl: 'https://e', apiKey: 'k' } },
  { plugin: peppermint, config: { baseUrl: 'https://p', apiKey: 'k' } },

  { plugin: slack, config: { defaultChannel: '#general' } },
  { plugin: teams, config: {} },
  { plugin: discord, config: { botToken: 't', guildId: 'g' } },

  { plugin: dropbox, config: { rootFolder: '/' } },
  { plugin: googleDrive, config: { rootFolderId: 'root' } },
  { plugin: onedrive, config: {} },
];

describe('All plugins: manifest sanity', () => {
  for (const { plugin } of cases) {
    it(`[${plugin.manifest.id}] has valid manifest`, () => {
      const m = plugin.manifest;
      expect(m.id).toMatch(/^[a-z0-9-]+$/);
      expect(m.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(m.name).toBeTruthy();
      expect(m.nameHe).toBeTruthy();
      expect(m.descriptionHe).toBeTruthy();
      expect(Array.isArray(m.permissions)).toBe(true);
      expect([
        'calendar', 'accounting', 'payment', 'bi',
        'marketing', 'operations', 'communication', 'storage',
      ]).toContain(m.category);
    });
  }
});

describe('All plugins: install/uninstall/healthCheck', () => {
  for (const { plugin, config } of cases) {
    it(`[${plugin.manifest.id}] full lifecycle`, async () => {
      const ctx = mockContext();
      await plugin.install(ctx, config);
      const health = await plugin.healthCheck(ctx);
      expect(['ok', 'degraded', 'down']).toContain(health.status);
      expect(health.checkedAt).toBeInstanceOf(Date);
      await plugin.uninstall(ctx);
    });
  }
});
