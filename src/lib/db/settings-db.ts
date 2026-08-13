import { getDb } from "./index";
import type { AppSettings } from "@/types";

interface SettingRow {
  key: string;
  value: string;
}

export function getRawSettings(): Record<string, string> {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as SettingRow[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function getSetting(key: string, fallback = ""): string {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as SettingRow | undefined;
  return row ? row.value : fallback;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(key, value);
}

export function setSettings(entries: Record<string, string>): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );
  const tx = db.transaction((obj: Record<string, string>) => {
    for (const [k, v] of Object.entries(obj)) stmt.run(k, v);
  });
  tx(entries);
}

export function getSettings(): AppSettings {
  const s = getRawSettings();
  const num = (k: string, d = 0) => {
    const n = parseInt(s[k] ?? "", 10);
    return Number.isNaN(n) ? d : n;
  };
  return {
    businessName: s.businessName ?? "",
    tradingName: s.tradingName ?? "",
    tagline: s.tagline ?? "",
    abn: s.abn ?? "",
    address: s.address ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    website: s.website ?? "",
    invoiceFooterNote: s.invoiceFooterNote ?? "",

    accountName: s.bankAccountName ?? "",
    bsb: s.bankBsb ?? "",
    accountNumber: s.bankAccountNumber ?? "",
    paymentInstructions: s.bankPaymentInstructions ?? "",

    orderPrefix: s.orderPrefix ?? "ORD-",
    orderNext: num("orderNext", 1),
    invoicePrefix: s.invoicePrefix ?? "INV-",
    invoiceNext: num("invoiceNext", 1),
    defaultDeliveryFeeCents: num("defaultDeliveryFeeCents", 0),

    invoicePaperSize: s.invoicePaperSize ?? "A4",
    labelSize: s.labelSize ?? "4x6",
    labelOrientation: s.labelOrientation ?? "portrait",
  };
}

/** Zero-padded sequential number, e.g. ORD-0001. */
export function formatSeq(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/**
 * Atomically consume the next order number and advance the counter.
 * Must be called inside an existing transaction OR standalone (it self-guards).
 */
export function nextOrderNumber(): string {
  const db = getDb();
  const prefix = getSetting("orderPrefix", "ORD-");
  const current = parseInt(getSetting("orderNext", "1"), 10) || 1;
  setSetting("orderNext", String(current + 1));
  return formatSeq(prefix, current);
}

/** Atomically consume the next invoice number and advance the counter. */
export function nextInvoiceNumber(): string {
  const prefix = getSetting("invoicePrefix", "INV-");
  const current = parseInt(getSetting("invoiceNext", "1"), 10) || 1;
  setSetting("invoiceNext", String(current + 1));
  return formatSeq(prefix, current);
}
