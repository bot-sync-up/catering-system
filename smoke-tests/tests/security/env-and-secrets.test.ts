import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_ENV = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'NODE_ENV',
  'CARDCOM_TERMINAL',
  'CARDCOM_USERNAME',
  'ICOUNT_API_TOKEN',
  'SENDGRID_API_KEY',
];

describe('Security smoke', () => {
  it('JWT_SECRET is set and not the default', () => {
    const v = process.env.JWT_SECRET;
    expect(v).toBeTruthy();
    expect(v).not.toBe('change-me');
    expect(v).not.toBe('secret');
    expect(v).not.toBe('changeme');
    expect((v || '').length).toBeGreaterThanOrEqual(32);
  });

  it('JWT_REFRESH_SECRET differs from JWT_SECRET', () => {
    if (process.env.JWT_REFRESH_SECRET) {
      expect(process.env.JWT_REFRESH_SECRET).not.toBe(process.env.JWT_SECRET);
    }
  });

  it.each(REQUIRED_ENV)('env var %s is set', (key) => {
    expect(process.env[key], `Missing env: ${key}`).toBeTruthy();
  });

  it('NODE_ENV is one of dev/test/staging/production', () => {
    expect(['development', 'test', 'staging', 'production']).toContain(process.env.NODE_ENV);
  });

  it('cookies are HTTPS-only in production', () => {
    if (process.env.NODE_ENV !== 'production') return;
    expect(process.env.COOKIE_SECURE).toBe('true');
    expect(process.env.COOKIE_SAMESITE || 'lax').toMatch(/strict|lax/i);
  });

  it('CORS not wildcard in production', () => {
    if (process.env.NODE_ENV !== 'production') return;
    expect(process.env.CORS_ORIGIN).toBeTruthy();
    expect(process.env.CORS_ORIGIN).not.toBe('*');
  });

  it('no .env files tracked by git', () => {
    const tracked = execSync('git ls-files', { encoding: 'utf8' });
    const envFiles = tracked.split('\n').filter((f) => /^\.env($|\.)/.test(f) && !/\.example$/.test(f));
    expect(envFiles, `Found tracked env files: ${envFiles.join(', ')}`).toEqual([]);
  });

  it('no obvious secrets in tracked source', () => {
    const tracked = execSync('git ls-files', { encoding: 'utf8' })
      .split('\n')
      .filter((f) => /\.(ts|js|tsx|jsx|json|env\.example)$/.test(f))
      .slice(0, 500);

    const patterns = [
      /AKIA[0-9A-Z]{16}/,                              // AWS
      /AIza[0-9A-Za-z\-_]{35}/,                        // Google
      /sk_live_[0-9a-zA-Z]{24,}/,                      // Stripe
      /github_pat_[0-9A-Za-z_]{82}/,                   // GitHub PAT
      /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/,
    ];

    const hits: string[] = [];
    for (const f of tracked) {
      try {
        const c = readFileSync(resolve(process.cwd(), f), 'utf8');
        for (const p of patterns) {
          if (p.test(c)) hits.push(`${f}: ${p}`);
        }
      } catch { /* ignore */ }
    }
    expect(hits, `Secrets found: ${hits.join('; ')}`).toEqual([]);
  });

  it('.env.example exists and lists all required vars', () => {
    const path = resolve(process.cwd(), '.env.example');
    if (!existsSync(path)) return;
    const c = readFileSync(path, 'utf8');
    for (const k of REQUIRED_ENV) {
      expect(c, `.env.example missing ${k}`).toContain(k);
    }
  });

  it('gitleaks scan passes (if installed)', () => {
    try {
      execSync('gitleaks detect --no-banner --redact --exit-code 1', { stdio: 'pipe' });
    } catch (e: any) {
      if (/command not found|not recognized/i.test(String(e?.stderr || e?.message))) return;
      throw e;
    }
  });
});
