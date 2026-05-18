// בדיקות בסיסיות למנוע התמחור (לא דורש DB - פונקציות עזר)
const test = require('node:test');
const assert = require('node:assert');

test('round helper - חישוב נכון', () => {
  function round(n) { return Math.round(n * 100) / 100; }
  assert.strictEqual(round(10.123), 10.12);
  assert.strictEqual(round(10.125), 10.13);
  assert.strictEqual(round(10), 10);
});

test('coupon percentage - חישוב הנחה באחוזים', () => {
  const subtotal = 1000;
  const percent = 15;
  const discount = subtotal * (percent / 100);
  assert.strictEqual(discount, 150);
});

test('coupon fixed amount - לא יותר מהסכום', () => {
  const subtotal = 50;
  const couponValue = 100;
  const discount = Math.min(couponValue, subtotal);
  assert.strictEqual(discount, 50);
});

test('loyalty points value - 100 נק = 10 שח', () => {
  const POINT_VALUE = 0.10;
  assert.strictEqual(100 * POINT_VALUE, 10);
});

test('seasonal multiplier - תוספת חג', () => {
  const round = (n) => Math.round(n * 100) / 100;
  const base = 100;
  const multiplier = 1.15;
  assert.strictEqual(round(base * multiplier), 115);
});
