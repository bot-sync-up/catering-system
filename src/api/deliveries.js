// API: משלוחים - יצירה, עדכון סטטוס, תיעוד מסירה
'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('../db/schema');
const { estimateETA, haversineKm, buildWazeLink, buildGoogleMapsLink } = require('../services/geo');
const { checkGeofences } = require('../services/geofencing');
const {
  sendETANotification,
  sendArrivalNotification,
  sendDeliveredNotification,
} = require('../services/notifications');

const router = express.Router();

// תיקיית העלאות
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `proof_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const VALID_TRANSITIONS = {
  pending:   ['assigned', 'cancelled'],
  assigned:  ['en_route', 'cancelled'],
  en_route:  ['arrived', 'failed'],
  arrived:   ['delivered', 'failed'],
  delivered: [],
  failed:    [],
  cancelled: [],
};

// רשימת משלוחים
router.get('/', (req, res) => {
  const { status, driver_id, limit = 100 } = req.query;
  let sql = `
    SELECT d.*, dr.full_name as driver_name, dr.phone as driver_phone,
           v.license_plate as vehicle_plate
    FROM deliveries d
    LEFT JOIN drivers dr ON d.driver_id = dr.id
    LEFT JOIN vehicles v ON d.vehicle_id = v.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { sql += ' AND d.status = ?'; params.push(status); }
  if (driver_id) { sql += ' AND d.driver_id = ?'; params.push(driver_id); }
  sql += ' ORDER BY d.created_at DESC LIMIT ?';
  params.push(Number(limit));
  const rows = db.prepare(sql).all(...params);
  res.json({ ok: true, data: rows, count: rows.length });
});

// משלוח בודד
router.get('/:id', (req, res) => {
  const delivery = db.prepare(`
    SELECT d.*, dr.full_name as driver_name, dr.phone as driver_phone, dr.driver_type,
           v.license_plate as vehicle_plate, v.make as vehicle_make, v.model as vehicle_model
    FROM deliveries d
    LEFT JOIN drivers dr ON d.driver_id = dr.id
    LEFT JOIN vehicles v ON d.vehicle_id = v.id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!delivery) return res.status(404).json({ ok: false, error: 'משלוח לא נמצא' });

  const proof = db.prepare('SELECT * FROM delivery_proofs WHERE delivery_id = ?').get(req.params.id);
  const events = db.prepare(`
    SELECT * FROM tracking_events WHERE delivery_id = ?
    ORDER BY timestamp ASC
  `).all(req.params.id);

  // קישורי ניווט
  let nav = null;
  if (delivery.delivery_lat != null && delivery.delivery_lng != null) {
    nav = {
      waze: buildWazeLink(delivery.delivery_lat, delivery.delivery_lng),
      google_maps: buildGoogleMapsLink(delivery.delivery_lat, delivery.delivery_lng),
    };
  }

  res.json({ ok: true, data: { ...delivery, proof, tracking_events: events, navigation: nav } });
});

// יצירת משלוח חדש
router.post('/', (req, res) => {
  const b = req.body;
  const required = ['customer_name', 'customer_phone', 'pickup_address', 'delivery_address'];
  for (const f of required) {
    if (!b[f]) return res.status(400).json({ ok: false, error: `שדה חובה חסר: ${f}` });
  }

  const id = uuidv4();
  const orderNumber = b.order_number || `ORD-${Date.now()}`;

  try {
    db.prepare(`
      INSERT INTO deliveries (
        id, order_number, customer_name, customer_phone, customer_email,
        pickup_address, pickup_lat, pickup_lng, pickup_contact, pickup_notes,
        delivery_address, delivery_lat, delivery_lng, delivery_notes,
        weight_kg, volume, packages_count, declared_value, payment_on_delivery,
        scheduled_pickup_at, scheduled_delivery_at, priority, status
      ) VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?,?,?, ?,?,?,?,?, ?,?,?, 'pending')
    `).run(
      id, orderNumber, b.customer_name, b.customer_phone, b.customer_email || null,
      b.pickup_address, b.pickup_lat || null, b.pickup_lng || null, b.pickup_contact || null, b.pickup_notes || null,
      b.delivery_address, b.delivery_lat || null, b.delivery_lng || null, b.delivery_notes || null,
      b.weight_kg || 0, b.volume || 0, b.packages_count || 1, b.declared_value || 0, b.payment_on_delivery || 0,
      b.scheduled_pickup_at || null, b.scheduled_delivery_at || null, b.priority || 3
    );
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }

  const created = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id);
  res.status(201).json({ ok: true, data: created });
});

// עדכון סטטוס - מאמת מעבר חוקי, מטפל בתופעות לוואי (notifications)
router.put('/:id/status', async (req, res) => {
  const { status, lat, lng } = req.body;
  const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
  if (!delivery) return res.status(404).json({ ok: false, error: 'משלוח לא נמצא' });

  const allowed = VALID_TRANSITIONS[delivery.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      ok: false,
      error: `מעבר סטטוס לא חוקי: ${delivery.status} -> ${status}. מותר: ${allowed.join(', ') || 'ללא'}`,
    });
  }

  db.prepare(`
    UPDATE deliveries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, req.params.id);

  db.prepare(`
    INSERT INTO tracking_events (delivery_id, event_type, status, lat, lng)
    VALUES (?, 'status_change', ?, ?, ?)
  `).run(req.params.id, status, lat || null, lng || null);

  // תופעות לוואי
  try {
    if (status === 'en_route' && delivery.delivery_lat && lat && lng) {
      const distKm = haversineKm(lat, lng, delivery.delivery_lat, delivery.delivery_lng);
      const eta = estimateETA(distKm);
      db.prepare('UPDATE deliveries SET eta = ? WHERE id = ?').run(eta.toISOString(), req.params.id);
      sendETANotification(delivery, eta).catch(() => {});
    } else if (status === 'arrived') {
      sendArrivalNotification(delivery).catch(() => {});
    } else if (status === 'delivered') {
      sendDeliveredNotification(delivery).catch(() => {});
      // עדכון מונה משלוחים של נהג
      if (delivery.driver_id) {
        db.prepare('UPDATE drivers SET total_deliveries = total_deliveries + 1 WHERE id = ?')
          .run(delivery.driver_id);
      }
    }
  } catch (e) {
    console.error('[notification error]', e.message);
  }

  res.json({ ok: true, data: db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id) });
});

