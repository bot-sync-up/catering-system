import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate } from "k6/metrics";

const paymentLatency = new Trend("payment_latency_ms");
const paymentSuccess = new Rate("payment_success_rate");

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 100,
      maxVUs: 300,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 5 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<500", "p(99)<2000"],
    payment_latency_ms: ["p(95)<1500"],
    payment_success_rate: ["rate>0.97"],
  },
};

const BASE = __ENV.BASE_URL || "https://staging.example.co.il";
const TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
  };

  group("payment flow", () => {
    // create order
    const order = http.post(
      `${BASE}/api/orders`,
      JSON.stringify({ items: [{ sku: "LOAD-TEST", qty: 1 }] }),
      { headers }
    );
    if (order.status !== 201) {
      paymentSuccess.add(false);
      return;
    }
    const orderId = order.json("id");

    // tokenize card (Tranzila test card)
    const tok = http.post(
      `${BASE}/api/payments/tokenize`,
      JSON.stringify({
        cardNumber: "4580458045804580",
        cvv: "123",
        expiry: "12/30",
      }),
      { headers }
    );
    const token = tok.json("token");

    // charge
    const t0 = Date.now();
    const charge = http.post(
      `${BASE}/api/payments/charge`,
      JSON.stringify({ orderId, token, amount: 100, currency: "ILS" }),
      { headers }
    );
    paymentLatency.add(Date.now() - t0);
    const ok = check(charge, {
      "charge 200": (x) => x.status === 200,
      "approved": (x) => x.json("status") === "approved",
    });
    paymentSuccess.add(ok);
    sleep(1);
  });
}
