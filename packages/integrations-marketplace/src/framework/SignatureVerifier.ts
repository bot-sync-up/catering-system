/**
 * SignatureVerifier — אימות חתימת HMAC לפי הספק.
 *
 * כל ספק/פרובידר מגדיר אסטרטגיה משלו (header name, אלגוריתם, formatting).
 * המחלקה רושמת אסטרטגיות built-in ומאפשרת רישום נוספות.
 */

import crypto from 'crypto';

export type SecretResolver = (provider: string, installationId: string) => Promise<string>;

export interface VerifierStrategy {
  /** שם header של החתימה */
  headerName: string;
  /** אלגוריתם hash */
  algo: 'sha256' | 'sha1' | 'sha512';
  /** קידוד פלט: hex או base64 */
  encoding: 'hex' | 'base64';
  /** prefix אופציונלי (לדוגמה: "sha256=") */
  prefix?: string;
}

const BUILTIN_STRATEGIES: Record<string, VerifierStrategy> = {
  // Cardcom — חתימה ב-header X-Cardcom-Signature
  cardcom: { headerName: 'x-cardcom-signature', algo: 'sha256', encoding: 'hex' },
  // Tranzila — sha256 base64
  tranzila: { headerName: 'x-tranzila-signature', algo: 'sha256', encoding: 'base64' },
  // PayPlus
  payplus: { headerName: 'x-payplus-signature', algo: 'sha256', encoding: 'hex' },
  // Stripe — חתימה מורכבת יותר עם t=... v1=..., כאן רק validation בסיסי
  stripe: { headerName: 'stripe-signature', algo: 'sha256', encoding: 'hex' },
  // Slack
  slack: { headerName: 'x-slack-signature', algo: 'sha256', encoding: 'hex', prefix: 'v0=' },
  // Mailchimp
  mailchimp: { headerName: 'x-mailchimp-signature', algo: 'sha256', encoding: 'hex' },
  // Google (Pub/Sub push) — JWT, יבדק בנפרד
  google: { headerName: 'authorization', algo: 'sha256', encoding: 'hex' },
  // iCount/Greeninvoice — sha256 hex
  icount: { headerName: 'x-icount-signature', algo: 'sha256', encoding: 'hex' },
  greeninvoice: { headerName: 'x-greeninvoice-signature', algo: 'sha256', encoding: 'hex' },
  rivhit: { headerName: 'x-rivhit-signature', algo: 'sha256', encoding: 'hex' },
  // HubSpot
  hubspot: { headerName: 'x-hubspot-signature-v3', algo: 'sha256', encoding: 'base64' },
  // ActiveCampaign
  activecampaign: { headerName: 'x-ac-signature', algo: 'sha256', encoding: 'hex' },
  // Facebook Lead Ads
  'facebook-lead-ads': { headerName: 'x-hub-signature-256', algo: 'sha256', encoding: 'hex', prefix: 'sha256=' },
  // Dropbox
  dropbox: { headerName: 'x-dropbox-signature', algo: 'sha256', encoding: 'hex' },
};

export class SignatureVerifier {
  private strategies = new Map<string, VerifierStrategy>();
  private resolver: SecretResolver | null = null;

  constructor() {
    for (const [k, v] of Object.entries(BUILTIN_STRATEGIES)) this.strategies.set(k, v);
  }

  registerStrategy(provider: string, strategy: VerifierStrategy): void {
    this.strategies.set(provider, strategy);
  }

  setSecretResolver(resolver: SecretResolver): void {
    this.resolver = resolver;
  }

  async verify(
    provider: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
    installationId: string
  ): Promise<boolean> {
    const strategy = this.strategies.get(provider);
    if (!strategy) {
      // ספק לא מוכר — דחייה בטוחה
      return false;
    }
    if (!this.resolver) {
      throw new Error('SignatureVerifier: no secret resolver configured');
    }

    const headerVal = headers[strategy.headerName];
    if (!headerVal) return false;
    const received = Array.isArray(headerVal) ? headerVal[0] : headerVal;

    const secret = await this.resolver(provider, installationId);
    const hmac = crypto.createHmac(strategy.algo, secret);
    hmac.update(rawBody);
    const expected = (strategy.prefix ?? '') + hmac.digest(strategy.encoding);

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  }
}
