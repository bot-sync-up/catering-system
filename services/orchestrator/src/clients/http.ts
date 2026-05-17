import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { config } from '../lib/config';
import { logger } from '../lib/logger';

/**
 * Thin axios factory.
 * In USE_MOCKS=true mode the underlying URLs are unreachable; each client wraps
 * its own try/catch and returns deterministic mock payloads. Tests can swap clients via DI.
 */
export function makeClient(baseURL: string, opts: AxiosRequestConfig = {}): AxiosInstance {
  const inst = axios.create({
    baseURL,
    timeout: 8000,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  inst.interceptors.response.use(
    (r) => r,
    (err) => {
      logger.warn({ url: err.config?.url, code: err.code, msg: err.message }, 'http client error');
      return Promise.reject(err);
    },
  );
  return inst;
}

export const useMocks = (): boolean => config.useMocks;
