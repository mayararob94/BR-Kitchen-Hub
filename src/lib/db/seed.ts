import { getDb } from "./index";
import { createCategory, listCategories } from "./categories-db";
import { createMeal, listMeals } from "./meals-db";
import { createCustomer, listCustomers } from "./customers-db";
import { createWeek, setWeekMeals, getWeek } from "./weeks-db";
import {
  createIngredient,
  getIngredientByCode,
  type IngredientInput,
} from "./ingredients-db";
import {
  createRecipe,
  setRecipeComponents,
  getRecipeForMeal,
  listRecipes,
  type ComponentInput,
} from "./recipes-db";
import { todayISO } from "@/lib/format";
import type { BaseUnit } from "@/types";

const DEMO_NOTE = "[DEMO]";

interface SeedResult {
  customers: number;
  meals: number;
  ingredients: number;
  recipes: number;
  weekId: number;
}

/**
 * Seed optional demo data so the operator can test the full workflow end to end
 * (customers → orders, and ingredients → recipes → production). Demo rows are
 * tagged with "[DEMO]" so they can be removed later.
 */
export function seedDemo(): SeedResult {
  const db = getDb();

  const tx = db.transaction((): SeedResult => {
    // ── Categories ──
    let daily = listCategories().find((c) => c.name === "Daily Meals");
    if (!daily) {
      const id = createCategory({ name: "Daily Meals", sortOrder: 1 });
      daily = { id } as never;
    }
    const categoryId = (daily as { id: number }).id;

    // ── Meals ──
    const demoMeals = [
      "Chicken Stroganoff",
      "Beef Ragu",
      "Chicken Schnitzel",
      "Feijoada",
      "Thai Green Curry",
    ];
    const mealIds: number[] = [];
    demoMeals.forEach((name, i) => {
      const found = listMeals().find((m) => m.name === name);
      if (found) {
        mealIds.push(found.id);
        return;
      }
      mealIds.push(
        createMeal({ name, categoryId, priceCents: 1595, sortOrder: i + 1, notes: DEMO_NOTE })
      );
    });
    const mealByName = new Map(listMeals().map((m) => [m.name, m.id]));

    // ── Customers ──
    const demoCustomers = [
      {
        firstName: "Lucas", lastName: "Test", phone: "+61400000001", email: "lucas@example.com",
        addressLine1: "12 Ocean Street", suburb: "Surfers Paradise", state: "QLD", postcode: "4217",
        deliveryInstructions: "Leave at front door", deliveryWindow: "morning", deliveryPreference: "safe_place",
        notes: `${DEMO_NOTE} Gate code 1234`,
      },
      {
        firstName: "Ana", lastName: "Test", phone: "+61400000002", email: "ana@example.com",
        addressLine1: "5 Palm Avenue", suburb: "Broadbeach", state: "QLD", postcode: "4218",
        deliveryWindow: "anytime", deliveryPreference: "home", notes: `${DEMO_NOTE} Call before delivery`,
      },
      {
        firstName: "John", lastName: "Test", phone: "+61400000003", email: "john@example.com",
        addressLine1: "88 Hedges Avenue", suburb: "Mermaid Beach", state: "QLD", postcode: "4218",
        deliveryWindow: "afternoon", deliveryPreference: "safe_place", notes: `${DEMO_NOTE} Leave behind side gate`,
      },
    ];
    const existingCustomers = new Set(listCustomers().map((c) => c.fullName.toLowerCase()));
    let customerCount = 0;
    for (const c of demoCustomers) {
      if (!existingCustomers.has(`${c.firstName} ${c.lastName}`.toLowerCase())) {
        createCustomer(c);
        customerCount++;
      }
    }

    // ── Ingredients (tagged [DEMO]) ──
    // price is cents per big unit (kg / L / each).
    const demoIngredients: (IngredientInput & { code: string })[] = [
      { code: "MEAT-001", name: "Beef Flank", category: "Meat/Protein", baseUnit: "g", defaultYieldPct: 75, priceCents: 2500 },
      { code: "CHKN-001", name: "Chicken Thigh", category: "Meat/Protein", baseUnit: "g", defaultYieldPct: 78, priceCents: 1100 },
      { code: "DRY-001", name: "Jasmine Rice", category: "Dry Goods", baseUnit: "g", defaultYieldPct: 250, priceCents: 320 },
      { code: "DRY-002", name: "Black Beans", category: "Dry Goods", baseUnit: "g", defaultYieldPct: 300, priceCents: 500 },
      { code: "DRY-003", name: "Flour", category: "Dry Goods", baseUnit: "g", defaultYieldPct: 100, priceCents: 120 },
      { code: "DRY-004", name: "Pasta Sheets", category: "Dry Goods", baseUnit: "g", defaultYieldPct: 100, priceCents: 600 },
      { code: "PROD-001", name: "Broccoli", category: "Produce", baseUnit: "g", defaultYieldPct: 90, priceCents: 650 },
      { code: "PROD-002", name: "Onion", category: "Produce", baseUnit: "g", defaultYieldPct: 90, priceCents: 200 },
      { code: "DAIRY-001", name: "Milk", category: "Dairy", baseUnit: "ml", defaultYieldPct: 100, priceCents: 150 },
      { code: "DAIRY-002", name: "Butter", category: "Dairy", baseUnit: "g", defaultYieldPct: 100, priceCents: 900 },
    ];
    let ingredientCount = 0;
    for (const ing of demoIngredients) {
      if (!getIngredientByCode(ing.code)) {
        createIngredient({ ...ing, notes: DEMO_NOTE });
        ingredientCount++;
      }
    }
    const ingId = (code: string) => getIngredientByCode(code)?.id ?? null;
    const ingComp = (code: string, grams: number): ComponentInput => ({
      componentType: "ingredient",
      ingredientId: ingId(code),
      quantityBase: grams,
    });

    // ── Recipes ──
    let recipeCount = 0;

    // Batch / sub-recipe: Béchamel Sauce (used inside Beef Ragu below)
    let bechamel = listRecipes("batch").find((r) => r.name === "Béchamel Sauce");
    if (!bechamel) {
      const id = createRecipe({
        name: "Béchamel Sauce",
        recipeType: "batch",
        batchYieldBase: 8500,
        batchYieldUnit: "g" as BaseUnit,
        notes: DEMO_NOTE,
      });
      setRecipeComponents(id, [
        ingComp("DAIRY-001", 8000),
        ingComp("DAIRY-002", 600),
        ingComp("DRY-003", 600),
      ]);
      recipeCount++;
      bechamel = listRecipes("batch").find((r) => r.id === id);
    }
    const bechamelId = bechamel?.id ?? null;

    // Final dish recipes (skip if the meal already has one)
    const addFinalRecipe = (mealName: string, comps: ComponentInput[]) => {
      const mealId = mealByName.get(mealName);
      if (!mealId || getRecipeForMeal(mealId)) return;
      const id = createRecipe({ mealId, name: mealName, recipeType: "final", notes: DEMO_NOTE });
      setRecipeComponents(id, comps);
      recipeCount++;
    };

    addFinalRecipe("Chicken Stroganoff", [
      ingComp("DRY-001", 200),
      ingComp("CHKN-001", 150),
      ingComp("PROD-001", 80),
    ]);
    addFinalRecipe("Feijoada", [
      ingComp("DRY-002", 200),
      ingComp("MEAT-001", 150),
      ingComp("DRY-001", 150),
    ]);
    addFinalRecipe("Beef Ragu", [
      ingComp("MEAT-001", 180),
      ingComp("DRY-004", 100),
      ingComp("PROD-002", 50),
      ...(bechamelId
        ? [{ componentType: "recipe" as const, childRecipeId: bechamelId, quantityBase: 100 }]
        : []),
    ]);

    // ── Active week with the demo meals ──
    const weekId = createWeek(todayISO(), "active");
    const week = getWeek(weekId);
    if (week) {
      setWeekMeals(weekId, mealIds.map((mealId) => ({ mealId, priceCents: 1595 })));
    }

    return {
      customers: customerCount,
      meals: mealIds.length,
      ingredients: ingredientCount,
      recipes: recipeCount,
      weekId,
    };
  });

  return tx();
}

