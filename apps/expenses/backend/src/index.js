require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./modules/auth/routes');
const expenseRoutes = require('./modules/expenses/routes');
const recurringRoutes = require('./modules/recurring/routes');
const coaRoutes = require('./modules/coa/routes');
const budgetRoutes = require('./modules/budget/routes');
const pettyRoutes = require('./modules/pettycash/routes');
const bankRoutes = require('./modules/bank/routes');
const reimbRoutes = require('./modules/reimbursement/routes');
const ocrRoutes = require('./modules/ocr/routes');
const { errorHandler } = require('./middleware/error');
const { startScheduler } = require('./jobs/scheduler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'expenses-budget', ts: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/coa', coaRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/petty', pettyRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/reimbursement', reimbRoutes);
app.use('/api/ocr', ocrRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[server] running on :${PORT}`);
  if (process.env.NODE_ENV !== 'test') {
    try { startScheduler(); } catch (e) { console.error('[scheduler] failed:', e.message); }
  }
});
