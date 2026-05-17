'use strict';

/**
 * שירות מלאי — לב המערכת
 * אחראי על: תנועות IN/OUT/ADJUST/WASTE/TRANSFER, FIFO, התראות, BOM/produce
 */

const db = require('../db');
const dayjs = require('dayjs');

// --- עזרי FIFO ----------------------------------------------------------

/** מחזיר Lots פתוחים למוצר/מיקום בסדר FIFO (תפוגה קרובה ראשונה, ואז קבלה ישנה ראשונה) */
function getFifoLots(productId, locationId) {
  return db.prepare(`
    SELECT * FROM Lot
    WHERE product_id = ? AND location_id = ? AND qty_remaining > 0
    ORDER BY
      CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,
      expires_at ASC,
      received_at ASC,
      id ASC
  `).all(productId, locationId);
}

/** עדכון רמת מלאי כוללת */
function bumpStockLevel(productId, locationId, delta) {
  db.prepare(`
    INSERT INTO StockLevel (product_id, location_id, qty, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(product_id, location_id) DO UPDATE SET
      qty = qty + excluded.qty,
      updated_at = datetime('now')
  `).run(productId, locationId, delta);
}

function getStockLevel(productId, locationId) {
  const row = db.prepare(`SELECT qty FROM StockLevel WHERE product_id=? AND location_id=?`)
    .get(productId, locationId);
  return row ? row.qty : 0;
}

// --- תנועות -------------------------------------------------------------

/**
 * קבלת מלאי — IN
 * @param {object} p { productId, locationId, qty, unitCost, expiresAt, supplierId, poId, lotCode, userName, notes }
 */
