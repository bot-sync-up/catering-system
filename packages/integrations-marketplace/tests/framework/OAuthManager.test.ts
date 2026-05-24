import { describe, it, expect } from 'vitest';
import { InMemoryEncryptedTokenStorage, OAuthFlow } from '../../src/framework/OAuthManager';

describe('InMemoryEncryptedTokenStorage', () => {
  it('encrypts and decrypts tokens round-trip', async () => {
    const storage = new InMemoryEncryptedTokenStorage('super-secret-key');
    const tokens = {
      accessToken: 'at_123',
      refreshToken: 'rt_456',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      tokenType: 'Bearer',
    };
    await storage.save('google:inst1', tokens);
    const loaded = await storage.load('google:inst1');
    expect(loaded?.accessToken).toBe('at_123');
    expect(loaded?.refreshToken).toBe('rt_456');
  });

  it('returns null for missing key', async () => {
    const storage = new InMemoryEncryptedTokenStorage('k');
    expect(await storage.load('missing')).toBeNull();
  });
});

describe('OAuthFlow', () => {
  it('starts a flow and returns URL with PKCE', () => {
    const providers = new Map();
    providers.set('demo', {
      id: 'demo',
      authorizeUrl: 'https://demo.example/auth',
      tokenUrl: 'https://demo.example/token',
      clientId: 'cid',
      clientSecret: 'sec',
      scopes: ['read'],
      redirectUri: 'https://app.example/cb',
      pkce: true,
    });
    const flow = new OAuthFlow(providers);
    const { url, state } = flow.start('demo', 'inst1');
    expect(state).toMatch(/^[a-f0-9]+$/);
    expect(url).toContain('code_challenge');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('rejects unknown provider', () => {
    const flow = new OAuthFlow(new Map());
    expect(() => flow.start('nope', 'inst')).toThrow();
  });
});
