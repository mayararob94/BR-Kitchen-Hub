import { getWeek } from "@/lib/db/weeks-db";
import { resolveComputation } from "@/lib/db/production-db";
import { getSettings } from "@/lib/db/settings-db";
import { PrintControls } from "@/components/PrintControls";
import { formatQty, unitBigLabel } from "@/lib/units";
import { formatMoney } from "@/lib/money";
import { formatWeekRange, formatDate } from "@/lib/format";
import type { IngredientRequirement } from "@/types";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = ["Meat/Protein", "Produce", "Dry Goods", "Dairy"];

function groupByCategory(items: IngredientRequirement[]): [string, IngredientRequirement[]][] {
  const map = new Map<string, IngredientRequirement[]>();
  for (const it of items) {
    if (!map.has(it.category)) map.set(it.category, []);
    map.get(it.category)!.push(it);
  }
  const keys = [...map.keys()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });
  return keys.map((k) => [k, map.get(k)!]);
}

export default async function OrderingPrintPage({
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
  const groups = groupByCategory(computation.ingredients);

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintControls mode="a4" backHref={`/production?week=${weekId}`} title="Ordering PDF" />
      <div className="print-page mx-auto my-4 w-[210mm] max-w-full bg-white p-[14mm] text-gray-900 shadow-sm">
        <div className="flex items-end justify-between border-b-2 border-brand-600 pb-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-brand-700">Production Order</h1>
            <p className="text-sm text-gray-500">
              {settings.businessName} · Purchasing list
            </p>
          </div>
          <div className="text-right text-sm">
            {wk && <div>Production Week: {formatWeekRange(wk.weekStart, wk.weekEnd)}</div>}
            <div>Printed: {formatDate(new Date().toISOString())}</div>
            <div>Total Meals: {computation.totalMeals}</div>
            <div>Buffer: {computation.bufferPct}%</div>
          </div>
        </div>

        {groups.map(([category, items]) => (
          <div key={category} className="mt-5 break-inside-avoid">
            <h2 className="mb-1 font-display text-base font-semibold uppercase tracking-wide text-gray-700">
              {category}
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="w-6 py-1"></th>
                  <th className="py-1">Ingredient</th>
                  <th className="py-1 text-right">Required</th>
                  <th className="py-1 text-right">Buffer</th>
                  <th className="py-1 text-right">Purchase</th>
                  <th className="py-1">Supplier</th>
                  <th className="py-1 text-right">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.ingredientId} className="border-b border-gray-100">
                    <td className="py-1.5">
                      <span className="inline-block h-3.5 w-3.5 border border-gray-400" />
                    </td>
                    <td className="py-1.5 font-medium">{r.name}</td>
                    <td className="py-1.5 text-right">{formatQty(r.requiredBase, r.baseUnit)}</td>
                    <td className="py-1.5 text-right text-gray-500">{r.bufferPct}%</td>
                    <td className="py-1.5 text-right font-semibold">
                      {formatQty(r.purchaseBase, r.baseUnit)} {unitBigLabel(r.baseUnit) !== "each" ? "" : ""}
                    </td>
                    <td className="py-1.5">{r.supplier || "—"}</td>
                    <td className="py-1.5 text-right">
                      {r.estimatedCostCents != null ? formatMoney(r.estimatedCostCents) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {computation.ingredients.length === 0 && (
          <p className="mt-8 text-center text-gray-400">
            No ingredient requirements. Add recipes to the ordered dishes.
          </p>
        )}

        <div className="mt-6 flex justify-end border-t-2 border-gray-300 pt-3">
          <div className="text-right">
            <span className="text-sm text-gray-500">Estimated Purchasing Cost</span>
            <div className="font-display text-2xl font-bold text-gray-900">
              {computation.estimatedPurchasingCostCents != null
                ? formatMoney(computation.estimatedPurchasingCostCents)
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
