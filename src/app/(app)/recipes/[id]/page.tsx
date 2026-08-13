import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe, recipesUsing } from "@/lib/db/recipes-db";
import { getMeal } from "@/lib/db/meals-db";
import { recipeEditorOptions } from "@/lib/db/recipe-view";
import { PageHeader } from "@/components/ui/PageHeader";
import { RecipeEditor } from "@/components/recipes/RecipeEditor";

export const dynamic = "force-dynamic";

export default async function RecipeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = getRecipe(Number(id));
  if (!recipe) notFound();

  const meal = recipe.mealId ? getMeal(recipe.mealId) : null;
  const options = recipeEditorOptions(recipe.id);
  const usedIn = recipesUsing(recipe.id);

  return (
    <div>
      <PageHeader
        title={recipe.name}
        subtitle={
          recipe.recipeType === "batch"
            ? "Batch Recipe — produced internally and used inside other recipes"
            : meal
              ? `Final Dish · linked to meal “${meal.name}”`
              : "Final Dish"
        }
        actions={
          <Link href="/recipes" className="btn-ghost">
            ← All Recipes
          </Link>
        }
      />

      {usedIn.length > 0 && (
        <div className="card mb-4 p-3 text-sm">
          <span className="font-medium text-gray-700">Used in:</span>{" "}
          {usedIn.map((u, i) => (
            <span key={u.id}>
              <Link href={`/recipes/${u.id}`} className="text-brand-700 hover:underline">
                {u.name}
              </Link>
              {i < usedIn.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}

      <RecipeEditor
        recipe={recipe}
        sellingPriceCents={meal?.priceCents ?? null}
        ingredientOptions={options.ingredients}
        batchOptions={options.batchRecipes}
      />
    </div>
  );
}
