'use strict';

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const inv = require('../lib/services/inventory');
const purch = require('../lib/services/purchasing');
const cycle = require('../lib/services/cyclecount');
const { generateBarcodeForProductId, buildBarcodeSheetPdf } = require('../lib/utils/barcode');
const { buildValuationPdf } = require('../lib/utils/valuationPdf');

// --- Helper -------------------------------------------------------------
function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message || String(e) });
    }
  };
}

// --- Locations ----------------------------------------------------------
router.get('/locations', wrap((req, res) => {
  res.json(db.prepare('SELECT * FROM Location WHERE active=1 ORDER BY name').all());
}));
router.post('/locations', wrap((req, res) => {
  const { code, name, type = 'storage' } = req.body;
  const r = db.prepare('INSERT INTO Location (code,name,type) VALUES (?,?,?)').run(code, name, type);
  res.json({ id: r.lastInsertRowid });
}));

// --- Suppliers ----------------------------------------------------------
router.get('/suppliers', wrap((req, res) => {
  res.json(db.prepare('SELECT * FROM Supplier WHERE active=1 ORDER BY name').all());
}));
router.post('/suppliers', wrap((req, res) => {
  const { name, phone, email, notes } = req.body;
  const r = db.prepare('INSERT INTO Supplier (name,phone,email,notes) VALUES (?,?,?,?)')
    .run(name, phone, email, notes);
  res.json({ id: r.lastInsertRowid });
}));

// --- Products -----------------------------------------------------------
router.get('/products', wrap((req, res) => {
  const rows = db.prepare(`
    SELECT p.*, COALESCE((SELECT SUM(qty) FROM StockLevel WHERE product_id=p.id),0) AS total_qty
    FROM Product p
    WHERE p.active=1
    ORDER BY p.name
  `).all();
  res.json(rows);
}));

router.get('/products/:id', wrap((req, res) => {
  const p = db.prepare('SELECT * FROM Product WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'מוצר לא נמצא' });
  const stock = db.prepare(`
    SELECT s.*, l.name AS location_name FROM StockLevel s
    JOIN Location l ON l.id=s.location_id WHERE s.product_id=?`).all(p.id);
  const lots = db.prepare(`
    SELECT l.*, loc.name AS location_name FROM Lot l
    JOIN Location loc ON loc.id=l.location_id
    WHERE l.product_id=? AND l.qty_remaining > 0
    ORDER BY (CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END), expires_at, received_at`)
    .all(p.id);
  const bom = db.prepare(`
    SELECT b.*, raw.name AS raw_name, raw.unit AS raw_unit FROM BOM b
    JOIN Product raw ON raw.id=b.raw_id WHERE b.dish_id=?`).all(p.id);
  res.json({ ...p, stock, lots, bom });
}));

router.post('/products', wrap((req, res) => {
  const {
    sku, name, kind, unit = 'יח׳', category = null,
    default_cost = 0, min_qty = 0, reorder_qty = 0,
    shelf_life_days = null, default_supplier_id = null,
  } = req.body;
  const tx = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO Product (sku,name,kind,unit,category,default_cost,min_qty,reorder_qty,shelf_life_days,default_supplier_id)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(sku, name, kind, unit, category, default_cost, min_qty, reorder_qty, shelf_life_days, default_supplier_id);
    const id = r.lastInsertRowid;
    const barcode = generateBarcodeForProductId(id);
    db.prepare('UPDATE Product SET barcode=? WHERE id=?').run(barcode, id);
    return { id, barcode };
  });
  res.json(tx());
}));

