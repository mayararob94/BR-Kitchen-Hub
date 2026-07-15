/**
 * Minimal D1-compatible database interface.
 *
 * We depend on this narrow surface rather than the full `D1Database` type so
 * the repository layer can be exercised in unit tests with a plain SQLite
 * adapter, and so a missing `wrangler types` step never breaks typechecking.
 * The shape matches Cloudflare D1's prepared-statement API.
 */
export interface D1PreparedLike {
  bind(...values: unknown[]): D1PreparedLike;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: Record<string, unknown> }>;
}

export interface D1Like {
  prepare(query: string): D1PreparedLike;
  batch(statements: D1PreparedLike[]): Promise<unknown[]>;
}
