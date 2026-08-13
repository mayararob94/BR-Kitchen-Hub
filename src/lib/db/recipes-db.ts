import { getDb } from "./index";
import type { Recipe, RecipeComponent, RecipeType, BaseUnit } from "@/types";

interface RecipeRow {
  id: number;
  meal_id: number | null;
  name: string;
  recipe_type: string;
  version: number;
  is_active: number;
  batch_yield_base: number | null;
  batch_yield_unit: string;
  batch_increment: number | null;
  instructions: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ComponentRow {
  id: number;
  recipe_id: number;
  component_type: string;
  ingredient_id: number | null;
  child_recipe_id: number | null;
  quantity_base: number;
  yield_override: number | null;
  price_override_cents: number | null;
  prep_notes: string;
  sort_order: number;
  // joins
  ingredient_name: string | null;
  ingredient_unit: string | null;
  child_name: string | null;
  child_unit: string | null;
}

function mapComponent(r: ComponentRow): RecipeComponent {
  const isIng = r.component_type === "ingredient";
  return {
    id: r.id,
    recipeId: r.recipe_id,
    componentType: r.component_type as RecipeComponent["componentType"],
    ingredientId: r.ingredient_id,
    childRecipeId: r.child_recipe_id,
    quantityBase: r.quantity_base,
    yieldOverride: r.yield_override,
    priceOverrideCents: r.price_override_cents,
    prepNotes: r.prep_notes,
    sortOrder: r.sort_order,
    name: (isIng ? r.ingredient_name : r.child_name) ?? undefined,
    baseUnit: ((isIng ? r.ingredient_unit : r.child_unit) ?? "g") as BaseUnit,
  };
}

function componentsFor(recipeId: number): RecipeComponent[] {
  const rows = getDb()
    .prepare(
      `SELECT rc.*,
              i.name AS ingredient_name, i.base_unit AS ingredient_unit,
              cr.name AS child_name, cr.batch_yield_unit AS child_unit
       FROM recipe_components rc
       LEFT JOIN ingredients i ON i.id = rc.ingredient_id
       LEFT JOIN recipes cr ON cr.id = rc.child_recipe_id
       WHERE rc.recipe_id = ?
       ORDER BY rc.sort_order ASC, rc.id ASC`
    )
    .all(recipeId) as ComponentRow[];
  return rows.map(mapComponent);
}

function mapRecipe(r: RecipeRow, withComponents = true): Recipe {
  return {
    id: r.id,
    mealId: r.meal_id,
    name: r.name,
    recipeType: r.recipe_type as RecipeType,
    version: r.version,
    isActive: !!r.is_active,
    batchYieldBase: r.batch_yield_base,
    batchYieldUnit: r.batch_yield_unit as BaseUnit,
    batchIncrement: r.batch_increment,
    instructions: r.instructions,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    components: withComponents ? componentsFor(r.id) : [],
  };
}

export function listRecipes(type?: RecipeType, includeInactive = true): Recipe[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (type) {
    clauses.push("recipe_type = ?");
    params.push(type);
  }
  if (!includeInactive) clauses.push("is_active = 1");
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(`SELECT * FROM recipes ${where} ORDER BY recipe_type ASC, name ASC`)
    .all(...params) as RecipeRow[];
  return rows.map((r) => mapRecipe(r));
}

export function getRecipe(id: number): Recipe | null {
  const r = getDb().prepare("SELECT * FROM recipes WHERE id = ?").get(id) as
    | RecipeRow
    | undefined;
  return r ? mapRecipe(r) : null;
}

/** The active recipe attached to a given meal (Final Dish), if any. */
export function getRecipeForMeal(mealId: number): Recipe | null {
  const r = getDb()
    .prepare(
      "SELECT * FROM recipes WHERE meal_id = ? AND is_active = 1 ORDER BY version DESC LIMIT 1"
    )
    .get(mealId) as RecipeRow | undefined;
  return r ? mapRecipe(r) : null;
}

/** All recipes indexed by id (used by the engine to resolve sub-recipes). */
export function getAllRecipesMap(): Map<number, Recipe> {
  return new Map(listRecipes().map((r) => [r.id, r]));
}

export interface RecipeInput {
  mealId?: number | null;
  name: string;
  recipeType: RecipeType;
  batchYieldBase?: number | null;
  batchYieldUnit?: BaseUnit;
  batchIncrement?: number | null;
  instructions?: string;
  notes?: string;
  isActive?: boolean;
}

export interface ComponentInput {
  componentType: "ingredient" | "recipe";
  ingredientId?: number | null;
  childRecipeId?: number | null;
  quantityBase: number;
  yieldOverride?: number | null;
  priceOverrideCents?: number | null;
  prepNotes?: string;
}

export function createRecipe(data: RecipeInput): number {
  const info = getDb()
    .prepare(
      `INSERT INTO recipes
        (meal_id, name, recipe_type, batch_yield_base, batch_yield_unit, batch_increment, instructions, notes, is_active)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
      data.mealId ?? null,
      data.name,
      data.recipeType,
      data.batchYieldBase ?? null,
      data.batchYieldUnit ?? "g",
      data.batchIncrement ?? null,
      data.instructions ?? "",
      data.notes ?? "",
      data.isActive === false ? 0 : 1
    );
  return Number(info.lastInsertRowid);
}

export function updateRecipeMeta(id: number, data: Partial<RecipeInput>): void {
  const cur = getRecipe(id);
  if (!cur) return;
  getDb()
    .prepare(
      `UPDATE recipes SET
        name=?, recipe_type=?, batch_yield_base=?, batch_yield_unit=?, batch_increment=?,
        instructions=?, notes=?, is_active=?, version = version + 1,
        updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE id=?`
    )
    .run(
      data.name ?? cur.name,
      data.recipeType ?? cur.recipeType,
      data.batchYieldBase === undefined ? cur.batchYieldBase : data.batchYieldBase,
      data.batchYieldUnit ?? cur.batchYieldUnit,
      data.batchIncrement === undefined ? cur.batchIncrement : data.batchIncrement,
      data.instructions ?? cur.instructions,
      data.notes ?? cur.notes,
      (data.isActive ?? cur.isActive) ? 1 : 0,
      id
    );
}

/** Replace a recipe's component rows (transactional). */
export function setRecipeComponents(recipeId: number, comps: ComponentInput[]): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM recipe_components WHERE recipe_id = ?").run(recipeId);
    const ins = db.prepare(
      `INSERT INTO recipe_components
        (recipe_id, component_type, ingredient_id, child_recipe_id, quantity_base,
         yield_override, price_override_cents, prep_notes, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?)`
    );
    comps.forEach((c, i) => {
      ins.run(
        recipeId,
        c.componentType,
        c.componentType === "ingredient" ? (c.ingredientId ?? null) : null,
        c.componentType === "recipe" ? (c.childRecipeId ?? null) : null,
        c.quantityBase,
        c.yieldOverride ?? null,
        c.priceOverrideCents ?? null,
        c.prepNotes ?? "",
        i + 1
      );
    });
  });
  tx();
}

export function deleteRecipe(id: number): { ok: boolean; reason?: string } {
  const usedIn = getDb()
    .prepare("SELECT COUNT(*) AS c FROM recipe_components WHERE child_recipe_id = ?")
    .get(id) as { c: number };
  if (usedIn.c > 0) return { ok: false, reason: "used-in-recipes" };
  const db = getDb();
  db.prepare("DELETE FROM recipe_components WHERE recipe_id = ?").run(id);
  db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
  return { ok: true };
}

/**
 * Recipes that use the given recipe as a component ("Used In").
 */
export function recipesUsing(recipeId: number): { id: number; name: string; mealId: number | null }[] {
  return getDb()
    .prepare(
      `SELECT DISTINCT r.id, r.name, r.meal_id AS mealId
       FROM recipe_components rc JOIN recipes r ON r.id = rc.recipe_id
       WHERE rc.child_recipe_id = ?`
    )
    .all(recipeId) as { id: number; name: string; mealId: number | null }[];
}

/**
 * Would adding `childId` as a component of `parentId` create a cycle?
 * True if parentId is the same as childId, or childId already (transitively)
 * depends on parentId.
 */
export function wouldCreateCycle(parentId: number, childId: number): boolean {
  if (parentId === childId) return true;
  const db = getDb();
  const childrenOf = (rid: number): number[] =>
    (
      db
        .prepare(
          "SELECT child_recipe_id AS c FROM recipe_components WHERE recipe_id = ? AND component_type = 'recipe' AND child_recipe_id IS NOT NULL"
        )
        .all(rid) as { c: number }[]
    ).map((x) => x.c);

  // Walk the dependency tree under childId; if we reach parentId, it's a cycle.
  const seen = new Set<number>();
  const stack = [childId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === parentId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...childrenOf(cur));
  }
  return false;
}
