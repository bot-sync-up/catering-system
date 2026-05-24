// k6 run -e BASE_URL=https://staging.example.com -e API_TOKEN=... ordering.js
import { check } from 'k6';
import { request, pause, standardThresholds } from './common.js';

export const options = {
  scenarios: {
    browse_then_order: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 50 },   // warm-up
        { duration: '3m',  target: 200 },  // steady
        { duration: '2m',  target: 500 },  // peak
        { duration: '2m',  target: 200 },  // cool
        { duration: '1m',  target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: standardThresholds,
};

export default function () {
  // 1. Homepage
  request('GET', '/');
  pause();

  // 2. Browse catalog
  const list = request('GET', '/api/products?limit=20&page=1');
  let productId;
  if (list.status === 200) {
    const items = list.json('items');
    if (Array.isArray(items) && items.length > 0) {
      productId = items[Math.floor(Math.random() * items.length)].id;
    }
  }
  pause();

  if (!productId) return;

  // 3. Product detail
  request('GET', `/api/products/${productId}`);
  pause();

  // 4. Add to cart
  const cart = request('POST', '/api/cart/items', { productId, quantity: 1 });
  check(cart, { 'cart 200/201': (r) => r.status === 200 || r.status === 201 });
  pause();

  // 5. Checkout (no payment in load test; assert it routes to payment intent)
  const checkout = request('POST', '/api/checkout', {
    shippingAddress: { city: 'תל אביב', street: 'דיזנגוף 1', zip: '6100000' },
    paymentMethod: 'card_simulator',
  });
  check(checkout, { 'checkout returns intent': (r) => r.json('paymentIntentId') != null });
  pause(2, 5);
}
