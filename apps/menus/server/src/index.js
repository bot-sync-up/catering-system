// Entry point - Menu & Pricing Platform Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const menuRoutes = require('./routes/menus');
const itemRoutes = require('./routes/items');
const packageRoutes = require('./routes/packages');
const allergyRoutes = require('./routes/allergies');
const dietRoutes = require('./routes/diets');
const priceListRoutes = require('./routes/priceLists');
const couponRoutes = require('./routes/coupons');
const loyaltyRoutes = require('./routes/loyalty');
const seasonalRoutes = require('./routes/seasonal');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const pricingRoutes = require('./routes/pricing');

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// בריאות
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'menu-pricing', time: new Date().toISOString() });
});

// API routes
app.use('/api/menus', menuRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/allergies', allergyRoutes);
app.use('/api/diets', dietRoutes);
app.use('/api/price-lists', priceListRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/seasonal', seasonalRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pricing', pricingRoutes);

// סטטי - הקליינט הבנוי
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🍽️  Menu & Pricing Server | http://localhost:${PORT}`);
});

module.exports = app;
