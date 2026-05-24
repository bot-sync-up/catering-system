// Shared helpers and thresholds for k6 scenarios.
// Targets: p95 < 500ms, error rate < 1%.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const errorRate = new Rate('errors');
export const apiLatency = new Trend('api_latency_ms', true);

export const BASE_URL = __ENV.BASE_URL || 'https://staging.example.com';
export const API_TOKEN = __ENV.API_TOKEN || '';

export const standardThresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1500'],
  http_req_failed:   ['rate<0.01'],
  errors:            ['rate<0.01'],
};

export function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(API_TOKEN ? { 'Authorization': `Bearer ${API_TOKEN}` } : {}),
    ...extra,
  };
}

export function request(method, path, body, params = {}) {
  const url = `${BASE_URL}${path}`;
  const res = http.request(method, url, body ? JSON.stringify(body) : null, {
    headers: authHeaders(),
    tags: { endpoint: path },
    ...params,
  });
  apiLatency.add(res.timings.duration);
  const ok = check(res, {
    [`${method} ${path} -> 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!ok);
  return res;
}

export function pause(min = 1, max = 3) {
  sleep(Math.random() * (max - min) + min);
}
