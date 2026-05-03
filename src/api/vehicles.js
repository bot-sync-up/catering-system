// API: צי רכב
'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');

const router = express.Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY license_plate';
  res.json({ ok: true, data: db.prepare(sql).all(...params) });
});

router.get('/:id', (req, res) => {
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ ok: false, error: 'רכב לא נמצא' });

  // נהג נוכחי
  const driver = db.prepare('SELECT id, full_name, phone FROM drivers WHERE current_vehicle_id = ?')
    .get(req.params.id);
  res.json({ ok: true, data: { ...v, current_driver: driver } });
});

router.post('/', (req, res) => {
  const b = req.body;
  if (!b.license_plate) {
    return res.status(400).json({ ok: false, error: 'מספר רישוי חובה' });
  }
  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO vehicles (
        id, license_plate, make, model, year, capacity_kg, capacity_volume,
        fuel_type, status, current_km
      ) VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, b.license_plate, b.make || null, b.model || null, b.year || null,
      b.capacity_kg || 0, b.capacity_volume || 0, b.fuel_type || 'diesel',
      b.status || 'available', b.current_km || 0
    );
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
  res.status(201).json({ ok: true, data: db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) });
});

router.put('/:id/location', (req, res) => {
  const { lat, lng } = req.body;
  if (lat == null || lng == null) {
    return res.status(400).json({ ok: false, error: 'lat ו-lng חובה' });
  }
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ ok: false, error: 'רכב לא נמצא' });

  db.prepare(`
    UPDATE vehicles SET current_lat = ?, current_lng = ?, last_location_update = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(lat, lng, req.params.id);
  res.json({ ok: true });
});

router.put('/:id', (req, res) => {
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ ok: false, error: 'רכב לא נמצא' });

  const fields = ['make', 'model', 'year', 'capacity_kg', 'capacity_volume',
    'fuel_type', 'status', 'last_service_date', 'next_service_km', 'current_km'];
  const updates = [], params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.json({ ok: true, data: v });
  params.push(req.params.id);
  db.prepare(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true, data: db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id) });
});

// צי במצב חי - כל הרכבים עם מיקום עדכני
router.get('/fleet/live', (req, res) => {
  const fleet = db.prepare(`
    SELECT v.*, d.full_name as driver_name, d.phone as driver_phone
    FROM vehicles v
    LEFT JOIN drivers d ON d.current_vehicle_id = v.id
    WHERE v.current_lat IS NOT NULL
  `).all();
  res.json({ ok: true, data: fleet });
});

module.exports = router;
