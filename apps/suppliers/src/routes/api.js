// API REST — עברית
const express = require('express');
const router = express.Router();

const suppliersSvc = require('../services/suppliers');
const productsSvc  = require('../services/products');
const poSvc        = require('../services/purchaseOrders');

const wrap = (fn) => (req, res) => {
  try { fn(req, res); }
  catch (e) { res.status(400).json({ error: e.message }); }
};

// ======= SUPPLIERS =======
router.get('/suppliers', wrap((req, res) => {
  res.json(suppliersSvc.listSuppliers({ q: req.query.q }));
}));
router.get('/suppliers/:id', wrap((req, res) => {
  const s = suppliersSvc.getSupplier(+req.params.id);
  if (!s) return res.status(404).json({ error: 'הספק לא נמצא' });
  res.json(s);
}));
router.post('/suppliers', wrap((req, res) => {
  if (!req.body.name) throw new Error('שם הספק חובה');
  res.status(201).json(suppliersSvc.createSupplier(req.body));
}));
router.put('/suppliers/:id', wrap((req, res) => {
  const s = suppliersSvc.updateSupplier(+req.params.id, req.body);
  if (!s) return res.status(404).json({ error: 'הספק לא נמצא' });
  res.json(s);
}));
router.delete('/suppliers/:id', wrap((req, res) => {
  suppliersSvc.deleteSupplier(+req.params.id);
  res.json({ ok: true });
}));
router.get('/suppliers/:id/rating', wrap((req, res) => {
  res.json(suppliersSvc.getSupplierRating(+req.params.id));
}));

// ======= PRODUCTS =======
router.get('/products', wrap((req, res) => res.json(productsSvc.listProducts())));
router.get('/products/:id', wrap((req, res) => {
  const p = productsSvc.getProduct(+req.params.id);
  if (!p) return res.status(404).json({ error: 'המוצר לא נמצא' });
  res.json(p);
}));
router.post('/products', wrap((req, res) => {
  if (!req.body.sku || !req.body.name) throw new Error('SKU ושם חובה');
  res.status(201).json(productsSvc.createProduct(req.body));
}));
router.put('/products/:id', wrap((req, res) => {
  const p = productsSvc.updateProduct(+req.params.id, req.body);
  if (!p) return res.status(404).json({ error: 'המוצר לא נמצא' });
  res.json(p);
}));
router.delete('/products/:id', wrap((req, res) => {
  productsSvc.deleteProduct(+req.params.id);
  res.json({ ok: true });
}));
router.get('/products/:id/prices', wrap((req, res) => {
  res.json(productsSvc.compareProductPrices(+req.params.id));
}));
router.get('/products/:id/recommend', wrap((req, res) => {
  res.json(productsSvc.recommendSupplier(+req.params.id));
}));

router.post('/supplier-products', wrap((req, res) => {
  const { supplier_id, product_id, price } = req.body;
  if (!supplier_id || !product_id || price == null) {
    throw new Error('supplier_id, product_id, price חובה');
  }
  res.status(201).json(productsSvc.upsertSupplierProduct(req.body));
}));

// ======= PURCHASE ORDERS =======
router.get('/purchase-orders', wrap((req, res) => {
  res.json(poSvc.listPOs({
    status: req.query.status,
    supplier_id: req.query.supplier_id ? +req.query.supplier_id : undefined,
  }));
}));
router.get('/purchase-orders/:id', wrap((req, res) => {
  const po = poSvc.getPO(+req.params.id);
  if (!po) return res.status(404).json({ error: 'ההזמנה לא נמצאה' });
  res.json(po);
}));
router.post('/purchase-orders', wrap((req, res) => {
  res.status(201).json(poSvc.createPO(req.body));
}));
router.post('/purchase-orders/:id/approve', wrap((req, res) => {
  res.json(poSvc.approvePO(+req.params.id));
}));
router.post('/purchase-orders/:id/send', wrap((req, res) => {
  res.json(poSvc.sendPO(+req.params.id));
}));
router.post('/purchase-orders/:id/cancel', wrap((req, res) => {
  res.json(poSvc.cancelPO(+req.params.id));
}));
router.post('/purchase-orders/:id/grn', wrap((req, res) => {
  res.json(poSvc.receiveGRN(+req.params.id, req.body));
}));

// ======= RATINGS =======
router.post('/ratings', wrap((req, res) => {
  const { supplier_id, delivery_score, quality_score, price_score } = req.body;
  if (!supplier_id || !delivery_score || !quality_score || !price_score) {
    throw new Error('שדות חובה: supplier_id, delivery_score, quality_score, price_score');
  }
  res.status(201).json(poSvc.addRating(req.body));
}));

// ======= PORTAL STUB =======
router.get('/portal/:token/orders', wrap((req, res) => {
  const db = require('../db');
  const supplier = db.prepare('SELECT * FROM suppliers WHERE portal_token=?').get(req.params.token);
  if (!supplier) return res.status(404).json({ error: 'טוקן לא תקין' });
  const orders = poSvc.listPOs({ supplier_id: supplier.id });
  res.json({ supplier: { id: supplier.id, name: supplier.name }, orders });
}));

module.exports = router;
