import { getDb } from "./index";
import type { WeeklyMenu, WeeklyMenuItem, WeekStatus } from "@/types";
import { addDays, mondayOf } from "@/lib/format";

interface WeekRow {
  id: number;
  week_start: string;
  week_end: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface WeekItemRow {
  id: number;
  weekly_menu_id: number;
  meal_id: number;
  price_cents: number;
  sort_order: number;
  meal_name: string;
  category_name: string | null;
}

function mapWeek(r: WeekRow): WeeklyMenu {
  return {
    id: r.id,
    weekStart: r.week_start,
    weekEnd: r.week_end,
    status: r.status as WeekStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapItem(r: WeekItemRow): WeeklyMenuItem {
  return {
    id: r.id,
    weeklyMenuId: r.weekly_menu_id,
    mealId: r.meal_id,
    mealName: r.meal_name,
    priceCents: r.price_cents,
    sortOrder: r.sort_order,
    categoryName: r.category_name,
  };
}

export function listWeeks(): WeeklyMenu[] {
  const rows = getDb()
    .prepare("SELECT * FROM weekly_menus ORDER BY week_start DESC")
    .all() as WeekRow[];
  return rows.map(mapWeek);
}

export function getWeek(id: number): WeeklyMenu | null {
  const r = getDb().prepare("SELECT * FROM weekly_menus WHERE id = ?").get(id) as
    | WeekRow
    | undefined;
  return r ? mapWeek(r) : null;
}

export function getWeekByStart(weekStart: string): WeeklyMenu | null {
  const r = getDb()
    .prepare("SELECT * FROM weekly_menus WHERE week_start = ?")
    .get(weekStart) as WeekRow | undefined;
  return r ? mapWeek(r) : null;
}

/** The active week with the latest start date — the New Order default. */
export function getActiveWeek(): WeeklyMenu | null {
  const r = getDb()
    .prepare(
      "SELECT * FROM weekly_menus WHERE status = 'active' ORDER BY week_start DESC LIMIT 1"
    )
    .get() as WeekRow | undefined;
  if (r) return mapWeek(r);
  // Fall back to the most recent week of any status so New Order still works.
  const any = getDb()
    .prepare("SELECT * FROM weekly_menus ORDER BY week_start DESC LIMIT 1")
    .get() as WeekRow | undefined;
  return any ? mapWeek(any) : null;
}

/** Create a week from any date within it (snapped to Monday). */
export function createWeek(dateWithinWeek: string, status: WeekStatus = "draft"): number {
  const start = mondayOf(dateWithinWeek);
  const end = addDays(start, 6);
  const existing = getWeekByStart(start);
  if (existing) return existing.id;
  const info = getDb()
    .prepare(
      "INSERT INTO weekly_menus (week_start, week_end, status) VALUES (?, ?, ?)"
    )
    .run(start, end, status);
  return Number(info.lastInsertRowid);
}

export function setWeekStatus(id: number, status: WeekStatus): void {
  getDb()
    .prepare(
      "UPDATE weekly_menus SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?"
    )
    .run(status, id);
}

export function deleteWeek(id: number): { ok: boolean; reason?: string } {
  const orders = getDb()
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE weekly_menu_id = ?")
    .get(id) as { c: number };
  if (orders.c > 0) return { ok: false, reason: "has-orders" };
  getDb().prepare("DELETE FROM weekly_menus WHERE id = ?").run(id);
  return { ok: true };
}

export function getWeekItems(weeklyMenuId: number): WeeklyMenuItem[] {
  const rows = getDb()
    .prepare(
      `SELECT wmi.*, m.name AS meal_name, c.name AS category_name
       FROM weekly_menu_items wmi
       JOIN meals m ON m.id = wmi.meal_id
       LEFT JOIN categories c ON c.id = m.category_id
       WHERE wmi.weekly_menu_id = ?
       ORDER BY wmi.sort_order ASC, m.name ASC`
    )
    .all(weeklyMenuId) as WeekItemRow[];
  return rows.map(mapItem);
}

/** Add a meal to a week, snapshotting its current price as the week price. */
export function addMealToWeek(weeklyMenuId: number, mealId: number): void {
  const db = getDb();
  const meal = db
    .prepare("SELECT price_cents FROM meals WHERE id = ?")
    .get(mealId) as { price_cents: number } | undefined;
  if (!meal) return;
  const maxSort = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order),0) AS m FROM weekly_menu_items WHERE weekly_menu_id = ?"
    )
    .get(weeklyMenuId) as { m: number };
  db.prepare(
    `INSERT OR IGNORE INTO weekly_menu_items (weekly_menu_id, meal_id, price_cents, sort_order)
     VALUES (?, ?, ?, ?)`
  ).run(weeklyMenuId, mealId, meal.price_cents, maxSort.m + 1);
}

export function removeMealFromWeek(weeklyMenuId: number, mealId: number): void {
  getDb()
    .prepare("DELETE FROM weekly_menu_items WHERE weekly_menu_id = ? AND meal_id = ?")
    .run(weeklyMenuId, mealId);
}

export function setWeekItemPrice(itemId: number, priceCents: number): void {
  getDb()
    .prepare("UPDATE weekly_menu_items SET price_cents = ? WHERE id = ?")
    .run(priceCents, itemId);
}

/** Replace a week's meal set (used when saving the weekly menu editor). */
export function setWeekMeals(
  weeklyMenuId: number,
  items: { mealId: number; priceCents: number }[]
): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM weekly_menu_items WHERE weekly_menu_id = ?").run(weeklyMenuId);
    const ins = db.prepare(
      `INSERT INTO weekly_menu_items (weekly_menu_id, meal_id, price_cents, sort_order)
       VALUES (?, ?, ?, ?)`
    );
    items.forEach((it, i) => ins.run(weeklyMenuId, it.mealId, it.priceCents, i + 1));
  });
  tx();
}

/** Copy the meal set + weekly prices from one week into another. */
export function duplicateWeekMenu(fromWeekId: number, toWeekId: number): void {
  const items = getWeekItems(fromWeekId);
  setWeekMeals(
    toWeekId,
    items.map((i) => ({ mealId: i.mealId, priceCents: i.priceCents }))
  );
}
