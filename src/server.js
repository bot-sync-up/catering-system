// השרת הראשי - מערכת לוגיסטיקה ומשלוחים
'use strict';

const express = require('express');
const path = require('path');

require('./db/schema'); // יוצר טבלאות אם לא קיימות

const deliveriesRouter = require('./api/deliveries');
const driversRouter = require('./api/drivers');
const vehiclesRouter = require('./api/vehicles');
const contractorsRouter = require('./api/contractors');
const geofencesRouter = require('./api/geofences');
const routesRouter = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// קבצים סטטיים
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API endpoints
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/contractors', contractorsRouter);
app.use('/api/geofences', geofencesRouter);
app.use('/api/routes', routesRouter);

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), service: 'logistics-delivery' });
});

// טיפול בשגיאות
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ ok: false, error: err.message || 'שגיאת שרת' });
});

app.listen(PORT, () => {
  console.log(`
מערכת לוגיסטיקה ומשלוחים פעילה
========================================
URL:    http://localhost:${PORT}
API:    http://localhost:${PORT}/api/health
זמן:    ${new Date().toLocaleString('he-IL')}
========================================
`);
});
