"use server";

import { revalidatePath } from "next/cache";
import {
  createMeal,
  updateMeal,
  deleteMeal,
  type MealInput,
} from "@/lib/db/meals-db";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/db/categories-db";

export async function createMealAction(data: MealInput): Promise<void> {
  createMeal(data);
  revalidatePath("/meals");
  revalidatePath("/weekly-menu");
}

export async function updateMealAction(
  id: number,
  data: Partial<MealInput>
): Promise<void> {
  updateMeal(id, data);
  revalidatePath("/meals");
  revalidatePath("/weekly-menu");
}

export async function deleteMealAction(
  id: number
): Promise<{ ok: boolean; reason?: string }> {
  const result = deleteMeal(id);
  revalidatePath("/meals");
  revalidatePath("/weekly-menu");
  return result;
}

export async function createCategoryAction(data: {
  name: string;
  sortOrder?: number;
}): Promise<void> {
  createCategory(data);
  revalidatePath("/meals");
}

export async function updateCategoryAction(
  id: number,
  data: { name?: string; sortOrder?: number; isActive?: boolean }
): Promise<void> {
  updateCategory(id, data);
  revalidatePath("/meals");
}

export async function deleteCategoryAction(
  id: number
): Promise<{ ok: boolean; reason?: string }> {
  const result = deleteCategory(id);
  revalidatePath("/meals");
  return result;
}
