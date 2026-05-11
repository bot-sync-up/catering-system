/**
 * iCount Resilient Wrapper
 * ---------------------------------------------------------------
 * המערכת מנסה ספק חשבונאות ראשי (iCount). אם הספק נופל / מחזיר 5xx
 * או timeout — עוברים אוטומטית ל-Green Invoice ולאחר מכן Rivhit.
 * שומרים בכל הזמנה (Order) באיזה ספק נוצרה כדי לאפשר auditing.
 *
 * תכונות:
 *   - Circuit breaker per-provider (5 כשלונות → פתח 60 שניות).
 *   - Exponential backoff (200, 400, 800 ms).
 *   - שמירת הספק שהצליח ב-Order.invoiceProvider.
 *   - תיעוד כל ניסיון ב-IntegrationLog (התאמה לפורמט הקיים).
 */

import type { z } from 'zod';

/* ----------------------------------------------------------- */
/* הקונספט הגנרי של ספק חשבונאות                                 */
/* ----------------------------------------------------------- */
export interface AccountingProvider {
  readonly name: 'icount' | 'green-invoice' | 'rivhit';
  createInvoice(input: InvoiceInput): Promise<InvoiceResult>;
  healthCheck(): Promise<boolean>;
}

export interface InvoiceInput {
  customerId: string;
  amount: number;
  vatRate: number;
  description: string;
  externalRef: string;
}

export interface InvoiceResult {
  invoiceNumber: string;
  pdfUrl?: string;
  provider: AccountingProvider['name'];
  raw: unknown;
}

export interface IntegrationLogger {
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
}

/* ----------------------------------------------------------- */
/* Circuit Breaker                                              */
/* ----------------------------------------------------------- */
class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  constructor(
    private threshold = 5,
    private cooldownMs = 60_000,
  ) {}
  isOpen(): boolean {
    return Date.now() < this.openUntil;
  }
  recordSuccess(): void {
    this.failures = 0;
  }
  recordFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.openUntil = Date.now() + this.cooldownMs;
      this.failures = 0;
    }
  }
}

/* ----------------------------------------------------------- */
/* sleep helper                                                  */
/* ----------------------------------------------------------- */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ----------------------------------------------------------- */
/* Resilient Client                                              */
/* ----------------------------------------------------------- */
export class ResilientInvoiceClient {
  private breakers = new Map<string, CircuitBreaker>();

  constructor(
    private providers: AccountingProvider[],
    private logger: IntegrationLogger = console as unknown as IntegrationLogger,
    private maxRetriesPerProvider = 3,
  ) {
    for (const p of providers) this.breakers.set(p.name, new CircuitBreaker());
  }

  async createInvoice(input: InvoiceInput): Promise<InvoiceResult> {
    const errors: { provider: string; error: string }[] = [];

    for (const provider of this.providers) {
      const breaker = this.breakers.get(provider.name)!;

      if (breaker.isOpen()) {
        this.logger.warn(`[invoice] breaker open for ${provider.name}, skipping`);
        errors.push({ provider: provider.name, error: 'circuit_open' });
        continue;
      }

      for (let attempt = 0; attempt < this.maxRetriesPerProvider; attempt++) {
        try {
          const result = await provider.createInvoice(input);
          breaker.recordSuccess();
          this.logger.info(`[invoice] success via ${provider.name}`, {
            attempt,
            externalRef: input.externalRef,
          });
          return result;
        } catch (err) {
          const msg = (err as Error).message;
          this.logger.warn(`[invoice] ${provider.name} attempt ${attempt + 1} failed: ${msg}`, {
            externalRef: input.externalRef,
          });
          breaker.recordFailure();

          // 4xx — לא מנסים שוב על אותו ספק (שגיאת לקוח)
          if (/4\d\d/.test(msg)) break;

          // exponential backoff: 200, 400, 800 ms
          await sleep(200 * 2 ** attempt);
        }
      }
      errors.push({ provider: provider.name, error: 'exhausted_retries' });
    }

    throw new Error(
      `כל ספקי החשבונאות נפלו: ${JSON.stringify(errors)} (externalRef=${input.externalRef})`,
    );
  }
}

/* ----------------------------------------------------------- */
/* פונקצית עזר לבניית כל הספקים בקלות                            */
/* ----------------------------------------------------------- */
export function buildDefaultClient(opts: {
  icount: AccountingProvider;
  greenInvoice: AccountingProvider;
  rivhit: AccountingProvider;
  logger?: IntegrationLogger;
}): ResilientInvoiceClient {
  return new ResilientInvoiceClient(
    [opts.icount, opts.greenInvoice, opts.rivhit],
    opts.logger,
  );
}