// עדכון מיקום של משלוח (ממכשיר נהג) - מפעיל גיאופנסינג
router.post('/:id/location', (req, res) => {
  const { lat, lng, accuracy } = req.body;
  if (lat == null || lng == null) {
    return res.status(400).json({ ok: false, error: 'lat ו-lng חובה' });
  }
  const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
  if (!delivery) return res.status(404).json({ ok: false, error: 'משלוח לא נמצא' });

  db.prepare(`
    INSERT INTO tracking_events (delivery_id, event_type, lat, lng, metadata)
    VALUES (?, 'location_update', ?, ?, ?)
  `).run(req.params.id, lat, lng, JSON.stringify({ accuracy }));

  // עדכון מיקום הרכב
  if (delivery.vehicle_id) {
    db.prepare(`
      UPDATE vehicles SET current_lat = ?, current_lng = ?,
        last_location_update = CURRENT_TIMESTAMP WHERE id = ?
    `).run(lat, lng, delivery.vehicle_id);
  }

  // הוק גיאופנסינג
  const geoEvents = checkGeofences({
    entity_type: 'vehicle',
    entity_id: delivery.vehicle_id || delivery.driver_id,
    delivery_id: req.params.id,
    lat, lng,
  });

  res.json({ ok: true, geofence_events: geoEvents });
});

// תיעוד מסירה - חתימה (base64) + תמונה (multipart) + GPS
router.post('/:id/proof', upload.single('photo'), (req, res) => {
  const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
  if (!delivery) return res.status(404).json({ ok: false, error: 'משלוח לא נמצא' });

  const {
    signature_data,
    recipient_name,
    recipient_id_number,
    gps_lat,
    gps_lng,
    gps_accuracy,
    notes,
  } = req.body;

  const proofId = uuidv4();
  const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO delivery_proofs (
      id, delivery_id, signature_data, photo_path, recipient_name, recipient_id_number,
      gps_lat, gps_lng, gps_accuracy, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    proofId, req.params.id, signature_data || null, photoPath,
    recipient_name || null, recipient_id_number || null,
    gps_lat ? Number(gps_lat) : null,
    gps_lng ? Number(gps_lng) : null,
    gps_accuracy ? Number(gps_accuracy) : null,
    notes || null
  );

  // עדכון סטטוס אוטומטי ל-delivered אם עדיין לא
  if (delivery.status === 'arrived' || delivery.status === 'en_route') {
    db.prepare(`
      UPDATE deliveries SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(req.params.id);
    db.prepare(`
      INSERT INTO tracking_events (delivery_id, event_type, status, lat, lng)
      VALUES (?, 'status_change', 'delivered', ?, ?)
    `).run(req.params.id, gps_lat || null, gps_lng || null);
    if (delivery.driver_id) {
      db.prepare('UPDATE drivers SET total_deliveries = total_deliveries + 1 WHERE id = ?')
        .run(delivery.driver_id);
    }
    sendDeliveredNotification(delivery).catch(() => {});
  }

  res.status(201).json({
    ok: true,
    data: db.prepare('SELECT * FROM delivery_proofs WHERE id = ?').get(proofId),
  });
});

// קישורי ניווט מהירים
router.get('/:id/navigation', (req, res) => {
  const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
  if (!delivery) return res.status(404).json({ ok: false, error: 'משלוח לא נמצא' });
  if (delivery.delivery_lat == null) {
    return res.status(400).json({ ok: false, error: 'לא הוגדרו קואורדינטות יעד' });
  }
  res.json({
    ok: true,
    data: {
      waze: buildWazeLink(delivery.delivery_lat, delivery.delivery_lng),
      google_maps: buildGoogleMapsLink(delivery.delivery_lat, delivery.delivery_lng),
      address: delivery.delivery_address,
    },
  });
});

module.exports = router;
