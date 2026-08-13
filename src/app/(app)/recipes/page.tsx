import { listRecipes, recipesUsing } from "@/lib/db/recipes-db";
import { getMeal } from "@/lib/db/meals-db";
import { computeRecipeById } from "@/lib/db/recipe-view";
import { PageHeader } from "@/components/ui/PageHeader";
import { RecipesList, type RecipeRow } from "./RecipesList";

export const dynamic = "force-dynamic";

export default function RecipesPage() {
  const recipes = listRecipes();

  const rows: RecipeRow[] = recipes.map((r) => {
    const computed = computeRecipeById(r.id)?.computed ?? null;
    const meal = r.mealId ? getMeal(r.mealId) : null;
    const sellingPriceCents = meal?.priceCents ?? null;
    const foodCost = computed?.foodCostCents ?? null;
    return {
      id: r.id,
      name: r.name,
      type: r.recipeType,
      isActive: r.isActive,
      componentCount: r.components.length,
      sellingPriceCents,
      foodCostCents: foodCost,
      costUnavailable: computed?.costUnavailable ?? false,
      costPerKgCents:
        r.recipeType === "batch" && computed?.costPerBaseFinishedCents != null
          ? computed.costPerBaseFinishedCents * 1000
          : null,
      foodCostPct:
        foodCost != null && sellingPriceCents && sellingPriceCents > 0
          ? (foodCost / sellingPriceCents) * 100
          : null,
      marginPct:
        foodCost != null && sellingPriceCents && sellingPriceCents > 0
          ? ((sellingPriceCents - foodCost) / sellingPriceCents) * 100
          : null,
      usedInCount: recipesUsing(r.id).length,
    };
  });

  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle="Final dishes (sellable) and batch recipes (sauces, stocks, components used inside other recipes)."
      />
      <RecipesList rows={rows} />
    </div>
  );
}
