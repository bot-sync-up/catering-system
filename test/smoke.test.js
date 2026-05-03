// בדיקת עשן - וידוא שהמודולים נטענים והפונקציות הבסיסיות עובדות
'use strict';

const test = require('node:test');
const assert = require('node:assert');

test('geo: haversine - מרחק תל אביב-ירושלים ~55 ק"מ', () => {
  const { haversineKm } = require('../src/services/geo');
  const tlv = { lat: 32.0853, lng: 34.7818 };
  const jer = { lat: 31.7683, lng: 35.2137 };
  const d = haversineKm(tlv.lat, tlv.lng, jer.lat, jer.lng);
  assert.ok(d > 50 && d < 60, `מרחק לא הגיוני: ${d}`);
});

test('geo: ETA - חישוב הגיוני', () => {
  const { estimateETA } = require('../src/services/geo');
  const eta = estimateETA(40, 40); // 40 ק"מ ב-40 קמ"ש = שעה
  const diffMin = (eta.getTime() - Date.now()) / 60000;
  assert.ok(diffMin > 55 && diffMin < 65);
});

test('geo: isInsideCircle', () => {
  const { isInsideCircle } = require('../src/services/geo');
  assert.strictEqual(isInsideCircle(32.0853, 34.7818, 32.0853, 34.7818, 100), true);
  assert.strictEqual(isInsideCircle(31.7683, 35.2137, 32.0853, 34.7818, 1000), false);
});

test('geo: planRouteNearestNeighbor', () => {
  const { planRouteNearestNeighbor } = require('../src/services/geo');
  const start = { lat: 32.08, lng: 34.78 };
  const stops = [
    { id: 'a', lat: 32.5, lng: 35.0 },
    { id: 'b', lat: 32.1, lng: 34.8 },
    { id: 'c', lat: 32.3, lng: 34.9 },
  ];
  const r = planRouteNearestNeighbor(start, stops);
  assert.strictEqual(r.stops.length, 3);
  assert.strictEqual(r.stops[0].id, 'b'); // הכי קרוב
  assert.ok(r.total_distance_km > 0);
});

test('geo: Waze ו-Google Maps links', () => {
  const { buildWazeLink, buildGoogleMapsLink } = require('../src/services/geo');
  assert.match(buildWazeLink(32.08, 34.78), /waze\.com.*32\.08/);
  assert.match(buildGoogleMapsLink(32.08, 34.78), /google\.com\/maps.*32\.08/);
});

test('notifications: normalize Israeli phone', () => {
  const { normalizeIsraeliPhone } = require('../src/services/notifications');
  assert.strictEqual(normalizeIsraeliPhone('0501234567'), '+972501234567');
  assert.strictEqual(normalizeIsraeliPhone('972501234567'), '+972501234567');
  assert.strictEqual(normalizeIsraeliPhone('+972501234567'), '+972501234567');
});

test('schema נטען ויוצר טבלאות', () => {
  const db = require('../src/db/schema');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const names = tables.map(t => t.name);
  for (const t of ['vehicles','drivers','deliveries','delivery_proofs','tracking_events','driver_invoices','invoice_items','geofences']) {
    assert.ok(names.includes(t), `חסרה טבלה: ${t}`);
  }
});

