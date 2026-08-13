import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/db/recipes-db";
import { getIngredient } from "@/lib/db/ingredients-db";
import { resolveComputation } from "@/lib/db/production-db";
import { PrintControls } from "@/components/PrintControls";
import { formatQty } from "@/lib/units";
import { formatWeekRange } from "@/lib/format";
import { getWeek } from "@/lib/db/weeks-db";
import type { BaseUnit } from "@/types";

export const dynamic = "force-dynamic";

export default async function RecipeCardPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { id } = await params;
  const { week } = await searchParams;
  const recipe = getRecipe(Number(id));
  if (!recipe) notFound();

  // Resolve component display names/units + master quantities.
  const rows = recipe.components.map((c) => {
    let name = c.name ?? "?";
    let unit: BaseUnit = (c.baseUnit as BaseUnit) ?? "g";
    if (c.componentType === "ingredient" && c.ingredientId) {
      const ing = getIngredient(c.ingredientId);
      if (ing) {
        name = ing.name;
        unit = ing.baseUnit;
      }
    }
    return { name, unit, quantityBase: c.quantityBase, type: c.componentType };
  });

  // Optional week-scaled production version (batch recipes only).
  let scaled:
    | { batches: number | null; required: number; components: { name: string; unit: BaseUnit; quantityBase: number }[] }
    | null = null;
  let wkLabel = "";
  if (week && recipe.recipeType === "batch") {
    const weekId = Number(week);
    const wk = getWeek(weekId);
    if (wk) wkLabel = formatWeekRange(wk.weekStart, wk.weekEnd);
    const { computation } = resolveComputation(weekId);
    const sub = computation.subRecipes.find((s) => s.recipeId === recipe.id);
    if (sub) {
      scaled = {
        batches: sub.recommendedBatches,
        required: sub.requiredFinishedBase,
        components: sub.components.map((c) => ({
          name: c.name,
          unit: c.baseUnit,
          quantityBase: Math.round(c.quantityBase),
        })),
      };
    }
  }

  const yieldLabel =
    recipe.recipeType === "batch" && recipe.batchYieldBase != null
      ? formatQty(recipe.batchYieldBase, recipe.batchYieldUnit)
      : null;

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintControls mode="a4" backHref={`/recipes/${recipe.id}`} title="Recipe Card" />
      <div className="print-page mx-auto my-4 w-[210mm] max-w-full bg-white p-[16mm] text-gray-900 shadow-sm">
        <div className="border-b-2 border-brand-600 pb-3">
          <h1 className="font-display text-3xl font-semibold text-brand-700">{recipe.name}</h1>
          <p className="text-sm text-gray-500">
            {recipe.recipeType === "batch" ? "Batch Recipe" : "Final Dish"}
            {yieldLabel && ` · Standard Batch Yield: ${yieldLabel}`}
          </p>
        </div>

        {/* Scaled production card */}
        {scaled ? (
          <div className="mt-5">
            <h2 className="font-display text-lg font-semibold text-gray-800">
              Production for {wkLabel}
            </h2>
            <p className="text-sm text-gray-600">
              Required: {formatQty(scaled.required, recipe.batchYieldUnit)}
              {scaled.batches != null && ` · Make ${scaled.batches.toFixed(2)} batch(es)`}
            </p>
            <table className="mt-3 w-full text-base">
              <thead>
                <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2">Ingredient</th>
                  <th className="py-2 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {scaled.components.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 text-right font-medium">{formatQty(c.quantityBase, c.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5">
            <h2 className="font-display text-lg font-semibold text-gray-800">
              {recipe.recipeType === "batch" ? "Standard Batch" : "Per Portion"}
            </h2>
            <table className="mt-3 w-full text-base">
              <thead>
                <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2">Component</th>
                  <th className="py-2 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2">
                      {r.name}
                      {r.type === "recipe" && (
                        <span className="ml-1 text-xs text-gray-400">(batch recipe)</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-medium">{formatQty(r.quantityBase, r.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {yieldLabel && (
              <p className="mt-3 text-sm font-medium text-gray-700">
                Expected Finished Yield: {yieldLabel}
              </p>
            )}
          </div>
        )}

        {recipe.instructions && (
          <div className="mt-6">
            <h3 className="font-display text-base font-semibold text-gray-800">Method</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{recipe.instructions}</p>
          </div>
        )}
        {recipe.notes && (
          <div className="mt-4">
            <h3 className="font-display text-base font-semibold text-gray-800">Notes</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{recipe.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
