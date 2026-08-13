import Link from "next/link";
import { listWeeks, getActiveWeek } from "@/lib/db/weeks-db";
import { resolveComputation } from "@/lib/db/production-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { WeekSelect } from "@/components/ui/WeekSelect";
import { ProductionView } from "./ProductionView";
import { formatWeekRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weeks = listWeeks();
  const active = getActiveWeek();
  const selectedId = week ? Number(week) : (active?.id ?? weeks[0]?.id ?? null);
  const selectedWeek = weeks.find((w) => w.id === selectedId) ?? null;

  if (!selectedId || !selectedWeek) {
    return (
      <div>
        <PageHeader title="Production" />
        <div className="card p-6 text-center text-gray-500">
          <p>Create a weekly menu and take some orders first.</p>
          <Link href="/weekly-menu" className="btn-primary mt-3 inline-flex">
            Weekly Menu
          </Link>
        </div>
      </div>
    );
  }

  const { plan, computation, ordersChanged } = resolveComputation(selectedId);

  return (
    <div>
      <PageHeader
        title="Production"
        subtitle={`Week of ${formatWeekRange(selectedWeek.weekStart, selectedWeek.weekEnd)}`}
        actions={
          <WeekSelect
            weeks={weeks.map((w) => ({
              id: w.id,
              label: formatWeekRange(w.weekStart, w.weekEnd),
              status: w.status,
            }))}
            value={selectedId}
            basePath="/production"
          />
        }
      />
      <ProductionView
        weekId={selectedId}
        plan={plan}
        computation={computation}
        ordersChanged={ordersChanged}
      />
    </div>
  );
}
