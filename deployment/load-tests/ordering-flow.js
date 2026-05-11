// k6 — end-to-end ordering flow.
// Run: k6 run -e BASE_URL=https://staging.example.com ordering-flow.js
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const placeOrderRT = new Trend("rt_place_order", true);
const e2eErr = new Rate("errors");

export const options = {
  scenarios: {
    constant_load: {
      executor: "constant-arrival-rate",
      rate: 30, timeUnit: "1s", duration: "5m",
      preAllocatedVUs: 50, maxVUs: 200,
    },
    spike: {
      executor: "ramping-arrival-rate",
      startTime: "5m",
      startRate: 30, timeUnit: "1s",
      stages: [
        { duration: "30s", target: 200 },
        { duration: "1m",  target: 200 },
        { duration: "30s", target: 30  },
      ],
      preAllocatedVUs: 100, maxVUs: 500,
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    http_req_failed:   ["rate<0.01"],
    errors:            ["rate<0.01"],
    rt_place_order:    ["p(95)<800"],
  },
};

const BASE = __ENV.BASE_URL || "https://staging.example.com";

function rand(n) { return Math.floor(Math.random() * n); }

export default function () {
  let token, cartId, orderId;

  group("login (guest)", () => {
    const r = http.post(`${BASE}/api/auth/guest`, JSON.stringify({ deviceId: `k6-${__VU}-${__ITER}` }),
      { headers: { "content-type": "application/json" } });
    check(r, { "guest 200": (x) => x.status === 200 }) || e2eErr.add(1);
    token = r.json("token");
  });

  const H = { headers: { authorization: `Bearer ${token}`, "content-type": "application/json" } };

  group("browse menu", () => {
    const r = http.get(`${BASE}/api/menu?merchantId=demo`, H);
    check(r, { "menu 200": (x) => x.status === 200, "items > 5": (x) => x.json("items").length > 5 }) || e2eErr.add(1);
  });

  group("create cart", () => {
    const r = http.post(`${BASE}/api/cart`, JSON.stringify({ merchantId: "demo" }), H);
    cartId = r.json("id");
    check(r, { "cart 201": (x) => x.status === 201 }) || e2eErr.add(1);
  });

  group("add 3 items", () => {
    for (let i = 0; i < 3; i++) {
      const r = http.post(`${BASE}/api/cart/${cartId}/items`,
        JSON.stringify({ productId: `p${rand(20)}`, qty: 1 + rand(2) }), H);
      check(r, { "add 200": (x) => x.status === 200 }) || e2eErr.add(1);
    }
  });

  group("place order", () => {
    const t0 = Date.now();
    const r = http.post(`${BASE}/api/orders`,
      JSON.stringify({ cartId, paymentMethod: "card_token_test", deliveryAddress: { city: "TLV", street: "1" } }), H);
    placeOrderRT.add(Date.now() - t0);
    orderId = r.json("id");
    check(r, { "order 201": (x) => x.status === 201 }) || e2eErr.add(1);
  });

  group("poll status", () => {
    const r = http.get(`${BASE}/api/orders/${orderId}`, H);
    check(r, { "status 200": (x) => x.status === 200 }) || e2eErr.add(1);
  });

  sleep(1 + Math.random() * 2);
}
