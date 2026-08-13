/**
 * Money is stored everywhere as integer cents (matching the MEALzinha online
 * project's `_cents` columns) to avoid floating-point rounding errors.
 */

export function formatMoney(cents: number): string {
  const value = (cents ?? 0) / 100;
  return `$${value.toFixed(2)}`;
}

/** Parse a user-entered dollar string ("15.95", "$15.95", "") into cents. */
export function dollarsToCents(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const n = typeof input === "number" ? input : parseFloat(String(input).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function centsToDollars(cents: number): string {
  return ((cents ?? 0) / 100).toFixed(2);
}
