'use strict';
/** ספירת מלאי תקופתית */

const db = require('../db');
const dayjs = require('dayjs');
const { adjustStock } = require('./inventory');

function nextCountCode() {
  const ymd = dayjs().format('YYYYMMDD');
  const last = db.prepare(`SELECT code FROM CycleCount WHERE code LIKE ? ORDER BY id DESC LIMIT 1`)
    .get(`CC-${ymd}-%`);
  let n = 1;
  if (last) {
    const m = /-(\d+)$/.exec(last.code);
    if (m) n = parseInt(m[1], 10) + 1;
  }
  return `CC-${ymd}-${String(n).padStart(3, '0')}`;
}

/** יצירת ספירה — צילום מצב נוכחי לכל המוצרים במיקום */
function createCount({ locationId, productIds = null, notes = null }) {
  const code = nextCountCode();
  const tx = db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO CycleCount (code, location_id, notes) VALUES (?, ?, ?)
    `).run(code, locationId, notes);
    const countId = res.lastInsertRowid;

    let products;
    if (productIds && productIds.length) {
      const placeholders = productIds.map(() => '?').join(',');
      products = db.prepare(`SELECT id FROM Product WHERE id IN (${placeholders})`).all(...productIds);
    } else {
      products = db.prepare(`SELECT id FROM Product WHERE active=1`).all();
    }

    const insertLine = db.prepare(`
      INSERT INTO CycleCountLine (count_id, product_id, qty_system) VALUES (?, ?, ?)
    `);
    const getStock = db.prepare(`SELECT COALESCE(qty,0) AS qty FROM StockLevel WHERE product_id=? AND location_id=?`);
    for (const p of products) {
      const sys = getStock.get(p.id, locationId);
      insertLine.run(countId, p.id, sys ? sys.qty : 0);
    }
    return countId;
  });
  return { id: tx(), code };
}

/** רישום ספירה לפריט בודד */
function recordLine(countId, productId, qtyCounted, notes = null) {
  const line = db.prepare(`SELECT * FROM CycleCountLine WHERE count_id=? AND product_id=?`).get(countId, productId);
  if (!line) throw new Error('פריט לא נמצא בספירה');
  const variance = qtyCounted - line.qty_system;
  db.prepare(`
    UPDATE CycleCountLine SET qty_counted=?, variance=?, notes=? WHERE id=?
  `).run(qtyCounted, variance, notes, line.id);
  return { variance };
}

/** סגירת ספירה — יוצר תנועות ADJUST לפי הפרשים */
function finalizeCount(countId, { userName = null } = {}) {
  const cc = db.prepare(`SELECT * FROM CycleCount WHERE id=?`).get(countId);
  if (!cc) throw new Error('ספירה לא נמצאה');
  if (cc.status !== 'open') throw new Error('ספירה כבר נסגרה');

  const lines = db.prepare(`SELECT * FROM CycleCountLine WHERE count_id=? AND qty_counted IS NOT NULL`).all(countId);
  const tx = db.transaction(() => {
    let adjustments = 0;
    for (const l of lines) {
      if (Math.abs(l.variance) > 1e-9) {
        adjustStock({
          productId: l.product_id,
          locationId: cc.location_id,
          delta: l.variance,
          userName,
          notes: `התאמה מספירה ${cc.code}`,
          refType: 'CYCLE',
          refId: countId,
        });
        adjustments++;
      }
    }
    db.prepare(`UPDATE CycleCount SET status='finalized', finalized_at=datetime('now') WHERE id=?`).run(countId);
    return adjustments;
  });
  return { adjustments: tx() };
}

module.exports = { createCount, recordLine, finalizeCount };
