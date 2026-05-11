// Tests OCR endpoint that accepts an Israeli ID card image.
import http from "k6/http";
import { check } from "k6";
import { SharedArray } from "k6/data";

const samples = new SharedArray("samples", () => {
  // Base64 placeholder images (1px) — replace with synthetic ID cards in CI.
  return ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="];
});

export const options = {
  vus: 10,
  duration: "2m",
  thresholds: {
    http_req_duration: ["p(95)<3000"],   // OCR is heavy
    http_req_failed:   ["rate<0.02"],
  },
};

const BASE = __ENV.BASE_URL || "https://staging.example.com";

export default function () {
  const img = samples[0];
  const r = http.post(`${BASE}/api/ocr/id`,
    JSON.stringify({ imageB64: img }),
    { headers: { "content-type": "application/json", authorization: `Bearer ${__ENV.TEST_TOKEN}` }, timeout: "60s" });
  check(r, { "ocr 200": (x) => x.status === 200, "has fields": (x) => !!x.json("idNumber") });
}
