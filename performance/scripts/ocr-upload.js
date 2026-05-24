// OCR upload - multipart upload + polling עד שהעיבוד מסתיים.
// SLO: p95<15s כולל זמן עיבוד.

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { loginAsRandomUser, authHeaders } from '../common/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.co.il';
const SAMPLE_PDF = open(__ENV.OCR_SAMPLE || './fixtures/sample-invoice.pdf', 'b');

const uploadLatency = new Trend('ocr_upload_ms', true);
const totalLatency = new Trend('ocr_e2e_ms', true);
const ocrTimeout = new Rate('ocr_timeout_rate');
const ocrDone = new Counter('ocr_done_total');

export const options = {
  scenarios: {
    ocr: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '8m', target: 20 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    ocr_upload_ms: ['p(95)<3000'],
    ocr_e2e_ms: ['p(95)<15000', 'p(99)<25000'],
    ocr_timeout_rate: ['rate<0.02'],
    http_req_failed: ['rate<0.02'],
  },
  tags: { test: 'ocr-upload' },
};

export default function () {
  const { token } = loginAsRandomUser(__VU);
  if (!token) return;

  const start = Date.now();
  let jobId;

  group('upload document', () => {
    const t0 = Date.now();
    const res = http.post(
      `${BASE_URL}/api/ocr/upload`,
      {
        file: http.file(SAMPLE_PDF, 'invoice.pdf', 'application/pdf'),
        language: 'heb',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        tags: { name: 'ocr_upload' },
        timeout: '60s',
      }
    );
    uploadLatency.add(Date.now() - t0);
    check(res, {
      'upload accepted': (r) => r.status === 202 || r.status === 200,
      'has jobId': (r) => !!r.json('jobId'),
    });
    jobId = res.json('jobId');
  });

  if (!jobId) return;

  // Poll עד 30 שניות
  const headers = authHeaders(token);
  const deadline = Date.now() + 30000;
  let done = false;

  while (Date.now() < deadline && !done) {
    sleep(1);
    const res = http.get(
      `${BASE_URL}/api/ocr/jobs/${jobId}`,
      { ...headers, tags: { name: 'ocr_poll' } }
    );
    if (res.status !== 200) continue;
    const status = res.json('status');
    if (status === 'done' || status === 'completed') {
      done = true;
      const took = Date.now() - start;
      totalLatency.add(took);
      ocrDone.add(1);
      check(res, {
        'ocr has text': (r) => {
          const text = r.json('text') || r.json('result.text');
          return text && text.length > 10;
        },
      });
    } else if (status === 'failed' || status === 'error') {
      break;
    }
  }

  if (!done) {
    ocrTimeout.add(1);
  }
}