router.put('/products/:id', wrap((req, res) => {
  const allowed = ['name','unit','category','default_cost','min_qty','reorder_qty','shelf_life_days','default_supplier_id','active'];
  const sets = [], vals = [];
  for (const k of allowed) if (k in req.body) { sets.push(`${k}=?`); vals.push(req.body[k]); }
  if (sets.length === 0) return res.json({ ok: true });
  vals.push(req.params.id);
  db.prepare(`UPDATE Product SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json({ ok: true });
}));

// --- BOM ----------------------------------------------------------------
router.post('/dishes/:id/bom', wrap((req, res) => {
  const dishId = parseInt(req.params.id, 10);
  const { raw_id, qty, notes = null } = req.body;
  db.prepare(`
    INSERT INTO BOM (dish_id, raw_id, qty, notes) VALUES (?,?,?,?)
    ON CONFLICT(dish_id, raw_id) DO UPDATE SET qty=excluded.qty, notes=excluded.notes
  `).run(dishId, raw_id, qty, notes);
  res.json({ ok: true });
}));

router.delete('/dishes/:dishId/bom/:rawId', wrap((req, res) => {
  db.prepare('DELETE FROM BOM WHERE dish_id=? AND raw_id=?').run(req.params.dishId, req.params.rawId);
  res.json({ ok: true });
}));

router.post('/dishes/:id/produce', wrap((req, res) => {
  const dishId = parseInt(req.params.id, 10);
  const { qty, locationId, userName, notes } = req.body;
  res.json(inv.produceDish({ dishId, qty, locationId, userName, notes }));
}));

// --- Movements ----------------------------------------------------------
router.post('/movements/in', wrap((req, res) => {
  res.json(inv.receiveStock(req.body));
}));
router.post('/movements/out', wrap((req, res) => {
  res.json(inv.consumeStock({ ...req.body, type: 'OUT' }));
}));
router.post('/movements/waste', wrap((req, res) => {
  if (!req.body.reasonId) throw new Error('דרושה סיבת פחת');
  res.json(inv.consumeStock({ ...req.body, type: 'WASTE' }));
}));
router.post('/movements/adjust', wrap((req, res) => {
  res.json(inv.adjustStock(req.body));
}));
router.post('/transfers', wrap((req, res) => {
  res.json(inv.transferStock(req.body));
}));

router.get('/movements', wrap((req, res) => {
  const { productId, locationId, type, limit = 200 } = req.query;
  const where = [], params = [];
  if (productId) { where.push('m.product_id=?'); params.push(productId); }
  if (locationId) { where.push('m.location_id=?'); params.push(locationId); }
  if (type) { where.push('m.type=?'); params.push(type); }
  const sql = `
    SELECT m.*, p.name AS product_name, p.sku, l.name AS location_name, w.name AS reason_name
    FROM InventoryMovement m
    JOIN Product p ON p.id=m.product_id
    JOIN Location l ON l.id=m.location_id
    LEFT JOIN WasteReason w ON w.id=m.reason_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY m.ts DESC LIMIT ?
  `;
  params.push(parseInt(limit, 10));
  res.json(db.prepare(sql).all(...params));
}));

// --- Stock --------------------------------------------------------------
router.get('/stock', wrap((req, res) => {
  res.json(db.prepare(`
    SELECT s.product_id, s.location_id, s.qty, p.sku, p.name, p.kind, p.unit, p.min_qty,
           l.name AS location_name
    FROM StockLevel s
    JOIN Product p ON p.id=s.product_id
    JOIN Location l ON l.id=s.location_id
    ORDER BY p.name, l.name
  `).all());
}));

// --- Alerts -------------------------------------------------------------
router.get('/alerts', wrap((req, res) => {
  const { acked } = req.query;
  const where = acked === '1' ? '' : 'WHERE acknowledged=0';
  res.json(db.prepare(`
    SELECT a.*, p.name AS product_name, p.sku, l.name AS location_name
    FROM Alert a
    LEFT JOIN Product p ON p.id=a.product_id
    LEFT JOIN Location l ON l.id=a.location_id
    ${where}
    ORDER BY a.ts DESC LIMIT 500
  `).all());
}));
router.post('/alerts/:id/ack', wrap((req, res) => {
  db.prepare('UPDATE Alert SET acknowledged=1 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
}));
router.post('/alerts/rescan', wrap((req, res) => {
  inv.rescanAllAlerts();
  res.json({ ok: true });
}));

// --- Waste reasons ------------------------------------------------------
router.get('/waste-reasons', wrap((req, res) => {
  res.json(db.prepare('SELECT * FROM WasteReason WHERE active=1 ORDER BY name').all());
}));
router.post('/waste-reasons', wrap((req, res) => {
  const { code, name } = req.body;
  const r = db.prepare('INSERT INTO WasteReason (code,name) VALUES (?,?)').run(code, name);
  res.json({ id: r.lastInsertRowid });
}));

// --- Purchase Orders ----------------------------------------------------
router.get('/po', wrap((req, res) => {
  res.json(db.prepare(`
    SELECT po.*, s.name AS supplier_name,
      (SELECT COUNT(*) FROM POLine WHERE po_id=po.id) AS lines_count
    FROM PurchaseOrder po
    LEFT JOIN Supplier s ON s.id=po.supplier_id
    ORDER BY po.created_at DESC LIMIT 200
  `).all());
}));
router.get('/po/:id', wrap((req, res) => {
  const po = db.prepare(`
    SELECT po.*, s.name AS supplier_name FROM PurchaseOrder po
    LEFT JOIN Supplier s ON s.id=po.supplier_id WHERE po.id=?`).get(req.params.id);
  if (!po) return res.status(404).json({ error: 'PO לא נמצא' });
  po.lines = db.prepare(`
    SELECT pl.*, p.name AS product_name, p.sku, p.unit
    FROM POLine pl JOIN Product p ON p.id=pl.product_id WHERE po_id=?`).all(po.id);
  res.json(po);
}));
router.post('/po/auto', wrap((req, res) => {
  res.json(purch.autoGenerateReorderPOs(req.body || {}));
}));
router.post('/po/:id/receive', wrap((req, res) => {
  const { defaultLocationId, userName } = req.body;
  res.json(purch.receivePO(parseInt(req.params.id, 10), { defaultLocationId, userName }));
}));

// --- Cycle Counts -------------------------------------------------------
router.post('/cyclecount', wrap((req, res) => {
  res.json(cycle.createCount(req.body));
}));
router.get('/cyclecount', wrap((req, res) => {
  res.json(db.prepare(`
    SELECT cc.*, l.name AS location_name,
      (SELECT COUNT(*) FROM CycleCountLine WHERE count_id=cc.id) AS lines_count,
      (SELECT COUNT(*) FROM CycleCountLine WHERE count_id=cc.id AND qty_counted IS NOT NULL) AS counted_count
    FROM CycleCount cc JOIN Location l ON l.id=cc.location_id ORDER BY cc.created_at DESC
  `).all());
}));
router.get('/cyclecount/:id', wrap((req, res) => {
  const cc = db.prepare(`SELECT cc.*, l.name AS location_name FROM CycleCount cc
    JOIN Location l ON l.id=cc.location_id WHERE cc.id=?`).get(req.params.id);
  if (!cc) return res.status(404).json({ error: 'לא נמצא' });
  cc.lines = db.prepare(`
    SELECT cl.*, p.name AS product_name, p.sku, p.unit FROM CycleCountLine cl
    JOIN Product p ON p.id=cl.product_id WHERE count_id=? ORDER BY p.name`).all(cc.id);
  res.json(cc);
}));
router.post('/cyclecount/:id/line', wrap((req, res) => {
  const { productId, qtyCounted, notes } = req.body;
  res.json(cycle.recordLine(parseInt(req.params.id, 10), productId, qtyCounted, notes));
}));
router.post('/cyclecount/:id/finalize', wrap((req, res) => {
  res.json(cycle.finalizeCount(parseInt(req.params.id, 10), req.body || {}));
}));

// --- Reports ------------------------------------------------------------
router.get('/valuation', wrap((req, res) => {
  res.json(inv.valuationCurrent(req.query.date || null));
}));

router.get('/valuation.pdf', wrap(async (req, res) => {
  const pdf = await buildValuationPdf({ asOfDate: req.query.date || null });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="valuation-${req.query.date || 'now'}.pdf"`);
  res.end(pdf);
}));

