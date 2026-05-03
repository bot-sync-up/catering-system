const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes');
const { addClient } = require('./sse');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

// SSE
app.get('/api/stream', (req, res) => addClient(res));

app.use('/api', routes);
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`מערכת ניהול אירועים פועלת על פורט ${PORT}`);
});
