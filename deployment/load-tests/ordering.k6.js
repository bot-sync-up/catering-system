import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Counter } from "k6/metrics";

const orderLatency = new Trend("order_latency_ms");
const orderErrors = new Counter("order_errors");

export const options = {
  scenarios: {
    steady: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "5m", target: 200 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    order_latency_ms: ["p(95)<800"],
  },
};

const BASE = __ENV.BASE_URL || "https://staging.example.co.il";
const TOKEN = __ENV.AUTH_TOKEN || "";

export function setup() {
  const res = http.post(`${BASE}/api/auth/login`, JSON.stringify({
    email: __ENV.TEST_EMAIL,
    password: __ENV.TEST_PASSWORD,
  }), { headers: { "Content-Type": "application/json" } });
  return { token: res.json("token") || TOKEN };
}

export default function (data) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.token}`,
  };

  group("browse catalog", () => {
    const r = http.get(`${BASE}/api/products?limit=20`, { headers });
    check(r, { "catalog 200": (x) => x.status === 200 });
    sleep(1);
  });

  group("create order", () => {
    const t0 = Date.now();
    const r = http.post(
      `${BASE}/api/orders`,
      JSON.stringify({
        items: [
          { sku: "TEST-001", qty: 2 },
          { sku: "TEST-002", qty: 1 },
        ],
        shipping: { city: "ירושלים", street: "יפו 1" },
      }),
      { headers }
    );
    orderLatency.add(Date.now() - t0);
    const ok = check(r, {
      "order 201": (x) => x.status === 201,
      "has id": (x) => !!x.json("id"),
    });
    if (!ok) orderErrors.add(1);
    sleep(2);
  });
}
