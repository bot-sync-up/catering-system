// API: ניהול קבלנים - חשבוניות, תשלומים, דוחות
'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');

const router = express.Router();

// רשימת קבלנים פעילים
router.get('/', (req, res) => {
  const list = db.prepare(`
    SELECT id, full_name, phone, contractor_company, per_delivery_rate, hourly_rate,
           rating, total_deliveries, status
    FROM drivers
    WHERE driver_type = 'contractor'
    ORDER BY contractor_company, full_name
  `).all();
  res.json({ ok: true, data: list });
});

// חישוב תשלום מגיע - לתקופה
router.get('/:driverId/pending', (req, res) => {
  const { from, to } = req.query;
  const driver = db.prepare(`SELECT * FROM drivers WHERE id = ? AND driver_type = 'contractor'`)
    .get(req.params.driverId);
  if (!driver) return res.status(404).json({ ok: false, error: 'קבלן לא נמצא' });

  const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString();
  const toDate = to || new Date().toISOString();

  // משלוחים שהושלמו ולא נכללו עדיין בחשבונית
  const deliveries = db.prepare(`
    SELECT d.id, d.order_number, d.customer_name, d.delivery_address, d.updated_at
    FROM deliveries d
    LEFT JOIN invoice_items ii ON ii.delivery_id = d.id
    WHERE d.driver_id = ? AND d.status = 'delivered'
      AND d.updated_at BETWEEN ? AND ?
      AND ii.id IS NULL
    ORDER BY d.updated_at
  `).all(req.params.driverId, fromDate, toDate);

  const ratePerDelivery = driver.per_delivery_rate || 0;
  const total = deliveries.length * ratePerDelivery;

  res.json({
    ok: true,
    data: {
      driver_id: driver.id,
      driver_name: driver.full_name,
      contractor_company: driver.contractor_company,
      period: { from: fromDate, to: toDate },
      deliveries_count: deliveries.length,
      rate_per_delivery: ratePerDelivery,
      total_amount: total,
      vat_amount: total * 0.17,
      total_with_vat: total * 1.17,
      deliveries,
    },
  });
});

// יצירת חשבונית לקבלן
router.post('/invoices', (req, res) => {
  const { driver_id, period_start, period_end, delivery_ids, notes } = req.body;
  if (!driver_id || !period_start || !period_end) {
    return res.status(400).json({ ok: false, error: 'driver_id, period_start, period_end חובה' });
  }

  const driver = db.prepare(`SELECT * FROM drivers WHERE id = ? AND driver_type = 'contractor'`)
    .get(driver_id);
  if (!driver) return res.status(404).json({ ok: false, error: 'קבלן לא נמצא' });

  // משלוחים לחיוב
  let deliveries;
  if (delivery_ids && delivery_ids.length) {
    const placeholders = delivery_ids.map(() => '?').join(',');
    deliveries = db.prepare(
      `SELECT * FROM deliveries WHERE id IN (${placeholders}) AND driver_id = ?`
    ).all(...delivery_ids, driver_id);
  } else {
    deliveries = db.prepare(`
      SELECT d.* FROM deliveries d
      LEFT JOIN invoice_items ii ON ii.delivery_id = d.id
      WHERE d.driver_id = ? AND d.status = 'delivered'
        AND d.updated_at BETWEEN ? AND ?
        AND ii.id IS NULL
    `).all(driver_id, period_start, period_end);
  }

  if (deliveries.length === 0) {
    return res.status(400).json({ ok: false, error: 'אין משלוחים לחיוב בתקופה זו' });
  }

  const ratePerDelivery = driver.per_delivery_rate || 0;
  const subtotal = deliveries.length * ratePerDelivery;
  const vat = subtotal * 0.17;

  const invoiceId = uuidv4();
  const invoiceNumber = `INV-${Date.now()}`;

  // טרנזקציה
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO driver_invoices (
        id, driver_id, invoice_number, period_start, period_end,
        deliveries_count, total_amount, vat_amount, status, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(invoiceId, driver_id, invoiceNumber, period_start, period_end,
      deliveries.length, subtotal, vat, 'draft', notes || null);

    const itemStmt = db.prepare(`
      INSERT INTO invoice_items (invoice_id, delivery_id, amount, description) VALUES (?,?,?,?)
    `);
    for (const d of deliveries) {
      itemStmt.run(invoiceId, d.id, ratePerDelivery, `משלוח ${d.order_number} ל-${d.customer_name}`);
    }
  });
  tx();

  res.status(201).json({
    ok: true,
    data: db.prepare('SELECT * FROM driver_invoices WHERE id = ?').get(invoiceId),
  });
});

// רשימת חשבוניות
router.get('/invoices', (req, res) => {
  const { driver_id, status } = req.query;
  let sql = `
    SELECT i.*, d.full_name as driver_name, d.contractor_company
    FROM driver_invoices i
    JOIN drivers d ON i.driver_id = d.id
    WHERE 1=1
  `;
  const params = [];
  if (driver_id) { sql += ' AND i.driver_id = ?'; params.push(driver_id); }
  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  sql += ' ORDER BY i.created_at DESC';
  res.json({ ok: true, data: db.prepare(sql).all(...params) });
});

router.get('/invoices/:id', (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, d.full_name as driver_name, d.contractor_company, d.bank_account
    FROM driver_invoices i
    JOIN drivers d ON i.driver_id = d.id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!inv) return res.status(404).json({ ok: false, error: 'חשבונית לא נמצאה' });

  const items = db.prepare(`
    SELECT ii.*, dl.order_number, dl.customer_name, dl.delivery_address
    FROM invoice_items ii
    LEFT JOIN deliveries dl ON ii.delivery_id = dl.id
    WHERE ii.invoice_id = ?
  `).all(req.params.id);

  res.json({ ok: true, data: { ...inv, items } });
});

router.put('/invoices/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['draft', 'sent', 'paid', 'cancelled'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'סטטוס לא חוקי' });
  }
  const inv = db.prepare('SELECT * FROM driver_invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ ok: false, error: 'חשבונית לא נמצאה' });

  if (status === 'paid') {
    db.prepare(`UPDATE driver_invoices SET status = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(status, req.params.id);
  } else {
    db.prepare(`UPDATE driver_invoices SET status = ? WHERE id = ?`).run(status, req.params.id);
  }
  res.json({ ok: true, data: db.prepare('SELECT * FROM driver_invoices WHERE id = ?').get(req.params.id) });
});

module.exports = router;