test('flow מלא: יצירת רכב, נהג, משלוח, שיבוץ, מעבר סטטוסים, תיעוד', () => {
  const db = require('../src/db/schema');
  const { v4: uuidv4 } = require('uuid');
  const { findBestDriver, assignDriver } = require('../src/services/assignment');

  // נקה
  db.exec('DELETE FROM delivery_proofs; DELETE FROM tracking_events; DELETE FROM deliveries; DELETE FROM drivers; DELETE FROM vehicles;');

  // רכב
  const vId = uuidv4();
  db.prepare(`INSERT INTO vehicles (id, license_plate, capacity_kg, current_lat, current_lng, status)
    VALUES (?, ?, ?, ?, ?, 'available')`).run(vId, 'TEST-1', 1000, 32.08, 34.78);

  // נהג פנימי
  const dId = uuidv4();
  db.prepare(`INSERT INTO drivers (id, full_name, phone, driver_type, current_vehicle_id, status, rating)
    VALUES (?, ?, ?, ?, ?, 'active', 5)`).run(dId, 'נהג בדיקה', '0501111111', 'internal', vId);

  // משלוח
  const delId = uuidv4();
  db.prepare(`INSERT INTO deliveries (
    id, order_number, customer_name, customer_phone,
    pickup_address, pickup_lat, pickup_lng,
    delivery_address, delivery_lat, delivery_lng,
    weight_kg
  ) VALUES (?,?,?,?, ?,?,?, ?,?,?, ?)`).run(
    delId, 'TEST-ORD-1', 'לקוח בדיקה', '0509999999',
    'רחוב 1 ת"א', 32.08, 34.78,
    'רחוב 2 ת"א', 32.10, 34.80,
    50
  );

  // המלצה
  const recs = findBestDriver(delId);
  assert.ok(recs.length > 0, 'אמורים להיות נהגים מומלצים');
  assert.strictEqual(recs[0].driver_id, dId);

  // שיבוץ
  const assigned = assignDriver(delId, dId);
  assert.strictEqual(assigned.status, 'assigned');
  assert.strictEqual(assigned.driver_id, dId);

  // מעבר סטטוסים ידני
  db.prepare("UPDATE deliveries SET status = 'en_route' WHERE id = ?").run(delId);
  db.prepare("UPDATE deliveries SET status = 'arrived' WHERE id = ?").run(delId);
  db.prepare("UPDATE deliveries SET status = 'delivered' WHERE id = ?").run(delId);

  // תיעוד
  const proofId = uuidv4();
  db.prepare(`INSERT INTO delivery_proofs (id, delivery_id, recipient_name, gps_lat, gps_lng)
    VALUES (?,?,?,?,?)`).run(proofId, delId, 'מקבל בדיקה', 32.10, 34.80);

  const proof = db.prepare('SELECT * FROM delivery_proofs WHERE id = ?').get(proofId);
  assert.strictEqual(proof.recipient_name, 'מקבל בדיקה');
});

test('geofencing: זיהוי enter event', () => {
  const db = require('../src/db/schema');
  const { v4: uuidv4 } = require('uuid');
  const { checkGeofences } = require('../src/services/geofencing');

  db.exec('DELETE FROM geofences;');
  const fId = uuidv4();
  db.prepare(`INSERT INTO geofences (id, name, type, center_lat, center_lng, radius_meters, active)
    VALUES (?,?,?,?,?,?,1)`).run(fId, 'אזור בדיקה', 'circle', 32.08, 34.78, 500);

  // קריאה ראשונה - בחוץ
  const ev1 = checkGeofences({ entity_id: 'test-entity', lat: 33.0, lng: 35.0 });
  assert.strictEqual(ev1.length, 0);

  // קריאה שנייה - בפנים -> enter
  const ev2 = checkGeofences({ entity_id: 'test-entity', lat: 32.08, lng: 34.78 });
  assert.strictEqual(ev2.length, 1);
  assert.strictEqual(ev2[0].event_type, 'geofence_enter');

  // קריאה שלישית - עדיין בפנים -> אין אירוע
  const ev3 = checkGeofences({ entity_id: 'test-entity', lat: 32.08, lng: 34.78 });
  assert.strictEqual(ev3.length, 0);

  // קריאה רביעית - בחוץ -> exit
  const ev4 = checkGeofences({ entity_id: 'test-entity', lat: 33.0, lng: 35.0 });
  assert.strictEqual(ev4.length, 1);
  assert.strictEqual(ev4[0].event_type, 'geofence_exit');
});