function receiveStock(p) {
  const {
    productId, locationId, qty, unitCost = 0,
    expiresAt = null, supplierId = null, poId = null,
    lotCode = null, userName = null, notes = null,
  } = p;
  if (!(qty > 0)) throw new Error('qty חייב להיות חיובי');

  const product = db.prepare('SELECT * FROM Product WHERE id=?').get(productId);
  if (!product) throw new Error('מוצר לא קיים');

  // אם לא ניתן תאריך תפוגה אך יש shelf_life_days — חשב
  let exp = expiresAt;
  if (!exp && product.shelf_life_days) {
    exp = dayjs().add(product.shelf_life_days, 'day').format('YYYY-MM-DD');
  }

  const code = lotCode || `L-${product.sku}-${dayjs().format('YYYYMMDDHHmmss')}`;

  const tx = db.transaction(() => {
    const lotRes = db.prepare(`
      INSERT INTO Lot (product_id, location_id, lot_code, qty_initial, qty_remaining,
                       unit_cost, expires_at, supplier_id, po_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(productId, locationId, code, qty, qty, unitCost, exp, supplierId, poId, notes);
    const lotId = lotRes.lastInsertRowid;

    db.prepare(`
      INSERT INTO InventoryMovement
        (type, product_id, location_id, qty, unit_cost, lot_id, ref_type, ref_id, user_name, notes)
      VALUES ('IN', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(productId, locationId, qty, unitCost, lotId,
           poId ? 'PO' : null, poId, userName, notes);

    bumpStockLevel(productId, locationId, qty);
    return lotId;
  });

  const lotId = tx();
  checkAlertsForProduct(productId, locationId);
  return { lotId };
}

/**
 * הוצאה — OUT (לפי FIFO).
 * מפצלת בין lots ויוצרת תנועה לכל פיצול.
 */
function consumeStock(p) {
  const {
    productId, locationId, qty,
    type = 'OUT', reasonId = null,
    refType = null, refId = null,
    userName = null, notes = null, allowNegative = false,
  } = p;
  if (!(qty > 0)) throw new Error('qty חייב להיות חיובי');
  if (!['OUT', 'WASTE', 'CONSUME'].includes(type)) {
    throw new Error('סוג תנועה לא תקין להוצאה: ' + type);
  }

  const movements = [];

  const tx = db.transaction(() => {
    let remaining = qty;
    const lots = getFifoLots(productId, locationId);
    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, lot.qty_remaining);
      db.prepare(`UPDATE Lot SET qty_remaining = qty_remaining - ? WHERE id = ?`)
        .run(take, lot.id);
      const movRes = db.prepare(`
        INSERT INTO InventoryMovement
          (type, product_id, location_id, qty, unit_cost, lot_id,
           ref_type, ref_id, reason_id, user_name, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(type, productId, locationId, take, lot.unit_cost, lot.id,
             refType, refId, reasonId, userName, notes);
      movements.push({ id: movRes.lastInsertRowid, lotId: lot.id, qty: take, unitCost: lot.unit_cost });
      remaining -= take;
    }

    if (remaining > 1e-9) {
      if (!allowNegative) {
        throw new Error(`מלאי לא מספיק. חסר ${remaining.toFixed(3)}`);
      }
      // מאזן שלילי — תנועה ללא lot
      const movRes = db.prepare(`
        INSERT INTO InventoryMovement
          (type, product_id, location_id, qty, unit_cost, lot_id,
           ref_type, ref_id, reason_id, user_name, notes)
        VALUES (?, ?, ?, 0, ?, NULL, ?, ?, ?, ?, ?)
      `).run(type, productId, locationId, 0, refType, refId, reasonId, userName,
             (notes || '') + ` [חסר ${remaining}]`);
      movements.push({ id: movRes.lastInsertRowid, lotId: null, qty: remaining, unitCost: 0, negative: true });
    }

    bumpStockLevel(productId, locationId, -qty);
  });
  tx();
  checkAlertsForProduct(productId, locationId);
  return { movements };
}

/**
 * התאמה — ADJUST. delta יכול להיות חיובי/שלילי.
 * אם חיובי — נוצר lot ADJUST. אם שלילי — מוריד מ-FIFO.
 */
function adjustStock(p) {
  const { productId, locationId, delta, userName = null, notes = null, refType = 'ADJUST', refId = null } = p;
  if (delta === 0) return { ok: true };
  if (delta > 0) {
    return receiveStock({
      productId, locationId, qty: delta,
      unitCost: 0, lotCode: `ADJ-${dayjs().format('YYYYMMDDHHmmss')}`,
      userName, notes: 'התאמה חיובית: ' + (notes || ''),
    });
  }
  // שלילי
  return consumeStock({
    productId, locationId, qty: -delta,
    type: 'OUT', refType, refId,
    userName, notes: 'התאמה שלילית: ' + (notes || ''),
    allowNegative: true,
  });
}

/** העברה בין מיקומים — TRANSFER (OUT ממקור + IN ליעד עם אותו unit_cost וexpires_at) */
function transferStock(p) {
  const { productId, fromLocationId, toLocationId, qty, userName = null, notes = null } = p;
  if (fromLocationId === toLocationId) throw new Error('מיקום מקור ויעד זהים');
  if (!(qty > 0)) throw new Error('qty חייב להיות חיובי');

  const tx = db.transaction(() => {
    let remaining = qty;
    const lots = getFifoLots(productId, fromLocationId);
    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, lot.qty_remaining);
      db.prepare(`UPDATE Lot SET qty_remaining = qty_remaining - ? WHERE id = ?`).run(take, lot.id);
      db.prepare(`
        INSERT INTO InventoryMovement (type, product_id, location_id, qty, unit_cost, lot_id, ref_type, user_name, notes)
        VALUES ('TRANSFER', ?, ?, ?, ?, ?, 'TRANSFER', ?, ?)
      `).run(productId, fromLocationId, take, lot.unit_cost, lot.id, userName,
             (notes || '') + ' (יציאה)');
      // יצירת lot חדש ביעד
      const newLot = db.prepare(`
        INSERT INTO Lot (product_id, location_id, lot_code, qty_initial, qty_remaining,
                         unit_cost, expires_at, supplier_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(productId, toLocationId, lot.lot_code + '-T', take, take,
             lot.unit_cost, lot.expires_at, lot.supplier_id, 'מהעברה');
      db.prepare(`
        INSERT INTO InventoryMovement (type, product_id, location_id, qty, unit_cost, lot_id, ref_type, user_name, notes)
        VALUES ('TRANSFER', ?, ?, ?, ?, ?, 'TRANSFER', ?, ?)
      `).run(productId, toLocationId, take, lot.unit_cost, newLot.lastInsertRowid,
             userName, (notes || '') + ' (כניסה)');
      remaining -= take;
    }
    if (remaining > 1e-9) throw new Error(`לא נמצא מלאי מספיק להעברה. חסר ${remaining.toFixed(3)}`);

    bumpStockLevel(productId, fromLocationId, -qty);
    bumpStockLevel(productId, toLocationId, qty);
  });
  tx();
  checkAlertsForProduct(productId, fromLocationId);
  checkAlertsForProduct(productId, toLocationId);
  return { ok: true };
}

// --- BOM / ייצור --------------------------------------------------------

/** ייצור מנה: dish_id, qty (כמה מנות), location_id (איפה הוכנה — בד"כ מטבח) */
function produceDish(p) {
  const { dishId, qty, locationId, userName = null, notes = null } = p;
  if (!(qty > 0)) throw new Error('qty חייב להיות חיובי');
  const dish = db.prepare(`SELECT * FROM Product WHERE id=? AND kind='dish'`).get(dishId);
  if (!dish) throw new Error('מנה לא נמצאה');
  const bom = db.prepare(`SELECT * FROM BOM WHERE dish_id=?`).all(dishId);
  if (bom.length === 0) throw new Error('אין BOM למנה הזו');

  let totalCost = 0;
  const tx = db.transaction(() => {
    for (const line of bom) {
      const need = line.qty * qty;
      const result = consumeStock({
        productId: line.raw_id,
        locationId,
        qty: need,
        type: 'CONSUME',
        refType: 'DISH', refId: dishId,
        userName,
        notes: `ייצור ${qty} ${dish.name}`,
      });
      for (const m of result.movements) totalCost += (m.qty || 0) * (m.unitCost || 0);
    }
    const unitCost = totalCost / qty;
    receiveStock({
      productId: dishId,
      locationId,
      qty,
      unitCost,
      lotCode: `PROD-${dish.sku}-${dayjs().format('YYYYMMDDHHmmss')}`,
      userName,
      notes: 'יוצר ע"י BOM. ' + (notes || ''),
    });
    db.prepare(`
      INSERT INTO InventoryMovement (type, product_id, location_id, qty, unit_cost, ref_type, ref_id, user_name, notes)
      VALUES ('PRODUCE', ?, ?, ?, ?, 'DISH', ?, ?, ?)
    `).run(dishId, locationId, qty, totalCost / qty, dishId, userName, notes);
  });
  tx();
  return { ok: true, totalCost };
}

// --- שווי מלאי / שערוך --------------------------------------------------

/**
 * שווי מלאי לתאריך נתון לפי FIFO.
 * משתמש ב-Lot.qty_remaining הנוכחי × unit_cost ב-asOfDate=NULL.
 * אם asOfDate ניתן — משחזר ע"י סכום תנועות עד תאריך.
 */
function valuationCurrent(asOfDate = null) {
  if (!asOfDate) {
    return db.prepare(`
      SELECT p.id AS product_id, p.sku, p.name, p.unit, p.kind, l.location_id, loc.name AS location_name,
             SUM(l.qty_remaining) AS qty,
             SUM(l.qty_remaining * l.unit_cost) AS value
      FROM Lot l
      JOIN Product p ON p.id = l.product_id
      JOIN Location loc ON loc.id = l.location_id
      WHERE l.qty_remaining > 0
      GROUP BY p.id, l.location_id
      ORDER BY p.name
    `).all();
  }
  // asOfDate: שחזור היסטורי
  return db.prepare(`
    WITH movs AS (
      SELECT product_id, location_id,
             SUM(CASE WHEN type IN ('IN','TRANSFER') THEN qty
                      WHEN type IN ('OUT','WASTE','CONSUME') THEN -qty
                      WHEN type='ADJUST' THEN qty ELSE 0 END) AS qty,
             SUM(qty * unit_cost) AS value_in
      FROM InventoryMovement
      WHERE ts <= ?
      GROUP BY product_id, location_id
    )
    SELECT p.id AS product_id, p.sku, p.name, p.unit, p.kind,
           m.location_id, loc.name AS location_name,
           m.qty, m.value_in AS value
    FROM movs m
    JOIN Product p ON p.id = m.product_id
    JOIN Location loc ON loc.id = m.location_id
    WHERE m.qty > 0.0001
    ORDER BY p.name
  `).all(asOfDate + ' 23:59:59');
}

// --- התראות -------------------------------------------------------------

function checkAlertsForProduct(productId, locationId) {
  const product = db.prepare('SELECT * FROM Product WHERE id=?').get(productId);
  if (!product) return;
  const total = db.prepare(`SELECT COALESCE(SUM(qty),0) AS q FROM StockLevel WHERE product_id=?`).get(productId).q;
  if (product.min_qty > 0 && total < product.min_qty) {
    insertAlertIfNew('LOW_STOCK', 'warn', productId, locationId,
      `מלאי נמוך: ${product.name} — ${total.toFixed(2)} ${product.unit} (סף ${product.min_qty})`);
  }
  // תפוגה
  const expiringSoon = db.prepare(`
    SELECT COUNT(*) AS c FROM Lot
    WHERE product_id=? AND qty_remaining > 0 AND expires_at IS NOT NULL
      AND expires_at <= date('now','+3 day') AND expires_at > date('now')
  `).get(productId).c;
  if (expiringSoon > 0) {
    insertAlertIfNew('EXPIRING', 'warn', productId, locationId,
      `${product.name}: ${expiringSoon} lots פגי תוקף בקרוב`);
  }
  const expired = db.prepare(`
    SELECT COUNT(*) AS c FROM Lot
    WHERE product_id=? AND qty_remaining > 0 AND expires_at IS NOT NULL AND expires_at < date('now')
  `).get(productId).c;
  if (expired > 0) {
    insertAlertIfNew('EXPIRED', 'critical', productId, locationId,
      `${product.name}: ${expired} lots פגי תוקף!`);
  }
}

function insertAlertIfNew(type, level, productId, locationId, message) {
  const exists = db.prepare(`
    SELECT id FROM Alert
    WHERE type=? AND product_id=? AND acknowledged=0
  `).get(type, productId);
  if (exists) return;
  db.prepare(`
    INSERT INTO Alert (level, type, product_id, location_id, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(level, type, productId, locationId, message);
}

function rescanAllAlerts() {
  const products = db.prepare('SELECT id FROM Product WHERE active=1').all();
  for (const p of products) checkAlertsForProduct(p.id, null);
}

module.exports = {
  receiveStock,
  consumeStock,
  adjustStock,
  transferStock,
  produceDish,
  valuationCurrent,
  getFifoLots,
  getStockLevel,
  checkAlertsForProduct,
  rescanAllAlerts,
};
