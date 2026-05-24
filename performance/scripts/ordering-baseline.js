// Baseline load test - הזמנות
// Ramp 0->100 VUs over 5min, hold 10min, ramp down 5min
// SLO: p95<500ms, error<1%

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { loginAsRandomUser, authHeaders } from '../common/auth.js';
import { randomOrder, randomAddress } from '../common/data.js';

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.co.il';

const orderCreateLatency = new Trend('order_create_duration', true);
const orderListLatency = new Trend('order_list_duration', true);
const orderErrors = new Rate('order_errors');
const ordersCreated = new Counter('orders_created_total');

export const options = {
  scenarios: {
    ordering: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    order_create_duration: ['p(95)<800'],
    order_errors: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
  tags: {
    test: 'ordering-baseline',
    env: __ENV.TEST_ENV || 'staging',
  },
  summaryTrendStats: ['min', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const res = http.get(`${BASE_URL}/healthz`);
  if (res.status !== 200) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  console.log(`Starting baseline test against ${BASE_URL}`);
  return { startedAt: Date.now() };
}

export default function () {
  const { token } = loginAsRandomUser(__VU);
  if (!token) {
    orderErrors.add(1);
    return;
  }
  const headers = authHeaders(token);

  group('browse catalog', () => {
    const res = http.get(`${BASE_URL}/api/products?limit=20`, {
      ...headers,
      tags: { name: 'products_list' },
    });
    check(res, { 'products 200': (r) => r.status === 200 });
    sleep(1 + Math.random());
  });

  group('view product', () => {
    const res = http.get(`${BASE_URL}/api/products/BAKE-001`, {
      ...headers,
      tags: { name: 'product_detail' },
    });
    check(res, { 'product 200': (r) => r.status === 200 });
    sleep(0.5);
  });

  group('list my orders', () => {
    const res = http.get(`${BASE_URL}/api/orders/mine?limit=10`, {
      ...headers,
      tags: { name: 'order_list' },
    });
    orderListLatency.add(res.timings.duration);
    check(res, { 'orders list 200': (r) => r.status === 200 });
    sleep(0.5);
  });

  group('create order', () => {
    const payload = { ...randomOrder(), shipping: randomAddress() };
    const res = http.post(
      `${BASE_URL}/api/orders`,
      JSON.stringify(payload),
      { ...headers, tags: { name: 'order_create' } }
    );
    orderCreateLatency.add(res.timings.duration);
    const ok = check(res, {
      'order created 201': (r) => r.status === 201 || r.status === 200,
      'order has id': (r) => !!r.json('id'),
    });
    if (ok) {
      ordersCreated.add(1);
    } else {
      orderErrors.add(1);
    }
    sleep(1 + Math.random() * 2);
  });
}

export function handleSummary(data) {
  return {
    'reports/last-baseline-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const lines = [
    '',
    '=== Baseline ordering summary ===',
    `p95 http_req_duration: ${(m.http_req_duration.values['p(95)'] || 0).toFixed(1)}ms`,
    `p99 http_req_duration: ${(m.http_req_duration.values['p(99)'] || 0).toFixed(1)}ms`,
    `error rate: ${((m.http_req_failed.values.rate || 0) * 100).toFixed(2)}%`,
    `orders created: ${m.orders_created_total ? m.orders_created_total.values.count : 0}`,
    '',
  ];
  return lines.join('\n');
}
