import { listMeals } from "@/lib/db/meals-db";
import { listCategories } from "@/lib/db/categories-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { MealsManager } from "./MealsManager";

export const dynamic = "force-dynamic";

export default function MealsPage() {
  const meals = listMeals();
  const categories = listCategories();

  return (
    <div>
      <PageHeader title="Meals" subtitle={`${meals.length} meals in the database`} />
      <MealsManager meals={meals} categories={categories} />
    </div>
  );
}
