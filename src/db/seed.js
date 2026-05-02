// נתוני דמו
const db = require('./index');
const suppliersSvc = require('../services/suppliers');
const productsSvc = require('../services/products');
const poSvc = require('../services/purchaseOrders');

console.log('מנקה נתונים קיימים...');
db.exec(`
  DELETE FROM grn_items; DELETE FROM grns;
  DELETE FROM po_items; DELETE FROM purchase_orders;
  DELETE FROM supplier_ratings; DELETE FROM supplier_products;
  DELETE FROM products; DELETE FROM suppliers;
`);

console.log('יוצר ספקים...');
const sup1 = suppliersSvc.createSupplier({
  name: 'אלקטרוניקה כהן בע״מ', tax_id: '512345678',
  contact_name: 'משה כהן', phone: '03-1234567', email: 'moshe@cohen.co.il',
  address: 'רחוב הרצל 10, תל אביב',
  bank_name: 'הפועלים', bank_branch: '601', bank_account: '123456',
  payment_terms: 'שוטף+30',
});
const sup2 = suppliersSvc.createSupplier({
  name: 'טכנו-אור הפצה', tax_id: '513456789',
  contact_name: 'יעל אור', phone: '04-7654321', email: 'sales@techno-or.co.il',
  address: 'דרך השלום 25, חיפה',
  bank_name: 'דיסקונט', bank_branch: '052', bank_account: '987654',
  payment_terms: 'שוטף+45',
});
const sup3 = suppliersSvc.createSupplier({
  name: 'מחסני זול-יבוא', tax_id: '514567890',
  contact_name: 'דוד לוי', phone: '08-1112233', email: 'david@zol.co.il',
  payment_terms: 'מזומן',
});

console.log('יוצר מוצרים...');
const prod1 = productsSvc.createProduct({ sku: 'EL-001', name: 'נורה LED 9W', unit: 'יח׳', stock: 50 });
const prod2 = productsSvc.createProduct({ sku: 'EL-002', name: 'כבל חשמל 3x1.5 מ״מ', unit: 'מטר', stock: 200 });
const prod3 = productsSvc.createProduct({ sku: 'EL-003', name: 'שקע חשמל כפול', unit: 'יח׳', stock: 30 });

console.log('מגדיר מחירי ספקים...');
productsSvc.upsertSupplierProduct({ supplier_id: sup1.id, product_id: prod1.id, price: 12.5, lead_time_days: 5 });
productsSvc.upsertSupplierProduct({ supplier_id: sup2.id, product_id: prod1.id, price: 11.0, lead_time_days: 7 });
productsSvc.upsertSupplierProduct({ supplier_id: sup3.id, product_id: prod1.id, price:  9.8, lead_time_days: 14 });

productsSvc.upsertSupplierProduct({ supplier_id: sup1.id, product_id: prod2.id, price: 4.2, lead_time_days: 3 });
productsSvc.upsertSupplierProduct({ supplier_id: sup2.id, product_id: prod2.id, price: 4.5, lead_time_days: 5 });

productsSvc.upsertSupplierProduct({ supplier_id: sup1.id, product_id: prod3.id, price: 28.0, lead_time_days: 4 });
productsSvc.upsertSupplierProduct({ supplier_id: sup3.id, product_id: prod3.id, price: 24.5, lead_time_days: 10 });

console.log('יוצר דירוגים...');
poSvc.addRating({ supplier_id: sup1.id, delivery_score: 5, quality_score: 5, price_score: 3, comment: 'מעולה, מהיר' });
poSvc.addRating({ supplier_id: sup1.id, delivery_score: 4, quality_score: 5, price_score: 3 });
poSvc.addRating({ supplier_id: sup2.id, delivery_score: 4, quality_score: 4, price_score: 4 });
poSvc.addRating({ supplier_id: sup3.id, delivery_score: 2, quality_score: 3, price_score: 5, comment: 'זול אך איטי' });

console.log('יוצר הזמנת רכש לדוגמה...');
const po = poSvc.createPO({
  supplier_id: sup2.id,
  notes: 'הזמנה ראשונה',
  items: [
    { product_id: prod1.id, qty: 100, unit_price: 11.0 },
    { product_id: prod2.id, qty: 50,  unit_price: 4.5  },
  ],
});
poSvc.approvePO(po.id);
poSvc.sendPO(po.id);

console.log('סיד הסתיים בהצלחה.');
console.log(`ספקים: ${suppliersSvc.listSuppliers().length}, מוצרים: ${productsSvc.listProducts().length}`);
console.log(`טוקן פורטל לספק 1: /portal/${sup1.portal_token}`);
