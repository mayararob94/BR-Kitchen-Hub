import { getDb } from "./index";
import { getCustomer } from "./customers-db";
import { nextOrderNumber, nextInvoiceNumber } from "./settings-db";
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  DiscountType,
} from "@/types";

interface OrderRow {
  id: number;
  order_number: string;
  invoice_number: string | null;
  weekly_menu_id: number | null;
  customer_id: number | null;
  delivery_date: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address_line1: string;
  address_line2: string;
  suburb: string;
  state: string;
  postcode: string;
  delivery_instructions: string;
  delivery_window: string;
  delivery_preference: string;
  order_status: string;
  payment_status: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_type: string;
  discount_value: number;
  discount_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  payment_date: string | null;
  payment_reference: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: number;
  order_id: number;
  meal_id: number | null;
  meal_name_snapshot: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
}

function mapItem(r: ItemRow): OrderItem {
  return {
    id: r.id,
    orderId: r.order_id,
    mealId: r.meal_id,
    mealNameSnapshot: r.meal_name_snapshot,
    unitPriceCents: r.unit_price_cents,
    quantity: r.quantity,
    lineTotalCents: r.line_total_cents,
  };
}

function mapOrder(r: OrderRow, items: OrderItem[]): Order {
  return {
    id: r.id,
    orderNumber: r.order_number,
    invoiceNumber: r.invoice_number,
    weeklyMenuId: r.weekly_menu_id,
    customerId: r.customer_id,
    deliveryDate: r.delivery_date,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    addressLine1: r.address_line1,
    addressLine2: r.address_line2,
    suburb: r.suburb,
    state: r.state,
    postcode: r.postcode,
    deliveryInstructions: r.delivery_instructions,
    deliveryWindow: r.delivery_window as Order["deliveryWindow"],
    deliveryPreference: r.delivery_preference as Order["deliveryPreference"],
    orderStatus: r.order_status as OrderStatus,
    paymentStatus: r.payment_status as PaymentStatus,
    subtotalCents: r.subtotal_cents,
    deliveryFeeCents: r.delivery_fee_cents,
    discountType: r.discount_type as DiscountType,
    discountValue: r.discount_value,
    discountCents: r.discount_cents,
    totalCents: r.total_cents,
    amountPaidCents: r.amount_paid_cents,
    paymentDate: r.payment_date,
    paymentReference: r.payment_reference,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    items,
    totalMeals: items.reduce((s, i) => s + i.quantity, 0),
  };
}

function itemsFor(orderId: number): OrderItem[] {
  const rows = getDb()
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC")
    .all(orderId) as ItemRow[];
  return rows.map(mapItem);
}

export function getOrder(id: number): Order | null {
  const r = getDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as
    | OrderRow
    | undefined;
  if (!r) return null;
  return mapOrder(r, itemsFor(r.id));
}

export interface OrderFilters {
  weekId?: number;
  deliveryDate?: string;
  customerId?: number;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  suburb?: string;
  search?: string;
}

