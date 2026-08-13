/**
 * Recursive recipe / costing / production engine.
 *
 * Pure functions over in-memory maps of recipes and ingredients, so results are
 * deterministic, unit-testable, and safe to freeze into a production snapshot.
 *
 * Conventions (see units.ts):
 *   • weights/volumes are integer base units (g / ml); counts are "each"
 *   • prices are cents per kg / litre / each
 *   • yield is a percentage; ratio = pct / 100; raw = cooked / ratio
 *
 * Component quantity semantics depend on context:
 *   • ingredient in a FINAL dish   → cooked/finished portion weight
 *   • ingredient in a BATCH recipe → raw input weight for one standard batch
 *   • sub-recipe component         → finished quantity used
 */

import type {
  Recipe,
  Ingredient,
  BaseUnit,
  ComputedRecipe,
  ComputedComponent,
  ProductionComputation,
  DishProduction,
  SubRecipeProduction,
  IngredientRequirement,
} from "@/types";

const MAX_DEPTH = 25;

export interface EngineData {
  recipes: Map<number, Recipe>;
  ingredients: Map<number, Ingredient>;
}

function componentYield(ingredient: Ingredient, override: number | null): number {
  const y = override ?? ingredient.defaultYieldPct;
  return y > 0 ? y : 0;
}

function componentPrice(ingredient: Ingredient, override: number | null): number | null {
  return override ?? ingredient.effectivePriceCents;
}

/** Cost in cents for a raw quantity given a per-kg/L/each price. */
function costOf(rawBase: number, unit: BaseUnit, priceCents: number | null): number | null {
  if (priceCents == null) return null;
  return unit === "each" ? rawBase * priceCents : (rawBase / 1000) * priceCents;
}

// ─────────────────────────────────────────────────────────────
//  Ingredient expansion (for purchasing) — accumulates raw grams
// ─────────────────────────────────────────────────────────────

/** Expand a FINAL dish (N portions) into raw ingredient base units. */
export function expandFinalDish(
  recipe: Recipe,
  portions: number,
  data: EngineData,
  acc: Map<number, number>,
  warnings: string[],
  depth = 0
): void {
  if (depth > MAX_DEPTH) {
    warnings.push(`Max recipe depth exceeded at "${recipe.name}"`);
    return;
  }
  for (const c of recipe.components) {
    if (c.componentType === "ingredient" && c.ingredientId != null) {
      const ing = data.ingredients.get(c.ingredientId);
      if (!ing) continue;
      const ratio = componentYield(ing, c.yieldOverride) / 100;
      const raw = ratio > 0 ? c.quantityBase / ratio : 0;
      acc.set(c.ingredientId, (acc.get(c.ingredientId) ?? 0) + raw * portions);
    } else if (c.componentType === "recipe" && c.childRecipeId != null) {
      const child = data.recipes.get(c.childRecipeId);
      if (!child) continue;
      expandBatchRecipe(child, c.quantityBase * portions, data, acc, warnings, depth + 1, [
        recipe.id,
      ]);
    }
  }
}

/** Expand a BATCH recipe needed to produce `neededFinished` base units. */
export function expandBatchRecipe(
  recipe: Recipe,
  neededFinished: number,
  data: EngineData,
  acc: Map<number, number>,
  warnings: string[],
  depth = 0,
  stack: number[] = []
): void {
  if (depth > MAX_DEPTH) {
    warnings.push(`Max recipe depth exceeded at "${recipe.name}"`);
    return;
  }
  if (stack.includes(recipe.id)) {
    warnings.push(`Circular recipe reference at "${recipe.name}" — skipped`);
    return;
  }
  const yield_ = recipe.batchYieldBase;
  if (!yield_ || yield_ <= 0) {
    warnings.push(`"${recipe.name}" has no batch yield — cannot expand for purchasing`);
    return;
  }
  const scale = neededFinished / yield_;
  const nextStack = [...stack, recipe.id];
  for (const c of recipe.components) {
    if (c.componentType === "ingredient" && c.ingredientId != null) {
      // Batch-recipe ingredients are raw inputs for one standard batch.
      acc.set(
        c.ingredientId,
        (acc.get(c.ingredientId) ?? 0) + c.quantityBase * scale
      );
    } else if (c.componentType === "recipe" && c.childRecipeId != null) {
      const child = data.recipes.get(c.childRecipeId);
      if (!child) continue;
      expandBatchRecipe(child, c.quantityBase * scale, data, acc, warnings, depth + 1, nextStack);
    }
  }
}

