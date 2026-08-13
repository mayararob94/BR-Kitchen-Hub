"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus, PaymentStatus } from "@/types";
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "@/components/ui/Badges";
import { setOrderStatusAction, setPaymentAction } from "@/app/actions/orders";
import { todayISO } from "@/lib/format";
import { dollarsToCents, centsToDollars } from "@/lib/money";

export function OrderQuickControls({
  orderId,
  orderStatus,
  paymentStatus,
  totalCents,
  paymentReference,
}: {
  orderId: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalCents: number;
  paymentReference: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pay, setPay] = useState<PaymentStatus>(paymentStatus);
  const [ref, setRef] = useState(paymentReference);
  const [amount, setAmount] = useState(centsToDollars(totalCents));

  function changeStatus(status: OrderStatus) {
    startTransition(async () => {
      await setOrderStatusAction(orderId, status);
      router.refresh();
    });
  }

  function savePayment() {
    startTransition(async () => {
      await setPaymentAction(orderId, {
        paymentStatus: pay,
        amountPaidCents:
          pay === "paid"
            ? totalCents
            : pay === "partial"
              ? dollarsToCents(amount)
              : 0,
        paymentDate: pay === "unpaid" ? null : todayISO(),
        paymentReference: ref,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Change order status</label>
        <select
          className="input"
          value={orderStatus}
          onChange={(e) => changeStatus(e.target.value as OrderStatus)}
          disabled={pending}
        >
          {ORDER_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <label className="label">Record payment</label>
        <select
          className="input mb-2"
          value={pay}
          onChange={(e) => setPay(e.target.value as PaymentStatus)}
        >
          {PAYMENT_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {pay === "partial" && (
          <div className="mb-2">
            <label className="label">Amount paid ($)</label>
            <input
              className="input"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        )}
        {pay !== "unpaid" && (
          <input
            className="input mb-2"
            placeholder="Payment reference"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
        )}
        <button className="btn-primary w-full" onClick={savePayment} disabled={pending}>
          {pending ? "Saving…" : "Save Payment"}
        </button>
      </div>
    </div>
  );
}
