// ===================================================================
// API: Geofencing - hook לבדיקת כניסה/יציאה מאזורים
// ===================================================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router();

// חישוב מרחק במטרים (Haversine)
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng/2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// רשימת אזורים
router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM geofences ORDER BY name').all());
});

// יצירת אזור
router.post('/', (req, res) => {
    const { name, center_lat, center_lng, radius_m, type, notes } = req.body;
    if (!name || center_lat == null || center_lng == null || !radius_m)
        return res.status(400).json({ error: 'name, center_lat, center_lng, radius_m חובה' });

    const id = uuidv4();
    db.prepare(`
        INSERT INTO geofences (id, name, center_lat, center_lng, radius_m, type, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, center_lat, center_lng, radius_m, type || 'zone', notes || null);
    res.status(201).json(db.prepare('SELECT * FROM geofences WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM geofences WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'אזור לא נמצא' });
    res.json({ ok: true });
});

// ===================================================================
// GET /api/geofence/check?lat=&lng=&driver_id=&delivery_id=
// בודק האם הנקודה נמצאת באזור כלשהו, ורושם אירוע אם נכנס/יצא.
// ===================================================================
router.get('/check', (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const { driver_id, delivery_id } = req.query;
    if (isNaN(lat) || isNaN(lng))
        return res.status(400).json({ error: 'lat ו-lng חובה' });

    const fences = db.prepare('SELECT * FROM geofences').all();
    const inside = fences
        .map(f => ({ ...f, distance_m: haversine(lat, lng, f.center_lat, f.center_lng) }))
        .filter(f => f.distance_m <= f.radius_m);

    // רישום אירוע "כניסה" עבור כל אזור שהמשתמש בתוכו (מבלי בדיקת מצב קודם — hook פשוט)
    if (delivery_id || driver_id) {
        const ins = db.prepare(`
            INSERT INTO geofence_events (delivery_id, driver_id, geofence_id, event_type, lat, lng, at)
            VALUES (?, ?, ?, 'enter', ?, ?, ?)
        `);
        const now = Date.now();
        for (const f of inside) {
            ins.run(delivery_id || null, driver_id || null, f.id, lat, lng, now);
        }
    }

    res.json({
        point: { lat, lng },
        inside: inside.map(f => ({
            id: f.id, name: f.name, type: f.type, distance_m: Math.round(f.distance_m)
        })),
        all_distances: fences.map(f => ({
            id: f.id, name: f.name, distance_m: Math.round(haversine(lat, lng, f.center_lat, f.center_lng))
        }))
    });
});

// אירועי geofencing אחרונים
router.get('/events', (req, res) => {
    const { delivery_id, driver_id, limit } = req.query;
    let sql = `
        SELECT e.*, g.name AS geofence_name
          FROM geofence_events e
          JOIN geofences g ON g.id = e.geofence_id
         WHERE 1=1
    `;
    const params = [];
    if (delivery_id) { sql += ' AND e.delivery_id = ?'; params.push(delivery_id); }
    if (driver_id)   { sql += ' AND e.driver_id = ?';   params.push(driver_id); }
    sql += ' ORDER BY e.at DESC LIMIT ?';
    params.push(parseInt(limit) || 50);
    res.json(db.prepare(sql).all(...params));
});

module.exports = router;
