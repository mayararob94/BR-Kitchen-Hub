import { getDb } from "./index";
import type { Meal } from "@/types";

interface MealRow {
  id: number;
  name: string;
  short_description: string;
  category_id: number | null;
  category_name: string | null;
  price_cents: number;
  is_active: number;
  sort_order: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

function map(r: MealRow): Meal {
  return {
    id: r.id,
    name: r.name,
    shortDescription: r.short_description,
    categoryId: r.category_id,
    categoryName: r.category_name,
    priceCents: r.price_cents,
    isActive: !!r.is_active,
    sortOrder: r.sort_order,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const SELECT = `
  SELECT m.*, c.name AS category_name
  FROM meals m LEFT JOIN categories c ON c.id = m.category_id
`;

export function listMeals(includeInactive = true): Meal[] {
  const rows = getDb()
    .prepare(
      `${SELECT} ${includeInactive ? "" : "WHERE m.is_active = 1"}
       ORDER BY m.sort_order ASC, m.name ASC`
    )
    .all() as MealRow[];
  return rows.map(map);
}

export function getMeal(id: number): Meal | null {
  const r = getDb().prepare(`${SELECT} WHERE m.id = ?`).get(id) as
    | MealRow
    | undefined;
  return r ? map(r) : null;
}

export interface MealInput {
  name: string;
  shortDescription?: string;
  categoryId?: number | null;
  priceCents: number;
  isActive?: boolean;
  sortOrder?: number;
  notes?: string;
}

export function createMeal(data: MealInput): number {
  const info = getDb()
    .prepare(
      `INSERT INTO meals (name, short_description, category_id, price_cents, is_active, sort_order, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.shortDescription ?? "",
      data.categoryId ?? null,
      data.priceCents,
      data.isActive === false ? 0 : 1,
      data.sortOrder ?? 0,
      data.notes ?? ""
    );
  return Number(info.lastInsertRowid);
}

export function updateMeal(id: number, data: Partial<MealInput>): void {
  const cur = getMeal(id);
  if (!cur) return;
  getDb()
    .prepare(
      `UPDATE meals SET name = ?, short_description = ?, category_id = ?, price_cents = ?,
       is_active = ?, sort_order = ?, notes = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`
    )
    .run(
      data.name ?? cur.name,
      data.shortDescription ?? cur.shortDescription,
      data.categoryId === undefined ? cur.categoryId : data.categoryId,
      data.priceCents ?? cur.priceCents,
      (data.isActive ?? cur.isActive) ? 1 : 0,
      data.sortOrder ?? cur.sortOrder,
      data.notes ?? cur.notes,
      id
    );
}

/**
 * Meals are never hard-deleted if referenced by historical orders (protects
 * invoice integrity). If unused, delete; otherwise archive (is_active = 0).
 */
export function deleteMeal(id: number): { ok: boolean; reason?: string } {
  const inOrders = getDb()
    .prepare("SELECT COUNT(*) AS c FROM order_items WHERE meal_id = ?")
    .get(id) as { c: number };
  if (inOrders.c > 0) {
    updateMeal(id, { isActive: false });
    return { ok: false, reason: "in-use-archived" };
  }
  const db = getDb();
  db.prepare("DELETE FROM weekly_menu_items WHERE meal_id = ?").run(id);
  db.prepare("DELETE FROM meals WHERE id = ?").run(id);
  return { ok: true };
}
