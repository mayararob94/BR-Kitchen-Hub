import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Single shared better-sqlite3 connection.
 *
 * The database file lives at <project>/data/mealzinha.db (override with
 * MEALZINHA_DB_PATH). The schema is applied automatically on first access, so
 * the operator never runs a migration step — `npm run dev` just works.
 */

const DB_PATH =
  process.env.MEALZINHA_DB_PATH || path.join(process.cwd(), "data", "mealzinha.db");

let _db: Database.Database | null = null;

export function getDbPath(): string {
  return DB_PATH;
}

// Default settings seeded on first run. Kept here (not in demo seed) because the
// app depends on these keys existing.
const DEFAULT_SETTINGS: Record<string, string> = {
  businessName: "MEALzinha",
  tradingName: "MEALzinha",
  abn: "47 971 306 531",
  address: "Gold Coast, QLD",
  phone: "+61489154463",
  email: "orders@mealzinha.com.au",
  website: "mealzinha.com.au",

  bankAccountName: "MEALzinha",
  bankBsb: "",
  bankAccountNumber: "",
  bankPaymentInstructions: "Please use your invoice number as the payment reference.",

  orderPrefix: "ORD-",
  orderNext: "1",
  invoicePrefix: "INV-",
  invoiceNext: "1",
  defaultDeliveryFeeCents: "0",

  // Production module: default waste/production buffer applied to ingredient
  // purchasing requirements (per-ingredient override possible).
  defaultBufferPct: "5",

  invoicePaperSize: "A4",
  labelSize: "4x6",
  labelOrientation: "portrait",
};

function applySchema(db: Database.Database) {
  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);

  // Seed default settings for any key that doesn't exist yet.
  const insert = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  const seed = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insert.run(key, value);
    }
  });
  seed();
}

/** Close and forget the current connection (used after a restore swaps the file). */
export function resetDb(): void {
  if (_db) {
    try {
      _db.close();
    } catch {
      /* already closed */
    }
    _db = null;
  }
}

export function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  applySchema(db);

  _db = db;
  return db;
}
