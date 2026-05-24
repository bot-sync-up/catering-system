// Spike test - 0->500 VUs בקפיצה כדי לזהות נקודות שבירה ותפקוד auto-scaling.

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { loginAsRandomUser, authHeaders } from '../common/auth.js';
import { randomOrder, randomAddress } from '../common/data.js';

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.co.il';

const spikeErrors = new Rate('spike_errors');
const spikeLatency = new Trend('spike_latency', true);

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 10 },     // warmup
        { duration: '10s', target: 500 },    // spike!
        { duration: '2m', target: 500 },     // hold at peak
        { duration: '20s', target: 10 },     // back to normal
        { duration: '30s', target: 10 },     // recovery observation
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],
    spike_errors: ['rate<0.05'],
  },
  tags: { test: 'ordering-spike' },
};

export default function () {
  const { token } = loginAsRandomUser(__VU);
  if (!token) {
    spikeErrors.add(1);
    return;
  }
  const headers = authHeaders(token);

  group('hot path - create order', () => {
    const res = http.post(
      `${BASE_URL}/api/orders`,
      JSON.stringify({ ...randomOrder(2), shipping: randomAddress() }),
      { ...headers, tags: { name: 'spike_order_create' } }
    );
    spikeLatency.add(res.timings.duration);
    const ok = check(res, {
      'order under spike': (r) => r.status === 200 || r.status === 201,
    });
    if (!ok) spikeErrors.add(1);
  });
}
