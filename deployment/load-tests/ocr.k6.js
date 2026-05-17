import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { SharedArray } from "k6/data";

const ocrLatency = new Trend("ocr_latency_ms");
const ocrSuccess = new Counter("ocr_success");
const ocrFail = new Counter("ocr_fail");

// load a small set of test images once (base64-encoded sample receipts)
const samples = new SharedArray("samples", function () {
  return JSON.parse(open("./fixtures/ocr-samples.json"));
});

export const options = {
  scenarios: {
    queue_pressure: {
      executor: "constant-arrival-rate",
      rate: 10,
      timeUnit: "1s",
      duration: "5m",
      preAllocatedVUs: 50,
      maxVUs: 150,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<500"], // upload/enqueue latency
    ocr_latency_ms: ["p(95)<15000", "p(99)<30000"], // end-to-end (async)
  },
};

const BASE = __ENV.BASE_URL || "https://staging.example.co.il";
const TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  const sample = samples[Math.floor(Math.random() * samples.length)];

  const t0 = Date.now();
  const upload = http.post(
    `${BASE}/api/ocr/jobs`,
    { file: http.file(sample.bytes, sample.name, "image/jpeg") },
    { headers }
  );

  const ok = check(upload, { "upload 202": (x) => x.status === 202 });
  if (!ok) {
    ocrFail.add(1);
    return;
  }

  const jobId = upload.json("jobId");
  // poll until done (max 30s)
  let attempts = 0;
  while (attempts < 30) {
    sleep(1);
    const status = http.get(`${BASE}/api/ocr/jobs/${jobId}`, { headers });
    const state = status.json("state");
    if (state === "completed") {
      ocrLatency.add(Date.now() - t0);
      ocrSuccess.add(1);
      return;
    }
    if (state === "failed") {
      ocrFail.add(1);
      return;
    }
    attempts++;
  }
  ocrFail.add(1);
}
