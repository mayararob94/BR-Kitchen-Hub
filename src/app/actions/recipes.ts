"use server";

import { revalidatePath } from "next/cache";
import {
  createRecipe,
  updateRecipeMeta,
  setRecipeComponents,
  deleteRecipe,
  getRecipeForMeal,
  wouldCreateCycle,
  type RecipeInput,
  type ComponentInput,
} from "@/lib/db/recipes-db";

export async function createRecipeAction(data: RecipeInput): Promise<{ id: number }> {
  const id = createRecipe(data);
  revalidatePath("/recipes");
  revalidatePath("/meals");
  return { id };
}

export async function updateRecipeMetaAction(
  id: number,
  data: Partial<RecipeInput>
): Promise<void> {
  updateRecipeMeta(id, data);
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/meals");
  revalidatePath("/production");
}

export async function saveRecipeComponentsAction(
  recipeId: number,
  comps: ComponentInput[]
): Promise<{ ok: boolean; error?: string }> {
  // Reject cycles: a sub-recipe component must not (transitively) depend on this recipe.
  for (const c of comps) {
    if (c.componentType === "recipe" && c.childRecipeId != null) {
      if (wouldCreateCycle(recipeId, c.childRecipeId)) {
        return {
          ok: false,
          error: "That sub-recipe would create a circular dependency and was rejected.",
        };
      }
    }
  }
  setRecipeComponents(recipeId, comps);
  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
  revalidatePath("/meals");
  revalidatePath("/production");
  return { ok: true };
}

export async function deleteRecipeAction(
  id: number
): Promise<{ ok: boolean; reason?: string }> {
  const res = deleteRecipe(id);
  revalidatePath("/recipes");
  revalidatePath("/meals");
  return res;
}

/** Ensure a meal (Final Dish) has a recipe, creating an empty one if missing. */
export async function ensureMealRecipeAction(
  mealId: number,
  mealName: string
): Promise<{ id: number }> {
  const existing = getRecipeForMeal(mealId);
  if (existing) return { id: existing.id };
  const id = createRecipe({
    mealId,
    name: mealName,
    recipeType: "final",
  });
  revalidatePath("/meals");
  revalidatePath("/recipes");
  return { id };
}
