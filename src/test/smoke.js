// Smoke test — בודק את כל הזרימה הקריטית: schema, CRUD, workflow, GRN, מלאי, דירוג, המלצה
process.env.DB_PATH = require('path').join(__dirname, '..', '..', 'data', 'smoke.db');
const fs = require('fs');
if (fs.existsSync(process.env.DB_PATH)) fs.unlinkSync(process.env.DB_PATH);

const assert = require('assert');
const db = require('../db');
const suppliersSvc = require('../services/suppliers');
const productsSvc = require('../services/products');
const poSvc = require('../services/purchaseOrders');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS:', name); passed++; }
  catch (e) { console.log('  FAIL:', name, '-', e.message); failed++; }
}

console.log('Smoke test — מערכת ספקים+PO');

test('יצירת ספק', () => {
  const s = suppliersSvc.createSupplier({ name: 'ספק א', tax_id: '111' });
  assert(s.id);
  assert.strictEqual(s.name, 'ספק א');
  assert(s.portal_token); // נוצר אוטומטית
});

test('עדכון ספק', () => {
  const s = suppliersSvc.createSupplier({ name: 'ספק ב' });
  const u = suppliersSvc.updateSupplier(s.id, { phone: '050-1234567' });
  assert.strictEqual(u.phone, '050-1234567');
});

test('יצירת מוצר ומחירי ספקים', () => {
  const p = productsSvc.createProduct({ sku: 'P001', name: 'מוצר א' });
  const s1 = suppliersSvc.createSupplier({ name: 'ס1' });
  const s2 = suppliersSvc.createSupplier({ name: 'ס2' });
  productsSvc.upsertSupplierProduct({ supplier_id: s1.id, product_id: p.id, price: 10, lead_time_days: 5 });
  productsSvc.upsertSupplierProduct({ supplier_id: s2.id, product_id: p.id, price: 12, lead_time_days: 3 });
  const prices = productsSvc.compareProductPrices(p.id);
  assert.strictEqual(prices.length, 2);
  assert.strictEqual(prices[0].price, 10); // הזול ראשון
});

test('המלצת ספק (ללא דירוגים — הזול מנצח)', () => {
  const p = productsSvc.createProduct({ sku: 'P002', name: 'מוצר ב' });
  const s1 = suppliersSvc.createSupplier({ name: 'הזול' });
  const s2 = suppliersSvc.createSupplier({ name: 'היקר' });
  productsSvc.upsertSupplierProduct({ supplier_id: s1.id, product_id: p.id, price: 10, lead_time_days: 5 });
  productsSvc.upsertSupplierProduct({ supplier_id: s2.id, product_id: p.id, price: 20, lead_time_days: 5 });
  const rec = productsSvc.recommendSupplier(p.id);
  assert.strictEqual(rec.recommendation.supplier_id, s1.id);
});

test('יצירת PO + workflow מלא', () => {
  const sup = suppliersSvc.createSupplier({ name: 'ספק PO' });
  const prod = productsSvc.createProduct({ sku: 'P-PO', name: 'מוצר PO', stock: 0 });
  const po = poSvc.createPO({
    supplier_id: sup.id,
    items: [{ product_id: prod.id, qty: 10, unit_price: 5 }],
  });
  assert.strictEqual(po.status, 'draft');
  assert.strictEqual(po.total, 50);
  assert(po.po_number.startsWith('PO-'));

  const approved = poSvc.approvePO(po.id);
  assert.strictEqual(approved.status, 'approved');
  assert(approved.approved_at);

  const sent = poSvc.sendPO(po.id);
  assert.strictEqual(sent.status, 'sent');
});

test('GRN חלקי → partial, מעדכן מלאי', () => {
  const sup = suppliersSvc.createSupplier({ name: 'ספק GRN' });
  const prod = productsSvc.createProduct({ sku: 'P-GRN', name: 'מוצר GRN', stock: 0 });
  const po = poSvc.createPO({
    supplier_id: sup.id,
    items: [{ product_id: prod.id, qty: 10, unit_price: 5 }],
  });
  poSvc.approvePO(po.id);
  poSvc.sendPO(po.id);
  const poiId = po.items[0].id;
  const r1 = poSvc.receiveGRN(po.id, { items: [{ po_item_id: poiId, qty_received: 4 }] });
  assert.strictEqual(r1.po.status, 'partial');
  assert.strictEqual(productsSvc.getProduct(prod.id).stock, 4);

  const r2 = poSvc.receiveGRN(po.id, { items: [{ po_item_id: poiId, qty_received: 6 }] });
  assert.strictEqual(r2.po.status, 'received');
  assert.strictEqual(productsSvc.getProduct(prod.id).stock, 10);
});

test('GRN חורג מהיתרה — נכשל', () => {
  const sup = suppliersSvc.createSupplier({ name: 'ס' });
  const prod = productsSvc.createProduct({ sku: 'P-OV', name: 'מ' });
  const po = poSvc.createPO({ supplier_id: sup.id, items: [{ product_id: prod.id, qty: 5, unit_price: 1 }] });
  poSvc.approvePO(po.id); poSvc.sendPO(po.id);
  let threw = false;
  try { poSvc.receiveGRN(po.id, { items: [{ po_item_id: po.items[0].id, qty_received: 6 }] }); }
  catch { threw = true; }
  assert(threw, 'אמור היה להיכשל');
});

test('מעבר סטטוס לא חוקי — נכשל', () => {
  const sup = suppliersSvc.createSupplier({ name: 'ס2' });
  const prod = productsSvc.createProduct({ sku: 'P-T', name: 'מ' });
  const po = poSvc.createPO({ supplier_id: sup.id, items: [{ product_id: prod.id, qty: 1, unit_price: 1 }] });
  let threw = false;
  try { poSvc.sendPO(po.id); } catch { threw = true; } // draft → sent ישירות אסור
  assert(threw);
});

test('דירוג ספק + ציון משוקלל', () => {
  const sup = suppliersSvc.createSupplier({ name: 'מדורג' });
  poSvc.addRating({ supplier_id: sup.id, delivery_score: 5, quality_score: 5, price_score: 5 });
  poSvc.addRating({ supplier_id: sup.id, delivery_score: 3, quality_score: 4, price_score: 5 });
  const r = suppliersSvc.getSupplierRating(sup.id);
  assert.strictEqual(r.count, 2);
  assert(r.overall >= 1 && r.overall <= 5);
});

test('פורטל ספק (טוקן)', () => {
  const sup = suppliersSvc.createSupplier({ name: 'פורטל' });
  const found = db.prepare('SELECT * FROM suppliers WHERE portal_token=?').get(sup.portal_token);
  assert(found);
  assert.strictEqual(found.id, sup.id);
});

console.log(`\nתוצאות: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
