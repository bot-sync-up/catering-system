// ===================================================================
// שרת ראשי - מערכת לוגיסטיקה ומשלוחים
// ===================================================================
const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const cors      = require('cors');
const bodyParser = require('body-parser');
const db        = require('./db');

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

async function bootstrap() {
    // ----- אתחול DB (sql.js WASM async init) -----
    await db.initSync();
    console.log('[DB] מוכן');

    const app = express();
    app.use(cors());
    app.use(bodyParser.json({ limit: '10mb' }));      // 10mb עבור חתימות base64
    app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
    app.use(express.static(path.join(__dirname, '..', 'public')));
    app.use('/uploads', express.static(UPLOAD_DIR));

    // ----- Routes -----
    app.use('/api/vehicles',   require('./routes/vehicles'));
    app.use('/api/drivers',    require('./routes/drivers'));
    app.use('/api/deliveries', require('./routes/deliveries'));
    app.use('/api/invoices',   require('./routes/invoices'));
    app.use('/api/eta',        require('./routes/eta'));
    app.use('/api/geofence',   require('./routes/geofence'));
    app.use('/api/route',      require('./routes/route'));

    app.get('/api/health', (req, res) => res.json({
        ok: true,
        service: 'logistics-delivery',
        time: new Date().toISOString()
    }));

    app.use('/api/*', (req, res) => res.status(404).json({ error: 'נתיב לא נמצא' }));
    app.use((err, req, res, next) => {
        console.error('[ERROR]', err);
        res.status(500).json({ error: err.message || 'שגיאת שרת' });
    });

    app.listen(PORT, () => {
        console.log(`==========================================`);
        console.log(`  מערכת לוגיסטיקה ומשלוחים`);
        console.log(`  השרת פועל על http://localhost:${PORT}`);
        console.log(`==========================================`);
    });
}

bootstrap().catch(err => {
    console.error('[BOOT] שגיאת אתחול:', err);
    process.exit(1);
});
