"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import type {
  Customer,
  WeeklyMenu,
  WeeklyMenuItem,
  Order,
  OrderStatus,
  PaymentStatus,
  DiscountType,
} from "@/types";
import { CustomerComboboxController } from "@/components/customers/CustomerCombobox";
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "@/components/ui/Badges";
import { formatMoney, centsToDollars, dollarsToCents } from "@/lib/money";
import { formatWeekRange, addDays } from "@/lib/format";
import {
  createOrderAction,
  updateOrderAction,
  getWeekItemsAction,
} from "@/app/actions/orders";
import type { OrderInput } from "@/lib/db/orders-db";

interface MealRow {
  mealId: number;
  name: string;
  price: string; // dollars (editable override)
  qty: number;
}

type SaveIntent = "stay" | "new" | "invoice" | "label" | "view";

export function OrderForm({
  mode,
  weeks,
  initialWeek,
  initialWeekItems,
  defaultDeliveryFeeCents,
  orderPrefixPreview,
  preselectedCustomer,
  order,
}: {
  mode: "create" | "edit";
  weeks: WeeklyMenu[];
  initialWeek: WeeklyMenu | null;
  initialWeekItems: WeeklyMenuItem[];
  defaultDeliveryFeeCents: number;
  orderPrefixPreview: string;
  preselectedCustomer?: Customer | null;
  order?: Order;
}) {
  const router = useRouter();

  const [weekId, setWeekId] = useState<number | null>(
    order?.weeklyMenuId ?? initialWeek?.id ?? null
  );
  const [customer, setCustomer] = useState<Customer | null>(
    preselectedCustomer ?? null
  );
  const [deliveryDate, setDeliveryDate] = useState<string>(
    order?.deliveryDate ??
      (initialWeek ? addDays(initialWeek.weekStart, 3) : "")
  );

  const [rows, setRows] = useState<MealRow[]>(() =>
    buildRows(initialWeekItems, order)
  );

  const [deliveryFee, setDeliveryFee] = useState<string>(
    centsToDollars(order ? order.deliveryFeeCents : defaultDeliveryFeeCents)
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    order?.discountType ?? "amount"
  );
  const [discountValue, setDiscountValue] = useState<string>(
    order
      ? order.discountType === "percent"
        ? String(order.discountValue)
        : centsToDollars(order.discountValue)
      : ""
  );
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    order?.orderStatus ?? "confirmed"
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    order?.paymentStatus ?? "unpaid"
  );
  const [paymentReference, setPaymentReference] = useState(
    order?.paymentReference ?? ""
  );
  const [paymentDate, setPaymentDate] = useState(order?.paymentDate ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const customerReset = useRef(0);

  // When the week changes (create mode), reload the available meals.
  async function onWeekChange(newWeekId: number) {
    setWeekId(newWeekId);
    const wk = weeks.find((w) => w.id === newWeekId);
    if (wk) setDeliveryDate(addDays(wk.weekStart, 3));
    const items = await getWeekItemsAction(newWeekId);
    setRows(buildRows(items, undefined));
  }

  function setQty(mealId: number, qty: number) {
    setRows((rs) =>
      rs.map((r) => (r.mealId === mealId ? { ...r, qty: Math.max(0, qty) } : r))
    );
  }
  function setPrice(mealId: number, price: string) {
    setRows((rs) =>
      rs.map((r) => (r.mealId === mealId ? { ...r, price } : r))
    );
  }

  // ── Live totals ──
  const totals = useMemo(() => {
    const subtotal = rows.reduce(
      (s, r) => s + dollarsToCents(r.price) * r.qty,
      0
    );
    const feeCents = dollarsToCents(deliveryFee);
    let discount = 0;
    if (discountType === "percent") {
      discount = Math.round((subtotal * (parseFloat(discountValue) || 0)) / 100);
    } else {
      discount = dollarsToCents(discountValue);
    }
    discount = Math.max(0, Math.min(discount, subtotal));
    const total = Math.max(0, subtotal + feeCents - discount);
    const meals = rows.reduce((s, r) => s + r.qty, 0);
    return { subtotal, feeCents, discount, total, meals };
  }, [rows, deliveryFee, discountType, discountValue]);

  function buildInput(): OrderInput {
    return {
      weeklyMenuId: weekId,
      customerId: customer?.id ?? null,
      deliveryDate: deliveryDate || null,
      items: rows
        .filter((r) => r.qty > 0)
        .map((r) => ({
          mealId: r.mealId,
          mealName: r.name,
          unitPriceCents: dollarsToCents(r.price),
          quantity: r.qty,
        })),
      deliveryFeeCents: dollarsToCents(deliveryFee),
      discountType,
      discountValue:
        discountType === "percent"
          ? parseFloat(discountValue) || 0
          : dollarsToCents(discountValue),
      orderStatus,
      paymentStatus,
      amountPaidCents: paymentStatus === "paid" ? totals.total : order?.amountPaidCents ?? 0,
      paymentDate: paymentDate || null,
      paymentReference,
      notes,
    };
  }

  function resetForNewOrder() {
    setCustomer(null);
    setRows((rs) => rs.map((r) => ({ ...r, qty: 0 })));
    setDiscountValue("");
    setPaymentStatus("unpaid");
    setPaymentReference("");
    setPaymentDate("");
    setNotes("");
    setDeliveryFee(centsToDollars(defaultDeliveryFeeCents));
    customerReset.current += 1;
  }

  async function save(intent: SaveIntent) {
    setError(null);
    if (!customer) {
      setError("Select a customer first.");
      return;
    }
    if (totals.meals === 0) {
      setError("Add at least one meal.");
      return;
    }
    setSaving(true);
    try {
      const input = buildInput();
      let id: number;
      if (mode === "edit" && order) {
        await updateOrderAction(order.id, input);
        id = order.id;
      } else {
        const res = await createOrderAction(input);
        id = res.id;
      }

      if (intent === "invoice") {
        router.push(`/print/invoice/${id}`);
        return;
      }
      if (intent === "label") {
        router.push(`/print/label/${id}`);
        return;
      }
      if (intent === "view") {
        router.push(`/orders/${id}`);
        return;
      }
      if (intent === "new") {
        setFlash(`Saved. Ready for the next order.`);
        resetForNewOrder();
        setSaving(false);
        return;
      }
      // stay
      if (mode === "edit") {
        setFlash("Changes saved.");
        setSaving(false);
        router.refresh();
      } else {
        router.push(`/orders/${id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  const selectedWeek = weeks.find((w) => w.id === weekId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* LEFT: order entry */}
      <div className="space-y-4">
        {/* Header fields */}
        <div className="card p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="label">Order Week</label>
              <select
                className="input"
                value={weekId ?? ""}
                onChange={(e) => onWeekChange(Number(e.target.value))}
                disabled={mode === "edit"}
              >
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    {formatWeekRange(w.weekStart, w.weekEnd)}
                    {w.status === "active" ? " ★" : ""}
                  </option>
                ))}
                {weeks.length === 0 && <option value="">No weeks</option>}
              </select>
            </div>
            <div>
              <label className="label">Delivery Date</label>
              <input
                type="date"
                className="input"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Order Number</label>
              <input
                className="input bg-gray-50"
                value={order?.orderNumber ?? `${orderPrefixPreview} (auto)`}
                readOnly
              />
            </div>
            <div>
              <label className="label">Payment Status</label>
              <select
                className="input"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              >
                {PAYMENT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="label">Customer</label>
            <CustomerComboboxController
              key={customerReset.current}
              selected={customer}
              onSelect={setCustomer}
              autoFocusInput={mode === "create"}
            />
            {customer && (
              <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <div>
                  {[customer.addressLine1, customer.addressLine2]
                    .filter(Boolean)
                    .join(", ")}
                  {customer.suburb ? `, ${customer.suburb}` : ""}{" "}
                  {customer.state} {customer.postcode}
                </div>
                <div>{customer.phone}</div>
                {customer.deliveryInstructions && (
                  <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-amber-800">
                    ⚑ {customer.deliveryInstructions}
                  </div>
                )}
                {customer.notes && (
                  <div className="mt-1 text-gray-500">Note: {customer.notes}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Meal quantity list */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 p-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Meals{" "}
              {selectedWeek && (
                <span className="font-normal text-gray-400">
                  · {formatWeekRange(selectedWeek.weekStart, selectedWeek.weekEnd)}
                </span>
              )}
            </h3>
            <span className="text-sm text-gray-500">{totals.meals} meals</span>
          </div>
          <ul className="divide-y divide-gray-50">
            {rows.map((r) => (
              <li key={r.mealId} className="flex items-center gap-3 px-3 py-2">
                <span className="flex-1 text-sm font-medium text-gray-800">
                  {r.name}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">$</span>
                  <input
                    className="input w-20 py-1 text-sm"
                    inputMode="decimal"
                    value={r.price}
                    onChange={(e) => setPrice(r.mealId, e.target.value)}
                    title="Price override for this order"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="btn-secondary h-8 w-8 p-0"
                    onClick={() => setQty(r.mealId, r.qty - 1)}
                    tabIndex={-1}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    className="input w-14 py-1 text-center text-sm"
                    inputMode="numeric"
                    value={r.qty}
                    onChange={(e) =>
                      setQty(r.mealId, parseInt(e.target.value, 10) || 0)
                    }
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    className="btn-secondary h-8 w-8 p-0"
                    onClick={() => setQty(r.mealId, r.qty + 1)}
                    tabIndex={-1}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="w-20 text-right text-sm text-gray-600">
                  {formatMoney(dollarsToCents(r.price) * r.qty)}
                </span>
              </li>
            ))}
            {rows.length === 0 && (
              <li className="p-6 text-center text-sm text-gray-400">
                This week has no meals. Add meals to the week in Weekly Menu.
              </li>
            )}
          </ul>
        </div>

        <div>
          <label className="label">Order Notes</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything specific to this order"
          />
        </div>
      </div>

      {/* RIGHT: totals + save */}
      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Order Total</h3>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatMoney(totals.subtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Delivery Fee</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">$</span>
                <input
                  className="input w-24 py-1 text-right text-sm"
                  inputMode="decimal"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Discount</span>
              <div className="flex items-center gap-1">
                <select
                  className="input w-16 py-1 text-sm"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                >
                  <option value="amount">$</option>
                  <option value="percent">%</option>
                </select>
                <input
                  className="input w-20 py-1 text-right text-sm"
                  inputMode="decimal"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-xs text-tropical-700">
                <span>Discount applied</span>
                <span>−{formatMoney(totals.discount)}</span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
              <span className="font-semibold text-gray-900">Grand Total</span>
              <span className="font-display text-xl font-semibold text-gray-900">
                {formatMoney(totals.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Status & Payment</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Order Status</label>
              <select
                className="input"
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
              >
                {ORDER_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {paymentStatus !== "unpaid" && (
              <>
                <div>
                  <label className="label">Payment Date</label>
                  <input
                    type="date"
                    className="input"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Payment Reference / Notes</label>
                  <input
                    className="input"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Bank transfer reference"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        )}
        {flash && (
          <div className="rounded-lg border border-tropical-200 bg-tropical-50 p-2 text-sm text-tropical-800">
            {flash}
          </div>
        )}

        <div className="card space-y-2 p-4">
          {mode === "create" ? (
            <>
              <button
                className="btn-primary w-full"
                onClick={() => save("new")}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save & New Order"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => save("invoice")}
                  disabled={saving}
                >
                  Save & Invoice
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => save("label")}
                  disabled={saving}
                >
                  Save & Label
                </button>
              </div>
              <button
                className="btn-ghost w-full"
                onClick={() => save("view")}
                disabled={saving}
              >
                Save & View Order
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-primary w-full"
                onClick={() => save("view")}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => save("invoice")}
                  disabled={saving}
                >
                  Save & Invoice
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => save("label")}
                  disabled={saving}
                >
                  Save & Label
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function buildRows(items: WeeklyMenuItem[], order?: Order): MealRow[] {
  const qtyByMeal = new Map<number, number>();
  const priceByMeal = new Map<number, number>();
  if (order) {
    for (const it of order.items) {
      if (it.mealId != null) {
        qtyByMeal.set(it.mealId, it.quantity);
        priceByMeal.set(it.mealId, it.unitPriceCents);
      }
    }
  }

  const rows: MealRow[] = items.map((it) => ({
    mealId: it.mealId,
    name: it.mealName,
    price: centsToDollars(priceByMeal.get(it.mealId) ?? it.priceCents),
    qty: qtyByMeal.get(it.mealId) ?? 0,
  }));

  // Include order items whose meal is no longer on the week menu (edit mode).
  if (order) {
    const present = new Set(items.map((i) => i.mealId));
    for (const it of order.items) {
      if (it.mealId != null && !present.has(it.mealId)) {
        rows.push({
          mealId: it.mealId,
          name: it.mealNameSnapshot,
          price: centsToDollars(it.unitPriceCents),
          qty: it.quantity,
        });
      }
    }
  }
  return rows;
}
