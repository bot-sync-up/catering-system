'use strict';
/** seed: נתוני דמה למערכת מלאי */

const db = require('./index');
const { receiveStock } = require('../services/inventory');
const { generateBarcodeForProductId } = require('../utils/barcode');

async function run() {
  await db.initDb();
  console.log('[seed] starting...');

  // מיקומים
  const locations = [
    { code: 'KITCHEN', name: 'מטבח', type: 'kitchen' },
    { code: 'WAREHOUSE', name: 'מחסן', type: 'warehouse' },
  ];
  const locIds = {};
  for (const l of locations) {
    const exist = db.prepare('SELECT id FROM Location WHERE code=?').get(l.code);
    if (exist) { locIds[l.code] = exist.id; continue; }
    const r = db.prepare('INSERT INTO Location (code,name,type) VALUES (?,?,?)').run(l.code, l.name, l.type);
    locIds[l.code] = r.lastInsertRowid;
  }

  // ספקים
  const suppliers = [
    { name: 'מחסני יבוא בע"מ', phone: '03-1234567' },
    { name: 'משק חקלאי הגליל', phone: '04-9876543' },
    { name: 'בשרי הצפון', phone: '04-1112222' },
  ];
  const supIds = [];
  for (const s of suppliers) {
    const exist = db.prepare('SELECT id FROM Supplier WHERE name=?').get(s.name);
    if (exist) { supIds.push(exist.id); continue; }
    const r = db.prepare('INSERT INTO Supplier (name,phone) VALUES (?,?)').run(s.name, s.phone);
    supIds.push(r.lastInsertRowid);
  }

  // סיבות פחת
  const reasons = [
    { code: 'EXPIRED', name: 'פג תוקף' },
    { code: 'SPILL', name: 'נשפך' },
    { code: 'BURNT', name: 'נשרף' },
    { code: 'DROPPED', name: 'נפל / זוהם' },
    { code: 'OVERPROD', name: 'ייצור עודף' },
  ];
  for (const r of reasons) {
    const e = db.prepare('SELECT id FROM WasteReason WHERE code=?').get(r.code);
    if (!e) db.prepare('INSERT INTO WasteReason (code,name) VALUES (?,?)').run(r.code, r.name);
  }

  // חומרי גלם
  const raws = [
    { sku: 'R-FLOUR', name: 'קמח לבן', unit: 'ק״ג', cost: 4.5, min: 20, reorder: 100, shelf: 180, sup: 0 },
    { sku: 'R-OIL', name: 'שמן זית', unit: 'ליטר', cost: 25, min: 5, reorder: 30, shelf: 365, sup: 0 },
    { sku: 'R-TOMATO', name: 'עגבניה', unit: 'ק״ג', cost: 6, min: 10, reorder: 40, shelf: 7, sup: 1 },
    { sku: 'R-ONION', name: 'בצל', unit: 'ק״ג', cost: 4, min: 8, reorder: 30, shelf: 30, sup: 1 },
    { sku: 'R-CHICKEN', name: 'חזה עוף', unit: 'ק״ג', cost: 35, min: 15, reorder: 50, shelf: 4, sup: 2 },
    { sku: 'R-RICE', name: 'אורז', unit: 'ק״ג', cost: 8, min: 10, reorder: 50, shelf: 365, sup: 0 },
    { sku: 'R-SALT', name: 'מלח', unit: 'ק״ג', cost: 2, min: 2, reorder: 10, shelf: null, sup: 0 },
    { sku: 'R-OLIVE', name: 'זיתים', unit: 'ק״ג', cost: 18, min: 3, reorder: 10, shelf: 60, sup: 1 },
  ];
  const productIds = {};
  for (const p of raws) {
    let exist = db.prepare('SELECT id FROM Product WHERE sku=?').get(p.sku);
    if (!exist) {
      const r = db.prepare(`
        INSERT INTO Product (sku,name,kind,unit,default_cost,min_qty,reorder_qty,shelf_life_days,default_supplier_id)
        VALUES (?,?,?,?,?,?,?,?,?)
      `).run(p.sku, p.name, 'raw', p.unit, p.cost, p.min, p.reorder, p.shelf, supIds[p.sup]);
      const id = r.lastInsertRowid;
      const bc = generateBarcodeForProductId(id);
      db.prepare('UPDATE Product SET barcode=? WHERE id=?').run(bc, id);
      productIds[p.sku] = id;
    } else {
      productIds[p.sku] = exist.id;
    }
  }

  // מנות
  const dishes = [
    { sku: 'D-PASTA', name: 'פסטה ברוטב עגבניות', unit: 'מנה' },
    { sku: 'D-RICE', name: 'אורז עם עוף', unit: 'מנה' },
  ];
  for (const d of dishes) {
    let exist = db.prepare('SELECT id FROM Product WHERE sku=?').get(d.sku);
    if (!exist) {
      const r = db.prepare(`
        INSERT INTO Product (sku,name,kind,unit,default_cost,min_qty)
        VALUES (?,?,?,?,?,?)
      `).run(d.sku, d.name, 'dish', d.unit, 0, 0);
      const id = r.lastInsertRowid;
      db.prepare('UPDATE Product SET barcode=? WHERE id=?').run(generateBarcodeForProductId(id), id);
      productIds[d.sku] = id;
    } else {
      productIds[d.sku] = exist.id;
    }
  }

  // BOM
  const bom = [
    { dish: 'D-PASTA', raw: 'R-FLOUR', qty: 0.12 },
    { dish: 'D-PASTA', raw: 'R-TOMATO', qty: 0.20 },
    { dish: 'D-PASTA', raw: 'R-ONION', qty: 0.05 },
    { dish: 'D-PASTA', raw: 'R-OIL', qty: 0.02 },
    { dish: 'D-PASTA', raw: 'R-SALT', qty: 0.005 },
    { dish: 'D-RICE', raw: 'R-RICE', qty: 0.15 },
    { dish: 'D-RICE', raw: 'R-CHICKEN', qty: 0.18 },
    { dish: 'D-RICE', raw: 'R-OIL', qty: 0.01 },
    { dish: 'D-RICE', raw: 'R-SALT', qty: 0.003 },
  ];
  for (const b of bom) {
    db.prepare(`
      INSERT INTO BOM (dish_id, raw_id, qty) VALUES (?,?,?)
      ON CONFLICT(dish_id, raw_id) DO UPDATE SET qty=excluded.qty
    `).run(productIds[b.dish], productIds[b.raw], b.qty);
  }

  // קבלות מלאי לדמה
  const today = new Date();
  const addDays = (d) => new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10);
  const initial = [
    { sku: 'R-FLOUR', loc: 'WAREHOUSE', qty: 50, cost: 4.5, exp: null },
    { sku: 'R-OIL', loc: 'WAREHOUSE', qty: 12, cost: 25, exp: addDays(300) },
    { sku: 'R-TOMATO', loc: 'KITCHEN', qty: 25, cost: 6, exp: addDays(5) },
    { sku: 'R-TOMATO', loc: 'WAREHOUSE', qty: 15, cost: 5.5, exp: addDays(10) },
    { sku: 'R-ONION', loc: 'KITCHEN', qty: 18, cost: 4, exp: addDays(20) },
    { sku: 'R-CHICKEN', loc: 'KITCHEN', qty: 22, cost: 35, exp: addDays(3) },
    { sku: 'R-RICE', loc: 'WAREHOUSE', qty: 80, cost: 8, exp: addDays(300) },
    { sku: 'R-SALT', loc: 'WAREHOUSE', qty: 8, cost: 2, exp: null },
    { sku: 'R-OLIVE', loc: 'KITCHEN', qty: 2, cost: 18, exp: addDays(40) }, // מתחת לסף!
  ];
  for (const r of initial) {
    receiveStock({
      productId: productIds[r.sku],
      locationId: locIds[r.loc],
      qty: r.qty,
      unitCost: r.cost,
      expiresAt: r.exp,
      userName: 'seed',
      notes: 'seed initial',
    });
  }

  console.log('[seed] done. products:', Object.keys(productIds).length);
}

if (require.main === module) {
  run().then(() => {
    db.close();
    process.exit(0);
  }).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = run;
