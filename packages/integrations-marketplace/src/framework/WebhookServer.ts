/**
 * WebhookServer — שרת Express מרכזי לקבלת webhooks מכל הספקים.
 *
 * זרימה:
 *  1. POST /webhooks/:provider/:installationId
 *  2. SignatureVerifier בוחר verifier לפי provider ובודק HMAC
 *  3. Dispatcher מנתב לאינסטנס הפלאגין הנכון
 */

import express, { type Request, type Response, type Application } from 'express';
import { SignatureVerifier } from './SignatureVerifier';
import type { PluginRegistry } from '../core/PluginRegistry';
import type { PluginContext } from '../core/PluginContext';

export interface WebhookServerOptions {
  registry: PluginRegistry;
  ctxFactory: (installationId: string) => Promise<PluginContext>;
  port?: number;
}

export class WebhookServer {
  private app: Application;
  private verifier: SignatureVerifier;
  private dispatcher: WebhookDispatcher;

  constructor(private opts: WebhookServerOptions) {
    this.app = express();
    this.verifier = new SignatureVerifier();
    this.dispatcher = new WebhookDispatcher(opts.registry, opts.ctxFactory);

    // חובה לקרוא raw body לצורך אימות חתימה
    this.app.use('/webhooks', express.raw({ type: '*/*', limit: '5mb' }));

    this.app.post('/webhooks/:provider/:installationId', (req, res) =>
      this.handle(req, res)
    );

    this.app.get('/health', (_req, res) => res.json({ ok: true }));
  }

  private async handle(req: Request, res: Response): Promise<void> {
    const { provider, installationId } = req.params;
    const rawBody = req.body as Buffer;

    try {
      const valid = await this.verifier.verify(provider, req.headers, rawBody, installationId);
      if (!valid) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const payload = JSON.parse(rawBody.toString('utf8') || '{}');
      await this.dispatcher.dispatch(provider, installationId, payload);
      res.status(200).json({ received: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      res.status(500).json({ error: msg });
    }
  }

  listen(): void {
    const port = this.opts.port ?? 4000;
    this.app.listen(port, () => {
      // intentionally console — webhook server is a long-running daemon
      // eslint-disable-next-line no-console
      console.log(`[WebhookServer] listening on :${port}`);
    });
  }

  getApp(): Application {
    return this.app;
  }
}

/**
 * Dispatcher — מנתב webhook לפלאגין המתאים לפי installationId.
 */
export class WebhookDispatcher {
  constructor(
    private registry: PluginRegistry,
    private ctxFactory: (installationId: string) => Promise<PluginContext>
  ) {}

  async dispatch(provider: string, installationId: string, payload: unknown): Promise<void> {
    const install = this.registry.getInstallation(installationId);
    if (!install) throw new Error(`Unknown installation: ${installationId}`);
    if (install.status !== 'active') return;

    const plugin = this.registry.get(install.pluginId);
    if (!plugin?.handleWebhook) return;

    const ctx = await this.ctxFactory(installationId);
    await plugin.handleWebhook(ctx, {
      type: `${provider}.webhook`,
      payload,
      occurredAt: new Date(),
      source: provider,
    });
  }
}
