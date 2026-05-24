/**
 * PluginRegistry — רישום מרכזי של כל הפלאגינים הזמינים במרקטפלייס.
 *
 * אחראי על:
 *  - רישום ובדיקת מניפסטים
 *  - חיפוש לפי קטגוריה/מזהה
 *  - יצירת התקנות בהקשר של ארגון מסוים
 */

import type { IPlugin, PluginCategory, PluginManifest } from './IPlugin';
import type { PluginContext } from './PluginContext';
import { PluginSandbox } from './PluginSandbox';

export interface InstallationRecord {
  installationId: string;
  organizationId: string;
  pluginId: string;
  installedAt: Date;
  config: Record<string, unknown>;
  status: 'active' | 'paused' | 'failed';
}

export class PluginRegistry {
  private plugins = new Map<string, IPlugin>();
  private installations = new Map<string, InstallationRecord>();
  private sandbox = new PluginSandbox();

  /** רישום פלאגין חדש בעת אתחול המערכת */
  register(plugin: IPlugin): void {
    this.validateManifest(plugin.manifest);
    if (this.plugins.has(plugin.manifest.id)) {
      throw new Error(`Plugin already registered: ${plugin.manifest.id}`);
    }
    this.plugins.set(plugin.manifest.id, plugin);
  }

  /** שליפת פלאגין לפי מזהה */
  get(pluginId: string): IPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /** רשימת כל הפלאגינים — אופציונלית פילטר לפי קטגוריה */
  list(category?: PluginCategory): PluginManifest[] {
    const all = Array.from(this.plugins.values()).map(p => p.manifest);
    return category ? all.filter(m => m.category === category) : all;
  }

  /** התקנת פלאגין לארגון — מריץ install בתוך sandbox */
  async install(
    pluginId: string,
    organizationId: string,
    config: Record<string, unknown>,
    ctx: PluginContext
  ): Promise<InstallationRecord> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    this.validateConfig(plugin.manifest, config);

    const installationId = `inst_${organizationId}_${pluginId}_${Date.now()}`;
    const record: InstallationRecord = {
      installationId,
      organizationId,
      pluginId,
      installedAt: new Date(),
      config,
      status: 'active',
    };

    try {
      await this.sandbox.run(plugin, () => plugin.install(ctx, config));
      this.installations.set(installationId, record);
      return record;
    } catch (err) {
      record.status = 'failed';
      throw err;
    }
  }

  /** הסרת התקנה */
  async uninstall(installationId: string, ctx: PluginContext): Promise<void> {
    const rec = this.installations.get(installationId);
    if (!rec) throw new Error(`Installation not found: ${installationId}`);
    const plugin = this.plugins.get(rec.pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${rec.pluginId}`);

    await this.sandbox.run(plugin, () => plugin.uninstall(ctx));
    this.installations.delete(installationId);
  }

  getInstallation(installationId: string): InstallationRecord | undefined {
    return this.installations.get(installationId);
  }

  listInstallations(organizationId: string): InstallationRecord[] {
    return Array.from(this.installations.values()).filter(
      r => r.organizationId === organizationId
    );
  }

  private validateManifest(m: PluginManifest): void {
    if (!m.id || !/^[a-z0-9-]+$/.test(m.id)) {
      throw new Error(`Invalid plugin id: ${m.id}`);
    }
    if (!m.version || !/^\d+\.\d+\.\d+/.test(m.version)) {
      throw new Error(`Invalid version: ${m.version}`);
    }
    if (!m.permissions) {
      throw new Error(`Plugin ${m.id} must declare permissions array`);
    }
  }

  private validateConfig(m: PluginManifest, config: Record<string, unknown>): void {
    if (!m.configSchema) return;
    for (const [key, field] of Object.entries(m.configSchema)) {
      if (field.required && config[key] == null) {
        throw new Error(`Missing required config field: ${key} for plugin ${m.id}`);
      }
    }
  }
}
