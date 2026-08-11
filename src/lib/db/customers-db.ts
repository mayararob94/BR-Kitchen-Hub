import { getDb } from "./index";
import type { Customer, CustomerStats } from "@/types";
import { fullName } from "@/lib/format";

interface CustomerRow {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  suburb: string;
  state: string;
  postcode: string;
  delivery_instructions: string;
  delivery_window: string;
  delivery_preference: string;
  notes: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function map(r: CustomerRow): Customer {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    fullName: fullName(r.first_name, r.last_name),
    phone: r.phone,
    email: r.email,
    addressLine1: r.address_line1,
    addressLine2: r.address_line2,
    suburb: r.suburb,
    state: r.state,
    postcode: r.postcode,
    deliveryInstructions: r.delivery_instructions,
    deliveryWindow: r.delivery_window as Customer["deliveryWindow"],
    deliveryPreference: r.delivery_preference as Customer["deliveryPreference"],
    notes: r.notes,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listCustomers(includeInactive = true): Customer[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM customers ${includeInactive ? "" : "WHERE is_active = 1"}
       ORDER BY first_name ASC, last_name ASC`
    )
    .all() as CustomerRow[];
  return rows.map(map);
}

export function getCustomer(id: number): Customer | null {
  const r = getDb().prepare("SELECT * FROM customers WHERE id = ?").get(id) as
    | CustomerRow
    | undefined;
  return r ? map(r) : null;
}

/** Search by name, phone, suburb or email. */
export function searchCustomers(query: string, limit = 25): Customer[] {
  const q = query.trim();
  if (!q) return listCustomers(false).slice(0, limit);
  const like = `%${q.toLowerCase()}%`;
  const rows = getDb()
    .prepare(
      `SELECT * FROM customers
       WHERE is_active = 1 AND (
         lower(first_name || ' ' || last_name) LIKE ?
         OR lower(phone) LIKE ?
         OR lower(suburb) LIKE ?
         OR lower(email) LIKE ?
       )
       ORDER BY first_name ASC, last_name ASC
       LIMIT ?`
    )
    .all(like, like, like, like, limit) as CustomerRow[];
  return rows.map(map);
}

export interface CustomerInput {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  deliveryInstructions?: string;
  deliveryWindow?: string;
  deliveryPreference?: string;
  notes?: string;
  isActive?: boolean;
}

export function createCustomer(data: CustomerInput): number {
  const info = getDb()
    .prepare(
      `INSERT INTO customers
       (first_name,last_name,phone,email,address_line1,address_line2,suburb,state,postcode,
        delivery_instructions,delivery_window,delivery_preference,notes,is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      data.firstName ?? "",
      data.lastName ?? "",
      data.phone ?? "",
      data.email ?? "",
      data.addressLine1 ?? "",
      data.addressLine2 ?? "",
      data.suburb ?? "",
      data.state ?? "",
      data.postcode ?? "",
      data.deliveryInstructions ?? "",
      data.deliveryWindow ?? "",
      data.deliveryPreference ?? "",
      data.notes ?? "",
      data.isActive === false ? 0 : 1
    );
  return Number(info.lastInsertRowid);
}

export function updateCustomer(id: number, data: CustomerInput): void {
  const cur = getCustomer(id);
  if (!cur) return;
  const v = <T>(nv: T | undefined, ov: T): T => (nv === undefined ? ov : nv);
  getDb()
    .prepare(
      `UPDATE customers SET
        first_name=?,last_name=?,phone=?,email=?,address_line1=?,address_line2=?,
        suburb=?,state=?,postcode=?,delivery_instructions=?,delivery_window=?,
        delivery_preference=?,notes=?,is_active=?,
        updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE id=?`
    )
    .run(
      v(data.firstName, cur.firstName),
      v(data.lastName, cur.lastName),
      v(data.phone, cur.phone),
      v(data.email, cur.email),
      v(data.addressLine1, cur.addressLine1),
      v(data.addressLine2, cur.addressLine2),
      v(data.suburb, cur.suburb),
      v(data.state, cur.state),
      v(data.postcode, cur.postcode),
      v(data.deliveryInstructions, cur.deliveryInstructions),
      v(data.deliveryWindow, cur.deliveryWindow),
      v(data.deliveryPreference, cur.deliveryPreference),
      v(data.notes, cur.notes),
      (data.isActive ?? cur.isActive) ? 1 : 0,
      id
    );
}

export function setCustomerActive(id: number, active: boolean): void {
  getDb()
    .prepare(
      "UPDATE customers SET is_active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?"
    )
    .run(active ? 1 : 0, id);
}

export function getCustomerStats(id: number): CustomerStats {
  const db = getDb();
  const agg = db
    .prepare(
      `SELECT COUNT(*) AS orders,
              COALESCE(SUM(total_cents),0) AS spent,
              MAX(delivery_date) AS last_date
       FROM orders WHERE customer_id = ? AND order_status != 'cancelled'`
    )
    .get(id) as { orders: number; spent: number; last_date: string | null };
  const meals = db
    .prepare(
      `SELECT COALESCE(SUM(oi.quantity),0) AS meals
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.customer_id = ? AND o.order_status != 'cancelled'`
    )
    .get(id) as { meals: number };
  return {
    totalOrders: agg.orders,
    totalMeals: meals.meals,
    totalSpentCents: agg.spent,
    lastOrderDate: agg.last_date,
  };
}

/**
 * Detect likely duplicates by phone, email, or name+suburb.
 * Used before create/import so the operator is warned.
 */
export function findDuplicates(data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  suburb?: string;
}): Customer[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: unknown[] = [];

  const phone = (data.phone ?? "").replace(/\s/g, "").toLowerCase();
  if (phone) {
    clauses.push("replace(lower(phone),' ','') = ?");
    params.push(phone);
  }
  const email = (data.email ?? "").trim().toLowerCase();
  if (email) {
    clauses.push("lower(email) = ?");
    params.push(email);
  }
  const name = `${(data.firstName ?? "").trim()} ${(data.lastName ?? "").trim()}`
    .trim()
    .toLowerCase();
  const suburb = (data.suburb ?? "").trim().toLowerCase();
  if (name && suburb) {
    clauses.push("(lower(first_name || ' ' || last_name) = ? AND lower(suburb) = ?)");
    params.push(name, suburb);
  }

  if (clauses.length === 0) return [];
  const rows = db
    .prepare(`SELECT * FROM customers WHERE ${clauses.join(" OR ")}`)
    .all(...params) as CustomerRow[];
  return rows.map(map);
}
