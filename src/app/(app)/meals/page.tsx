import { listMeals } from "@/lib/db/meals-db";
import { listCategories } from "@/lib/db/categories-db";
import { computeRecipeForMeal } from "@/lib/db/recipe-view";
import { PageHeader } from "@/components/ui/PageHeader";
import { MealsManager } from "./MealsManager";
import type { MealRecipeInfo } from "./MealsManager";

export const dynamic = "force-dynamic";

export default function MealsPage() {
  const meals = listMeals();
  const categories = listCategories();

  const recipeInfo: Record<number, MealRecipeInfo> = {};
  for (const m of meals) {
    const rc = computeRecipeForMeal(m.id);
    if (!rc) {
      recipeInfo[m.id] = { hasRecipe: false };
      continue;
    }
    const fc = rc.computed.foodCostCents;
    recipeInfo[m.id] = {
      hasRecipe: true,
      recipeId: rc.recipe.id,
      empty: rc.recipe.components.length === 0,
      foodCostCents: fc,
      costUnavailable: rc.computed.costUnavailable,
      foodCostPct: fc != null && m.priceCents > 0 ? (fc / m.priceCents) * 100 : null,
      marginPct: fc != null && m.priceCents > 0 ? ((m.priceCents - fc) / m.priceCents) * 100 : null,
    };
  }

  return (
    <div>
      <PageHeader title="Meals" subtitle={`${meals.length} meals in the database`} />
      <MealsManager meals={meals} categories={categories} recipeInfo={recipeInfo} />
    </div>
  );
}
