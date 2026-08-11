import { getDb } from "./index";
import type { Category } from "@/types";

interface CategoryRow {
  id: number;
  name: string;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function map(r: CategoryRow): Category {
  return {
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listCategories(includeInactive = true): Category[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM categories ${includeInactive ? "" : "WHERE is_active = 1"}
       ORDER BY sort_order ASC, name ASC`
    )
    .all() as CategoryRow[];
  return rows.map(map);
}

export function getCategory(id: number): Category | null {
  const r = getDb().prepare("SELECT * FROM categories WHERE id = ?").get(id) as
    | CategoryRow
    | undefined;
  return r ? map(r) : null;
}

export function createCategory(data: {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}): number {
  const info = getDb()
    .prepare(
      "INSERT INTO categories (name, sort_order, is_active) VALUES (?, ?, ?)"
    )
    .run(data.name, data.sortOrder ?? 0, data.isActive === false ? 0 : 1);
  return Number(info.lastInsertRowid);
}

export function updateCategory(
  id: number,
  data: { name?: string; sortOrder?: number; isActive?: boolean }
): void {
  const cur = getCategory(id);
  if (!cur) return;
  getDb()
    .prepare(
      `UPDATE categories SET name = ?, sort_order = ?, is_active = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`
    )
    .run(
      data.name ?? cur.name,
      data.sortOrder ?? cur.sortOrder,
      (data.isActive ?? cur.isActive) ? 1 : 0,
      id
    );
}

/** A category can only be deleted if no meal references it; otherwise archive. */
export function deleteCategory(id: number): { ok: boolean; reason?: string } {
  const count = getDb()
    .prepare("SELECT COUNT(*) AS c FROM meals WHERE category_id = ?")
    .get(id) as { c: number };
  if (count.c > 0) {
    updateCategory(id, { isActive: false });
    return { ok: false, reason: "in-use-archived" };
  }
  getDb().prepare("DELETE FROM categories WHERE id = ?").run(id);
  return { ok: true };
}
