import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { SignatureVerifier } from '../../src/framework/SignatureVerifier';

describe('SignatureVerifier', () => {
  it('verifies a valid cardcom signature', async () => {
    const ver = new SignatureVerifier();
    ver.setSecretResolver(async () => 'shared-secret');
    const body = Buffer.from(JSON.stringify({ amount: 100 }));
    const expected = crypto.createHmac('sha256', 'shared-secret').update(body).digest('hex');
    const ok = await ver.verify(
      'cardcom',
      { 'x-cardcom-signature': expected },
      body,
      'inst1'
    );
    expect(ok).toBe(true);
  });

  it('rejects invalid signature', async () => {
    const ver = new SignatureVerifier();
    ver.setSecretResolver(async () => 'shared-secret');
    const body = Buffer.from('{}');
    const ok = await ver.verify(
      'cardcom',
      { 'x-cardcom-signature': 'a'.repeat(64) },
      body,
      'inst1'
    );
    expect(ok).toBe(false);
  });

  it('rejects unknown provider', async () => {
    const ver = new SignatureVerifier();
    ver.setSecretResolver(async () => 'x');
    const ok = await ver.verify('mystery-provider', {}, Buffer.from(''), 'i');
    expect(ok).toBe(false);
  });

  it('verifies slack with v0= prefix', async () => {
    const ver = new SignatureVerifier();
    ver.setSecretResolver(async () => 'slack-secret');
    const body = Buffer.from('payload=test');
    const expected = 'v0=' + crypto.createHmac('sha256', 'slack-secret').update(body).digest('hex');
    const ok = await ver.verify('slack', { 'x-slack-signature': expected }, body, 'inst1');
    expect(ok).toBe(true);
  });
});
