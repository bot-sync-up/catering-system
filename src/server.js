// שרת ראשי
const path = require('path');
const express = require('express');

const apiRouter = require('./routes/api');
const db = require('./db');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', apiRouter);

// פורטל ספק (HTML stub)
app.get('/portal/:token', (req, res) => {
  const supplier = db.prepare('SELECT id, name FROM suppliers WHERE portal_token=?')
    .get(req.params.token);
  if (!supplier) {
    return res.status(404).send('<h1 dir="rtl">טוקן לא תקין</h1>');
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'portal.html'));
});

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`מערכת ספקים+PO רצה על http://localhost:${PORT}`);
  });
}

module.exports = app;