router.get('/barcodes.pdf', wrap(async (req, res) => {
  let ids = [];
  if (req.query.ids) ids = String(req.query.ids).split(',').map((s) => parseInt(s, 10)).filter(Boolean);
  let products;
  if (ids.length) {
    products = db.prepare(`SELECT id, sku, name, barcode FROM Product WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  } else {
    products = db.prepare('SELECT id, sku, name, barcode FROM Product WHERE active=1 AND barcode IS NOT NULL').all();
  }
  const items = products.map((p) => ({ barcode: p.barcode, name: p.name, sku: p.sku }));
  const pdf = await buildBarcodeSheetPdf(items);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="barcodes.pdf"`);
  res.end(pdf);
}));

// דשבורד — סטטיסטיקה כללית
router.get('/dashboard', wrap((req, res) => {
  const products = db.prepare(`SELECT COUNT(*) AS c FROM Product WHERE active=1`).get().c;
  const dishes = db.prepare(`SELECT COUNT(*) AS c FROM Product WHERE active=1 AND kind='dish'`).get().c;
  const raws = products - dishes;
  const lowStock = db.prepare(`
    SELECT COUNT(*) AS c FROM (
      SELECT p.id FROM Product p
      LEFT JOIN StockLevel s ON s.product_id=p.id
      WHERE p.active=1 AND p.min_qty>0
      GROUP BY p.id
      HAVING COALESCE(SUM(s.qty),0) < p.min_qty
    )
  `).get().c;
  const expiring = db.prepare(`
    SELECT COUNT(DISTINCT product_id) AS c FROM Lot
    WHERE qty_remaining>0 AND expires_at IS NOT NULL AND expires_at <= date('now','+3 day')`).get().c;
  const expired = db.prepare(`
    SELECT COUNT(DISTINCT product_id) AS c FROM Lot
    WHERE qty_remaining>0 AND expires_at IS NOT NULL AND expires_at < date('now')`).get().c;
  const valuation = db.prepare(`
    SELECT COALESCE(SUM(qty_remaining*unit_cost),0) AS v FROM Lot WHERE qty_remaining>0`).get().v;
  const openAlerts = db.prepare(`SELECT COUNT(*) AS c FROM Alert WHERE acknowledged=0`).get().c;
  res.json({ products, raws, dishes, lowStock, expiring, expired, valuation, openAlerts });
}));

module.exports = router;
