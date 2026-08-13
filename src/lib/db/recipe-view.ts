import { getAllRecipesMap, getRecipe, getRecipeForMeal } from "./recipes-db";
import { getIngredientsMap, listIngredients } from "./ingredients-db";
import { computeRecipe, type EngineData } from "@/lib/recipe-engine";
import type { ComputedRecipe, Recipe, BaseUnit } from "@/types";

export function engineData(): EngineData {
  return { recipes: getAllRecipesMap(), ingredients: getIngredientsMap() };
}

/** Compute a single recipe's costs (per portion for final, per batch for batch). */
export function computeRecipeById(id: number): { recipe: Recipe; computed: ComputedRecipe } | null {
  const recipe = getRecipe(id);
  if (!recipe) return null;
  const data = engineData();
  const withComponents = data.recipes.get(id) ?? recipe;
  return { recipe, computed: computeRecipe(withComponents, data) };
}

export function computeRecipeForMeal(
  mealId: number
): { recipe: Recipe; computed: ComputedRecipe } | null {
  const recipe = getRecipeForMeal(mealId);
  if (!recipe) return null;
  return computeRecipeById(recipe.id);
}

export interface IngredientOption {
  id: number;
  name: string;
  category: string;
  baseUnit: BaseUnit;
  defaultYieldPct: number;
  effectivePriceCents: number | null;
}

export interface BatchRecipeOption {
  id: number;
  name: string;
  baseUnit: BaseUnit;
  costPerBaseFinishedCents: number | null;
  batchYieldBase: number | null;
}

/** Options for the recipe editor's component picker (ingredients + batch recipes). */
export function recipeEditorOptions(excludeRecipeId?: number): {
  ingredients: IngredientOption[];
  batchRecipes: BatchRecipeOption[];
} {
  const data = engineData();
  const ingredients: IngredientOption[] = listIngredients(false).map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    baseUnit: i.baseUnit,
    defaultYieldPct: i.defaultYieldPct,
    effectivePriceCents: i.effectivePriceCents,
  }));

  const batchRecipes: BatchRecipeOption[] = [];
  for (const r of data.recipes.values()) {
    if (r.recipeType !== "batch" || !r.isActive) continue;
    if (excludeRecipeId && r.id === excludeRecipeId) continue;
    const computed = computeRecipe(r, data);
    batchRecipes.push({
      id: r.id,
      name: r.name,
      baseUnit: r.batchYieldUnit,
      costPerBaseFinishedCents: computed.costPerBaseFinishedCents ?? null,
      batchYieldBase: r.batchYieldBase,
    });
  }
  batchRecipes.sort((a, b) => a.name.localeCompare(b.name));
  return { ingredients, batchRecipes };
}