export function listOrders(filters: OrderFilters = {}): Order[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.weekId) {
    clauses.push("weekly_menu_id = ?");
    params.push(filters.weekId);
  }
  if (filters.deliveryDate) {
    clauses.push("delivery_date = ?");
    params.push(filters.deliveryDate);
  }
  if (filters.customerId) {
    clauses.push("customer_id = ?");
    params.push(filters.customerId);
  }
  if (filters.orderStatus) {
    clauses.push("order_status = ?");
    params.push(filters.orderStatus);
  }
  if (filters.paymentStatus) {
    clauses.push("payment_status = ?");
    params.push(filters.paymentStatus);
  }
  if (filters.suburb) {
    clauses.push("lower(suburb) = ?");
    params.push(filters.suburb.toLowerCase());
  }
  if (filters.search) {
    clauses.push(
      "(lower(customer_name) LIKE ? OR lower(order_number) LIKE ? OR lower(invoice_number) LIKE ?)"
    );
    const like = `%${filters.search.toLowerCase()}%`;
    params.push(like, like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(`SELECT * FROM orders ${where} ORDER BY id DESC`)
    .all(...params) as OrderRow[];
  return rows.map((r) => mapOrder(r, itemsFor(r.id)));
}

// ─── Totals ───

export interface OrderItemInput {
  mealId: number | null;
  mealName: string;
  unitPriceCents: number;
  quantity: number;
}

export function computeTotals(input: {
  items: OrderItemInput[];
  deliveryFeeCents: number;
  discountType: DiscountType;
  discountValue: number; // percent number, or cents when amount
}): {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
} {
  const subtotal = input.items.reduce(
    (s, i) => s + i.unitPriceCents * i.quantity,
    0
  );
  let discount = 0;
  if (input.discountType === "percent") {
    discount = Math.round((subtotal * input.discountValue) / 100);
  } else {
    discount = input.discountValue;
  }
  discount = Math.max(0, Math.min(discount, subtotal));
  const total = Math.max(0, subtotal + input.deliveryFeeCents - discount);
  return { subtotalCents: subtotal, discountCents: discount, totalCents: total };
}

export interface OrderInput {
  weeklyMenuId: number | null;
  customerId: number | null;
  deliveryDate: string | null;
  items: OrderItemInput[];
  deliveryFeeCents: number;
  discountType: DiscountType;
  discountValue: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  amountPaidCents?: number;
  paymentDate?: string | null;
  paymentReference?: string;
  notes?: string;
}

/** Snapshot customer delivery details onto the order at save time. */
function customerSnapshot(customerId: number | null) {
  const c = customerId ? getCustomer(customerId) : null;
  return {
    customer_name: c?.fullName ?? "",
    customer_phone: c?.phone ?? "",
    customer_email: c?.email ?? "",
    address_line1: c?.addressLine1 ?? "",
    address_line2: c?.addressLine2 ?? "",
    suburb: c?.suburb ?? "",
    state: c?.state ?? "",
    postcode: c?.postcode ?? "",
    delivery_instructions: c?.deliveryInstructions ?? "",
    delivery_window: c?.deliveryWindow ?? "",
    delivery_preference: c?.deliveryPreference ?? "",
  };
}

export function createOrder(input: OrderInput): number {
  const db = getDb();
  const totals = computeTotals(input);
  const snap = customerSnapshot(input.customerId);

  const tx = db.transaction(() => {
    const orderNumber = nextOrderNumber();
    const info = db
      .prepare(
        `INSERT INTO orders (
          order_number, weekly_menu_id, customer_id, delivery_date,
          customer_name, customer_phone, customer_email,
          address_line1, address_line2, suburb, state, postcode,
          delivery_instructions, delivery_window, delivery_preference,
          order_status, payment_status,
          subtotal_cents, delivery_fee_cents, discount_type, discount_value, discount_cents, total_cents,
          amount_paid_cents, payment_date, payment_reference, notes
        ) VALUES (?,?,?,?, ?,?,?, ?,?,?,?,?, ?,?,?, ?,?, ?,?,?,?,?,?, ?,?,?,?)`
      )
      .run(
        orderNumber,
        input.weeklyMenuId,
        input.customerId,
        input.deliveryDate,
        snap.customer_name,
        snap.customer_phone,
        snap.customer_email,
        snap.address_line1,
        snap.address_line2,
        snap.suburb,
        snap.state,
        snap.postcode,
        snap.delivery_instructions,
        snap.delivery_window,
        snap.delivery_preference,
        input.orderStatus,
        input.paymentStatus,
        totals.subtotalCents,
        input.deliveryFeeCents,
        input.discountType,
        input.discountValue,
        totals.discountCents,
        totals.totalCents,
        input.amountPaidCents ?? 0,
        input.paymentDate ?? null,
        input.paymentReference ?? "",
        input.notes ?? ""
      );
    const orderId = Number(info.lastInsertRowid);
    insertItems(orderId, input.items);
    return orderId;
  });
  return tx();
}

function insertItems(orderId: number, items: OrderItemInput[]) {
  const db = getDb();
  const ins = db.prepare(
    `INSERT INTO order_items (order_id, meal_id, meal_name_snapshot, unit_price_cents, quantity, line_total_cents)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const it of items) {
    if (it.quantity <= 0) continue;
    ins.run(
      orderId,
      it.mealId,
      it.mealName,
      it.unitPriceCents,
      it.quantity,
      it.unitPriceCents * it.quantity
    );
  }
}

export function updateOrder(id: number, input: OrderInput): void {
  const db = getDb();
  const totals = computeTotals(input);
  const snap = customerSnapshot(input.customerId);
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE orders SET
        weekly_menu_id=?, customer_id=?, delivery_date=?,
        customer_name=?, customer_phone=?, customer_email=?,
        address_line1=?, address_line2=?, suburb=?, state=?, postcode=?,
        delivery_instructions=?, delivery_window=?, delivery_preference=?,
        order_status=?, payment_status=?,
        subtotal_cents=?, delivery_fee_cents=?, discount_type=?, discount_value=?, discount_cents=?, total_cents=?,
        amount_paid_cents=?, payment_date=?, payment_reference=?, notes=?,
        updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE id=?`
    ).run(
      input.weeklyMenuId,
      input.customerId,
      input.deliveryDate,
      snap.customer_name,
      snap.customer_phone,
      snap.customer_email,
      snap.address_line1,
      snap.address_line2,
      snap.suburb,
      snap.state,
      snap.postcode,
      snap.delivery_instructions,
      snap.delivery_window,
      snap.delivery_preference,
      input.orderStatus,
      input.paymentStatus,
      totals.subtotalCents,
      input.deliveryFeeCents,
      input.discountType,
      input.discountValue,
      totals.discountCents,
      totals.totalCents,
      input.amountPaidCents ?? 0,
      input.paymentDate ?? null,
      input.paymentReference ?? "",
      input.notes ?? "",
      id
    );
    db.prepare("DELETE FROM order_items WHERE order_id = ?").run(id);
    insertItems(id, input.items);
  });
  tx();
}

