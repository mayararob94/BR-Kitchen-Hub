/**
 * Unit handling for the production module.
 *
 * Internally everything is stored in integer base units:
 *   • weight  → grams (g)
 *   • volume  → millilitres (ml)
 *   • count   → each
 *
 * Prices are integer cents per **kg / litre / each**. Convert only for display.
 */

export type BaseUnit = "g" | "ml" | "each";

/** Human display of a base-unit quantity, e.g. 5400g → "5.40kg", 250ml → "250ml". */
export function formatQty(base: number, unit: BaseUnit): string {
  if (unit === "each") {
    return `${round(base, 2)} ea`;
  }
  const big = unit === "g" ? "kg" : "L";
  if (Math.abs(base) >= 1000) {
    return `${round(base / 1000, 2)}${big}`;
  }
  return `${round(base, 0)}${unit}`;
}

/** Always display in the large unit (kg / L / each) — used in tables/PDFs. */
export function formatBig(base: number, unit: BaseUnit): string {
  if (unit === "each") return `${round(base, 2)} ea`;
  const big = unit === "g" ? "kg" : "L";
  return `${round(base / 1000, 3)}${big}`;
}

export function unitBigLabel(unit: BaseUnit): string {
  return unit === "g" ? "kg" : unit === "ml" ? "L" : "each";
}

export function unitSmallLabel(unit: BaseUnit): string {
  return unit;
}

/** Parse a big-unit number ("5.4" kg) into integer base units (5400 g). */
export function bigToBase(value: string | number, unit: BaseUnit): number {
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return 0;
  if (unit === "each") return Math.round(n);
  return Math.round(n * 1000);
}

/** Convert integer base units back to a big-unit number (for editing fields). */
export function baseToBig(base: number, unit: BaseUnit): number {
  if (unit === "each") return base;
  return base / 1000;
}

/** Parse a small-unit number ("200" g) directly into base units. */
export function smallToBase(value: string | number): number {
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n);
}

function round(n: number, dp: number): string | number {
  const f = Math.pow(10, dp);
  const r = Math.round(n * f) / f;
  return dp === 0 ? r : r.toFixed(dp);
}

/** Yield percentage → ratio. 250 → 2.5, 75 → 0.75. */
export function yieldRatio(pct: number): number {
  return pct / 100;
}
