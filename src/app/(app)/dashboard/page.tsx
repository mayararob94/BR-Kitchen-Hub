import Link from "next/link";
import { listWeeks, getActiveWeek } from "@/lib/db/weeks-db";
import {
  dashboardStatsForWeek,
  mealsRequiredForWeek,
} from "@/lib/db/reports-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatMoney } from "@/lib/money";
import { formatWeekRange, todayISO } from "@/lib/format";
import { WeekSelect } from "@/components/ui/WeekSelect";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weeks = listWeeks();
  const active = getActiveWeek();
  const selectedId = week ? Number(week) : (active?.id ?? weeks[0]?.id ?? null);
  const selectedWeek = weeks.find((w) => w.id === selectedId) ?? null;

  const stats = dashboardStatsForWeek(selectedId, todayISO());
  const meals = mealsRequiredForWeek(selectedId);

  const cards = [
    { label: "Total Orders", value: stats.totalOrders },
    { label: "Total Meals", value: stats.totalMeals },
    { label: "Revenue", value: formatMoney(stats.totalRevenueCents) },
    { label: "Deliveries", value: stats.deliveries },
    { label: "Paid Orders", value: stats.paidOrders, tone: "green" },
    { label: "Unpaid Orders", value: stats.unpaidOrders, tone: "red" },
    { label: "Orders Today", value: stats.ordersToday },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          selectedWeek
            ? `Week of ${formatWeekRange(selectedWeek.weekStart, selectedWeek.weekEnd)}`
            : "No week selected"
        }
        actions={
          <>
            <WeekSelect
              weeks={weeks.map((w) => ({
                id: w.id,
                label: formatWeekRange(w.weekStart, w.weekEnd),
                status: w.status,
              }))}
              value={selectedId}
              basePath="/dashboard"
            />
            <Link href="/orders/new" className="btn-primary">
              New Order
            </Link>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {c.label}
            </div>
            <div
              className={`mt-1 font-display text-2xl font-semibold ${
                c.tone === "green"
                  ? "text-tropical-700"
                  : c.tone === "red"
                    ? "text-red-600"
                    : "text-gray-900"
              }`}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Meals required */}
      <div className="card mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Meals Required</h3>
            <p className="text-xs text-gray-400">
              Aggregated production quantities for this week
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/print/production?week=${selectedId ?? ""}&breakdown=1`}
              target="_blank"
              className="btn-secondary"
            >
              Print Production Summary
            </a>
          </div>
        </div>
        <ul className="divide-y divide-gray-50">
          {meals.map((m) => (
            <li
              key={m.mealName}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="text-sm font-medium text-gray-800">{m.mealName}</span>
              <span className="font-display text-lg font-semibold text-gray-900">
                {m.quantity}
              </span>
            </li>
          ))}
          {meals.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-400">
              No meals ordered yet for this week.
            </li>
          )}
        </ul>
        {meals.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2.5">
            <span className="text-sm font-semibold text-gray-700">Total Meals</span>
            <span className="font-display text-lg font-bold text-gray-900">
              {meals.reduce((s, m) => s + m.quantity, 0)}
            </span>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Link href="/orders" className="card p-4 hover:border-brand-300">
          <div className="font-medium text-gray-900">Manage Orders →</div>
          <div className="text-sm text-gray-500">View, edit, duplicate, print</div>
        </Link>
        <Link href="/labels" className="card p-4 hover:border-brand-300">
          <div className="font-medium text-gray-900">Delivery & Labels →</div>
          <div className="text-sm text-gray-500">4×6 labels & manifest</div>
        </Link>
        <Link href="/invoices" className="card p-4 hover:border-brand-300">
          <div className="font-medium text-gray-900">Invoices →</div>
          <div className="text-sm text-gray-500">Bulk print for the week</div>
        </Link>
      </div>
    </div>
  );
}
