// ===================================================================
// API: רכבים בצי
// ===================================================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router();

// רשימת כל הרכבים
router.get('/', (req, res) => {
    const rows = db.prepare(`
        SELECT * FROM vehicles
        ORDER BY created_at DESC
    `).all();
    res.json(rows);
});

// רכב יחיד
router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'רכב לא נמצא' });
    res.json(row);
});

// יצירת רכב חדש
router.post('/', (req, res) => {
    const { plate, make, model, year, capacity_kg, status, notes } = req.body;
    if (!plate) return res.status(400).json({ error: 'מספר רישוי חובה' });

    const id = uuidv4();
    try {
        db.prepare(`
            INSERT INTO vehicles (id, plate, make, model, year, capacity_kg, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, plate, make || null, model || null, year || null,
               capacity_kg || null, status || 'available', notes || null);
        const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
        res.status(201).json(row);
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE')
            return res.status(409).json({ error: 'מספר רישוי כבר קיים' });
        throw err;
    }
});

// עדכון רכב
router.put('/:id', (req, res) => {
    const { plate, make, model, year, capacity_kg, status, notes } = req.body;
    const result = db.prepare(`
        UPDATE vehicles
           SET plate = COALESCE(?, plate),
               make  = COALESCE(?, make),
               model = COALESCE(?, model),
               year  = COALESCE(?, year),
               capacity_kg = COALESCE(?, capacity_kg),
               status = COALESCE(?, status),
               notes  = COALESCE(?, notes)
         WHERE id = ?
    `).run(plate, make, model, year, capacity_kg, status, notes, req.params.id);

    if (!result.changes) return res.status(404).json({ error: 'רכב לא נמצא' });
    res.json(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id));
});

// עדכון מיקום GPS אחרון של רכב (מעקב)
router.post('/:id/location', (req, res) => {
    const { lat, lng } = req.body;
    if (lat == null || lng == null)
        return res.status(400).json({ error: 'lat ו-lng נדרשים' });

    const result = db.prepare(`
        UPDATE vehicles
           SET last_lat = ?, last_lng = ?, last_seen_at = ?
         WHERE id = ?
    `).run(lat, lng, Date.now(), req.params.id);

    if (!result.changes) return res.status(404).json({ error: 'רכב לא נמצא' });
    res.json({ ok: true });
});

// מחיקת רכב
router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'רכב לא נמצא' });
    res.json({ ok: true });
});

module.exports = router;
