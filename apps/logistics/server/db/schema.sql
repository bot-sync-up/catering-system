-- ===================================================================
-- מערכת לוגיסטיקה ומשלוחים - סכמת בסיס הנתונים
-- ===================================================================

-- רכבים בצי
CREATE TABLE IF NOT EXISTS vehicles (
    id              TEXT PRIMARY KEY,
    plate           TEXT NOT NULL UNIQUE,           -- מספר רישוי
    make            TEXT,                            -- יצרן
    model           TEXT,                            -- דגם
    year            INTEGER,
    capacity_kg     REAL,                            -- קיבולת בק"ג
    status          TEXT DEFAULT 'available',        -- available | in_use | maintenance
    last_lat        REAL,                            -- GPS אחרון
    last_lng        REAL,
    last_seen_at    INTEGER,                         -- timestamp Unix ms
    notes           TEXT,
    created_at      INTEGER DEFAULT (strftime('%s','now') * 1000)
);

-- נהגים - פנימיים וקבלנים
CREATE TABLE IF NOT EXISTS drivers (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,                   -- שם מלא
    phone           TEXT NOT NULL,                   -- טלפון
    license_no      TEXT,                            -- רישיון נהיגה
    type            TEXT NOT NULL DEFAULT 'internal',-- internal | contractor
    contractor_name TEXT,                            -- שם חברת הקבלן (אם רלוונטי)
    rate_per_km     REAL DEFAULT 0,                  -- תעריף לק"מ (לקבלנים)
    rate_per_delivery REAL DEFAULT 0,                -- תעריף למשלוח
    status          TEXT DEFAULT 'active',           -- active | inactive | suspended
    notes           TEXT,
    created_at      INTEGER DEFAULT (strftime('%s','now') * 1000)
);

-- משלוחים
CREATE TABLE IF NOT EXISTS deliveries (
    id              TEXT PRIMARY KEY,
    tracking_no     TEXT UNIQUE,                     -- מספר מעקב
    customer_name   TEXT NOT NULL,                   -- שם הלקוח
    customer_phone  TEXT,
    pickup_address  TEXT NOT NULL,                   -- כתובת איסוף
    pickup_lat      REAL,
    pickup_lng      REAL,
    dropoff_address TEXT NOT NULL,                   -- כתובת מסירה
    dropoff_lat     REAL,
    dropoff_lng     REAL,
    package_desc    TEXT,                            -- תיאור החבילה
    weight_kg       REAL,
    distance_km     REAL,                            -- מרחק משוער
    eta_at          INTEGER,                         -- זמן הגעה משוער (timestamp ms)
    status          TEXT DEFAULT 'pending',          -- pending | assigned | en_route | arrived | delivered | cancelled
    driver_id       TEXT,                            -- שיבוץ נהג
    vehicle_id      TEXT,                            -- שיבוץ רכב
    priority        INTEGER DEFAULT 0,
    notes           TEXT,
    assigned_at     INTEGER,                         -- מתי שובץ
    en_route_at     INTEGER,
    arrived_at      INTEGER,
    delivered_at    INTEGER,
    created_at      INTEGER DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (driver_id)  REFERENCES drivers(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_status   ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver   ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_created  ON deliveries(created_at DESC);

-- תיעוד מסירה - חתימה, תמונה, GPS, חותמת זמן
CREATE TABLE IF NOT EXISTS delivery_proofs (
    id              TEXT PRIMARY KEY,
    delivery_id     TEXT NOT NULL,
    signature_data  TEXT,                            -- data URL של החתימה (PNG base64)
    photo_path      TEXT,                            -- נתיב לתמונה שהועלתה
    gps_lat         REAL,                            -- מיקום בעת המסירה
    gps_lng         REAL,
    gps_accuracy    REAL,                            -- דיוק במטרים
    received_by     TEXT,                            -- שם המקבל
    proof_at        INTEGER NOT NULL,                -- חותמת זמן Unix ms
    notes           TEXT,
    created_at      INTEGER DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
);

CREATE INDEX IF NOT EXISTS idx_proofs_delivery ON delivery_proofs(delivery_id);

-- חשבוניות נהגים קבלנים
CREATE TABLE IF NOT EXISTS driver_invoices (
    id              TEXT PRIMARY KEY,
    driver_id       TEXT NOT NULL,
    period_start    INTEGER NOT NULL,                -- תאריך תחילת תקופה
    period_end      INTEGER NOT NULL,                -- תאריך סוף תקופה
    deliveries_count INTEGER DEFAULT 0,              -- כמות משלוחים בתקופה
    total_km        REAL DEFAULT 0,                  -- סה"כ ק"מ
    base_amount     REAL DEFAULT 0,                  -- סכום בסיס (לפי משלוחים)
    km_amount       REAL DEFAULT 0,                  -- סכום לפי ק"מ
    bonus           REAL DEFAULT 0,                  -- בונוס
    deductions      REAL DEFAULT 0,                  -- ניכויים
    total_amount    REAL DEFAULT 0,                  -- סה"כ לתשלום
    status          TEXT DEFAULT 'draft',            -- draft | issued | paid
    notes           TEXT,
    created_at      INTEGER DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_driver ON driver_invoices(driver_id);

-- היסטוריית מעקב מצב משלוח (audit trail)
CREATE TABLE IF NOT EXISTS delivery_status_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id     TEXT NOT NULL,
    from_status     TEXT,
    to_status       TEXT NOT NULL,
    lat             REAL,
    lng             REAL,
    note            TEXT,
    at              INTEGER NOT NULL,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
);

CREATE INDEX IF NOT EXISTS idx_status_log_delivery ON delivery_status_log(delivery_id);

-- אזורי Geofencing
CREATE TABLE IF NOT EXISTS geofences (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,                   -- שם האזור
    center_lat      REAL NOT NULL,
    center_lng      REAL NOT NULL,
    radius_m        REAL NOT NULL,                   -- רדיוס במטרים
    type            TEXT DEFAULT 'zone',             -- zone | restricted | depot
    notes           TEXT,
    created_at      INTEGER DEFAULT (strftime('%s','now') * 1000)
);

-- אירועי Geofencing (כניסה/יציאה)
CREATE TABLE IF NOT EXISTS geofence_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id     TEXT,
    driver_id       TEXT,
    geofence_id     TEXT NOT NULL,
    event_type      TEXT NOT NULL,                   -- enter | exit
    lat             REAL,
    lng             REAL,
    at              INTEGER NOT NULL,
    FOREIGN KEY (geofence_id) REFERENCES geofences(id)
);

-- התראות ETA שנשלחו
CREATE TABLE IF NOT EXISTS eta_notifications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id     TEXT NOT NULL,
    channel         TEXT NOT NULL,                   -- sms | whatsapp
    phone           TEXT NOT NULL,
    message         TEXT,
    eta_at          INTEGER,
    sent_at         INTEGER NOT NULL,
    status          TEXT DEFAULT 'queued',           -- queued | sent | failed
    provider_id     TEXT,                            -- מזהה אצל הספק
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
);
