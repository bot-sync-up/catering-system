/**
 * PluginSettings — מסך הגדרות לפלאגין מותקן.
 *
 * מספק:
 *  - עריכת configSchema
 *  - הצגת health check
 *  - הצגת אירועי webhook אחרונים
 *  - הסרת התקנה
 */

import type { PluginRegistry } from '../core/PluginRegistry';
import type { PluginContext } from '../core/PluginContext';
import type { PluginHealth, PluginManifest, ConfigField } from '../core/IPlugin';

export interface PluginSettingsViewModel {
  manifest: PluginManifest;
  configFields: Array<[string, ConfigField]>;
  currentConfig: Record<string, unknown>;
  health: PluginHealth;
  installationId: string;
  organizationId: string;
}

export class PluginSettings {
  constructor(private registry: PluginRegistry) {}

  async load(installationId: string, ctx: PluginContext): Promise<PluginSettingsViewModel> {
    const install = this.registry.getInstallation(installationId);
    if (!install) throw new Error(`Installation not found: ${installationId}`);
    const plugin = this.registry.get(install.pluginId);
    if (!plugin) throw new Error(`Plugin missing: ${install.pluginId}`);

    const health = await plugin.healthCheck(ctx);

    return {
      manifest: plugin.manifest,
      configFields: Object.entries(plugin.manifest.configSchema ?? {}),
      currentConfig: install.config,
      health,
      installationId,
      organizationId: install.organizationId,
    };
  }

  async uninstall(installationId: string, ctx: PluginContext): Promise<void> {
    await this.registry.uninstall(installationId, ctx);
  }
}
