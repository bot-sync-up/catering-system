// שירות ספקים
const crypto = require('crypto');
const db = require('../db');

function genToken() {
  return crypto.randomBytes(12).toString('hex');
}

function listSuppliers({ q } = {}) {
  if (q) {
    const like = `%${q}%`;
    return db.prepare(
      `SELECT * FROM suppliers
       WHERE name LIKE ? OR tax_id LIKE ? OR contact_name LIKE ?
       ORDER BY name`
    ).all(like, like, like);
  }
  return db.prepare('SELECT * FROM suppliers ORDER BY name').all();
}

function getSupplier(id) {
  return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
}

function createSupplier(data) {
  const stmt = db.prepare(`
    INSERT INTO suppliers
    (name, tax_id, contact_name, phone, email, address,
     bank_name, bank_branch, bank_account, payment_terms, portal_token, active)
    VALUES (@name, @tax_id, @contact_name, @phone, @email, @address,
            @bank_name, @bank_branch, @bank_account, @payment_terms, @portal_token, @active)
  `);
  const payload = {
    name: data.name,
    tax_id: data.tax_id || null,
    contact_name: data.contact_name || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    bank_name: data.bank_name || null,
    bank_branch: data.bank_branch || null,
    bank_account: data.bank_account || null,
    payment_terms: data.payment_terms || 'שוטף+30',
    portal_token: data.portal_token || genToken(),
    active: data.active === undefined ? 1 : (data.active ? 1 : 0),
  };
  const info = stmt.run(payload);
  return getSupplier(info.lastInsertRowid);
}

function updateSupplier(id, data) {
  const existing = getSupplier(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  db.prepare(`
    UPDATE suppliers SET
      name=@name, tax_id=@tax_id, contact_name=@contact_name, phone=@phone,
      email=@email, address=@address, bank_name=@bank_name, bank_branch=@bank_branch,
      bank_account=@bank_account, payment_terms=@payment_terms, active=@active
    WHERE id=@id
  `).run({
    id,
    name: merged.name,
    tax_id: merged.tax_id,
    contact_name: merged.contact_name,
    phone: merged.phone,
    email: merged.email,
    address: merged.address,
    bank_name: merged.bank_name,
    bank_branch: merged.bank_branch,
    bank_account: merged.bank_account,
    payment_terms: merged.payment_terms,
    active: merged.active ? 1 : 0,
  });
  return getSupplier(id);
}

function deleteSupplier(id) {
  return db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
}

// דירוג ממוצע (זמן/איכות/מחיר) + ציון משוקלל
function getSupplierRating(id) {
  const r = db.prepare(`
    SELECT
      COUNT(*) AS count,
      ROUND(AVG(delivery_score),2) AS delivery,
      ROUND(AVG(quality_score),2)  AS quality,
      ROUND(AVG(price_score),2)    AS price
    FROM supplier_ratings WHERE supplier_id = ?
  `).get(id);
  if (!r || !r.count) return { count: 0, delivery: null, quality: null, price: null, overall: null };
  // משקולות: איכות 0.4, זמן 0.35, מחיר 0.25
  const overall = +(r.quality * 0.4 + r.delivery * 0.35 + r.price * 0.25).toFixed(2);
  return { ...r, overall };
}

module.exports = {
  listSuppliers, getSupplier, createSupplier,
  updateSupplier, deleteSupplier, getSupplierRating,
};