/** Remove demo-tagged rows. Anything referenced by real orders is left intact. */
export function clearDemo(): void {
  const db = getDb();
  const tx = db.transaction(() => {
    // Demo customers not referenced by orders.
    const demoCustomers = db
      .prepare("SELECT id FROM customers WHERE notes LIKE ?")
      .all(`%${DEMO_NOTE}%`) as { id: number }[];
    for (const c of demoCustomers) {
      const used = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE customer_id = ?").get(c.id) as { n: number };
      if (used.n === 0) db.prepare("DELETE FROM customers WHERE id = ?").run(c.id);
    }

    // Demo meals not referenced by orders — delete their recipes first.
    const demoMeals = db
      .prepare("SELECT id FROM meals WHERE notes LIKE ?")
      .all(`%${DEMO_NOTE}%`) as { id: number }[];
    for (const m of demoMeals) {
      const used = db.prepare("SELECT COUNT(*) AS n FROM order_items WHERE meal_id = ?").get(m.id) as { n: number };
      if (used.n === 0) {
        const recipes = db.prepare("SELECT id FROM recipes WHERE meal_id = ?").all(m.id) as { id: number }[];
        for (const r of recipes) {
          db.prepare("DELETE FROM recipe_components WHERE recipe_id = ?").run(r.id);
          db.prepare("DELETE FROM recipes WHERE id = ?").run(r.id);
        }
        db.prepare("DELETE FROM weekly_menu_items WHERE meal_id = ?").run(m.id);
        db.prepare("DELETE FROM meals WHERE id = ?").run(m.id);
      }
    }

    // Demo batch recipes no longer used by any recipe.
    const demoBatch = db
      .prepare("SELECT id FROM recipes WHERE recipe_type = 'batch' AND notes LIKE ?")
      .all(`%${DEMO_NOTE}%`) as { id: number }[];
    for (const r of demoBatch) {
      const used = db.prepare("SELECT COUNT(*) AS n FROM recipe_components WHERE child_recipe_id = ?").get(r.id) as { n: number };
      if (used.n === 0) {
        db.prepare("DELETE FROM recipe_components WHERE recipe_id = ?").run(r.id);
        db.prepare("DELETE FROM recipes WHERE id = ?").run(r.id);
      }
    }

    // Demo ingredients not referenced by any recipe.
    const demoIngredients = db
      .prepare("SELECT id FROM ingredients WHERE notes LIKE ?")
      .all(`%${DEMO_NOTE}%`) as { id: number }[];
    for (const ing of demoIngredients) {
      const used = db.prepare("SELECT COUNT(*) AS n FROM recipe_components WHERE ingredient_id = ?").get(ing.id) as { n: number };
      if (used.n === 0) db.prepare("DELETE FROM ingredients WHERE id = ?").run(ing.id);
    }
  });
  tx();
}
