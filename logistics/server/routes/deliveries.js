// ===================================================================
// API: משלוחים, שיבוץ נהג/רכב, מעבר מצבים, תיעוד מסירה
// ===================================================================
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename:    (req, file, cb) => {
        const ext = path.extname(file.originalname || '.jpg');
        cb(null, `${Date.now()}-${uuidv4()}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

// מצבי משלוח חוקיים והמעברים האפשריים
const STATUS_FLOW = {
    pending:   ['assigned', 'cancelled'],
    assigned:  ['en_route', 'cancelled'],
    en_route:  ['arrived', 'cancelled'],
    arrived:   ['delivered', 'cancelled'],
    delivered: [],
    cancelled: []
};

function generateTrackingNo() {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TRK-${ts}-${rnd}`;
}

// ===================================================================
// רשימת משלוחים (סינון לפי מצב, נהג, חיפוש לקוח)
// ===================================================================
router.get('/', (req, res) => {
    const { status, driver_id, q } = req.query;
    let sql = `
        SELECT d.*,
               dr.name AS driver_name,
               dr.phone AS driver_phone,
               dr.type AS driver_type,
               v.plate AS vehicle_plate
          FROM deliveries d
          LEFT JOIN drivers  dr ON dr.id = d.driver_id
          LEFT JOIN vehicles v  ON v.id  = d.vehicle_id
         WHERE 1=1
    `;
    const params = [];
    if (status)    { sql += ' AND d.status = ?';    params.push(status); }
    if (driver_id) { sql += ' AND d.driver_id = ?'; params.push(driver_id); }
    if (q) {
        sql += ' AND (d.customer_name LIKE ? OR d.tracking_no LIKE ? OR d.dropoff_address LIKE ?)';
        const like = `%${q}%`;
        params.push(like, like, like);
    }
    sql += ' ORDER BY d.created_at DESC LIMIT 500';
    res.json(db.prepare(sql).all(...params));
});

// ===================================================================
// משלוח יחיד עם כל הנתונים הנלווים
// ===================================================================
router.get('/:id', (req, res) => {
    const delivery = db.prepare(`
        SELECT d.*,
               dr.name AS driver_name,
               dr.phone AS driver_phone,
               v.plate AS vehicle_plate
          FROM deliveries d
          LEFT JOIN drivers  dr ON dr.id = d.driver_id
          LEFT JOIN vehicles v  ON v.id  = d.vehicle_id
         WHERE d.id = ?
    `).get(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'משלוח לא נמצא' });

    const proofs = db.prepare(`
        SELECT * FROM delivery_proofs WHERE delivery_id = ? ORDER BY proof_at DESC
    `).all(req.params.id);
    const log = db.prepare(`
        SELECT * FROM delivery_status_log WHERE delivery_id = ? ORDER BY at DESC
    `).all(req.params.id);

    res.json({ ...delivery, proofs, status_log: log });
});

// ===================================================================
// יצירת משלוח חדש
// ===================================================================
router.post('/', (req, res) => {
    const {
        customer_name, customer_phone,
        pickup_address, pickup_lat, pickup_lng,
        dropoff_address, dropoff_lat, dropoff_lng,
        package_desc, weight_kg, distance_km, eta_at,
        priority, notes
    } = req.body;

    if (!customer_name)   return res.status(400).json({ error: 'שם לקוח חובה' });
    if (!pickup_address)  return res.status(400).json({ error: 'כתובת איסוף חובה' });
    if (!dropoff_address) return res.status(400).json({ error: 'כתובת מסירה חובה' });

    const id = uuidv4();
    const tracking_no = generateTrackingNo();

    db.prepare(`
        INSERT INTO deliveries (
            id, tracking_no, customer_name, customer_phone,
            pickup_address, pickup_lat, pickup_lng,
            dropoff_address, dropoff_lat, dropoff_lng,
            package_desc, weight_kg, distance_km, eta_at,
            priority, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(id, tracking_no, customer_name, customer_phone || null,
           pickup_address, pickup_lat || null, pickup_lng || null,
           dropoff_address, dropoff_lat || null, dropoff_lng || null,
           package_desc || null, weight_kg || null, distance_km || null,
           eta_at || null, priority || 0, notes || null);

    db.prepare(`
        INSERT INTO delivery_status_log (delivery_id, from_status, to_status, at, note)
        VALUES (?, NULL, 'pending', ?, 'משלוח נוצר')
    `).run(id, Date.now());

    res.status(201).json(db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id));
});

// ===================================================================
// שיבוץ נהג ורכב למשלוח
// ===================================================================
router.post('/:id/assign', (req, res) => {
    const { driver_id, vehicle_id } = req.body;
    if (!driver_id) return res.status(400).json({ error: 'driver_id חובה' });

    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'משלוח לא נמצא' });
    if (!['pending', 'assigned'].includes(delivery.status))
        return res.status(409).json({ error: `אי-אפשר לשבץ במצב ${delivery.status}` });

    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driver_id);
    if (!driver) return res.status(404).json({ error: 'נהג לא נמצא' });
    if (driver.status !== 'active')
        return res.status(409).json({ error: 'הנהג אינו פעיל' });

    if (vehicle_id) {
        const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
        if (!v) return res.status(404).json({ error: 'רכב לא נמצא' });
    }

    const now = Date.now();
    const fromStatus = delivery.status;

    db.prepare(`
        UPDATE deliveries
           SET driver_id = ?, vehicle_id = ?, status = 'assigned', assigned_at = ?
         WHERE id = ?
    `).run(driver_id, vehicle_id || null, now, req.params.id);

    if (vehicle_id) {
        db.prepare(`UPDATE vehicles SET status = 'in_use' WHERE id = ?`).run(vehicle_id);
    }

    db.prepare(`
        INSERT INTO delivery_status_log (delivery_id, from_status, to_status, at, note)
        VALUES (?, ?, 'assigned', ?, ?)
    `).run(req.params.id, fromStatus, now, `שובץ ל-${driver.name}`);

    res.json(db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id));
});

// ===================================================================
// עדכון מצב משלוח (assigned → en_route → arrived → delivered)
// ===================================================================
router.post('/:id/status', (req, res) => {
    const { status, lat, lng, note } = req.body;
    if (!status) return res.status(400).json({ error: 'status חובה' });

    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'משלוח לא נמצא' });

    const allowed = STATUS_FLOW[delivery.status] || [];
    if (!allowed.includes(status))
        return res.status(409).json({
            error: `מעבר אסור: ${delivery.status} → ${status}`,
            allowed
        });

    const now = Date.now();
    const tsField = {
        en_route:  'en_route_at',
        arrived:   'arrived_at',
        delivered: 'delivered_at'
    }[status];

    let sql = `UPDATE deliveries SET status = ?`;
    const params = [status];
    if (tsField) { sql += `, ${tsField} = ?`; params.push(now); }
    sql += ` WHERE id = ?`;
    params.push(req.params.id);
    db.prepare(sql).run(...params);

    db.prepare(`
        INSERT INTO delivery_status_log (delivery_id, from_status, to_status, lat, lng, at, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, delivery.status, status,
           lat || null, lng || null, now, note || null);

    // אם נמסר - שחרור הרכב
    if (status === 'delivered' && delivery.vehicle_id) {
        db.prepare(`UPDATE vehicles SET status = 'available' WHERE id = ?`).run(delivery.vehicle_id);
    }

    res.json(db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id));
});

