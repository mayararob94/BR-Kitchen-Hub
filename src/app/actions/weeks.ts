"use server";

import { revalidatePath } from "next/cache";
import {
  createWeek,
  setWeekStatus,
  deleteWeek,
  setWeekMeals,
  duplicateWeekMenu,
} from "@/lib/db/weeks-db";
import type { WeekStatus } from "@/types";

export async function createWeekAction(
  dateWithinWeek: string,
  status: WeekStatus = "draft"
): Promise<{ id: number }> {
  const id = createWeek(dateWithinWeek, status);
  revalidatePath("/weekly-menu");
  revalidatePath("/orders/new");
  return { id };
}

export async function setWeekStatusAction(
  id: number,
  status: WeekStatus
): Promise<void> {
  setWeekStatus(id, status);
  revalidatePath("/weekly-menu");
  revalidatePath("/orders/new");
}

export async function deleteWeekAction(
  id: number
): Promise<{ ok: boolean; reason?: string }> {
  const result = deleteWeek(id);
  revalidatePath("/weekly-menu");
  return result;
}

export async function setWeekMealsAction(
  weekId: number,
  items: { mealId: number; priceCents: number }[]
): Promise<void> {
  setWeekMeals(weekId, items);
  revalidatePath("/weekly-menu");
  revalidatePath("/orders/new");
}

export async function duplicateWeekMenuAction(
  fromWeekId: number,
  toDateWithinWeek: string
): Promise<{ id: number }> {
  const id = createWeek(toDateWithinWeek, "draft");
  duplicateWeekMenu(fromWeekId, id);
  revalidatePath("/weekly-menu");
  return { id };
}
