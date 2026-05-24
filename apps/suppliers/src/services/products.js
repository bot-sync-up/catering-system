// שירות מוצרים + השוואת מחירים + המלצת ספק
const db = require('../db');
const { getSupplierRating } = require('./suppliers');

function listProducts() {
  return db.prepare('SELECT * FROM products ORDER BY name').all();
}
function getProduct(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}
function createProduct(data) {
  const info = db.prepare(`
    INSERT INTO products (sku, name, unit, stock)
    VALUES (?, ?, ?, ?)
  `).run(data.sku, data.name, data.unit || 'יח׳', data.stock || 0);
  return getProduct(info.lastInsertRowid);
}
function updateProduct(id, data) {
  const existing = getProduct(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  db.prepare(`UPDATE products SET sku=?, name=?, unit=?, stock=? WHERE id=?`)
    .run(merged.sku, merged.name, merged.unit, merged.stock, id);
  return getProduct(id);
}
function deleteProduct(id) {
  return db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

function upsertSupplierProduct({ supplier_id, product_id, price, lead_time_days, min_order_qty, currency }) {
  const existing = db.prepare(
    'SELECT id FROM supplier_products WHERE supplier_id=? AND product_id=?'
  ).get(supplier_id, product_id);
  if (existing) {
    db.prepare(`
      UPDATE supplier_products
      SET price=?, lead_time_days=?, min_order_qty=?, currency=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(price, lead_time_days || 7, min_order_qty || 1, currency || 'ILS', existing.id);
    return db.prepare('SELECT * FROM supplier_products WHERE id=?').get(existing.id);
  }
  const info = db.prepare(`
    INSERT INTO supplier_products (supplier_id, product_id, price, lead_time_days, min_order_qty, currency)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(supplier_id, product_id, price, lead_time_days || 7, min_order_qty || 1, currency || 'ILS');
  return db.prepare('SELECT * FROM supplier_products WHERE id=?').get(info.lastInsertRowid);
}

// השוואת מחירים — כל הספקים שמספקים את המוצר
function compareProductPrices(productId) {
  return db.prepare(`
    SELECT sp.id AS sp_id, sp.price, sp.lead_time_days, sp.min_order_qty, sp.currency,
           s.id AS supplier_id, s.name AS supplier_name, s.payment_terms
    FROM supplier_products sp
    JOIN suppliers s ON s.id = sp.supplier_id
    WHERE sp.product_id = ? AND s.active = 1
    ORDER BY sp.price ASC
  `).all(productId);
}

// המלצה: מחשב ציון משוקלל לפי מחיר/דירוג/זמן
// score = -priceNorm*0.5 + rating*0.35 - leadNorm*0.15 (גבוה יותר = טוב יותר)
function recommendSupplier(productId) {
  const offers = compareProductPrices(productId);
  if (!offers.length) return { recommendation: null, candidates: [] };
  const minPrice = Math.min(...offers.map(o => o.price));
  const maxPrice = Math.max(...offers.map(o => o.price));
  const minLead = Math.min(...offers.map(o => o.lead_time_days));
  const maxLead = Math.max(...offers.map(o => o.lead_time_days));
  const span = (mn, mx) => (mx === mn ? 1 : (mx - mn));

  const candidates = offers.map(o => {
    const r = getSupplierRating(o.supplier_id);
    const ratingOverall = r.overall || 3; // ברירת מחדל ניטרלית
    const priceNorm = (o.price - minPrice) / span(minPrice, maxPrice); // 0..1
    const leadNorm  = (o.lead_time_days - minLead) / span(minLead, maxLead);
    // נורמליזציה של דירוג ל-0..1
    const ratingNorm = (ratingOverall - 1) / 4;
    const score = +(0.5 * (1 - priceNorm) + 0.35 * ratingNorm + 0.15 * (1 - leadNorm)).toFixed(3);
    return {
      supplier_id: o.supplier_id,
      supplier_name: o.supplier_name,
      price: o.price,
      lead_time_days: o.lead_time_days,
      rating: ratingOverall,
      ratings_count: r.count,
      score,
    };
  }).sort((a, b) => b.score - a.score);

  return { recommendation: candidates[0], candidates };
}

module.exports = {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  upsertSupplierProduct, compareProductPrices, recommendSupplier,
};