// ===================================================================
// תיעוד מסירה - חתימה (data URL), תמונה (file), GPS, חותמת זמן
// ===================================================================
router.post('/:id/proof', upload.single('photo'), (req, res) => {
    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'משלוח לא נמצא' });

    const {
        signature_data, gps_lat, gps_lng, gps_accuracy,
        received_by, notes, photo_data
    } = req.body;

    let photo_path = null;
    if (req.file) {
        photo_path = `/uploads/${req.file.filename}`;
    } else if (photo_data && typeof photo_data === 'string' && photo_data.startsWith('data:image/')) {
        // תמיכה בתמונת base64 (במידה שאין multipart)
        const m = photo_data.match(/^data:image\/(\w+);base64,(.+)$/);
        if (m) {
            const filename = `${Date.now()}-${uuidv4()}.${m[1]}`;
            fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(m[2], 'base64'));
            photo_path = `/uploads/${filename}`;
        }
    }

    const proofId = uuidv4();
    const now = Date.now();

    db.prepare(`
        INSERT INTO delivery_proofs (
            id, delivery_id, signature_data, photo_path,
            gps_lat, gps_lng, gps_accuracy, received_by, proof_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(proofId, req.params.id,
           signature_data || null, photo_path,
           gps_lat || null, gps_lng || null, gps_accuracy || null,
           received_by || null, now, notes || null);

    // אם המשלוח עוד לא במצב delivered - מקדמים
    if (delivery.status === 'arrived') {
        db.prepare(`UPDATE deliveries SET status = 'delivered', delivered_at = ? WHERE id = ?`)
          .run(now, req.params.id);
        db.prepare(`
            INSERT INTO delivery_status_log (delivery_id, from_status, to_status, lat, lng, at, note)
            VALUES (?, 'arrived', 'delivered', ?, ?, ?, 'תיעוד מסירה הושלם')
        `).run(req.params.id, gps_lat || null, gps_lng || null, now);
        if (delivery.vehicle_id) {
            db.prepare(`UPDATE vehicles SET status = 'available' WHERE id = ?`).run(delivery.vehicle_id);
        }
    }

    res.status(201).json(db.prepare('SELECT * FROM delivery_proofs WHERE id = ?').get(proofId));
});

// ===================================================================
// מחיקת משלוח (רק אם pending/cancelled)
// ===================================================================
router.delete('/:id', (req, res) => {
    const d = db.prepare('SELECT status FROM deliveries WHERE id = ?').get(req.params.id);
    if (!d) return res.status(404).json({ error: 'משלוח לא נמצא' });
    if (!['pending', 'cancelled'].includes(d.status))
        return res.status(409).json({ error: 'ניתן למחוק רק משלוחים pending/cancelled' });

    db.prepare('DELETE FROM delivery_proofs WHERE delivery_id = ?').run(req.params.id);
    db.prepare('DELETE FROM delivery_status_log WHERE delivery_id = ?').run(req.params.id);
    db.prepare('DELETE FROM deliveries WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// ===================================================================
// סטטיסטיקות גלובליות (לדשבורד)
// ===================================================================
router.get('/stats/summary', (req, res) => {
    const byStatus = db.prepare(`
        SELECT status, COUNT(*) AS count FROM deliveries GROUP BY status
    `).all();
    const today = db.prepare(`
        SELECT COUNT(*) AS count FROM deliveries
         WHERE created_at > ?
    `).get(Date.now() - 24 * 3600 * 1000);

    res.json({ byStatus, today: today.count });
});

module.exports = router;
