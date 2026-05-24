/**
 * InstallFlow — אורקסטרציה של תהליך התקנת פלאגין מצד ה-UI.
 *
 * שלבים:
 *  1. הצגת תקציר הרשאות (consent)
 *  2. איסוף configSchema מהמשתמש
 *  3. אם authType === 'oauth2' — הפניה ל-OAuth provider
 *  4. קריאה ל-PluginRegistry.install
 */

import type { PluginManifest, ConfigField } from '../core/IPlugin';
import type { PluginRegistry } from '../core/PluginRegistry';
import type { PluginContext } from '../core/PluginContext';
import type { OAuthManager } from '../framework/OAuthManager';

export interface InstallFlowStep {
  step: 'consent' | 'config' | 'oauth' | 'finalize' | 'done';
  manifest: PluginManifest;
  /** ב-step=config — שדות שנדרשים מהמשתמש */
  configFields?: Array<[string, ConfigField]>;
  /** ב-step=oauth — URL להפניה */
  oauthUrl?: string;
  /** ב-step=done — מזהה התקנה */
  installationId?: string;
}

export class InstallFlow {
  constructor(
    private registry: PluginRegistry,
    private oauth: OAuthManager | null = null
  ) {}

  /** התחלת flow — מחזיר step ראשון של consent */
  begin(pluginId: string): InstallFlowStep {
    const plugin = this.registry.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);
    return { step: 'consent', manifest: plugin.manifest };
  }

  /** המשך אחרי consent — מחזיר step איסוף config */
  afterConsent(pluginId: string): InstallFlowStep {
    const plugin = this.registry.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);
    const fields = Object.entries(plugin.manifest.configSchema ?? {});
    return { step: 'config', manifest: plugin.manifest, configFields: fields };
  }

  /** אם הפלאגין הוא OAuth — מחזיר URL להפניה */
  startOAuth(pluginId: string, installationId: string): InstallFlowStep {
    const plugin = this.registry.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);
    if (plugin.manifest.authType !== 'oauth2') {
      throw new Error('Plugin does not use OAuth2');
    }
    if (!this.oauth) throw new Error('OAuthManager not configured');
    const { url } = this.oauth.flow.start(pluginId, installationId);
    return { step: 'oauth', manifest: plugin.manifest, oauthUrl: url };
  }

  /** סיום התקנה */
  async finalize(
    pluginId: string,
    organizationId: string,
    config: Record<string, unknown>,
    ctx: PluginContext
  ): Promise<InstallFlowStep> {
    const plugin = this.registry.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);
    const rec = await this.registry.install(pluginId, organizationId, config, ctx);
    return {
      step: 'done',
      manifest: plugin.manifest,
      installationId: rec.installationId,
    };
  }
}
