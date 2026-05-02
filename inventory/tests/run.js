'use strict';
/**
 * בדיקות end-to-end בסיסיות (ללא תלות בפריימוורק).
 * משתמש ב-DB זמני.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const TMP = path.join(os.tmpdir(), 'inv-test-' + Date.now() + '.db');
process.env.INVENTORY_DB = TMP;

const db = require('../src/lib/db');

let inv, purch, cycle, generateBarcodeForProductId, eanFromBase;
let locKitchen, locWarehouse, reasonId;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  OK  ', name); passed++; }
  catch (e) { console.error('  FAIL', name, '->', e.message); failed++; }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'eq') + `: ${a} !== ${b}`); }
function approx(a, b, msg, eps = 1e-6) { if (Math.abs(a - b) > eps) throw new Error((msg || 'approx') + `: ${a} !== ${b}`); }

function newProduct(sku, name, kind, opts = {}) {
  const r = db.prepare(`INSERT INTO Product
    (sku,name,kind,unit,default_cost,min_qty,reorder_qty,shelf_life_days)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(sku, name, kind, opts.unit || 'ק"ג', opts.cost || 0, opts.min || 0, opts.reorder || 0, opts.shelf || null);
  const id = r.lastInsertRowid;
  db.prepare('UPDATE Product SET barcode=? WHERE id=?').run(generateBarcodeForProductId(id), id);
  return id;
}

// --- Tests -------------------------------------------------------------

async function main() {
  await db.initDb();
  inv = require('../src/lib/services/inventory');
  purch = require('../src/lib/services/purchasing');
  cycle = require('../src/lib/services/cyclecount');
  ({ generateBarcodeForProductId, eanFromBase } = require('../src/lib/utils/barcode'));

  locKitchen = db.prepare('INSERT INTO Location (code,name,type) VALUES (?,?,?)')
    .run('KITCHEN', 'מטבח', 'kitchen').lastInsertRowid;
  locWarehouse = db.prepare('INSERT INTO Location (code,name,type) VALUES (?,?,?)')
    .run('WAREHOUSE', 'מחסן', 'warehouse').lastInsertRowid;
  reasonId = db.prepare('INSERT INTO WasteReason (code,name) VALUES (?,?)')
    .run('SPOIL', 'נזרק').lastInsertRowid;

test('barcode EAN-13 checksum', () => {
  // דוגמה ידועה: 4006381333931 — דוגמת EAN תקנית
  eq(eanFromBase('400638133393'), '4006381333931');
});

test('barcode generated for product is 13 chars and starts with 200', () => {
  const id = newProduct('TEST-BC', 'בדיקה', 'raw');
  const p = db.prepare('SELECT barcode FROM Product WHERE id=?').get(id);
  eq(p.barcode.length, 13);
  eq(p.barcode.startsWith('200'), true);
});

test('receiveStock + getStockLevel', () => {
  const id = newProduct('R-A', 'מוצר A', 'raw', { min: 5 });
  inv.receiveStock({ productId: id, locationId: locWarehouse, qty: 10, unitCost: 3 });
  eq(inv.getStockLevel(id, locWarehouse), 10);
});

test('FIFO consumes earlier-expiring lot first', () => {
  const id = newProduct('R-FIFO', 'FIFO', 'raw');
  inv.receiveStock({ productId: id, locationId: locKitchen, qty: 5, unitCost: 10, expiresAt: '2099-01-01', lotCode: 'LATE' });
  inv.receiveStock({ productId: id, locationId: locKitchen, qty: 5, unitCost: 20, expiresAt: '2026-06-01', lotCode: 'EARLY' });
  inv.consumeStock({ productId: id, locationId: locKitchen, qty: 5, type: 'OUT' });
  // ה-lot EARLY (תוקף קרוב יותר) צריך להיות מרוקן
  const lots = db.prepare('SELECT * FROM Lot WHERE product_id=? ORDER BY id').all(id);
  const early = lots.find((l) => l.lot_code === 'EARLY');
  const late = lots.find((l) => l.lot_code === 'LATE');
  approx(early.qty_remaining, 0, 'EARLY נצרך ראשון');
  approx(late.qty_remaining, 5, 'LATE עוד שלם');
});

test('OUT splits across multiple lots', () => {
  const id = newProduct('R-SPLIT', 'split', 'raw');
  inv.receiveStock({ productId: id, locationId: locKitchen, qty: 3, unitCost: 1, expiresAt: '2026-01-01' });
  inv.receiveStock({ productId: id, locationId: locKitchen, qty: 4, unitCost: 2, expiresAt: '2027-01-01' });
  inv.consumeStock({ productId: id, locationId: locKitchen, qty: 5, type: 'OUT' });
  approx(inv.getStockLevel(id, locKitchen), 2);
  const movs = db.prepare(`SELECT * FROM InventoryMovement WHERE product_id=? AND type='OUT'`).all(id);
  eq(movs.length, 2, 'שתי תנועות OUT (פיצול)');
});

test('OUT > stock should throw without allowNegative', () => {
  const id = newProduct('R-NEG', 'neg', 'raw');
  inv.receiveStock({ productId: id, locationId: locKitchen, qty: 1, unitCost: 1 });
  let threw = false;
  try { inv.consumeStock({ productId: id, locationId: locKitchen, qty: 5, type: 'OUT' }); }
  catch (e) { threw = true; }
  eq(threw, true);
});

test('WASTE requires reason and decreases stock', () => {
  const id = newProduct('R-WASTE', 'waste', 'raw');
  inv.receiveStock({ productId: id, locationId: locKitchen, qty: 3, unitCost: 5 });
  inv.consumeStock({ productId: id, locationId: locKitchen, qty: 1, type: 'WASTE', reasonId });
  approx(inv.getStockLevel(id, locKitchen), 2);
  const w = db.prepare(`SELECT * FROM InventoryMovement WHERE product_id=? AND type='WASTE'`).get(id);
  eq(w.reason_id, reasonId);
});

test('TRANSFER moves between locations preserving cost', () => {
  const id = newProduct('R-TR', 'transfer', 'raw');
  inv.receiveStock({ productId: id, locationId: locWarehouse, qty: 10, unitCost: 7 });
  inv.transferStock({ productId: id, fromLocationId: locWarehouse, toLocationId: locKitchen, qty: 4 });
  approx(inv.getStockLevel(id, locWarehouse), 6);
  approx(inv.getStockLevel(id, locKitchen), 4);
  const lot = db.prepare(`SELECT * FROM Lot WHERE product_id=? AND location_id=? AND qty_remaining>0`)
    .get(id, locKitchen);
  approx(lot.unit_cost, 7);
});

test('ADJUST positive creates lot, negative consumes', () => {
  const id = newProduct('R-ADJ', 'adj', 'raw');
  inv.adjustStock({ productId: id, locationId: locKitchen, delta: 7 });
  approx(inv.getStockLevel(id, locKitchen), 7);
  inv.adjustStock({ productId: id, locationId: locKitchen, delta: -3 });
  approx(inv.getStockLevel(id, locKitchen), 4);
});

test('Low-stock alert is created when crossing min_qty', () => {
  const id = newProduct('R-LOW', 'low', 'raw', { min: 5 });
  inv.receiveStock({ productId: id, locationId: locKitchen, qty: 10, unitCost: 1 });
  inv.consumeStock({ productId: id, locationId: locKitchen, qty: 8, type: 'OUT' });
  const a = db.prepare(`SELECT * FROM Alert WHERE product_id=? AND type='LOW_STOCK' AND acknowledged=0`).get(id);
  if (!a) throw new Error('לא נוצרה התראת LOW_STOCK');
});

test('produceDish consumes BOM and produces dish', () => {
  const flour = newProduct('R-FL', 'קמח', 'raw', { unit: 'ק"ג' });
  const oil = newProduct('R-OL', 'שמן', 'raw', { unit: 'ליטר' });
  const dish = newProduct('D-X', 'מנה X', 'dish', { unit: 'מנה' });
  db.prepare('INSERT INTO BOM (dish_id, raw_id, qty) VALUES (?,?,?)').run(dish, flour, 0.1);
  db.prepare('INSERT INTO BOM (dish_id, raw_id, qty) VALUES (?,?,?)').run(dish, oil, 0.02);
  inv.receiveStock({ productId: flour, locationId: locKitchen, qty: 10, unitCost: 5 });
  inv.receiveStock({ productId: oil, locationId: locKitchen, qty: 5, unitCost: 20 });
  inv.produceDish({ dishId: dish, qty: 10, locationId: locKitchen });
  approx(inv.getStockLevel(flour, locKitchen), 9, 'קמח: 10 - (10*0.1)');
  approx(inv.getStockLevel(oil, locKitchen), 4.8, 'שמן: 5 - (10*0.02)');
  approx(inv.getStockLevel(dish, locKitchen), 10);
});

test('Auto-PO created for low-stock raw items', () => {
  // נקה תחילה
  db.prepare('DELETE FROM PurchaseOrder').run();
  const sup = db.prepare('INSERT INTO Supplier (name) VALUES (?)').run('ספק טסט').lastInsertRowid;
  const id = newProduct('R-PO', 'מוצר רכש', 'raw', { min: 100, reorder: 50, cost: 4 });
  db.prepare('UPDATE Product SET default_supplier_id=? WHERE id=?').run(sup, id);
  // המלאי = 0, מתחת לסף 100
  const pos = purch.autoGenerateReorderPOs();
  if (pos.length === 0) throw new Error('לא נוצר PO');
  const po = db.prepare('SELECT * FROM PurchaseOrder ORDER BY id DESC LIMIT 1').get();
  eq(po.status, 'draft');
  approx(po.total, 50 * 4);
});

test('PO receive creates IN movement and stock', () => {
  const sup = db.prepare('INSERT INTO Supplier (name) VALUES (?)').run('ספק2').lastInsertRowid;
  const id = newProduct('R-POR', 'מוצר PO Recv', 'raw');
  const poRes = db.prepare(`INSERT INTO PurchaseOrder (po_number, supplier_id, status) VALUES (?,?, 'draft')`)
    .run('PO-T-1', sup);
  db.prepare(`INSERT INTO POLine (po_id, product_id, qty, unit_cost) VALUES (?,?,?,?)`)
    .run(poRes.lastInsertRowid, id, 25, 6);
  purch.receivePO(poRes.lastInsertRowid, { defaultLocationId: locWarehouse });
  approx(inv.getStockLevel(id, locWarehouse), 25);
  const po = db.prepare('SELECT * FROM PurchaseOrder WHERE id=?').get(poRes.lastInsertRowid);
  eq(po.status, 'received');
});

test('CycleCount finalize creates adjustments', () => {
  const id = newProduct('R-CC', 'מוצר ספירה', 'raw');
  inv.receiveStock({ productId: id, locationId: locKitchen, qty: 10, unitCost: 1 });
  const cc = cycle.createCount({ locationId: locKitchen, productIds: [id] });
  // ספרנו רק 8 (יש פחת של 2)
  cycle.recordLine(cc.id, id, 8);
  const r = cycle.finalizeCount(cc.id);
  eq(r.adjustments, 1);
  approx(inv.getStockLevel(id, locKitchen), 8);
});

test('valuationCurrent returns positive value', () => {
  const v = inv.valuationCurrent();
  if (!v.length) throw new Error('שווי ריק');
  const total = v.reduce((a, r) => a + (r.value || 0), 0);
  if (total <= 0) throw new Error('סה"כ שווי <= 0');
});

  console.log(`\n--- ${passed} passed, ${failed} failed ---`);
  db.close();
  try { fs.unlinkSync(TMP); } catch (_) {}
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('test main error', e); process.exit(2); });
