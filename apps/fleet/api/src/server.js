import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';

import { authRouter } from './routes/auth.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { driversRouter } from './routes/drivers.js';
import { docsRouter } from './routes/documents.js';
import { expensesRouter } from './routes/expenses.js';
import { mileageRouter } from './routes/mileage.js';
import { alertsRouter } from './routes/alerts.js';
import { reportsRouter } from './routes/reports.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

app.get('/health', (req, res) => res.json({ ok: true, name: 'fleet-api', time: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/documents', docsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/mileage', mileageRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'שגיאת שרת', message: err.message });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Fleet API running on http://localhost:${PORT}`);
});
