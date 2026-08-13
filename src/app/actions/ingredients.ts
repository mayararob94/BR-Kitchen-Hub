"use server";

import { revalidatePath } from "next/cache";
import {
  createIngredient,
  updateIngredient,
  deleteIngredient,
  type IngredientInput,
} from "@/lib/db/ingredients-db";

export async function createIngredientAction(data: IngredientInput): Promise<void> {
  createIngredient(data);
  revalidatePath("/ingredients");
  revalidatePath("/recipes");
}

export async function updateIngredientAction(
  id: number,
  data: IngredientInput
): Promise<void> {
  updateIngredient(id, data);
  revalidatePath("/ingredients");
  revalidatePath("/recipes");
  revalidatePath("/production");
}

export async function deleteIngredientAction(
  id: number
): Promise<{ ok: boolean; reason?: string }> {
  const res = deleteIngredient(id);
  revalidatePath("/ingredients");
  return res;
}
