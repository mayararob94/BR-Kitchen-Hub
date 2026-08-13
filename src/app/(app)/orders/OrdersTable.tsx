"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Copy, FileText, Tag, Trash2 } from "lucide-react";
import type { OrderStatus, PaymentStatus } from "@/types";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "@/components/ui/Badges";
import { formatMoney } from "@/lib/money";
import { formatDate, addDays } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { deleteOrderAction, duplicateOrderAction } from "@/app/actions/orders";

interface Row {
  id: number;
  orderNumber: string;
  invoiceNumber: string | null;
  customerName: string;
  suburb: string;
  deliveryDate: string | null;
  weekId: number | null;
  totalMeals: number;
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}

interface WeekOpt {
  id: number;
  label: string;
  weekStart: string;
}

export function OrdersTable({
  orders,
  weeks,
  suburbs,
}: {
  orders: Row[];
  weeks: WeekOpt[];
  suburbs: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [weekId, setWeekId] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [suburb, setSuburb] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [dupOrder, setDupOrder] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !o.customerName.toLowerCase().includes(s) &&
          !o.orderNumber.toLowerCase().includes(s) &&
          !(o.invoiceNumber ?? "").toLowerCase().includes(s)
        )
          return false;
      }
      if (weekId && String(o.weekId) !== weekId) return false;
      if (status && o.orderStatus !== status) return false;
      if (payment && o.paymentStatus !== payment) return false;
      if (suburb && o.suburb !== suburb) return false;
      if (deliveryDate && o.deliveryDate !== deliveryDate) return false;
      return true;
    });
  }, [orders, search, weekId, status, payment, suburb, deliveryDate]);

  function remove(o: Row) {
    if (!window.confirm(`Delete order ${o.orderNumber}? This cannot be undone.`))
      return;
    startTransition(async () => {
      await deleteOrderAction(o.id);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Filters */}
      <div className="card mb-3 flex flex-wrap items-end gap-2 p-3">
        <div className="min-w-[180px] flex-1">
          <label className="label">Search</label>
          <input
            className="input"
            placeholder="Customer, order # or invoice #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Week</label>
          <select className="input" value={weekId} onChange={(e) => setWeekId(e.target.value)}>
            <option value="">All</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
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
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {ORDER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Payment</label>
          <select className="input" value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="">All</option>
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Suburb</label>
          <select className="input" value={suburb} onChange={(e) => setSuburb(e.target.value)}>
            <option value="">All</option>
            {suburbs.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">Order #</th>
                <th className="th">Customer</th>
                <th className="th">Delivery</th>
                <th className="th text-center">Meals</th>
                <th className="th text-right">Subtotal</th>
                <th className="th text-right">Delivery</th>
                <th className="th text-right">Disc.</th>
                <th className="th text-right">Total</th>
                <th className="th">Payment</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="td font-medium">
                    <Link href={`/orders/${o.id}`} className="text-brand-700 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="td">{o.customerName || "—"}</td>
                  <td className="td">{formatDate(o.deliveryDate)}</td>
                  <td className="td text-center">{o.totalMeals}</td>
                  <td className="td text-right">{formatMoney(o.subtotalCents)}</td>
                  <td className="td text-right">{formatMoney(o.deliveryFeeCents)}</td>
                  <td className="td text-right">
                    {o.discountCents ? `−${formatMoney(o.discountCents)}` : "—"}
                  </td>
                  <td className="td text-right font-medium">{formatMoney(o.totalCents)}</td>
                  <td className="td">
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="td">
                    <OrderStatusBadge status={o.orderStatus} />
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5 text-gray-500">
                      <Link href={`/orders/${o.id}`} title="View" className="btn-ghost p-1.5">
                        <Eye size={15} />
                      </Link>
                      <Link
                        href={`/orders/${o.id}/edit`}
                        title="Edit"
                        className="btn-ghost p-1.5"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        title="Duplicate"
                        className="btn-ghost p-1.5"
                        onClick={() => setDupOrder(o)}
                      >
                        <Copy size={15} />
                      </button>
                      <a
                        href={`/print/invoice/${o.id}`}
                        title="Print invoice"
                        target="_blank"
                        className="btn-ghost p-1.5"
                      >
                        <FileText size={15} />
                      </a>
                      <a
                        href={`/print/label/${o.id}`}
                        title="Print label"
                        target="_blank"
                        className="btn-ghost p-1.5"
                      >
                        <Tag size={15} />
                      </a>
                      <button
                        title="Delete"
                        className="btn-ghost p-1.5 text-red-500"
                        onClick={() => remove(o)}
                        disabled={pending}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="td py-8 text-center text-gray-400" colSpan={11}>
                    No orders match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DuplicateModal order={dupOrder} weeks={weeks} onClose={() => setDupOrder(null)} />
    </div>
  );
}

function DuplicateModal({
  order,
  weeks,
  onClose,
}: {
  order: Row | null;
  weeks: WeekOpt[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [targetWeek, setTargetWeek] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [warning, setWarning] = useState<string[] | null>(null);

  function run() {
    if (!order || !targetWeek) return;
    startTransition(async () => {
      const res = await duplicateOrderAction(
        order.id,
        Number(targetWeek),
        deliveryDate || null
      );
      if (res.id == null) return;
      if (res.unavailable.length > 0) {
        // Warn but the order is created; take the operator to it to review.
        setWarning(res.unavailable);
        setTimeout(() => router.push(`/orders/${res.id}/edit`), 1200);
        return;
      }
      router.push(`/orders/${res.id}`);
    });
  }

  return (
    <Modal open={!!order} onClose={onClose} title={`Duplicate ${order?.orderNumber ?? ""}`}>
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Creates a new order for the same customer and meal quantities, repriced for
          the selected week.
        </p>
        <div>
          <label className="label">Target Week</label>
          <select
            className="input"
            value={targetWeek}
            onChange={(e) => {
              setTargetWeek(e.target.value);
              const wk = weeks.find((w) => String(w.id) === e.target.value);
              if (wk) setDeliveryDate(addDays(wk.weekStart, 3));
            }}
          >
            <option value="">Select a week…</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
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
        {warning && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
            These meals aren’t on the target week and kept their original price —
            review before sending: {warning.join(", ")}
          </div>
        )}
        <div className="flex gap-2">
          <button className="btn-primary" onClick={run} disabled={pending || !targetWeek}>
            {pending ? "Duplicating…" : "Duplicate Order"}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
