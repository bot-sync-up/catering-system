'use strict';

const path = require('path');
const express = require('express');
const db = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'public')));

// UI routes — מגישים שלד HTML יחיד; ה-frontend טוען נתונים מה-API
app.get('/', (req, res) => res.render('layout', { page: 'dashboard', title: 'דשבורד' }));
app.get('/products', (req, res) => res.render('layout', { page: 'products', title: 'מוצרים' }));
app.get('/stock', (req, res) => res.render('layout', { page: 'stock', title: 'מלאי' }));
app.get('/movements', (req, res) => res.render('layout', { page: 'movements', title: 'תנועות' }));
app.get('/alerts', (req, res) => res.render('layout', { page: 'alerts', title: 'התראות' }));
app.get('/po', (req, res) => res.render('layout', { page: 'po', title: 'הזמנות רכש' }));
app.get('/cyclecount', (req, res) => res.render('layout', { page: 'cyclecount', title: 'ספירת מלאי' }));
app.get('/valuation', (req, res) => res.render('layout', { page: 'valuation', title: 'שערוך' }));
app.get('/dishes', (req, res) => res.render('layout', { page: 'dishes', title: 'מנות ו-BOM' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'שגיאת שרת' });
});

async function start() {
  await db.initDb();
  // טוען routes רק אחרי DB ready
  const apiRouter = require('./routes/api');
  app.use('/api', apiRouter);
  app.listen(PORT, () => {
    console.log(`[inventory] running on http://localhost:${PORT}`);
    console.log(`[inventory] db: ${db.DB_PATH}`);
  });
}
start().catch((e) => { console.error('startup error', e); process.exit(1); });
