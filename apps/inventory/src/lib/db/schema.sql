-- מערכת ניהול מלאי — סכימה (SQLite / sql.js)
PRAGMA foreign_keys = ON;

-- מיקומים: מטבח / מחסן / וכו'
CREATE TABLE IF NOT EXISTS Location (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'storage' CHECK (type IN ('kitchen','warehouse','storage')),
  active      INTEGER NOT NULL DEFAULT 1
);

-- ספקים
CREATE TABLE IF NOT EXISTS Supplier (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  active      INTEGER NOT NULL DEFAULT 1
);

-- סיבות פחת (חייב להופיע לפני InventoryMovement)
CREATE TABLE IF NOT EXISTS WasteReason (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  code   TEXT UNIQUE NOT NULL,
  name   TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

-- מוצרים: חומרי גלם או מנות מוכנות
CREATE TABLE IF NOT EXISTS Product (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sku             TEXT UNIQUE NOT NULL,
  barcode         TEXT UNIQUE,
  name            TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('raw','dish')),
  unit            TEXT NOT NULL DEFAULT 'יח׳',
  category        TEXT,
  default_cost    REAL NOT NULL DEFAULT 0,
  min_qty         REAL NOT NULL DEFAULT 0,
  reorder_qty     REAL NOT NULL DEFAULT 0,
  shelf_life_days INTEGER,
  default_supplier_id INTEGER REFERENCES Supplier(id),
  active          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- הזמנת רכש (חייב לפני Lot שמפנה אליה)
CREATE TABLE IF NOT EXISTS PurchaseOrder (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number    TEXT UNIQUE NOT NULL,
  supplier_id  INTEGER REFERENCES Supplier(id),
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','received','cancelled')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expected_at  TEXT,
  received_at  TEXT,
  notes        TEXT,
  total        REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS POLine (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id        INTEGER NOT NULL REFERENCES PurchaseOrder(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES Product(id),
  qty          REAL NOT NULL,
  unit_cost    REAL NOT NULL DEFAULT 0,
  qty_received REAL NOT NULL DEFAULT 0
);

-- מצב מלאי כולל לכל מוצר/מיקום
CREATE TABLE IF NOT EXISTS StockLevel (
  product_id   INTEGER NOT NULL REFERENCES Product(id) ON DELETE CASCADE,
  location_id  INTEGER NOT NULL REFERENCES Location(id) ON DELETE CASCADE,
  qty          REAL NOT NULL DEFAULT 0,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (product_id, location_id)
);

-- Lot: מנת כניסה ספציפית (FIFO + תפוגה)
CREATE TABLE IF NOT EXISTS Lot (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id      INTEGER NOT NULL REFERENCES Product(id) ON DELETE CASCADE,
  location_id     INTEGER NOT NULL REFERENCES Location(id) ON DELETE CASCADE,
  lot_code        TEXT NOT NULL,
  qty_initial     REAL NOT NULL,
  qty_remaining   REAL NOT NULL,
  unit_cost       REAL NOT NULL DEFAULT 0,
  received_at     TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT,
  supplier_id     INTEGER REFERENCES Supplier(id),
  po_id           INTEGER REFERENCES PurchaseOrder(id),
  notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_lot_fifo ON Lot(product_id, location_id, qty_remaining, expires_at, received_at);

-- תנועות מלאי
CREATE TABLE IF NOT EXISTS InventoryMovement (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            TEXT NOT NULL DEFAULT (datetime('now')),
  type          TEXT NOT NULL CHECK (type IN ('IN','OUT','ADJUST','WASTE','TRANSFER','PRODUCE','CONSUME')),
  product_id    INTEGER NOT NULL REFERENCES Product(id),
  location_id   INTEGER NOT NULL REFERENCES Location(id),
  qty           REAL NOT NULL,
  unit_cost     REAL NOT NULL DEFAULT 0,
  lot_id        INTEGER REFERENCES Lot(id),
  ref_type      TEXT,
  ref_id        INTEGER,
  reason_id     INTEGER REFERENCES WasteReason(id),
  user_name     TEXT,
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_mov_product ON InventoryMovement(product_id, ts);
CREATE INDEX IF NOT EXISTS idx_mov_ts ON InventoryMovement(ts);

-- BOM
CREATE TABLE IF NOT EXISTS BOM (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  dish_id     INTEGER NOT NULL REFERENCES Product(id) ON DELETE CASCADE,
  raw_id      INTEGER NOT NULL REFERENCES Product(id),
  qty         REAL NOT NULL,
  notes       TEXT,
  UNIQUE (dish_id, raw_id)
);

-- ספירת מלאי תקופתית
CREATE TABLE IF NOT EXISTS CycleCount (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  code         TEXT UNIQUE NOT NULL,
  location_id  INTEGER NOT NULL REFERENCES Location(id),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','finalized','cancelled')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  finalized_at TEXT,
  notes        TEXT
);

CREATE TABLE IF NOT EXISTS CycleCountLine (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  count_id     INTEGER NOT NULL REFERENCES CycleCount(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES Product(id),
  qty_system   REAL NOT NULL,
  qty_counted  REAL,
  variance     REAL,
  notes        TEXT,
  UNIQUE(count_id, product_id)
);

-- התראות
CREATE TABLE IF NOT EXISTS Alert (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          TEXT NOT NULL DEFAULT (datetime('now')),
  level       TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info','warn','critical')),
  type        TEXT NOT NULL,
  product_id  INTEGER REFERENCES Product(id),
  location_id INTEGER REFERENCES Location(id),
  message     TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_alert_ack ON Alert(acknowledged, ts);
