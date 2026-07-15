import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { D1Like, D1PreparedLike } from "@/lib/db/types";

/**
 * A D1-compatible adapter backed by an in-memory node:sqlite database. It
 * loads the real migration so tenant-isolation and auth logic are exercised
 * against the actual schema, not a mock. This is how we verify the RLS
 * replacement holds without a live Cloudflare context.
 */
class TestPrepared implements D1PreparedLike {
  private binds: unknown[] = [];
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): D1PreparedLike {
    this.binds = values;
    return this;
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.binds as never[])) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    if (colName) return (row[colName] ?? null) as T;
    return row as T;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const rows = this.db.prepare(this.sql).all(...(this.binds as never[])) as T[];
    return { results: rows };
  }

  async run(): Promise<{ success: boolean }> {
    this.db.prepare(this.sql).run(...(this.binds as never[]));
    return { success: true };
  }
}

export class TestDb implements D1Like {
  private readonly db: DatabaseSync;
  constructor() {
    this.db = new DatabaseSync(":memory:");
    this.db.exec("PRAGMA foreign_keys = ON;");
    const migration = readFileSync(
      resolve(process.cwd(), "migrations/0001_foundation.sql"),
      "utf8",
    );
    this.db.exec(migration);
  }

  prepare(query: string): D1PreparedLike {
    return new TestPrepared(this.db, query);
  }

  async batch(statements: D1PreparedLike[]): Promise<unknown[]> {
    const out: unknown[] = [];
    for (const s of statements) out.push(await s.run());
    return out;
  }

  /** Direct exec for arranging test fixtures. */
  exec(sql: string): void {
    this.db.exec(sql);
  }
}

export function createTestDb(): TestDb {
  return new TestDb();
}
