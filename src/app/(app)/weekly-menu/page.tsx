import { listWeeks, getWeek, getWeekItems, getActiveWeek } from "@/lib/db/weeks-db";
import { listMeals } from "@/lib/db/meals-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { WeeklyMenuManager } from "./WeeklyMenuManager";

export const dynamic = "force-dynamic";

export default async function WeeklyMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weeks = listWeeks();

  const selectedId = week ? Number(week) : (getActiveWeek()?.id ?? weeks[0]?.id ?? null);
  const selectedWeek = selectedId ? getWeek(selectedId) : null;
  const selectedItems = selectedId ? getWeekItems(selectedId) : [];
  const meals = listMeals(false); // active meals available to add

  return (
    <div>
      <PageHeader
        title="Weekly Menu"
        subtitle="Choose which meals are available each operating week. The New Order screen only shows the selected week's meals."
      />
      <WeeklyMenuManager
        weeks={weeks}
        selectedWeek={selectedWeek}
        selectedItems={selectedItems}
        meals={meals}
      />
    </div>
  );
}
