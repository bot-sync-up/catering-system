/**
 * healthCheck.ts — monitor רציף לכל ה-providers
 * עם auto-switch ל-fallback chain
 */

import { IBillingAdapter } from './adapters';
import { AdapterFactory } from './AdapterFactory';
import { Logger } from './types';

export interface HealthStatus {
  provider: string;
  healthy: boolean;
  lastChecked: string;
  lastError?: string;
  consecutiveFailures: number;
}

export interface HealthMonitorOptions {
  factory: AdapterFactory;
  intervalMs?: number;            // default 30s
  failureThreshold?: number;      // default 3 — switch after N failures
  onStatusChange?: (s: HealthStatus[]) => void;
  logger?: Logger;
}

export class HealthMonitor {
  private timer?: NodeJS.Timeout;
  private readonly statuses = new Map<string, HealthStatus>();
  private running = false;

  constructor(private readonly opts: HealthMonitorOptions) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.check();
    this.timer = setInterval(() => this.check(), this.opts.intervalMs ?? 30_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.running = false;
  }

  getStatuses(): HealthStatus[] {
    return [...this.statuses.values()];
  }

  /** הרצה ידנית של בדיקה אחת */
  async check(): Promise<HealthStatus[]> {
    const adapters = this.opts.factory.list();
    const results: HealthStatus[] = [];

    for (const a of adapters) {
      const prev = this.statuses.get(a.providerName);
      let healthy = false;
      let err: string | undefined;
      try {
        healthy = await a.isHealthy();
      } catch (e) {
        err = (e as Error).message;
      }

      const status: HealthStatus = {
        provider: a.providerName,
        healthy,
        lastChecked: new Date().toISOString(),
        lastError: err,
        consecutiveFailures: healthy ? 0 : (prev?.consecutiveFailures ?? 0) + 1,
      };
      this.statuses.set(a.providerName, status);
      results.push(status);

      if (!healthy && status.consecutiveFailures >= (this.opts.failureThreshold ?? 3)) {
        this.opts.logger?.error('[HealthMonitor] provider failing, triggering switch', {
          provider: a.providerName,
          failures: status.consecutiveFailures,
        });
      }
    }

    this.opts.onStatusChange?.(results);
    return results;
  }
}

/**
 * One-shot health check לכל ה-adapters
 */
export async function pingAll(adapters: IBillingAdapter[]): Promise<HealthStatus[]> {
  return Promise.all(
    adapters.map(async a => {
      const ts = new Date().toISOString();
      try {
        return {
          provider: a.providerName,
          healthy: await a.isHealthy(),
          lastChecked: ts,
          consecutiveFailures: 0,
        };
      } catch (e) {
        return {
          provider: a.providerName,
          healthy: false,
          lastChecked: ts,
          lastError: (e as Error).message,
          consecutiveFailures: 1,
        };
      }
    }),
  );
}
