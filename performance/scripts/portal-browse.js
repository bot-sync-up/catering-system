// דפדוף בפורטל - דמוי משתמש אנושי. בודק cache ratio, CDN, ISR.
// מסלולים: home -> category -> product -> search -> profile.

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { loginAsRandomUser, authHeaders } from '../common/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.co.il';

const pageLoadLatency = new Trend('portal_page_load_ms', true);
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');
const portalErrors = new Rate('portal_errors');

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 150 },
        { duration: '10m', target: 150 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    portal_page_load_ms: ['p(95)<800', 'p(99)<1500'],
    portal_errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
  tags: { test: 'portal-browse' },
};

const CATEGORIES = ['מאפים', 'משקאות', 'בשר', 'דגים', 'פסח'];
const SEARCH_TERMS = ['חלה', 'יין', 'בקר', 'דגים', 'מצות', 'שמן', 'תבלינים'];

function recordCache(res) {
  const cache = res.headers['X-Cache'] || res.headers['Cf-Cache-Status'] || res.headers['X-Vercel-Cache'];
  if (!cache) return;
  if (/hit/i.test(cache)) cacheHits.add(1);
  else if (/miss/i.test(cache)) cacheMisses.add(1);
}

export default function () {
  const anonymous = Math.random() < 0.6;
  let token = null;
  if (!anonymous) {
    const r = loginAsRandomUser(__VU);
    token = r.token;
  }
  const headers = token ? authHeaders(token) : { headers: { 'Accept-Language': 'he-IL' } };

  group('home', () => {
    const t0 = Date.now();
    const res = http.get(`${BASE_URL}/`, headers);
    pageLoadLatency.add(Date.now() - t0);
    recordCache(res);
    const ok = check(res, { 'home 200': (r) => r.status === 200 });
    if (!ok) portalErrors.add(1);
  });
  sleep(2 + Math.random() * 3);

  const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  group('category', () => {
    const t0 = Date.now();
    const res = http.get(`${BASE_URL}/category/${encodeURIComponent(cat)}`, headers);
    pageLoadLatency.add(Date.now() - t0);
    recordCache(res);
    check(res, { 'category 200': (r) => r.status === 200 });
  });
  sleep(1 + Math.random() * 3);

  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  group('search', () => {
    const t0 = Date.now();
    const res = http.get(
      `${BASE_URL}/api/search?q=${encodeURIComponent(term)}`,
      headers
    );
    pageLoadLatency.add(Date.now() - t0);
    check(res, { 'search 200': (r) => r.status === 200 });
  });
  sleep(1 + Math.random() * 2);

  group('product detail', () => {
    const t0 = Date.now();
    const res = http.get(`${BASE_URL}/products/BAKE-001`, headers);
    pageLoadLatency.add(Date.now() - t0);
    recordCache(res);
    check(res, { 'product 200': (r) => r.status === 200 });
  });
  sleep(2);

  if (token) {
    group('profile', () => {
      const res = http.get(`${BASE_URL}/api/me`, headers);
      check(res, { 'profile 200': (r) => r.status === 200 });
    });
  }
}
