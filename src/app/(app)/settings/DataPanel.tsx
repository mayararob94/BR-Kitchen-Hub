"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedDemoAction, clearDemoAction } from "@/app/actions/data";

export function DataPanel({
  weeks,
  activeWeekId,
}: {
  weeks: { id: number; label: string }[];
  activeWeekId: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [exportWeek, setExportWeek] = useState<string>(
    activeWeekId ? String(activeWeekId) : ""
  );
  const [message, setMessage] = useState<string | null>(null);

  const weekParam = exportWeek ? `?week=${exportWeek}` : "";
  const exports = [
    { label: "Customers", href: `/api/export/customers` },
    { label: "Orders", href: `/api/export/orders${weekParam}` },
    { label: "Order Items", href: `/api/export/order-items${weekParam}` },
    { label: "Production Summary", href: `/api/export/production${weekParam}` },
    { label: "Delivery Manifest", href: `/api/export/manifest${weekParam}` },
  ];

  return (
    <>
      <section className="card p-5">
        <h2 className="mb-1 font-display text-lg font-semibold text-gray-900">
          Export Data (CSV)
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          Orders, items, production and manifest exports use the selected week.
        </p>
        <div className="mb-3 max-w-xs">
          <label className="label">Week (for order exports)</label>
          <select
            className="input"
            value={exportWeek}
            onChange={(e) => setExportWeek(e.target.value)}
          >
            <option value="">All weeks</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {exports.map((e) => (
            <a key={e.label} href={e.href} className="btn-secondary">
              {e.label}
            </a>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-display text-lg font-semibold text-gray-900">
          Demo Data
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          Seed sample customers, meals and an active week to test the workflow. Remove
          it before real use (only demo rows not used by real orders are removed).
        </p>
        {message && (
          <div className="mb-3 rounded-lg border border-tropical-200 bg-tropical-50 p-2 text-sm text-tropical-800">
            {message}
          </div>
        )}
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await seedDemoAction();
                setMessage("Demo data added.");
                router.refresh();
              })
            }
          >
            Seed Demo Data
          </button>
          <button
            className="btn-danger"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Remove demo data?")) return;
              startTransition(async () => {
                await clearDemoAction();
                setMessage("Demo data removed.");
                router.refresh();
              });
            }}
          >
            Remove Demo Data
          </button>
        </div>
      </section>
    </>
  );
}
