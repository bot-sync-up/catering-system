// שירות הזמנות רכש — workflow + GRN + שילוב מלאי
const db = require('../db');

const STATUSES = ['draft', 'approved', 'sent', 'partial', 'received', 'cancelled'];

function genPoNumber() {
  const y = new Date().getFullYear();
  const row = db.prepare(
    `SELECT COUNT(*) AS c FROM purchase_orders WHERE po_number LIKE ?`
  ).get(`PO-${y}-%`);
  const seq = String((row.c || 0) + 1).padStart(5, '0');
  return `PO-${y}-${seq}`;
}

function genGrnNumber() {
  const y = new Date().getFullYear();
  const row = db.prepare(
    `SELECT COUNT(*) AS c FROM grns WHERE grn_number LIKE ?`
  ).get(`GRN-${y}-%`);
  const seq = String((row.c || 0) + 1).padStart(5, '0');
  return `GRN-${y}-${seq}`;
}

function getPO(id) {
  const po = db.prepare(`
    SELECT po.*, s.name AS supplier_name
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.id = ?
  `).get(id);
  if (!po) return null;
  po.items = db.prepare(`
    SELECT pi.*, p.name AS product_name, p.sku, p.unit
    FROM po_items pi
    JOIN products p ON p.id = pi.product_id
    WHERE pi.po_id = ?
  `).all(id);
  po.grns = db.prepare('SELECT * FROM grns WHERE po_id=? ORDER BY received_at DESC').all(id);
  return po;
}

function listPOs({ status, supplier_id } = {}) {
  let sql = `
    SELECT po.*, s.name AS supplier_name,
           (SELECT COUNT(*) FROM po_items WHERE po_id=po.id) AS items_count
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE 1=1
  `;
  const params = [];
  if (status) { sql += ' AND po.status = ?'; params.push(status); }
  if (supplier_id) { sql += ' AND po.supplier_id = ?'; params.push(supplier_id); }
  sql += ' ORDER BY po.created_at DESC';
  return db.prepare(sql).all(...params);
}

function createPO({ supplier_id, items, notes, expected_delivery }) {
  if (!supplier_id) throw new Error('חובה לציין ספק');
  if (!Array.isArray(items) || !items.length) throw new Error('חובה להזין שורות הזמנה');

  const tx = db.transaction(() => {
    const po_number = genPoNumber();
    const total = items.reduce((s, it) => s + (Number(it.qty) * Number(it.unit_price)), 0);
    const info = db.prepare(`
      INSERT INTO purchase_orders (po_number, supplier_id, status, notes, total, expected_delivery)
      VALUES (?, ?, 'draft', ?, ?, ?)
    `).run(po_number, supplier_id, notes || null, total, expected_delivery || null);
    const poId = info.lastInsertRowid;
    const itemStmt = db.prepare(`
      INSERT INTO po_items (po_id, product_id, qty, unit_price)
      VALUES (?, ?, ?, ?)
    `);
    for (const it of items) {
      itemStmt.run(poId, it.product_id, Number(it.qty), Number(it.unit_price));
    }
    return poId;
  });

  const id = tx();
  return getPO(id);
}

function transition(id, target) {
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id=?').get(id);
  if (!po) throw new Error('ההזמנה לא נמצאה');
  const allowed = {
    draft:    ['approved', 'cancelled'],
    approved: ['sent', 'cancelled'],
    sent:     ['partial', 'received', 'cancelled'],
    partial:  ['received', 'cancelled'],
    received: [],
    cancelled: [],
  };
  if (!allowed[po.status].includes(target)) {
    throw new Error(`מעבר לא חוקי: ${po.status} → ${target}`);
  }
  const fields = ['status=?'];
  const params = [target];
  if (target === 'approved') { fields.push('approved_at=CURRENT_TIMESTAMP'); }
  if (target === 'sent')     { fields.push('sent_at=CURRENT_TIMESTAMP'); }
  params.push(id);
  db.prepare(`UPDATE purchase_orders SET ${fields.join(', ')} WHERE id=?`).run(...params);
  return getPO(id);
}

function approvePO(id)  { return transition(id, 'approved'); }
function sendPO(id)     { return transition(id, 'sent'); }
function cancelPO(id)   { return transition(id, 'cancelled'); }

// קליטת סחורה — מעדכן po_items.qty_received, ממלא GRN, מעדכן מלאי, מעדכן סטטוס
function receiveGRN(poId, { items, notes }) {
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id=?').get(poId);
  if (!po) throw new Error('ההזמנה לא נמצאה');
  if (!['sent', 'partial', 'approved'].includes(po.status)) {
    throw new Error(`לא ניתן לקלוט ב-status=${po.status}`);
  }
  if (!Array.isArray(items) || !items.length) throw new Error('חובה לציין פריטים נקלטים');

  const tx = db.transaction(() => {
    const grn_number = genGrnNumber();
    const grnInfo = db.prepare(`INSERT INTO grns (grn_number, po_id, notes) VALUES (?, ?, ?)`)
      .run(grn_number, poId, notes || null);
    const grnId = grnInfo.lastInsertRowid;

    const grnItemStmt = db.prepare(`
      INSERT INTO grn_items (grn_id, po_item_id, qty_received) VALUES (?, ?, ?)
    `);
    const updateItemStmt = db.prepare(`
      UPDATE po_items SET qty_received = qty_received + ? WHERE id=?
    `);
    const updateStockStmt = db.prepare(`
      UPDATE products SET stock = stock + ? WHERE id=?
    `);

    for (const line of items) {
      const poItem = db.prepare('SELECT * FROM po_items WHERE id=? AND po_id=?')
        .get(line.po_item_id, poId);
      if (!poItem) throw new Error(`שורה ${line.po_item_id} לא נמצאה ב-PO`);
      const remaining = poItem.qty - poItem.qty_received;
      const qty = Number(line.qty_received);
      if (qty <= 0) throw new Error('כמות חיובית בלבד');
      if (qty > remaining + 1e-9) throw new Error(`כמות חורגת מהיתרה (${remaining})`);
      grnItemStmt.run(grnId, poItem.id, qty);
      updateItemStmt.run(qty, poItem.id);
      updateStockStmt.run(qty, poItem.product_id);
    }

    // עדכון סטטוס PO
    const allItems = db.prepare('SELECT qty, qty_received FROM po_items WHERE po_id=?').all(poId);
    const fullyReceived = allItems.every(i => Math.abs(i.qty_received - i.qty) < 1e-9);
    const anyReceived  = allItems.some(i => i.qty_received > 0);
    let newStatus = po.status;
    if (fullyReceived) newStatus = 'received';
    else if (anyReceived) newStatus = 'partial';
    db.prepare('UPDATE purchase_orders SET status=? WHERE id=?').run(newStatus, poId);

    return grnId;
  });

  const grnId = tx();
  return {
    grn: db.prepare('SELECT * FROM grns WHERE id=?').get(grnId),
    po: getPO(poId),
  };
}

function addRating({ supplier_id, po_id, delivery_score, quality_score, price_score, comment }) {
  const info = db.prepare(`
    INSERT INTO supplier_ratings
    (supplier_id, po_id, delivery_score, quality_score, price_score, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(supplier_id, po_id || null, delivery_score, quality_score, price_score, comment || null);
  return db.prepare('SELECT * FROM supplier_ratings WHERE id=?').get(info.lastInsertRowid);
}

module.exports = {
  STATUSES,
  listPOs, getPO, createPO,
  approvePO, sendPO, cancelPO,
  receiveGRN, addRating,
};
