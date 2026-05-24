'use strict';
/** שירות רכש: יצירת PO אוטומטי על סמך מוצרים מתחת לסף */

const db = require('../db');
const dayjs = require('dayjs');
const { receiveStock } = require('./inventory');

function nextPoNumber() {
  const year = dayjs().format('YYYY');
  const last = db.prepare(`SELECT po_number FROM PurchaseOrder
    WHERE po_number LIKE ? ORDER BY id DESC LIMIT 1`).get(`PO-${year}-%`);
  let n = 1;
  if (last) {
    const m = /-(\d+)$/.exec(last.po_number);
    if (m) n = parseInt(m[1], 10) + 1;
  }
  return `PO-${year}-${String(n).padStart(5, '0')}`;
}

/**
 * יצירת PO אוטומטי לכל המוצרים מתחת לסף (קיבוץ לפי ספק).
 * מחזיר רשימת ה-PO שנוצרו.
 */
function autoGenerateReorderPOs(opts = {}) {
  const { userName = null } = opts;
  const lows = db.prepare(`
    SELECT p.*, COALESCE(SUM(s.qty),0) AS total_qty
    FROM Product p
    LEFT JOIN StockLevel s ON s.product_id = p.id
    WHERE p.active = 1 AND p.kind = 'raw' AND p.min_qty > 0
    GROUP BY p.id
    HAVING total_qty < p.min_qty
  `).all();

  if (lows.length === 0) return [];

  // קיבוץ לפי ספק
  const bySupplier = new Map();
  for (const p of lows) {
    const sid = p.default_supplier_id || 0;
    if (!bySupplier.has(sid)) bySupplier.set(sid, []);
    bySupplier.get(sid).push(p);
  }

  const pos = [];
  const tx = db.transaction(() => {
    for (const [supplierId, items] of bySupplier.entries()) {
      const poNum = nextPoNumber();
      const poRes = db.prepare(`
        INSERT INTO PurchaseOrder (po_number, supplier_id, status, expected_at, notes)
        VALUES (?, ?, 'draft', date('now','+3 day'), 'נוצר אוטומטית מ-reorder')
      `).run(poNum, supplierId || null);
      const poId = poRes.lastInsertRowid;
      let total = 0;
      for (const p of items) {
        const qty = p.reorder_qty > 0 ? p.reorder_qty : Math.max(p.min_qty - (p.total_qty || 0), 1);
        const cost = p.default_cost || 0;
        db.prepare(`
          INSERT INTO POLine (po_id, product_id, qty, unit_cost) VALUES (?, ?, ?, ?)
        `).run(poId, p.id, qty, cost);
        total += qty * cost;
      }
      db.prepare(`UPDATE PurchaseOrder SET total=? WHERE id=?`).run(total, poId);
      pos.push({ id: poId, po_number: poNum, supplier_id: supplierId, lines: items.length, total });
    }
  });
  tx();
  return pos;
}

/** קבלת PO: יוצרת קבלות מלאי לכל POLine שלא התקבל עדיין */
function receivePO(poId, opts = {}) {
  const { defaultLocationId, userName = null } = opts;
  if (!defaultLocationId) throw new Error('דרוש defaultLocationId');
  const po = db.prepare('SELECT * FROM PurchaseOrder WHERE id=?').get(poId);
  if (!po) throw new Error('PO לא נמצא');
  if (po.status === 'received') throw new Error('PO כבר התקבל');

  const lines = db.prepare('SELECT * FROM POLine WHERE po_id=?').all(poId);
  const tx = db.transaction(() => {
    for (const line of lines) {
      const remain = line.qty - line.qty_received;
      if (remain <= 0) continue;
      receiveStock({
        productId: line.product_id,
        locationId: defaultLocationId,
        qty: remain,
        unitCost: line.unit_cost,
        supplierId: po.supplier_id,
        poId: po.id,
        userName,
        notes: `קבלה מ-${po.po_number}`,
      });
      db.prepare('UPDATE POLine SET qty_received=qty WHERE id=?').run(line.id);
    }
    db.prepare(`UPDATE PurchaseOrder SET status='received', received_at=datetime('now') WHERE id=?`).run(poId);
  });
  tx();
  return { ok: true };
}

module.exports = { autoGenerateReorderPOs, receivePO, nextPoNumber };
