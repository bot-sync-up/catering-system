// ===================================================================
// API: חשבוניות נהגים קבלנים (DriverInvoice)
// ===================================================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router();

// רשימת חשבוניות (אפשר לסנן לפי נהג)
router.get('/', (req, res) => {
    const { driver_id, status } = req.query;
    let sql = `
        SELECT i.*, d.name AS driver_name, d.contractor_name
          FROM driver_invoices i
          JOIN drivers d ON d.id = i.driver_id
         WHERE 1=1
    `;
    const params = [];
    if (driver_id) { sql += ' AND i.driver_id = ?'; params.push(driver_id); }
    if (status)    { sql += ' AND i.status = ?';    params.push(status); }
    sql += ' ORDER BY i.created_at DESC';
    res.json(db.prepare(sql).all(...params));
});

// חשבונית יחידה עם פירוט המשלוחים בתקופה
router.get('/:id', (req, res) => {
    const invoice = db.prepare(`
        SELECT i.*, d.name AS driver_name, d.contractor_name,
               d.rate_per_km, d.rate_per_delivery
          FROM driver_invoices i
          JOIN drivers d ON d.id = i.driver_id
         WHERE i.id = ?
    `).get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'חשבונית לא נמצאה' });

    const deliveries = db.prepare(`
        SELECT id, tracking_no, customer_name, dropoff_address,
               distance_km, delivered_at
          FROM deliveries
         WHERE driver_id = ?
           AND status = 'delivered'
           AND delivered_at BETWEEN ? AND ?
         ORDER BY delivered_at
    `).all(invoice.driver_id, invoice.period_start, invoice.period_end);

    res.json({ ...invoice, deliveries });
});

// יצירת חשבונית חדשה (חישוב אוטומטי לפי משלוחים שנמסרו בתקופה)
router.post('/generate', (req, res) => {
    const { driver_id, period_start, period_end, bonus, deductions, notes } = req.body;
    if (!driver_id)    return res.status(400).json({ error: 'driver_id חובה' });
    if (!period_start || !period_end)
        return res.status(400).json({ error: 'period_start ו-period_end חובה' });

    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driver_id);
    if (!driver) return res.status(404).json({ error: 'נהג לא נמצא' });
    if (driver.type !== 'contractor')
        return res.status(400).json({ error: 'חשבוניות מונפקות לקבלנים בלבד' });

    // איסוף משלוחים שנמסרו בתקופה
    const aggregate = db.prepare(`
        SELECT COUNT(*) AS cnt, COALESCE(SUM(distance_km), 0) AS km
          FROM deliveries
         WHERE driver_id = ?
           AND status = 'delivered'
           AND delivered_at BETWEEN ? AND ?
    `).get(driver_id, period_start, period_end);

    const baseAmount = (aggregate.cnt || 0) * (driver.rate_per_delivery || 0);
    const kmAmount   = (aggregate.km  || 0) * (driver.rate_per_km || 0);
    const totalAmount = baseAmount + kmAmount + (bonus || 0) - (deductions || 0);

    const id = uuidv4();
    db.prepare(`
        INSERT INTO driver_invoices (
            id, driver_id, period_start, period_end,
            deliveries_count, total_km, base_amount, km_amount,
            bonus, deductions, total_amount, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `).run(id, driver_id, period_start, period_end,
           aggregate.cnt, aggregate.km, baseAmount, kmAmount,
           bonus || 0, deductions || 0, totalAmount, notes || null);

    res.status(201).json(db.prepare('SELECT * FROM driver_invoices WHERE id = ?').get(id));
});

// עדכון מצב חשבונית (issued/paid)
router.post('/:id/status', (req, res) => {
    const { status } = req.body;
    if (!['draft', 'issued', 'paid'].includes(status))
        return res.status(400).json({ error: 'מצב לא חוקי' });
    const result = db.prepare(`UPDATE driver_invoices SET status = ? WHERE id = ?`)
                     .run(status, req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'חשבונית לא נמצאה' });
    res.json(db.prepare('SELECT * FROM driver_invoices WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM driver_invoices WHERE id = ? AND status = "draft"')
                     .run(req.params.id);
    if (!result.changes)
        return res.status(409).json({ error: 'ניתן למחוק רק חשבונית במצב draft' });
    res.json({ ok: true });
});

module.exports = router;
