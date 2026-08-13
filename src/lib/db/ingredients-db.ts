import { getDb } from "./index";
import type { Ingredient, BaseUnit } from "@/types";

interface IngredientRow {
  id: number;
  ingredient_code: string | null;
  name: string;
  category: string;
  base_unit: string;
  default_yield_pct: number;
  price_cents: number | null;
  supplier: string;
  supplier_sku: string;
  pack_size_base: number | null;
  pack_price_cents: number | null;
  purchase_increment_base: number | null;
  buffer_pct_override: number | null;
  notes: string;
  last_price_update: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * Effective unit price in cents per kg / litre / each. When a pack size + pack
 * price are set, the equivalent per-kg/L/each price is derived from them;
 * otherwise the directly-entered price is used.
 */
export function effectivePrice(
  priceCents: number | null,
  packSizeBase: number | null,
  packPriceCents: number | null,
  baseUnit: BaseUnit
): number | null {
  if (packSizeBase && packPriceCents != null && packSizeBase > 0) {
    const perBase = packPriceCents / packSizeBase; // cents per base unit
    return baseUnit === "each" ? perBase : perBase * 1000;
  }
  return priceCents;
}

function map(r: IngredientRow): Ingredient {
  const baseUnit = r.base_unit as BaseUnit;
  return {
    id: r.id,
    code: r.ingredient_code,
    name: r.name,
    category: r.category,
    baseUnit,
    defaultYieldPct: r.default_yield_pct,
    priceCents: r.price_cents,
    supplier: r.supplier,
    supplierSku: r.supplier_sku,
    packSizeBase: r.pack_size_base,
    packPriceCents: r.pack_price_cents,
    purchaseIncrementBase: r.purchase_increment_base,
    bufferPctOverride: r.buffer_pct_override,
    notes: r.notes,
    lastPriceUpdate: r.last_price_update,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    effectivePriceCents: effectivePrice(
      r.price_cents,
      r.pack_size_base,
      r.pack_price_cents,
      baseUnit
    ),
  };
}

export function listIngredients(includeInactive = true): Ingredient[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM ingredients ${includeInactive ? "" : "WHERE is_active = 1"}
       ORDER BY category ASC, name ASC`
    )
    .all() as IngredientRow[];
  return rows.map(map);
}

export function getIngredient(id: number): Ingredient | null {
  const r = getDb().prepare("SELECT * FROM ingredients WHERE id = ?").get(id) as
    | IngredientRow
    | undefined;
  return r ? map(r) : null;
}

export function getIngredientsMap(): Map<number, Ingredient> {
  return new Map(listIngredients().map((i) => [i.id, i]));
}

export interface IngredientInput {
  code?: string | null;
  name: string;
  category?: string;
  baseUnit?: BaseUnit;
  defaultYieldPct: number;
  priceCents?: number | null;
  supplier?: string;
  supplierSku?: string;
  packSizeBase?: number | null;
  packPriceCents?: number | null;
  purchaseIncrementBase?: number | null;
  bufferPctOverride?: number | null;
  notes?: string;
  isActive?: boolean;
}

export type PriceChangeSource = "MANUAL" | "CSV_IMPORT";

function normCode(code: string | null | undefined): string | null {
  const c = (code ?? "").trim();
  return c === "" ? null : c;
}

export function getIngredientByCode(code: string): Ingredient | null {
  const c = normCode(code);
  if (!c) return null;
  const r = getDb()
    .prepare("SELECT * FROM ingredients WHERE ingredient_code = ? COLLATE NOCASE")
    .get(c) as IngredientRow | undefined;
  return r ? map(r) : null;
}

/** Record an ingredient price change for later analysis (§15). */
export function recordPriceChange(
  ingredientId: number,
  oldPriceCents: number | null,
  newPriceCents: number | null,
  source: PriceChangeSource,
  changedBy = "Owner"
): void {
  if (oldPriceCents === newPriceCents) return;
  getDb()
    .prepare(
      `INSERT INTO ingredient_price_history (ingredient_id, old_price_cents, new_price_cents, source, changed_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(ingredientId, oldPriceCents, newPriceCents, source, changedBy);
}

export function createIngredient(
  data: IngredientInput,
  source: PriceChangeSource = "MANUAL",
  changedBy = "Owner"
): number {
  const info = getDb()
    .prepare(
      `INSERT INTO ingredients
        (ingredient_code, name, category, base_unit, default_yield_pct, price_cents, supplier, supplier_sku,
         pack_size_base, pack_price_cents, purchase_increment_base, buffer_pct_override,
         notes, last_price_update, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      normCode(data.code),
      data.name,
      data.category ?? "Other",
      data.baseUnit ?? "g",
      data.defaultYieldPct,
      data.priceCents ?? null,
      data.supplier ?? "",
      data.supplierSku ?? "",
      data.packSizeBase ?? null,
      data.packPriceCents ?? null,
      data.purchaseIncrementBase ?? null,
      data.bufferPctOverride ?? null,
      data.notes ?? "",
      data.priceCents != null || data.packPriceCents != null
        ? new Date().toISOString().slice(0, 10)
        : null,
      data.isActive === false ? 0 : 1
    );
  const id = Number(info.lastInsertRowid);
  const created = getIngredient(id);
  if (created && created.effectivePriceCents != null) {
    recordPriceChange(id, null, created.effectivePriceCents, source, changedBy);
  }
  return id;
}

export function updateIngredient(
  id: number,
  data: IngredientInput,
  source: PriceChangeSource = "MANUAL",
  changedBy = "Owner"
): void {
  const cur = getIngredient(id);
  if (!cur) return;
  const priceChanged =
    (data.priceCents ?? null) !== cur.priceCents ||
    (data.packPriceCents ?? null) !== cur.packPriceCents;
  getDb()
    .prepare(
      `UPDATE ingredients SET
        ingredient_code=?, name=?, category=?, base_unit=?, default_yield_pct=?, price_cents=?, supplier=?, supplier_sku=?,
        pack_size_base=?, pack_price_cents=?, purchase_increment_base=?, buffer_pct_override=?,
        notes=?, last_price_update=?, is_active=?,
        updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE id=?`
    )
    .run(
      data.code === undefined ? cur.code : normCode(data.code),
      data.name,
      data.category ?? cur.category,
      data.baseUnit ?? cur.baseUnit,
      data.defaultYieldPct,
      data.priceCents === undefined ? cur.priceCents : data.priceCents,
      data.supplier ?? cur.supplier,
      data.supplierSku ?? cur.supplierSku,
      data.packSizeBase === undefined ? cur.packSizeBase : data.packSizeBase,
      data.packPriceCents === undefined ? cur.packPriceCents : data.packPriceCents,
      data.purchaseIncrementBase === undefined
        ? cur.purchaseIncrementBase
        : data.purchaseIncrementBase,
      data.bufferPctOverride === undefined
        ? cur.bufferPctOverride
        : data.bufferPctOverride,
      data.notes ?? cur.notes,
      priceChanged ? new Date().toISOString().slice(0, 10) : cur.lastPriceUpdate,
      (data.isActive ?? cur.isActive) ? 1 : 0,
      id
    );
  if (priceChanged) {
    const after = getIngredient(id);
    recordPriceChange(
      id,
      cur.effectivePriceCents,
      after?.effectivePriceCents ?? null,
      source,
      changedBy
    );
  }
}

/** Ingredients referenced by any recipe are archived, not deleted (integrity). */
export function deleteIngredient(id: number): { ok: boolean; reason?: string } {
  const used = getDb()
    .prepare(
      "SELECT COUNT(*) AS c FROM recipe_components WHERE ingredient_id = ?"
    )
    .get(id) as { c: number };
  if (used.c > 0) {
    getDb()
      .prepare(
        "UPDATE ingredients SET is_active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?"
      )
      .run(id);
    return { ok: false, reason: "in-use-archived" };
  }
  getDb().prepare("DELETE FROM ingredients WHERE id = ?").run(id);
  return { ok: true };
}
