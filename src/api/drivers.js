// API: נהגים - פנימיים וקבלני משנה
'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');
const { findBestDriver, assignDriver } = require('../services/assignment');

const router = express.Router();

// רשימת נהגים
router.get('/', (req, res) => {
  const { driver_type, status } = req.query;
  let sql = `
    SELECT d.*, v.license_plate as vehicle_plate
    FROM drivers d
    LEFT JOIN vehicles v ON d.current_vehicle_id = v.id
    WHERE 1=1
  `;
  const params = [];
  if (driver_type) { sql += ' AND d.driver_type = ?'; params.push(driver_type); }
  if (status) { sql += ' AND d.status = ?'; params.push(status); }
  sql += ' ORDER BY d.full_name';
  res.json({ ok: true, data: db.prepare(sql).all(...params) });
});

// נהג בודד
router.get('/:id', (req, res) => {
  const driver = db.prepare(`
    SELECT d.*, v.license_plate as vehicle_plate, v.make, v.model
    FROM drivers d
    LEFT JOIN vehicles v ON d.current_vehicle_id = v.id
    WHERE d.id = ?
  `).get(req.params.id);
  if (!driver) return res.status(404).json({ ok: false, error: 'נהג לא נמצא' });

  const activeDeliveries = db.prepare(`
    SELECT id, order_number, customer_name, status, delivery_address
    FROM deliveries WHERE driver_id = ? AND status IN ('assigned','en_route','arrived')
  `).all(req.params.id);

  res.json({ ok: true, data: { ...driver, active_deliveries: activeDeliveries } });
});

// יצירת נהג
router.post('/', (req, res) => {
  const b = req.body;
  if (!b.full_name || !b.phone || !b.driver_type) {
    return res.status(400).json({ ok: false, error: 'שדות חובה: full_name, phone, driver_type' });
  }
  if (!['internal', 'contractor'].includes(b.driver_type)) {
    return res.status(400).json({ ok: false, error: 'driver_type חייב להיות internal או contractor' });
  }
  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO drivers (
        id, full_name, phone, email, id_number, license_number, license_expiry,
        driver_type, contractor_company, hourly_rate, per_delivery_rate,
        bank_account, current_vehicle_id, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, b.full_name, b.phone, b.email || null, b.id_number || null,
      b.license_number || null, b.license_expiry || null,
      b.driver_type, b.contractor_company || null,
      b.hourly_rate || null, b.per_delivery_rate || null,
      b.bank_account || null, b.current_vehicle_id || null,
      b.status || 'active'
    );
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
  res.status(201).json({ ok: true, data: db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) });
});

// עדכון נהג
router.put('/:id', (req, res) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!driver) return res.status(404).json({ ok: false, error: 'נהג לא נמצא' });

  const fields = ['full_name', 'phone', 'email', 'license_number', 'license_expiry',
    'hourly_rate', 'per_delivery_rate', 'bank_account', 'current_vehicle_id', 'status', 'rating'];
  const updates = [], params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.json({ ok: true, data: driver });
  params.push(req.params.id);
  db.prepare(`UPDATE drivers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true, data: db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id) });
});

// המלצה - מי הכי מתאים למשלוח
router.get('/recommend/:deliveryId', (req, res) => {
  try {
    const candidates = findBestDriver(req.params.deliveryId, {
      prefer_internal: req.query.prefer_internal !== 'false',
      max_distance_km: Number(req.query.max_distance_km) || 50,
    });
    res.json({ ok: true, data: candidates });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// שיבוץ נהג למשלוח
router.post('/:driverId/assign/:deliveryId', (req, res) => {
  try {
    const result = assignDriver(req.params.deliveryId, req.params.driverId, req.body.vehicle_id);
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
