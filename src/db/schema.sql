-- מערכת ספקים והזמנות רכש — סכימת SQLite
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tax_id TEXT,                 -- ח.פ / ע.מ
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  bank_account TEXT,
  payment_terms TEXT,          -- שוטף+30, מזומן וכו'
  portal_token TEXT UNIQUE,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'יח׳',
  stock REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- מחיר של מוצר אצל ספק מסוים (מוצר יכול להיות מספר ספקים)
CREATE TABLE IF NOT EXISTS supplier_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  price REAL NOT NULL,
  lead_time_days INTEGER DEFAULT 7,
  min_order_qty REAL DEFAULT 1,
  currency TEXT DEFAULT 'ILS',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(supplier_id, product_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- הזמנות רכש
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft|approved|sent|partial|received|cancelled
  notes TEXT,
  total REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  sent_at TEXT,
  expected_delivery TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS po_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty REAL NOT NULL,
  qty_received REAL DEFAULT 0,
  unit_price REAL NOT NULL,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- תעודת קליטה (Goods Received Note)
CREATE TABLE IF NOT EXISTS grns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_number TEXT UNIQUE NOT NULL,
  po_id INTEGER NOT NULL,
  received_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grn_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_id INTEGER NOT NULL,
  po_item_id INTEGER NOT NULL,
  qty_received REAL NOT NULL,
  FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE,
  FOREIGN KEY (po_item_id) REFERENCES po_items(id)
);

-- דירוגי ספק (זמן, איכות, מחיר)
CREATE TABLE IF NOT EXISTS supplier_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  po_id INTEGER,
  delivery_score INTEGER NOT NULL CHECK(delivery_score BETWEEN 1 AND 5),
  quality_score  INTEGER NOT NULL CHECK(quality_score  BETWEEN 1 AND 5),
  price_score    INTEGER NOT NULL CHECK(price_score    BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_sp_product ON supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_sp_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_poi_po ON po_items(po_id);
CREATE INDEX IF NOT EXISTS idx_ratings_supplier ON supplier_ratings(supplier_id);
