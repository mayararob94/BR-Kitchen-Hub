import { listIngredients } from "@/lib/db/ingredients-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { IngredientsManager } from "./IngredientsManager";

export const dynamic = "force-dynamic";

export default function IngredientsPage() {
  const ingredients = listIngredients();
  return (
    <div>
      <PageHeader
        title="Ingredients"
        subtitle="Central database of purchased ingredients — yield %, price and packaging feed every recipe automatically."
      />
      <IngredientsManager ingredients={ingredients} />
    </div>
  );
}
