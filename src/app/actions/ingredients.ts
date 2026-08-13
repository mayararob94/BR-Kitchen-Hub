"use server";

import { revalidatePath } from "next/cache";
import {
  createIngredient,
  updateIngredient,
  deleteIngredient,
  type IngredientInput,
} from "@/lib/db/ingredients-db";
import {
  previewImport,
  commitImport,
  type PreviewResult,
  type CommitResult,
} from "@/lib/db/ingredient-import";
import { requirePermission, currentActor } from "@/lib/permissions";

const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB

export async function createIngredientAction(data: IngredientInput): Promise<void> {
  requirePermission("ingredients.create");
  createIngredient(data);
  revalidatePath("/ingredients");
  revalidatePath("/recipes");
}

export async function updateIngredientAction(
  id: number,
  data: IngredientInput
): Promise<void> {
  requirePermission("ingredients.edit");
  updateIngredient(id, data);
  revalidatePath("/ingredients");
  revalidatePath("/recipes");
  revalidatePath("/production");
}

export async function deleteIngredientAction(
  id: number
): Promise<{ ok: boolean; reason?: string }> {
  requirePermission("ingredients.edit");
  const res = deleteIngredient(id);
  revalidatePath("/ingredients");
  return res;
}

// ─── CSV import ───

export async function previewIngredientImportAction(
  csvText: string
): Promise<PreviewResult> {
  requirePermission("ingredients.import");
  if (typeof csvText !== "string" || csvText.length > MAX_CSV_BYTES) {
    return {
      headerError: "File is missing or too large (5 MB max).",
      rows: [],
      counts: { total: 0, new: 0, nochange: 0, changes: 0, errors: 0, example: 0 },
    };
  }
  return previewImport(csvText);
}

export async function commitIngredientImportAction(args: {
  csvText: string;
  filename: string;
  applyUpdateCodes: string[];
  importNew: boolean;
}): Promise<CommitResult> {
  requirePermission("ingredients.import");
  if (typeof args.csvText !== "string" || args.csvText.length > MAX_CSV_BYTES) {
    throw new Error("File is missing or too large (5 MB max).");
  }
  const result = commitImport(
    args.csvText,
    (args.filename || "import.csv").slice(0, 200),
    Array.isArray(args.applyUpdateCodes) ? args.applyUpdateCodes.slice(0, 10000) : [],
    !!args.importNew,
    currentActor()
  );
  revalidatePath("/ingredients");
  revalidatePath("/recipes");
  revalidatePath("/production");
  return result;
}
