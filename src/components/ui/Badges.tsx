import type { OrderStatus, PaymentStatus } from "@/types";

const ORDER_STYLES: Record<OrderStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-50 text-blue-700",
  preparing: "bg-amber-50 text-amber-700",
  ready: "bg-indigo-50 text-indigo-700",
  delivered: "bg-tropical-100 text-tropical-800",
  cancelled: "bg-red-50 text-red-600",
};

const ORDER_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-red-50 text-red-600",
  paid: "bg-tropical-100 text-tropical-800",
  partial: "bg-amber-50 text-amber-700",
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  partial: "Partially Paid",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${ORDER_STYLES[status]}`}>{ORDER_LABELS[status]}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`badge ${PAYMENT_STYLES[status]}`}>{PAYMENT_LABELS[status]}</span>;
}

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = (
  Object.keys(ORDER_LABELS) as OrderStatus[]
).map((v) => ({ value: v, label: ORDER_LABELS[v] }));

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = (
  Object.keys(PAYMENT_LABELS) as PaymentStatus[]
).map((v) => ({ value: v, label: PAYMENT_LABELS[v] }));
