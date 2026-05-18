/**
 * AdapterFactory — בונה שרשרת fallback של adapters
 *
 * Default order:
 *   iCount  ->  GreenInvoice  ->  Rivhit  ->  Mock
 *
 * השרשרת בודקת health פעם בכל N שניות.
 * מבצעת auto-switch אם הספק הראשי נופל.
 */

import {
  IBillingAdapter,
  IcountAdapter,
  GreenInvoiceAdapter,
  GreenInvoiceCredentials,
  RivhitAdapter,
  RivhitCredentials,
  MockAdapter,
} from './adapters';
import { IcountClient } from './IcountClient';
import { Logger } from './types';

export interface AdapterFactoryConfig {
  icount?: { client: IcountClient };
  greeninvoice?: GreenInvoiceCredentials;
  rivhit?: RivhitCredentials;
  enableMockFallback?: boolean; // default true
  healthCheckIntervalMs?: number; // default 60_000
  logger?: Logger;
}

export interface AdapterCallOptions {
  preferProvider?: 'icount' | 'greeninvoice' | 'rivhit' | 'mock';
}

export class AdapterFactory {
  private readonly adapters: IBillingAdapter[] = [];
  private readonly healthCache = new Map<string, { healthy: boolean; ts: number }>();
  private readonly healthTtl: number;
  private readonly logger?: Logger;

  constructor(private readonly cfg: AdapterFactoryConfig) {
    this.logger = cfg.logger;
    this.healthTtl = cfg.healthCheckIntervalMs ?? 60_000;

    if (cfg.icount) this.adapters.push(new IcountAdapter(cfg.icount.client));
    if (cfg.greeninvoice) this.adapters.push(new GreenInvoiceAdapter(cfg.greeninvoice));
    if (cfg.rivhit) this.adapters.push(new RivhitAdapter(cfg.rivhit));
    if (cfg.enableMockFallback !== false) this.adapters.push(new MockAdapter());

    if (this.adapters.length === 0) {
      throw new Error('AdapterFactory: at least one adapter must be configured');
    }
  }

  /**
   * מחזיר את ה-adapter הראשון שזמין
   */
  async getActive(opts?: AdapterCallOptions): Promise<IBillingAdapter> {
    // Preferred first
    if (opts?.preferProvider) {
      const preferred = this.adapters.find(a => a.providerName === opts.preferProvider);
      if (preferred && (await this.isHealthy(preferred))) {
        return preferred;
      }
    }

    for (const a of this.adapters) {
      if (await this.isHealthy(a)) {
        this.logger?.debug('[AdapterFactory] using', { provider: a.providerName });
        return a;
      }
      this.logger?.warn('[AdapterFactory] unhealthy, trying next', { provider: a.providerName });
    }

    throw new Error('No healthy billing adapter available');
  }

  /**
   * הרצת פעולה עם fallback אוטומטי
   */
  async execute<T>(
    fn: (a: IBillingAdapter) => Promise<T>,
    opts?: AdapterCallOptions,
  ): Promise<{ result: T; provider: string }> {
    const errors: Array<{ provider: string; error: string }> = [];

    const ordered = opts?.preferProvider
      ? [
          ...this.adapters.filter(a => a.providerName === opts.preferProvider),
          ...this.adapters.filter(a => a.providerName !== opts.preferProvider),
        ]
      : this.adapters;

    for (const a of ordered) {
      try {
        if (!(await this.isHealthy(a))) {
          errors.push({ provider: a.providerName, error: 'unhealthy' });
          continue;
        }
        const result = await fn(a);
        return { result, provider: a.providerName };
      } catch (e) {
        const err = (e as Error).message;
        errors.push({ provider: a.providerName, error: err });
        this.invalidateHealth(a);
        this.logger?.error('[AdapterFactory] call failed, falling back', {
          provider: a.providerName, error: err,
        });
      }
    }

    throw new Error(
      `All adapters failed: ${errors.map(e => `${e.provider}=${e.error}`).join(', ')}`,
    );
  }

  private async isHealthy(a: IBillingAdapter): Promise<boolean> {
    const cached = this.healthCache.get(a.providerName);
    const now = Date.now();
    if (cached && now - cached.ts < this.healthTtl) {
      return cached.healthy;
    }
    let healthy = false;
    try {
      healthy = await a.isHealthy();
    } catch {
      healthy = false;
    }
    this.healthCache.set(a.providerName, { healthy, ts: now });
    return healthy;
  }

  private invalidateHealth(a: IBillingAdapter): void {
    this.healthCache.set(a.providerName, { healthy: false, ts: Date.now() });
  }

  /** רשימת כל ה-adapters שזמינים */
  list(): IBillingAdapter[] {
    return [...this.adapters];
  }
}
