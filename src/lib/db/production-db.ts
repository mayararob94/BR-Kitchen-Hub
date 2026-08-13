import crypto from "node:crypto";
import { getDb } from "./index";
import { getAllRecipesMap } from "./recipes-db";
import { getIngredientsMap } from "./ingredients-db";
import { getSetting } from "./settings-db";
import { computeProduction, type EngineData, type OrderLine } from "@/lib/recipe-engine";
import type { ProductionComputation, ProductionPlan, ProductionStatus } from "@/types";

// Orders counted for production: everything a kitchen would actually make.
const PRODUCTION_STATUSES = "('confirmed','preparing','ready','delivered')";

interface PlanRow {
  id: number;
  weekly_menu_id: number;
  status: string;
  buffer_pct: number;
  snapshot_json: string | null;
  orders_signature: string;
  created_at: string;
  finalised_at: string | null;
  updated_at: string;
}

/** Confirmed order lines (meal → portions) for a week. */
export function orderLinesForWeek(weekId: number): OrderLine[] {
  const rows = getDb()
    .prepare(
      `SELECT oi.meal_id AS mealId, SUM(oi.quantity) AS portions
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.weekly_menu_id = ? AND o.order_status IN ${PRODUCTION_STATUSES}
         AND oi.meal_id IS NOT NULL
       GROUP BY oi.meal_id`
    )
    .all(weekId) as { mealId: number; portions: number }[];
  return rows.map((r) => ({ mealId: r.mealId, portions: r.portions }));
}

export function orderCountForWeek(weekId: number): number {
  const r = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM orders
       WHERE weekly_menu_id = ? AND order_status IN ${PRODUCTION_STATUSES}`
    )
    .get(weekId) as { c: number };
  return r.c;
}

/** Stable signature of the week's order lines — detects post-finalise changes. */
export function ordersSignature(weekId: number): string {
  const lines = orderLinesForWeek(weekId)
    .slice()
    .sort((a, b) => a.mealId - b.mealId)
    .map((l) => `${l.mealId}:${l.portions}`)
    .join("|");
  return crypto.createHash("sha1").update(lines).digest("hex");
}

function engineData(): EngineData {
  return { recipes: getAllRecipesMap(), ingredients: getIngredientsMap() };
}

/** Live computation for a week (used for Draft plans and previews). */
export function computeForWeek(weekId: number, bufferPct: number): ProductionComputation {
  const data = engineData();
  const lines = orderLinesForWeek(weekId);
  const result = computeProduction(weekId, lines, data, bufferPct);
  result.totalOrders = orderCountForWeek(weekId);
  return result;
}

function mapPlan(r: PlanRow): ProductionPlan {
  return {
    id: r.id,
    weeklyMenuId: r.weekly_menu_id,
    status: r.status as ProductionStatus,
    bufferPct: r.buffer_pct,
    ordersSignature: r.orders_signature,
    createdAt: r.created_at,
    finalisedAt: r.finalised_at,
    updatedAt: r.updated_at,
    snapshot: r.snapshot_json ? (JSON.parse(r.snapshot_json) as ProductionComputation) : null,
  };
}

export function getPlan(weekId: number): ProductionPlan | null {
  const r = getDb()
    .prepare("SELECT * FROM production_plans WHERE weekly_menu_id = ?")
    .get(weekId) as PlanRow | undefined;
  return r ? mapPlan(r) : null;
}

function defaultBuffer(): number {
  const v = parseFloat(getSetting("defaultBufferPct", "5"));
  return Number.isNaN(v) ? 5 : v;
}

/** Get the plan for a week, creating a Draft if none exists. */
export function ensurePlan(weekId: number): ProductionPlan {
  const existing = getPlan(weekId);
  if (existing) return existing;
  getDb()
    .prepare(
      "INSERT INTO production_plans (weekly_menu_id, status, buffer_pct) VALUES (?, 'draft', ?)"
    )
    .run(weekId, defaultBuffer());
  return getPlan(weekId)!;
}

export function setPlanBuffer(weekId: number, bufferPct: number): void {
  ensurePlan(weekId);
  getDb()
    .prepare(
      "UPDATE production_plans SET buffer_pct = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE weekly_menu_id = ?"
    )
    .run(bufferPct, weekId);
}

/** Freeze the current computation into the plan snapshot. */
export function finalisePlan(weekId: number): ProductionPlan {
  const plan = ensurePlan(weekId);
  const snapshot = computeForWeek(weekId, plan.bufferPct);
  const sig = ordersSignature(weekId);
  getDb()
    .prepare(
      `UPDATE production_plans
       SET status = 'finalised', snapshot_json = ?, orders_signature = ?,
           finalised_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
           updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE weekly_menu_id = ?`
    )
    .run(JSON.stringify(snapshot), sig, weekId);
  return getPlan(weekId)!;
}

/** Reopen a finalised plan back to Draft (keeps the last snapshot until re-finalised). */
export function reopenPlan(weekId: number): void {
  getDb()
    .prepare(
      "UPDATE production_plans SET status = 'draft', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE weekly_menu_id = ?"
    )
    .run(weekId);
}

/** True if orders changed since a finalised plan was frozen. */
export function ordersChangedSinceFinalise(weekId: number): boolean {
  const plan = getPlan(weekId);
  if (!plan || plan.status !== "finalised") return false;
  return plan.ordersSignature !== ordersSignature(weekId);
}

/**
 * The computation to show for a week: the frozen snapshot when finalised,
 * otherwise a live draft computation.
 */
export function resolveComputation(weekId: number): {
  plan: ProductionPlan;
  computation: ProductionComputation;
  ordersChanged: boolean;
} {
  const plan = ensurePlan(weekId);
  if (plan.status === "finalised" && plan.snapshot) {
    return {
      plan,
      computation: plan.snapshot,
      ordersChanged: plan.ordersSignature !== ordersSignature(weekId),
    };
  }
  return {
    plan,
    computation: computeForWeek(weekId, plan.bufferPct),
    ordersChanged: false,
  };
}
