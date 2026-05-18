// ===================================================================
// API: נהגים (פנימיים + קבלנים)
// ===================================================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router();

// רשימת נהגים (סינון אופציונלי לפי סוג)
router.get('/', (req, res) => {
    const { type, status } = req.query;
    let sql = 'SELECT * FROM drivers WHERE 1=1';
    const params = [];
    if (type)   { sql += ' AND type = ?';   params.push(type); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY name';
    res.json(db.prepare(sql).all(...params));
});

// נהג יחיד
router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'נהג לא נמצא' });
    res.json(row);
});

// יצירת נהג חדש
router.post('/', (req, res) => {
    const { name, phone, license_no, type, contractor_name,
            rate_per_km, rate_per_delivery, status, notes } = req.body;
    if (!name || !phone)
        return res.status(400).json({ error: 'שם וטלפון חובה' });
    if (type && !['internal', 'contractor'].includes(type))
        return res.status(400).json({ error: 'סוג חייב להיות internal או contractor' });

    const id = uuidv4();
    db.prepare(`
        INSERT INTO drivers (id, name, phone, license_no, type, contractor_name,
                              rate_per_km, rate_per_delivery, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, phone, license_no || null, type || 'internal',
           contractor_name || null, rate_per_km || 0, rate_per_delivery || 0,
           status || 'active', notes || null);

    res.status(201).json(db.prepare('SELECT * FROM drivers WHERE id = ?').get(id));
});

// עדכון נהג
router.put('/:id', (req, res) => {
    const { name, phone, license_no, type, contractor_name,
            rate_per_km, rate_per_delivery, status, notes } = req.body;
    const result = db.prepare(`
        UPDATE drivers
           SET name             = COALESCE(?, name),
               phone            = COALESCE(?, phone),
               license_no       = COALESCE(?, license_no),
               type             = COALESCE(?, type),
               contractor_name  = COALESCE(?, contractor_name),
               rate_per_km      = COALESCE(?, rate_per_km),
               rate_per_delivery= COALESCE(?, rate_per_delivery),
               status           = COALESCE(?, status),
               notes            = COALESCE(?, notes)
         WHERE id = ?
    `).run(name, phone, license_no, type, contractor_name,
           rate_per_km, rate_per_delivery, status, notes, req.params.id);

    if (!result.changes) return res.status(404).json({ error: 'נהג לא נמצא' });
    res.json(db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id));
});

// סטטיסטיקות נהג (מספר משלוחים, ק"מ וכו')
router.get('/:id/stats', (req, res) => {
    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
    if (!driver) return res.status(404).json({ error: 'נהג לא נמצא' });

    const stats = db.prepare(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN status IN ('assigned','en_route','arrived') THEN 1 ELSE 0 END) AS active,
            COALESCE(SUM(distance_km), 0) AS total_km
          FROM deliveries
         WHERE driver_id = ?
    `).get(req.params.id);

    res.json({ driver, stats });
});

router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM drivers WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'נהג לא נמצא' });
    res.json({ ok: true });
});

module.exports = router;
