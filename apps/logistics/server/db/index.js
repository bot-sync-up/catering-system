// ===================================================================
// אתחול בסיס נתונים - sql.js (Pure JS - ללא תלות native)
// ===================================================================
// המודול חושף API דמוי better-sqlite3:
//     db.prepare(sql).run(...args)
//     db.prepare(sql).get(...args)
//     db.prepare(sql).all(...args)
//     db.exec(sql)
//     db.pragma(...) - no-op
// הנתונים מאוחסנים בקובץ data/logistics.db ונשמרים אחרי כל write.
// ===================================================================
const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

const DB_DIR  = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'logistics.db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

let SQL, raw;          // raw = sql.js Database instance
let writePending = false;

function persist() {
    // שמירה דחויה כדי למנוע flush בלולאת writes רצופים
    if (writePending) return;
    writePending = true;
    setImmediate(() => {
        try {
            const data = raw.export();
            fs.writeFileSync(DB_PATH, Buffer.from(data));
        } finally {
            writePending = false;
        }
    });
}

// --- אתחול סינכרוני (חוסם עד טעינת ה-WASM) ---
function initSync() {
    // sql.js v1.10 מחזיר Promise. נמתין לו לפני שהאפליקציה תתחיל לקבל בקשות.
    return initSqlJs().then(sqlMod => {
        SQL = sqlMod;
        if (fs.existsSync(DB_PATH)) {
            const buf = fs.readFileSync(DB_PATH);
            raw = new SQL.Database(new Uint8Array(buf));
        } else {
            raw = new SQL.Database();
        }
        const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        raw.run(schemaSQL);
        seedIfEmpty();
        persist();
        return wrapper;
    });
}

// === wrapper דמוי better-sqlite3 ===
function isWriteSql(sql) {
    return /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE)\b/i.test(sql);
}

const wrapper = {
    prepare(sql) {
        return {
            run(...args) {
                const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
                const stmt = raw.prepare(sql);
                stmt.bind(flat.map(v => v === undefined ? null : v));
                stmt.step();
                stmt.free();
                const changes = raw.getRowsModified();
                let lastInsertRowid = null;
                if (/^\s*INSERT\b/i.test(sql)) {
                    const r = raw.exec('SELECT last_insert_rowid() AS id');
                    if (r[0] && r[0].values[0]) lastInsertRowid = r[0].values[0][0];
                }
                if (isWriteSql(sql)) persist();
                return { changes, lastInsertRowid };
            },
            get(...args) {
                const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
                const stmt = raw.prepare(sql);
                stmt.bind(flat.map(v => v === undefined ? null : v));
                let row = null;
                if (stmt.step()) row = stmt.getAsObject();
                stmt.free();
                return row;
            },
            all(...args) {
                const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
                const stmt = raw.prepare(sql);
                stmt.bind(flat.map(v => v === undefined ? null : v));
                const rows = [];
                while (stmt.step()) rows.push(stmt.getAsObject());
                stmt.free();
                return rows;
            }
        };
    },
    exec(sql) { raw.run(sql); persist(); },
    pragma() { /* no-op */ }
};

// === זריעת נתונים בסיסיים ===
function seedIfEmpty() {
    const { v4: uuidv4 } = require('uuid');

    const driverCount = wrapper.prepare('SELECT COUNT(*) AS c FROM drivers').get().c;
    if (driverCount === 0) {
        const ins = wrapper.prepare(`
            INSERT INTO drivers (id, name, phone, license_no, type, contractor_name, rate_per_km, rate_per_delivery)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        ins.run(uuidv4(), 'משה כהן',     '050-1234567', '12345678', 'internal',   null,            0,   0);
        ins.run(uuidv4(), 'דוד לוי',      '050-2345678', '23456789', 'contractor', 'משלוחי לוי בע"מ', 3.5, 25);
        ins.run(uuidv4(), 'יוסף אברהם',   '050-3456789', '34567890', 'contractor', 'אברהם הובלות',   4.0, 30);
    }

    const vehicleCount = wrapper.prepare('SELECT COUNT(*) AS c FROM vehicles').get().c;
    if (vehicleCount === 0) {
        const ins = wrapper.prepare(`
            INSERT INTO vehicles (id, plate, make, model, year, capacity_kg, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        ins.run(uuidv4(), '12-345-67', 'Mercedes',   'Sprinter', 2022, 1500, 'available');
        ins.run(uuidv4(), '23-456-78', 'Ford',       'Transit',  2021, 1200, 'available');
        ins.run(uuidv4(), '34-567-89', 'Volkswagen', 'Caddy',    2023,  600, 'available');
    }

    const geoCount = wrapper.prepare('SELECT COUNT(*) AS c FROM geofences').get().c;
    if (geoCount === 0) {
        const ins = wrapper.prepare(`
            INSERT INTO geofences (id, name, center_lat, center_lng, radius_m, type)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        ins.run(uuidv4(), 'מחסן ראשי - תל אביב',  32.0853, 34.7818, 150, 'depot');
        ins.run(uuidv4(), 'אזור מסירה - ירושלים', 31.7683, 35.2137, 5000, 'zone');
    }
}

// === Proxy: routes עושים require('../db') וקוראים ל- prepare/exec בעת request.
// `initSync` נחשפת ישירות (לא דרך ה-Proxy) ל-bootstrap הראשי.
const dbProxy = new Proxy({}, {
    get(_, prop) {
        if (prop === 'initSync') return initSync;
        if (!raw) throw new Error('DB טרם אותחל - וודא קריאה ל-initSync()');
        return wrapper[prop];
    }
});

module.exports = dbProxy;

