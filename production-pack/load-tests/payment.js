// k6 run -e BASE_URL=... payment.js
// Targets the payment-intent path against the *sandbox* provider only.
// Never run this against real Stripe/Tranzila keys.
import { check, sleep } from 'k6';
import { request, standardThresholds } from './common.js';

export const options = {
  scenarios: {
    payment_steady: {
      executor: 'constant-arrival-rate',
      rate: 20,            // 20 requests/sec
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
    payment_spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      startTime: '5m30s',
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m',  target: 100 },
        { duration: '30s', target: 10  },
      ],
    },
  },
  thresholds: {
    ...standardThresholds,
    'http_req_duration{endpoint:/api/payments/intent}': ['p(95)<800'],
    'http_req_duration{endpoint:/api/payments/confirm}': ['p(95)<1200'],
  },
};

export default function () {
  const intent = request('POST', '/api/payments/intent', {
    amount: Math.floor(Math.random() * 9000) + 1000,  // 10 - 100 ILS in agorot
    currency: 'ILS',
    orderId: `loadtest-${__VU}-${__ITER}-${Date.now()}`,
  });
  if (intent.status !== 200) return;

  const id = intent.json('id');
  if (!id) return;

  sleep(0.5);

  const confirm = request('POST', '/api/payments/confirm', {
    paymentIntentId: id,
    paymentMethod: 'pm_card_visa_sandbox',
  });
  check(confirm, {
    'confirm settled': (r) => r.json('status') === 'succeeded' || r.json('status') === 'processing',
  });
}
