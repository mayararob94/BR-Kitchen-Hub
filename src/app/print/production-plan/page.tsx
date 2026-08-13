import { getWeek } from "@/lib/db/weeks-db";
import { resolveComputation } from "@/lib/db/production-db";
import { getSettings } from "@/lib/db/settings-db";
import { PrintControls } from "@/components/PrintControls";
import { formatQty } from "@/lib/units";
import { formatWeekRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductionPlanPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekId = week ? Number(week) : null;
  if (!weekId) return <div className="p-10 text-center text-gray-400">No week selected.</div>;

  const wk = getWeek(weekId);
  const { computation } = resolveComputation(weekId);
  const settings = getSettings();

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintControls mode="a4" backHref={`/production?week=${weekId}`} title="Production PDF" />
      <div className="print-page mx-auto my-4 w-[210mm] max-w-full bg-white p-[14mm] text-gray-900 shadow-sm">
        <div className="flex items-end justify-between border-b-2 border-brand-600 pb-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-brand-700">Production Plan</h1>
            <p className="text-sm text-gray-500">{settings.businessName} · Kitchen</p>
          </div>
          <div className="text-right text-sm">
            {wk && <div>Week: {formatWeekRange(wk.weekStart, wk.weekEnd)}</div>}
            <div>Total Meals: {computation.totalMeals}</div>
          </div>
        </div>

        {/* Dish assembly */}
        <h2 className="mt-5 font-display text-lg font-semibold text-gray-800">Dish Assembly</h2>
        {computation.dishes.map((d) => (
          <div key={d.mealId} className="mt-4 break-inside-avoid">
            <div className="flex items-baseline justify-between border-b border-gray-200 pb-1">
              <span className="font-semibold uppercase tracking-wide">{d.dishName}</span>
              <span className="text-sm">Required Portions: {d.portions}</span>
            </div>
            {d.hasRecipe ? (
              <table className="mt-1 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-1">Component</th>
                    <th className="py-1 text-right">Finished Required</th>
                    <th className="py-1 text-right">Raw Required</th>
                  </tr>
                </thead>
                <tbody>
                  {d.components.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1">
                        {c.name}
                        {c.type === "recipe" ? " (batch)" : ""}
                      </td>
                      <td className="py-1 text-right">{formatQty(c.finishedBase, c.baseUnit)}</td>
                      <td className="py-1 text-right">
                        {c.type === "recipe" ? "see below" : formatQty(c.rawBase, c.baseUnit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-1 text-sm text-amber-700">No recipe configured for this dish.</p>
            )}
          </div>
        ))}

        {/* Sub-recipe production */}
        {computation.subRecipes.length > 0 && (
          <>
            <h2 className="mt-8 font-display text-lg font-semibold text-gray-800">
              Batch / Sub-Recipe Production
            </h2>
            {computation.subRecipes.map((s) => (
              <div key={s.recipeId} className="mt-4 break-inside-avoid">
                <div className="flex items-baseline justify-between border-b border-gray-200 pb-1">
                  <span className="font-semibold uppercase tracking-wide">{s.name}</span>
                  <span className="text-sm">
                    Required {formatQty(s.requiredFinishedBase, s.baseUnit)}
                    {s.recommendedBatches != null && (
                      <> · Make {s.recommendedBatches.toFixed(2)} batch(es)</>
                    )}
                  </span>
                </div>
                <table className="mt-1 w-full text-sm">
                  <tbody>
                    {s.components.map((c, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1">
                          {c.name}
                          {c.type === "recipe" ? " (batch)" : ""}
                        </td>
                        <td className="py-1 text-right">
                          {formatQty(Math.round(c.quantityBase), c.baseUnit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
