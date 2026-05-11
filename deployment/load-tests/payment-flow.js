import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "3m",
  thresholds: {
    http_req_duration: ["p(95)<700"],
    http_req_failed:   ["rate<0.005"],
  },
};

const BASE = __ENV.BASE_URL || "https://staging.example.com";

export default function () {
  // Pre-created sandbox order
  const orderId = `order-sandbox-${__VU}-${__ITER}`;
  const r1 = http.post(`${BASE}/api/payments/intent`,
    JSON.stringify({ orderId, amount: 12900, currency: "ILS", provider: "cardcom" }),
    { headers: { "content-type": "application/json", "x-test-mode": "1" } });
  check(r1, { "intent 200": (x) => x.status === 200 });

  const intentId = r1.json("intentId");
  const r2 = http.post(`${BASE}/api/payments/${intentId}/confirm`,
    JSON.stringify({ token: "tok_test_visa" }),
    { headers: { "content-type": "application/json", "x-test-mode": "1" } });
  check(r2, { "confirm 200": (x) => x.status === 200, "paid": (x) => x.json("status") === "paid" });

  sleep(1);
}
