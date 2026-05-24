/**
 * Environment switch — base URL & sandbox flag.
 */
import type { Environment } from './types';

export interface CardcomEnvConfig {
  environment: Environment;
  baseUrl: string;
  /** Override base URL (e.g. for local mock server). */
  baseUrlOverride?: string;
}

const PRODUCTION_BASE = 'https://secure.cardcom.solutions/api/v11';
const SANDBOX_BASE = 'https://sandbox.cardcom.solutions/api/v11';

export function resolveBaseUrl(env: Environment, override?: string): string {
  if (override) return override.replace(/\/+$/, '');
  return env === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;
}

export function buildEnvConfig(env: Environment, override?: string): CardcomEnvConfig {
  return {
    environment: env,
    baseUrl: resolveBaseUrl(env, override),
    baseUrlOverride: override,
  };
}