/** Total raw base units a single recipe requires (per portion / per batch input). */
function rawWeightOf(recipe: Recipe, data: EngineData): number {
  const acc = new Map<number, number>();
  const warnings: string[] = [];
  if (recipe.recipeType === "final") {
    expandFinalDish(recipe, 1, data, acc, warnings, 0);
  } else {
    expandBatchRecipe(recipe, recipe.batchYieldBase ?? 0, data, acc, warnings, 0);
  }
  let total = 0;
  for (const v of acc.values()) total += v;
  return total;
}

// ─────────────────────────────────────────────────────────────
//  Cost per recipe (per portion for final, per batch for batch)
// ─────────────────────────────────────────────────────────────

export function computeRecipe(
  recipe: Recipe,
  data: EngineData,
  stack: number[] = []
): ComputedRecipe {
  const warnings: string[] = [];
  const components: ComputedComponent[] = [];
  let foodCost = 0;
  let anyUnavailable = false;
  let finishedWeight = 0;

  if (stack.includes(recipe.id)) {
    return {
      recipeId: recipe.id,
      type: recipe.recipeType,
      name: recipe.name,
      components: [],
      finishedWeightBase: 0,
      rawWeightBase: 0,
      foodCostCents: null,
      costUnavailable: true,
      warnings: [`Circular recipe reference at "${recipe.name}"`],
    };
  }
  const nextStack = [...stack, recipe.id];

  for (const c of recipe.components) {
    if (c.componentType === "ingredient" && c.ingredientId != null) {
      const ing = data.ingredients.get(c.ingredientId);
      if (!ing) {
        warnings.push("An ingredient referenced by this recipe is missing");
        continue;
      }
      if (!ing.isActive) warnings.push(`Ingredient "${ing.name}" is inactive`);
      const yieldPct = componentYield(ing, c.yieldOverride);
      if (yieldPct <= 0) warnings.push(`Ingredient "${ing.name}" has no yield`);
      const ratio = yieldPct / 100;

      let cookedBase: number;
      let rawBase: number;
      if (recipe.recipeType === "final") {
        cookedBase = c.quantityBase;
        rawBase = ratio > 0 ? Math.round(c.quantityBase / ratio) : 0;
      } else {
        // batch recipe: quantity is the raw input
        cookedBase = c.quantityBase;
        rawBase = c.quantityBase;
      }
      const price = componentPrice(ing, c.priceOverrideCents);
      const cost = costOf(rawBase, ing.baseUnit, price);
      if (cost == null) anyUnavailable = true;
      else foodCost += cost;
      finishedWeight += cookedBase;

      components.push({
        componentId: c.id,
        type: "ingredient",
        refId: ing.id,
        name: ing.name,
        baseUnit: ing.baseUnit,
        cookedBase,
        rawBase,
        yieldPct,
        unitPriceCents: price,
        costCents: cost,
        costUnavailable: cost == null,
      });
    } else if (c.componentType === "recipe" && c.childRecipeId != null) {
      const child = data.recipes.get(c.childRecipeId);
      if (!child) {
        warnings.push("A sub-recipe referenced by this recipe is missing");
        continue;
      }
      const childComputed = computeRecipe(child, data, nextStack);
      warnings.push(...childComputed.warnings);
      const usedFinished = c.quantityBase; // finished qty used
      const perBase = childComputed.costPerBaseFinishedCents ?? null;
      const cost = perBase != null ? usedFinished * perBase : null;
      if (cost == null) anyUnavailable = true;
      else foodCost += cost;
      finishedWeight += usedFinished;

      // Raw contribution of this sub-recipe (expanded), for the raw-weight total.
      const subAcc = new Map<number, number>();
      const subWarn: string[] = [];
      expandBatchRecipe(child, usedFinished, data, subAcc, subWarn, 0, nextStack);
      let subRaw = 0;
      for (const v of subAcc.values()) subRaw += v;

      components.push({
        componentId: c.id,
        type: "recipe",
        refId: child.id,
        name: child.name,
        baseUnit: child.batchYieldUnit,
        cookedBase: usedFinished,
        rawBase: Math.round(subRaw),
        yieldPct: 100,
        unitPriceCents: perBase != null ? perBase * 1000 : null, // per kg equiv for display
        costCents: cost,
        costUnavailable: cost == null,
      });
    }
  }

  const rawWeight = rawWeightOf(recipe, data);
  const foodCostCents = anyUnavailable && foodCost === 0 ? null : foodCost;
  const batchYieldBase = recipe.recipeType === "batch" ? recipe.batchYieldBase : undefined;
  const costPerBaseFinishedCents =
    recipe.recipeType === "batch" && batchYieldBase && batchYieldBase > 0 && !anyUnavailable
      ? foodCost / batchYieldBase
      : null;

  if (recipe.recipeType === "batch" && (!batchYieldBase || batchYieldBase <= 0)) {
    warnings.push(`Batch recipe "${recipe.name}" has no finished batch yield set`);
  }

  return {
    recipeId: recipe.id,
    type: recipe.recipeType,
    name: recipe.name,
    components,
    finishedWeightBase: recipe.recipeType === "batch" ? (batchYieldBase ?? finishedWeight) : finishedWeight,
    rawWeightBase: Math.round(rawWeight),
    foodCostCents,
    costUnavailable: anyUnavailable,
    batchYieldBase,
    costPerBaseFinishedCents,
    warnings: [...new Set(warnings)],
  };
}

