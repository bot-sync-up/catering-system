import { randomUUID } from 'crypto';
import { IMessageSender } from './IMessageSender';
import { Channel, Message, Recipient, SendResult } from './types';
import { checkConsent } from './consent/check';
import { auditSend } from './consent/audit';
import { isWithinQuietHours } from './quiet-hours';
import { checkRateLimit } from './rate-limit';
import { trackCost } from './cost-tracker';

export interface UnifiedSenderOptions {
  /** Max retry attempts per provider before falling back. Default: 3. */
  maxRetriesPerProvider?: number;
  /** Base backoff in ms (exponential). Default: 500. */
  baseBackoffMs?: number;
  /** If true, prefer cheapest provider over priority order. Default: false. */
  optimizeForCost?: boolean;
  /** Logger; defaults to console. */
  logger?: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void };
}

/**
 * UnifiedSender — single entry point for all outbound communication.
 *
 * Responsibilities:
 *   1. Route the message to the right channel.
 *   2. Pick the preferred provider (priority OR cost).
 *   3. Fall back to next provider on retryable failures.
 *   4. Enforce consent + quiet hours + rate limits before sending.
 *   5. Emit an audit record + cost record for each accepted send.
 */
export class UnifiedSender {
  private readonly providers: Map<Channel, IMessageSender[]> = new Map();
  private readonly opts: Required<Omit<UnifiedSenderOptions, 'logger'>> & {
    logger: NonNullable<UnifiedSenderOptions['logger']>;
  };

  constructor(providers: IMessageSender[], options: UnifiedSenderOptions = {}) {
    this.opts = {
      maxRetriesPerProvider: options.maxRetriesPerProvider ?? 3,
      baseBackoffMs: options.baseBackoffMs ?? 500,
      optimizeForCost: options.optimizeForCost ?? false,
      logger: options.logger ?? console,
    };
    for (const p of providers) {
      const list = this.providers.get(p.channel) ?? [];
      list.push(p);
      this.providers.set(p.channel, list);
    }
    // Sort each channel by priority (lower = better).
    for (const list of this.providers.values()) {
      list.sort((a, b) => (a.config.priority - b.config.priority));
    }
  }

  /** Send to one or many recipients. Returns one SendResult per recipient. */
  async send(message: Message): Promise<SendResult[]> {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    return Promise.all(recipients.map((r) => this.sendOne({ ...message, to: r })));
  }

  // ------------------------------------------------------------------ //
  private async sendOne(message: Message & { to: Recipient }): Promise<SendResult> {
    const correlationId = message.idempotencyKey ?? randomUUID();
    const recipient = message.to;

    // 1) consent
    if (!message.bypassConsent) {
      const ok = await checkConsent(recipient, message.channel);
      if (!ok) {
        const result: SendResult = {
          channel: message.channel,
          provider: 'none',
          correlationId,
          status: 'skipped',
          skippedReason: 'no_consent',
        };
        await auditSend(message, result);
        return result;
      }
    }

    // 2) quiet hours (skip for critical bypass)
    if (!message.bypassQuietHours && message.priority !== 'critical') {
      if (await isWithinQuietHours(recipient)) {
        const result: SendResult = {
          channel: message.channel,
          provider: 'none',
          correlationId,
          status: 'skipped',
          skippedReason: 'quiet_hours',
        };
        await auditSend(message, result);
        return result;
      }
    }

    // 3) rate limit
    const rate = await checkRateLimit(recipient.tenantId, message.channel);
    if (!rate.allowed) {
      const result: SendResult = {
        channel: message.channel,
        provider: 'none',
        correlationId,
        status: 'skipped',
        skippedReason: 'rate_limited',
      };
      await auditSend(message, result);
      return result;
    }

    // 4) provider chain with fallback
    const chain = this.pickProviders(message.channel);
    if (chain.length === 0) {
      const result: SendResult = {
        channel: message.channel,
        provider: 'none',
        correlationId,
        status: 'failed',
        error: { code: 'no_provider', message: `No provider configured for ${message.channel}`, retryable: false },
      };
      await auditSend(message, result);
      return result;
    }

    let lastError: SendResult['error'];
    for (const provider of chain) {
      const attempt = await this.sendWithRetry(provider, message, correlationId);
      if (attempt.status === 'sent') {
        await auditSend(message, attempt);
        if (attempt.costAgorot) await trackCost(recipient.tenantId, provider.config.name, attempt.costAgorot);
        return attempt;
      }
      lastError = attempt.error;
      this.opts.logger.warn(
        `[UnifiedSender] provider=${provider.config.name} failed (retryable=${attempt.error?.retryable}). Falling back.`,
      );
      if (attempt.error && attempt.error.retryable === false) {
        // Permanent failure (bad address etc.) — no point trying fallbacks.
        break;
      }
    }

    const failed: SendResult = {
      channel: message.channel,
      provider: chain[chain.length - 1].config.name,
      correlationId,
      status: 'failed',
      error: lastError ?? { code: 'unknown', message: 'All providers failed', retryable: false },
    };
    await auditSend(message, failed);
    return failed;
  }

  private pickProviders(channel: Channel): IMessageSender[] {
    const all = (this.providers.get(channel) ?? []).filter((p) => p.config.enabled !== false);
    if (this.opts.optimizeForCost) {
      return [...all].sort(
        (a, b) => (a.config.estimatedCostAgorot ?? Infinity) - (b.config.estimatedCostAgorot ?? Infinity),
      );
    }
    return all;
  }

  private async sendWithRetry(
    provider: IMessageSender,
    message: Message,
    correlationId: string,
  ): Promise<SendResult> {
    let lastResult: SendResult | undefined;
    for (let attempt = 0; attempt < this.opts.maxRetriesPerProvider; attempt++) {
      try {
        lastResult = await provider.send(message);
      } catch (e) {
        lastResult = {
          channel: provider.channel,
          provider: provider.config.name,
          correlationId,
          status: 'failed',
          error: {
            code: 'thrown',
            message: (e as Error).message,
            retryable: true,
          },
        };
      }
      // Override correlationId to ours for consistent tracking.
      lastResult.correlationId = correlationId;

      if (lastResult.status === 'sent') return lastResult;
      if (!lastResult.error?.retryable) return lastResult;

      const backoff = this.opts.baseBackoffMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoff));
    }
    return lastResult!;
  }
}
