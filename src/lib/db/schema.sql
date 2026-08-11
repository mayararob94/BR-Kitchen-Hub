-- MEALzinha Hub — local SQLite schema.
-- SQLite dialect matches Cloudflare D1 (used by the online project) so a future
-- migration/sync is straightforward. Money is stored as integer cents.

PRAGMA foreign_keys = ON;

-- ─── Settings (key/value, mirrors app_settings in the online project) ───
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Categories ───
CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Meals / Products ───
CREATE TABLE IF NOT EXISTS meals (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  category_id       INTEGER REFERENCES categories(id),
  price_cents       INTEGER NOT NULL DEFAULT 0,
  is_active         INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_meals_category ON meals(category_id);

-- ─── Customers ───
CREATE TABLE IF NOT EXISTS customers (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name            TEXT NOT NULL DEFAULT '',
  last_name             TEXT NOT NULL DEFAULT '',
  phone                 TEXT NOT NULL DEFAULT '',
  email                 TEXT NOT NULL DEFAULT '',
  address_line1         TEXT NOT NULL DEFAULT '',
  address_line2         TEXT NOT NULL DEFAULT '',
  suburb                TEXT NOT NULL DEFAULT '',
  state                 TEXT NOT NULL DEFAULT '',
  postcode              TEXT NOT NULL DEFAULT '',
  delivery_instructions TEXT NOT NULL DEFAULT '',
  delivery_window       TEXT NOT NULL DEFAULT '',
  delivery_preference   TEXT NOT NULL DEFAULT '',
  notes                 TEXT NOT NULL DEFAULT '',
  is_active             INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- ─── Weekly menus ───
CREATE TABLE IF NOT EXISTS weekly_menus (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,          -- YYYY-MM-DD (Monday)
  week_end   TEXT NOT NULL,          -- YYYY-MM-DD (Sunday)
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_menus_start ON weekly_menus(week_start);

CREATE TABLE IF NOT EXISTS weekly_menu_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  weekly_menu_id  INTEGER NOT NULL REFERENCES weekly_menus(id) ON DELETE CASCADE,
  meal_id         INTEGER NOT NULL REFERENCES meals(id),
  price_cents     INTEGER NOT NULL DEFAULT 0,  -- price for this week (from meal at add time, editable)
  sort_order      INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_menu_items_unique
  ON weekly_menu_items(weekly_menu_id, meal_id);

-- ─── Orders ───
CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number   TEXT NOT NULL,
  invoice_number TEXT,
  weekly_menu_id INTEGER REFERENCES weekly_menus(id),
  customer_id    INTEGER REFERENCES customers(id),
  delivery_date  TEXT,

  -- Customer snapshot at order time (keeps historical labels/invoices stable)
  customer_name         TEXT NOT NULL DEFAULT '',
  customer_phone        TEXT NOT NULL DEFAULT '',
  customer_email        TEXT NOT NULL DEFAULT '',
  address_line1         TEXT NOT NULL DEFAULT '',
  address_line2         TEXT NOT NULL DEFAULT '',
  suburb                TEXT NOT NULL DEFAULT '',
  state                 TEXT NOT NULL DEFAULT '',
  postcode              TEXT NOT NULL DEFAULT '',
  delivery_instructions TEXT NOT NULL DEFAULT '',
  delivery_window       TEXT NOT NULL DEFAULT '',
  delivery_preference   TEXT NOT NULL DEFAULT '',

  order_status   TEXT NOT NULL DEFAULT 'draft'
    CHECK (order_status IN ('draft','confirmed','preparing','ready','delivered','cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','partial')),

  subtotal_cents     INTEGER NOT NULL DEFAULT 0,
  delivery_fee_cents INTEGER NOT NULL DEFAULT 0,
  discount_type      TEXT NOT NULL DEFAULT 'amount' CHECK (discount_type IN ('amount','percent')),
  discount_value     INTEGER NOT NULL DEFAULT 0,  -- percent number, or dollar-cents when amount
  discount_cents     INTEGER NOT NULL DEFAULT 0,  -- actual applied discount
  total_cents        INTEGER NOT NULL DEFAULT 0,

  amount_paid_cents  INTEGER NOT NULL DEFAULT 0,
  payment_date       TEXT,
  payment_reference  TEXT NOT NULL DEFAULT '',

  notes      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_invoice_number
  ON orders(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_week ON orders(weekly_menu_id);

-- ─── Order items (price snapshot — never recalculated from current meal price) ───
CREATE TABLE IF NOT EXISTS order_items (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id           INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  meal_id            INTEGER REFERENCES meals(id),
  meal_name_snapshot TEXT NOT NULL,
  unit_price_cents   INTEGER NOT NULL,
  quantity           INTEGER NOT NULL,
  line_total_cents   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_meal ON order_items(meal_id);
