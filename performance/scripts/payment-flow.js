// Payment flow - Cardcom integration ב-50 RPS קבוע.
// בודק את כל המסלול: create-token -> charge -> webhook ack.

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { loginAsRandomUser, authHeaders } from '../common/auth.js';
import { randomPayment, randomOrder } from '../common/data.js';

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.co.il';
const CARDCOM_SANDBOX = __ENV.CARDCOM_SANDBOX === '1';

const tokenizeLatency = new Trend('cardcom_tokenize_ms', true);
const chargeLatency = new Trend('cardcom_charge_ms', true);
const paymentSuccess = new Counter('payment_success_total');
const paymentFailed = new Rate('payment_failed_rate');

export const options = {
  scenarios: {
    steady_50rps: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 150,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<4000'],
    cardcom_charge_ms: ['p(95)<2500'],
    payment_failed_rate: ['rate<0.005'],
    http_req_failed: ['rate<0.005'],
  },
  tags: { test: 'payment-flow' },
};

export default function () {
  const { token, user } = loginAsRandomUser(__VU);
  if (!token) return;
  const headers = authHeaders(token);

  // 1. צור הזמנה
  let orderId;
  group('create pending order', () => {
    const order = randomOrder(3);
    const res = http.post(
      `${BASE_URL}/api/orders`,
      JSON.stringify({ ...order, status: 'pending' }),
      { ...headers, tags: { name: 'pay_order_create' } }
    );
    check(res, { 'order created': (r) => r.status === 201 || r.status === 200 });
    orderId = res.json('id');
  });

  if (!orderId) {
    paymentFailed.add(1);
    return;
  }

  // 2. טוקניזציה של כרטיס
  let cardToken;
  group('tokenize card', () => {
    const payment = randomPayment();
    const t0 = Date.now();
    const res = http.post(
      `${BASE_URL}/api/payments/tokenize`,
      JSON.stringify({ card: payment.card, sandbox: CARDCOM_SANDBOX }),
      { ...headers, tags: { name: 'pay_tokenize' } }
    );
    tokenizeLatency.add(Date.now() - t0);
    check(res, {
      'tokenize 200': (r) => r.status === 200,
      'has token': (r) => !!r.json('token'),
    });
    cardToken = res.json('token');
  });

  if (!cardToken) {
    paymentFailed.add(1);
    return;
  }

  // 3. חיוב
  let txId;
  group('charge', () => {
    const t0 = Date.now();
    const res = http.post(
      `${BASE_URL}/api/payments/charge`,
      JSON.stringify({
        orderId,
        cardToken,
        installments: 1,
      }),
      { ...headers, tags: { name: 'pay_charge' } }
    );
    chargeLatency.add(Date.now() - t0);
    const ok = check(res, {
      'charge 200': (r) => r.status === 200,
      'charge approved': (r) => r.json('status') === 'approved' || r.json('approved') === true,
    });
    if (ok) {
      paymentSuccess.add(1);
      txId = res.json('transactionId') || res.json('txId');
    } else {
      paymentFailed.add(1);
    }
  });

  // 4. אישור webhook (סימולציה - בסביבת בדיקות הוא יישלח מהפרובידר)
  if (txId && Math.random() < 0.3) {
    group('verify status', () => {
      sleep(0.5);
      const res = http.get(
        `${BASE_URL}/api/payments/${txId}`,
        { ...headers, tags: { name: 'pay_verify' } }
      );
      check(res, { 'verify 200': (r) => r.status === 200 });
    });
  }
}
