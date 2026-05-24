/**
 * OAuthManager — ניהול זרימת OAuth2 לפלאגינים שדורשים זאת.
 *
 * רכיבים:
 *  - OAuthFlow: PKCE, state, code exchange
 *  - TokenStorage: שמירה מוצפנת של access/refresh tokens
 *  - AutoRefresher: רענון אוטומטי לפי expires_at
 */

import crypto from 'crypto';
import axios from 'axios';

export interface OAuthProvider {
  id: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
  /** האם הספק תומך ב-PKCE */
  pkce?: boolean;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope?: string;
  tokenType: string;
  raw?: Record<string, unknown>;
}

export interface EncryptedTokenStorage {
  save(key: string, tokens: OAuthTokens): Promise<void>;
  load(key: string): Promise<OAuthTokens | null>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory storage עם הצפנת AES-256-GCM.
 * בפרודקשן יוחלף ב-storage עם מסד נתונים.
 */
export class InMemoryEncryptedTokenStorage implements EncryptedTokenStorage {
  private store = new Map<string, string>();
  private key: Buffer;

  constructor(encryptionKey: string) {
    this.key = crypto.createHash('sha256').update(encryptionKey).digest();
  }

  async save(key: string, tokens: OAuthTokens): Promise<void> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const json = JSON.stringify(tokens);
    const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    this.store.set(key, [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':'));
  }

  async load(key: string): Promise<OAuthTokens | null> {
    const raw = this.store.get(key);
    if (!raw) return null;
    const [ivHex, tagHex, encHex] = raw.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
    const parsed = JSON.parse(dec.toString('utf8'));
    parsed.expiresAt = new Date(parsed.expiresAt);
    return parsed;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

interface PendingState {
  providerId: string;
  installationId: string;
  codeVerifier?: string;
  createdAt: Date;
}

export class OAuthFlow {
  private pending = new Map<string, PendingState>();

  constructor(private providers: Map<string, OAuthProvider>) {}

  /** התחלת flow — מחזיר URL להפניית המשתמש */
  start(providerId: string, installationId: string): { url: string; state: string } {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Unknown OAuth provider: ${providerId}`);

    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      scope: provider.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    const pending: PendingState = { providerId, installationId, createdAt: new Date() };

    if (provider.pkce) {
      const verifier = crypto.randomBytes(32).toString('base64url');
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
      params.set('code_challenge', challenge);
      params.set('code_challenge_method', 'S256');
      pending.codeVerifier = verifier;
    }

    this.pending.set(state, pending);
    return { url: `${provider.authorizeUrl}?${params.toString()}`, state };
  }

  /** השלמת flow אחרי שהמשתמש חזר עם code */
  async complete(state: string, code: string): Promise<{ installationId: string; tokens: OAuthTokens }> {
    const pending = this.pending.get(state);
    if (!pending) throw new Error('Invalid or expired state');
    this.pending.delete(state);

    const provider = this.providers.get(pending.providerId);
    if (!provider) throw new Error(`Unknown provider: ${pending.providerId}`);

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: provider.redirectUri,
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
    };
    if (pending.codeVerifier) body.code_verifier = pending.codeVerifier;

    const { data } = await axios.post(provider.tokenUrl, new URLSearchParams(body).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      scope: data.scope,
      tokenType: data.token_type ?? 'Bearer',
      raw: data,
    };

    return { installationId: pending.installationId, tokens };
  }
}

/**
 * AutoRefresher — מאחורי הקלעים מרענן tokens שמתקרבים לפקיעה.
 */
export class AutoRefresher {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private storage: EncryptedTokenStorage,
    private providers: Map<string, OAuthProvider>,
    private bufferMs = 5 * 60 * 1000
  ) {}

  start(intervalMs = 60_000): void {
    this.timer = setInterval(() => this.tick().catch(() => undefined), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** רענון יחיד לפי key (providerId:installationId) */
  async refresh(key: string): Promise<OAuthTokens | null> {
    const tokens = await this.storage.load(key);
    if (!tokens?.refreshToken) return null;
    const [providerId] = key.split(':');
    const provider = this.providers.get(providerId);
    if (!provider) return null;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
    });

    const { data } = await axios.post(provider.tokenUrl, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const fresh: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      tokenType: data.token_type ?? 'Bearer',
      scope: data.scope ?? tokens.scope,
      raw: data,
    };
    await this.storage.save(key, fresh);
    return fresh;
  }

  private async tick(): Promise<void> {
    // placeholder — בפרודקשן ניגש למסד נתונים ונסרוק tokens קרובים לפקיעה
  }
}

/**
 * Facade ראשי שמרכז את הכל.
 */
export class OAuthManager {
  public flow: OAuthFlow;
  public refresher: AutoRefresher;
  private providersMap: Map<string, OAuthProvider>;

  constructor(public storage: EncryptedTokenStorage, providers: OAuthProvider[]) {
    this.providersMap = new Map(providers.map(p => [p.id, p]));
    this.flow = new OAuthFlow(this.providersMap);
    this.refresher = new AutoRefresher(storage, this.providersMap);
  }

  /** קבלת token תקף — מרענן אוטומטית אם פג */
  async getValidToken(providerId: string, installationId: string): Promise<string> {
    const key = `${providerId}:${installationId}`;
    let tokens = await this.storage.load(key);
    if (!tokens) throw new Error('No tokens stored');
    if (tokens.expiresAt.getTime() - Date.now() < 30_000) {
      tokens = await this.refresher.refresh(key);
      if (!tokens) throw new Error('Refresh failed');
    }
    return tokens.accessToken;
  }
}
