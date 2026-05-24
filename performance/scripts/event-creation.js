// יצירת אירוע גדול - חתונה 700+ מוזמנים, 10+ אדמינים, תזמון פעולות בו-זמני.
// בודק bulk inserts, fanout notifications, real-time updates.

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { loginAsRandomUser, authHeaders } from '../common/auth.js';
import { randomEvent, randomPerson } from '../common/data.js';

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.co.il';

const eventCreateLatency = new Trend('event_create_ms', true);
const guestsBulkLatency = new Trend('guests_bulk_ms', true);
const adminAddLatency = new Trend('admin_add_ms', true);
const eventsCreated = new Counter('events_created_total');
const eventErrors = new Rate('event_errors');

export const options = {
  scenarios: {
    create_events: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 },
        { duration: '8m', target: 20 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    event_create_ms: ['p(95)<1500'],
    guests_bulk_ms: ['p(95)<5000'],
    admin_add_ms: ['p(95)<800'],
    event_errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
  tags: { test: 'event-creation' },
};

export default function () {
  const { token } = loginAsRandomUser(__VU);
  if (!token) {
    eventErrors.add(1);
    return;
  }
  const headers = authHeaders(token);
  const event = randomEvent();
  let eventId;

  // 1. צור אירוע
  group('create event', () => {
    const t0 = Date.now();
    const res = http.post(
      `${BASE_URL}/api/events`,
      JSON.stringify({
        type: event.type,
        date: event.date,
        hall: event.hallName,
        address: event.address,
        host: event.host,
      }),
      { ...headers, tags: { name: 'event_create' } }
    );
    eventCreateLatency.add(Date.now() - t0);
    const ok = check(res, {
      'event 201': (r) => r.status === 201 || r.status === 200,
      'event id': (r) => !!r.json('id'),
    });
    if (!ok) {
      eventErrors.add(1);
      return;
    }
    eventId = res.json('id');
    eventsCreated.add(1);
  });

  if (!eventId) return;

  // 2. הוסף 700 מוזמנים ב-bulk (chunks של 100)
  group('bulk add guests', () => {
    const allGuests = [];
    for (let i = 0; i < event.guestCount; i++) {
      const p = randomPerson();
      allGuests.push({
        name: p.fullName,
        phone: p.phone,
        seats: Math.random() < 0.7 ? 2 : 4,
        side: Math.random() < 0.5 ? 'חתן' : 'כלה',
      });
    }

    const t0 = Date.now();
    const chunkSize = 100;
    for (let i = 0; i < allGuests.length; i += chunkSize) {
      const chunk = allGuests.slice(i, i + chunkSize);
      const res = http.post(
        `${BASE_URL}/api/events/${eventId}/guests/bulk`,
        JSON.stringify({ guests: chunk }),
        { ...headers, tags: { name: 'guests_bulk' } }
      );
      check(res, { 'guests chunk 200': (r) => r.status === 200 || r.status === 201 });
    }
    guestsBulkLatency.add(Date.now() - t0);
  });

  // 3. הוסף 10 אדמינים
  group('add admins', () => {
    for (let i = 0; i < event.adminCount; i++) {
      const admin = randomPerson();
      const t0 = Date.now();
      const res = http.post(
        `${BASE_URL}/api/events/${eventId}/admins`,
        JSON.stringify({ phone: admin.phone, name: admin.fullName, role: 'manager' }),
        { ...headers, tags: { name: 'admin_add' } }
      );
      adminAddLatency.add(Date.now() - t0);
      check(res, { 'admin added': (r) => r.status === 200 || r.status === 201 });
    }
  });

  // 4. שלח הזמנות (fanout)
  group('trigger invites', () => {
    const res = http.post(
      `${BASE_URL}/api/events/${eventId}/invites/send`,
      JSON.stringify({ channel: 'sms', template: 'wedding-default' }),
      { ...headers, tags: { name: 'invites_send' } }
    );
    check(res, { 'invites queued': (r) => r.status === 202 || r.status === 200 });
  });

  // 5. קריאת dashboard (כאדמין)
  group('admin dashboard', () => {
    const res = http.get(
      `${BASE_URL}/api/events/${eventId}/dashboard`,
      { ...headers, tags: { name: 'event_dashboard' } }
    );
    check(res, {
      'dashboard 200': (r) => r.status === 200,
      'has stats': (r) => typeof r.json('totalGuests') === 'number',
    });
  });

  sleep(2);
}
