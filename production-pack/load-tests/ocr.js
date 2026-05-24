// k6 run -e BASE_URL=... -e OCR_PDF_PATH=./sample.pdf ocr.js
// Uploads a PDF, polls for the OCR result.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { request, BASE_URL, authHeaders, errorRate, apiLatency, standardThresholds } from './common.js';

const PDF = open(__ENV.OCR_PDF_PATH || './sample.pdf', 'b');

export const options = {
  scenarios: {
    ocr_async: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
    },
  },
  thresholds: {
    ...standardThresholds,
    // OCR is async, so endpoint latency is short; success rate is what matters
    'http_req_duration{endpoint:/api/ocr/upload}': ['p(95)<2000'],
  },
};

export default function () {
  const url = `${BASE_URL}/api/ocr/upload`;
  const headers = authHeaders();
  delete headers['Content-Type']; // multipart sets its own boundary

  const upload = http.post(url, {
    file: http.file(PDF, `loadtest-${__VU}-${__ITER}.pdf`, 'application/pdf'),
  }, { headers, tags: { endpoint: '/api/ocr/upload' } });
  apiLatency.add(upload.timings.duration);
  const okUp = check(upload, { 'upload 202': (r) => r.status === 202 });
  errorRate.add(!okUp);
  if (!okUp) return;

  const jobId = upload.json('jobId');
  if (!jobId) return;

  // Poll up to 60s
  let status = 'pending';
  for (let i = 0; i < 30; i++) {
    sleep(2);
    const r = request('GET', `/api/ocr/${jobId}`);
    if (r.status !== 200) break;
    status = r.json('status');
    if (status === 'done' || status === 'failed') break;
  }
  check({ status }, { 'ocr completed': (s) => s.status === 'done' });
}
