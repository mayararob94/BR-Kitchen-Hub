"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PaymentStatusBadge } from "@/components/ui/Badges";
import type { PaymentStatus } from "@/types";

export interface PrintRow {
  id: number;
  orderNumber: string;
  invoiceNumber: string | null;
  customerName: string;
  suburb: string;
  deliveryDate: string | null;
  totalMeals: number;
  totalCents: number;
  paymentStatus: PaymentStatus;
}

interface WeekOpt {
  id: number;
  label: string;
}

/**
 * Shared week/date filter + multi-select table used by the Invoices and
 * Delivery/Labels pages. Emits print URLs with ?ids=… for the print routes.
 */
export function BulkPrintPanel({
  rows,
  weeks,
  kind, // "invoice" | "label"
  currentWeek,
  currentDate,
}: {
  rows: PrintRow[];
  weeks: WeekOpt[];
  kind: "invoice" | "label";
  currentWeek?: string;
  currentDate?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(rows.map((r) => r.id))
  );

  function updateFilter(key: "week" | "date", value: string) {
    const p = new URLSearchParams(searchParams.toString());
    // week and date are mutually exclusive filters
    p.delete("week");
    p.delete("date");
    if (value) p.set(key, value);
    router.push(`?${p.toString()}`);
  }

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((s) =>
      s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))
    );
  }

  const ids = [...selected];
  const idsParam = ids.join(",");
  const printAllHref =
    kind === "invoice"
      ? `/print/invoices?ids=${idsParam}`
      : `/print/labels?ids=${idsParam}`;
  const manifestHref = `/print/manifest?ids=${idsParam}`;

  return (
    <div>
      <div className="card mb-3 flex flex-wrap items-end justify-between gap-3 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label">Order Week</label>
            <select
              className="input"
              value={currentWeek ?? ""}
              onChange={(e) => updateFilter("week", e.target.value)}
            >
              <option value="">Select week…</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="self-center pb-2 text-xs text-gray-400">or</div>
          <div>
            <label className="label">Delivery Date</label>
            <input
              type="date"
              className="input"
              value={currentDate ?? ""}
              onChange={(e) => updateFilter("date", e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          {kind === "label" && ids.length > 0 && (
            <a href={manifestHref} target="_blank" className="btn-secondary">
              Print Manifest
            </a>
          )}
          <a
            href={printAllHref}
            target="_blank"
            className={`btn-primary ${ids.length === 0 ? "pointer-events-none opacity-50" : ""}`}
          >
            {kind === "invoice" ? "Print All Invoices" : "Print All Labels"} ({ids.length})
          </a>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="th">Order #</th>
                <th className="th">Customer</th>
                <th className="th">Suburb</th>
                <th className="th">Delivery</th>
                <th className="th text-center">Meals</th>
                <th className="th text-right">Total</th>
                <th className="th">Payment</th>
                <th className="th text-right">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="td">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td className="td font-medium">{r.orderNumber}</td>
                  <td className="td">{r.customerName}</td>
                  <td className="td">{r.suburb || "—"}</td>
                  <td className="td">{formatDate(r.deliveryDate)}</td>
                  <td className="td text-center">{r.totalMeals}</td>
                  <td className="td text-right">{formatMoney(r.totalCents)}</td>
                  <td className="td">
                    <PaymentStatusBadge status={r.paymentStatus} />
                  </td>
                  <td className="td text-right">
                    <a
                      href={
                        kind === "invoice"
                          ? `/print/invoice/${r.id}`
                          : `/print/label/${r.id}`
                      }
                      target="_blank"
                      className="text-brand-700 hover:underline"
                    >
                      Print
                    </a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="td py-8 text-center text-gray-400">
                    Select a week or delivery date to list orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