// ─────────────────────────────────────────────────────────────
//  Production computation (orders → dishes → sub-recipes → buy list)
// ─────────────────────────────────────────────────────────────

function ceilToIncrement(value: number, increment: number | null): number {
  if (!increment || increment <= 0) return Math.round(value);
  return Math.ceil(value / increment) * increment;
}

export interface OrderLine {
  mealId: number;
  portions: number;
}

export function computeProduction(
  weekId: number,
  orderLines: OrderLine[],
  data: EngineData,
  globalBufferPct: number
): ProductionComputation {
  const warnings: string[] = [];

  // Meal → recipe lookup (active final recipe per meal).
  const recipeByMeal = new Map<number, Recipe>();
  for (const r of data.recipes.values()) {
    if (r.recipeType === "final" && r.mealId != null && r.isActive) {
      recipeByMeal.set(r.mealId, r);
    }
  }

  // Aggregate portions per meal.
  const portionsByMeal = new Map<number, number>();
  const nameByMeal = new Map<number, string>();
  for (const line of orderLines) {
    portionsByMeal.set(line.mealId, (portionsByMeal.get(line.mealId) ?? 0) + line.portions);
  }

  const dishes: DishProduction[] = [];
  const ingredientAcc = new Map<number, number>(); // ingredientId → raw base units
  const subReq = new Map<number, number>(); // sub-recipe id → required finished base
  let totalMeals = 0;
  let foodCostTotal = 0;
  let foodCostUnavailable = false;

  // Accumulate required finished quantity for a sub-recipe and cascade to its
  // own sub-recipe components.
  function addSub(recipe: Recipe, neededFinished: number, stack: number[]) {
    if (stack.includes(recipe.id)) {
      warnings.push(`Circular recipe reference at "${recipe.name}" — skipped`);
      return;
    }
    subReq.set(recipe.id, (subReq.get(recipe.id) ?? 0) + neededFinished);
    const yield_ = recipe.batchYieldBase;
    if (!yield_ || yield_ <= 0) return;
    const scale = neededFinished / yield_;
    const next = [...stack, recipe.id];
    for (const c of recipe.components) {
      if (c.componentType === "recipe" && c.childRecipeId != null) {
        const child = data.recipes.get(c.childRecipeId);
        if (child) addSub(child, c.quantityBase * scale, next);
      }
    }
  }

  for (const [mealId, portions] of portionsByMeal) {
    totalMeals += portions;
    const recipe = recipeByMeal.get(mealId);
    const dishName =
      recipe?.name ?? nameByMeal.get(mealId) ?? `Meal #${mealId}`;

    if (!recipe) {
      dishes.push({
        mealId,
        recipeId: null,
        dishName,
        portions,
        hasRecipe: false,
        components: [],
        foodCostCents: null,
      });
      warnings.push(`Dish "${dishName}" has ${portions} ordered but no production recipe`);
      continue;
    }

    const computed = computeRecipe(recipe, data);
    if (computed.costUnavailable) foodCostUnavailable = true;
    if (computed.foodCostCents != null) foodCostTotal += computed.foodCostCents * portions;

    // Per-dish component totals (finished + raw), scaled to portions.
    const dishComponents = computed.components.map((cc) => ({
      name: cc.name,
      type: cc.type,
      baseUnit: cc.baseUnit,
      finishedBase: cc.cookedBase * portions,
      rawBase: cc.rawBase * portions,
    }));
    dishes.push({
      mealId,
      recipeId: recipe.id,
      dishName,
      portions,
      hasRecipe: true,
      components: dishComponents,
      foodCostCents: computed.foodCostCents != null ? computed.foodCostCents * portions : null,
    });

    // Expand into raw ingredients for purchasing.
    expandFinalDish(recipe, portions, data, ingredientAcc, warnings, 0);

    // Accumulate sub-recipe finished requirements (with cascade).
    for (const c of recipe.components) {
      if (c.componentType === "recipe" && c.childRecipeId != null) {
        const child = data.recipes.get(c.childRecipeId);
        if (child) addSub(child, c.quantityBase * portions, [recipe.id]);
      }
    }
  }

  // Sub-recipe production list.
  const subRecipes: SubRecipeProduction[] = [];
  for (const [rid, required] of subReq) {
    const recipe = data.recipes.get(rid);
    if (!recipe) continue;
    const yield_ = recipe.batchYieldBase ?? null;
    const theoreticalBatches = yield_ && yield_ > 0 ? required / yield_ : null;
    // batchIncrement null → "exact" (produce the precise requirement). Otherwise
    // round UP to the configured batch increment (0.25 / 0.5 / 1 …) so we never
    // under-produce.
    const recommendedBatches =
      theoreticalBatches == null
        ? null
        : recipe.batchIncrement && recipe.batchIncrement > 0
          ? Math.ceil(theoreticalBatches / recipe.batchIncrement) * recipe.batchIncrement
          : theoreticalBatches;
    const scale = yield_ && yield_ > 0 ? required / yield_ : 0;
    const displayBatches = recommendedBatches ?? scale;

    const computed = computeRecipe(recipe, data);
    const costPerBase = computed.costPerBaseFinishedCents;
    const cost = costPerBase != null ? required * costPerBase : null;

    subRecipes.push({
      recipeId: rid,
      name: recipe.name,
      baseUnit: recipe.batchYieldUnit,
      requiredFinishedBase: Math.round(required),
      batchYieldBase: yield_,
      theoreticalBatches,
      recommendedBatches,
      scaleFactor: scale,
      // Components scaled to the recommended production (what the kitchen makes).
      components: recipe.components.map((c) => {
        const name =
          c.name ??
          (c.componentType === "ingredient"
            ? data.ingredients.get(c.ingredientId ?? -1)?.name
            : data.recipes.get(c.childRecipeId ?? -1)?.name) ??
          "?";
        const unit: BaseUnit =
          c.componentType === "ingredient"
            ? (data.ingredients.get(c.ingredientId ?? -1)?.baseUnit ?? "g")
            : (data.recipes.get(c.childRecipeId ?? -1)?.batchYieldUnit ?? "g");
        return {
          name,
          type: c.componentType,
          baseUnit: unit,
          quantityBase: c.quantityBase * displayBatches,
        };
      }),
      costCents: cost,
    });
  }
  subRecipes.sort((a, b) => a.name.localeCompare(b.name));

  // Master ingredient requirements with buffer + purchase rounding.
  const ingredients: IngredientRequirement[] = [];
  let purchasingCost = 0;
  let purchasingUnavailable = false;
  let rawWeightTotal = 0;

  for (const [ingId, requiredRaw] of ingredientAcc) {
    const ing = data.ingredients.get(ingId);
    if (!ing) continue;
    const requiredBase = Math.round(requiredRaw);
    rawWeightTotal += requiredBase;
    const bufferPct = ing.bufferPctOverride ?? globalBufferPct;
    const finalRequired = Math.round(requiredBase * (1 + bufferPct / 100));
    const purchaseBase = ceilToIncrement(finalRequired, ing.purchaseIncrementBase ?? null);
    const price = ing.effectivePriceCents;
    const estCost = costOf(purchaseBase, ing.baseUnit, price);
    if (estCost == null) purchasingUnavailable = true;
    else purchasingCost += estCost;
    if (price == null) warnings.push(`Ingredient "${ing.name}" has no price — cost unavailable`);

    ingredients.push({
      ingredientId: ingId,
      name: ing.name,
      category: ing.category,
      baseUnit: ing.baseUnit,
      supplier: ing.supplier,
      requiredBase,
      bufferPct,
      finalRequiredBase: finalRequired,
      purchaseBase,
      purchaseIncrementBase: ing.purchaseIncrementBase,
      unitPriceCents: price,
      estimatedCostCents: estCost,
      costUnavailable: estCost == null,
    });
  }
  ingredients.sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );

  return {
    weekId,
    totalOrders: 0, // filled by caller (needs order count, not lines)
    totalMeals,
    distinctDishes: portionsByMeal.size,
    estimatedFoodCostCents: foodCostUnavailable && foodCostTotal === 0 ? null : foodCostTotal,
    estimatedRawWeightBase: rawWeightTotal,
    bufferPct: globalBufferPct,
    dishes: dishes.sort((a, b) => b.portions - a.portions),
    subRecipes,
    ingredients,
    estimatedPurchasingCostCents:
      purchasingUnavailable && purchasingCost === 0 ? null : purchasingCost,
    warnings: [...new Set(warnings)],
  };
}