export function setOrderStatus(id: number, status: OrderStatus): void {
  getDb()
    .prepare(
      "UPDATE orders SET order_status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?"
    )
    .run(status, id);
}

export function setPayment(
  id: number,
  data: {
    paymentStatus: PaymentStatus;
    amountPaidCents?: number;
    paymentDate?: string | null;
    paymentReference?: string;
  }
): void {
  const cur = getOrder(id);
  if (!cur) return;
  getDb()
    .prepare(
      `UPDATE orders SET payment_status=?, amount_paid_cents=?, payment_date=?, payment_reference=?,
       updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?`
    )
    .run(
      data.paymentStatus,
      data.amountPaidCents ??
        (data.paymentStatus === "paid" ? cur.totalCents : cur.amountPaidCents),
      data.paymentDate ?? cur.paymentDate,
      data.paymentReference ?? cur.paymentReference,
      id
    );
}

/** Assign a sequential invoice number once (never reused, never changed). */
export function ensureInvoiceNumber(id: number): string | null {
  const db = getDb();
  const cur = db
    .prepare("SELECT invoice_number FROM orders WHERE id = ?")
    .get(id) as { invoice_number: string | null } | undefined;
  if (!cur) return null;
  if (cur.invoice_number) return cur.invoice_number;
  const tx = db.transaction(() => {
    const num = nextInvoiceNumber();
    db.prepare("UPDATE orders SET invoice_number = ? WHERE id = ?").run(num, id);
    return num;
  });
  return tx();
}

export function deleteOrder(id: number): void {
  getDb().prepare("DELETE FROM orders WHERE id = ?").run(id);
}

/**
 * Build the input for a duplicated order: same customer + item quantities,
 * repriced against the target week's menu. Meals unavailable that week are
 * flagged so the operator is warned before saving.
 */
export function buildDuplicateInput(
  sourceOrderId: number,
  targetWeekId: number,
  deliveryDate: string | null
): {
  input: OrderInput;
  unavailable: string[];
} | null {
  const src = getOrder(sourceOrderId);
  if (!src) return null;
  const db = getDb();
  const weekItems = db
    .prepare(
      "SELECT meal_id, price_cents FROM weekly_menu_items WHERE weekly_menu_id = ?"
    )
    .all(targetWeekId) as { meal_id: number; price_cents: number }[];
  const priceByMeal = new Map(weekItems.map((w) => [w.meal_id, w.price_cents]));

  const unavailable: string[] = [];
  const items: OrderItemInput[] = src.items.map((it) => {
    const weekPrice =
      it.mealId != null ? priceByMeal.get(it.mealId) : undefined;
    if (it.mealId != null && weekPrice === undefined) {
      unavailable.push(it.mealNameSnapshot);
    }
    return {
      mealId: it.mealId,
      mealName: it.mealNameSnapshot,
      unitPriceCents: weekPrice ?? it.unitPriceCents,
      quantity: it.quantity,
    };
  });

  return {
    unavailable,
    input: {
      weeklyMenuId: targetWeekId,
      customerId: src.customerId,
      deliveryDate,
      items,
      deliveryFeeCents: src.deliveryFeeCents,
      discountType: src.discountType,
      discountValue: src.discountValue,
      orderStatus: "draft",
      paymentStatus: "unpaid",
      notes: src.notes,
    },
  };
}
