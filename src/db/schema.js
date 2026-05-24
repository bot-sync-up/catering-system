// Schema הגדרת המודל - משתמש ב-node:sqlite המובנה (Node 22+)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'logistics.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// תאימות API ל-better-sqlite3 - .all() ו-.get() ב-node:sqlite מקבלים פרמטרים זהים
// אבל אין db.transaction(). נוסיף helper פשוט.
db.transaction = function (fn) {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };
};

const SCHEMA = `
-- רכבים בצי
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  license_plate TEXT UNIQUE NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  capacity_kg REAL DEFAULT 0,
  capacity_volume REAL DEFAULT 0,
  fuel_type TEXT DEFAULT 'diesel',
  status TEXT DEFAULT 'available', -- available, in_use, maintenance, off_road
  last_service_date TEXT,
  next_service_km INTEGER,
  current_km INTEGER DEFAULT 0,
  current_lat REAL,
  current_lng REAL,
  last_location_update TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- נהגים: פנימיים וקבלנים
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  id_number TEXT UNIQUE,
  license_number TEXT,
  license_expiry TEXT,
  driver_type TEXT NOT NULL CHECK (driver_type IN ('internal', 'contractor')),
  contractor_company TEXT,         -- רק לקבלני משנה
  hourly_rate REAL,
  per_delivery_rate REAL,
  bank_account TEXT,
  status TEXT DEFAULT 'active',    -- active, inactive, on_break, suspended
  current_vehicle_id TEXT,
  rating REAL DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (current_vehicle_id) REFERENCES vehicles(id)
);

-- משלוחים
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,

  -- מקור (איסוף)
  pickup_address TEXT NOT NULL,
  pickup_lat REAL,
  pickup_lng REAL,
  pickup_contact TEXT,
  pickup_notes TEXT,

  -- יעד (מסירה)
  delivery_address TEXT NOT NULL,
  delivery_lat REAL,
  delivery_lng REAL,
  delivery_notes TEXT,

  -- מאפיינים
  weight_kg REAL DEFAULT 0,
  volume REAL DEFAULT 0,
  packages_count INTEGER DEFAULT 1,
  declared_value REAL DEFAULT 0,
  payment_on_delivery REAL DEFAULT 0,

  -- שיבוץ
  driver_id TEXT,
  vehicle_id TEXT,
  assigned_at TEXT,

  -- חלון זמן
  scheduled_pickup_at TEXT,
  scheduled_delivery_at TEXT,
  eta TEXT,

  -- סטטוס: assigned -> en_route -> arrived -> delivered
  status TEXT DEFAULT 'pending' CHECK (status IN
    ('pending','assigned','en_route','arrived','delivered','failed','cancelled')),

  priority INTEGER DEFAULT 3,      -- 1=דחוף, 5=רגיל
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (driver_id) REFERENCES drivers(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- תיעוד מסירה - חתימה, תמונה, מיקום
CREATE TABLE IF NOT EXISTS delivery_proofs (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  signature_data TEXT,        -- Base64 PNG מקנבס חתימה
  photo_path TEXT,            -- נתיב לקובץ תמונה
  recipient_name TEXT,
  recipient_id_number TEXT,
  gps_lat REAL,
  gps_lng REAL,
  gps_accuracy REAL,
  notes TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
);

-- מעקב מיקום של משלוח לאורך הזמן
CREATE TABLE IF NOT EXISTS tracking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id TEXT NOT NULL,
  event_type TEXT NOT NULL,   -- location_update, status_change, geofence_enter, geofence_exit
  lat REAL,
  lng REAL,
  status TEXT,
  metadata TEXT,              -- JSON
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
);

-- חשבוניות לקבלני משנה
CREATE TABLE IF NOT EXISTS driver_invoices (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  deliveries_count INTEGER DEFAULT 0,
  total_amount REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, sent, paid, cancelled
  paid_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- פריטי חשבונית
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id TEXT NOT NULL,
  delivery_id TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  FOREIGN KEY (invoice_id) REFERENCES driver_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
);

-- אזורי גיאופנסינג
CREATE TABLE IF NOT EXISTS geofences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'circle',     -- circle, polygon
  center_lat REAL,
  center_lng REAL,
  radius_meters REAL,
  polygon_json TEXT,              -- JSON של נקודות לפוליגון
  trigger_event TEXT DEFAULT 'both', -- enter, exit, both
  webhook_url TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_created ON deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_delivery ON tracking_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_tracking_timestamp ON tracking_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_type ON drivers(driver_type);
`;

db.exec(SCHEMA);

module.exports = db;
