import { getDb } from "./index";

export interface MealTally {
  mealName: string;
  quantity: number;
}

export interface MealTallyByCustomer {
  mealName: string;
  breakdown: { customerName: string; quantity: number }[];
  total: number;
}

export interface DashboardStats {
  totalOrders: number;
  totalMeals: number;
  totalRevenueCents: number;
  unpaidOrders: number;
  paidOrders: number;
  deliveries: number;
  ordersToday: number;
}

const ACTIVE = "order_status != 'cancelled'";

/** Aggregate stats for a week (by weekly_menu_id). */
export function dashboardStatsForWeek(weekId: number | null, todayISO: string): DashboardStats {
  const db = getDb();
  const weekClause = weekId ? "weekly_menu_id = ?" : "1=1";
  const p = weekId ? [weekId] : [];

  const base = db
    .prepare(
      `SELECT
        COUNT(*) AS orders,
        COALESCE(SUM(total_cents),0) AS revenue,
        SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid,
        SUM(CASE WHEN delivery_date IS NOT NULL AND delivery_date != '' THEN 1 ELSE 0 END) AS deliveries
       FROM orders WHERE ${weekClause} AND ${ACTIVE}`
    )
    .get(...p) as {
    orders: number;
    revenue: number;
    unpaid: number;
    paid: number;
    deliveries: number;
  };

  const meals = db
    .prepare(
      `SELECT COALESCE(SUM(oi.quantity),0) AS meals
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE ${weekId ? "o.weekly_menu_id = ?" : "1=1"} AND o.${ACTIVE}`
    )
    .get(...p) as { meals: number };

  const today = db
    .prepare(
      `SELECT COUNT(*) AS c FROM orders
       WHERE substr(created_at,1,10) = ? AND ${weekClause} AND ${ACTIVE}`
    )
    .get(todayISO, ...p) as { c: number };

  return {
    totalOrders: base.orders,
    totalMeals: meals.meals,
    totalRevenueCents: base.revenue,
    unpaidOrders: base.unpaid,
    paidOrders: base.paid,
    deliveries: base.deliveries,
    ordersToday: today.c,
  };
}

/** "Meals Required" — aggregated meal quantities across a week's orders. */
export function mealsRequiredForWeek(weekId: number | null): MealTally[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT oi.meal_name_snapshot AS name, SUM(oi.quantity) AS qty
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE ${weekId ? "o.weekly_menu_id = ?" : "1=1"} AND o.${ACTIVE}
       GROUP BY oi.meal_name_snapshot
       ORDER BY qty DESC, name ASC`
    )
    .all(...(weekId ? [weekId] : [])) as { name: string; qty: number }[];
  return rows.map((r) => ({ mealName: r.name, quantity: r.qty }));
}

/** Production summary with per-customer breakdown per meal. */
export function productionByCustomer(weekId: number | null): MealTallyByCustomer[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT oi.meal_name_snapshot AS name, o.customer_name AS customer, SUM(oi.quantity) AS qty
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE ${weekId ? "o.weekly_menu_id = ?" : "1=1"} AND o.${ACTIVE}
       GROUP BY oi.meal_name_snapshot, o.customer_name
       ORDER BY name ASC, qty DESC`
    )
    .all(...(weekId ? [weekId] : [])) as {
    name: string;
    customer: string;
    qty: number;
  }[];

  const byMeal = new Map<string, MealTallyByCustomer>();
  for (const r of rows) {
    if (!byMeal.has(r.name)) {
      byMeal.set(r.name, { mealName: r.name, breakdown: [], total: 0 });
    }
    const m = byMeal.get(r.name)!;
    m.breakdown.push({ customerName: r.customer || "—", quantity: r.qty });
    m.total += r.qty;
  }
  return [...byMeal.values()];
}
