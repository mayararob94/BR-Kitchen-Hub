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

-- ═══════════════════════════════════════════════════════════════════════
--  RECIPE / YIELD / COSTING / PRODUCTION MODULE
--  Weights are integer grams, volumes integer millilitres, counts integer
--  "each". Prices are integer cents per kg / per litre / per each. Yield is
--  a REAL percentage (e.g. 75, 250) — ratio = yield_pct / 100.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Ingredients (things purchased externally) ───
CREATE TABLE IF NOT EXISTS ingredients (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  name                   TEXT NOT NULL,
  category               TEXT NOT NULL DEFAULT 'Other',   -- Meat/Protein, Produce, Dry Goods, Dairy…
  base_unit              TEXT NOT NULL DEFAULT 'g' CHECK (base_unit IN ('g','ml','each')),
  default_yield_pct      REAL NOT NULL DEFAULT 100,       -- >0; may exceed 100 (rice, beans…)
  price_cents            INTEGER,                          -- cents per kg / litre / each; NULL = unknown
  supplier               TEXT NOT NULL DEFAULT '',
  supplier_sku           TEXT NOT NULL DEFAULT '',
  pack_size_base         INTEGER,                          -- optional: pack size in base units
  pack_price_cents       INTEGER,                          -- optional: price for one pack
  purchase_increment_base INTEGER,                         -- optional: round purchasing up to this many base units
  buffer_pct_override    REAL,                             -- optional: per-ingredient production buffer
  notes                  TEXT NOT NULL DEFAULT '',
  last_price_update      TEXT,
  is_active              INTEGER NOT NULL DEFAULT 1,
  created_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);

-- ─── Recipes (final dish linked to a meal, OR a batch/sub-recipe) ───
CREATE TABLE IF NOT EXISTS recipes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id           INTEGER REFERENCES meals(id),          -- set for a Final Dish; NULL for a Batch Recipe
  name              TEXT NOT NULL,
  recipe_type       TEXT NOT NULL DEFAULT 'final' CHECK (recipe_type IN ('final','batch')),
  version           INTEGER NOT NULL DEFAULT 1,
  is_active         INTEGER NOT NULL DEFAULT 1,
  -- Batch recipes only: the actual finished yield of one standard batch.
  batch_yield_base  INTEGER,                               -- finished yield in base units
  batch_yield_unit  TEXT NOT NULL DEFAULT 'g' CHECK (batch_yield_unit IN ('g','ml','each')),
  batch_increment   REAL,                                  -- production rounding, in batches (0.25/0.5/1); NULL = exact
  instructions      TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_recipes_meal ON recipes(meal_id);
CREATE INDEX IF NOT EXISTS idx_recipes_type ON recipes(recipe_type);

-- ─── Recipe components (polymorphic: an ingredient OR a child recipe) ───
CREATE TABLE IF NOT EXISTS recipe_components (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id        INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  component_type   TEXT NOT NULL CHECK (component_type IN ('ingredient','recipe')),
  ingredient_id    INTEGER REFERENCES ingredients(id),     -- when component_type = 'ingredient'
  child_recipe_id  INTEGER REFERENCES recipes(id),         -- when component_type = 'recipe'
  -- Meaning of quantity_base depends on context (see recipe-engine.ts):
  --  • ingredient in a FINAL dish  → cooked/finished portion weight
  --  • ingredient in a BATCH recipe → raw input weight for one standard batch
  --  • sub-recipe component        → finished quantity used
  quantity_base    INTEGER NOT NULL DEFAULT 0,
  yield_override   REAL,                                   -- optional per-recipe yield override (ingredient-in-final-dish)
  price_override_cents INTEGER,                            -- optional per-recipe price override
  prep_notes       TEXT NOT NULL DEFAULT '',
  sort_order       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_recipe_components_recipe ON recipe_components(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_components_ingredient ON recipe_components(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_components_child ON recipe_components(child_recipe_id);

-- ─── Production plans (per week; snapshot frozen on finalise) ───
CREATE TABLE IF NOT EXISTS production_plans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  weekly_menu_id    INTEGER NOT NULL REFERENCES weekly_menus(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalised')),
  buffer_pct        REAL NOT NULL DEFAULT 0,
  snapshot_json     TEXT,                                  -- frozen computed result at finalise
  orders_signature  TEXT NOT NULL DEFAULT '',              -- detects order changes after finalise
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  finalised_at      TEXT,
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_production_plans_week ON production_plans(weekly_menu_id);
