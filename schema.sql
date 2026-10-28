PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  product_code TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'none',
  category TEXT NOT NULL DEFAULT 'Kita',
  unit TEXT NOT NULL DEFAULT 'vnt.',
  quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity REAL NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movements (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  item_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  change_type TEXT NOT NULL,
  change_amount REAL NOT NULL DEFAULT 0,
  quantity_after REAL NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_movements_created_at ON movements(created_at DESC);
