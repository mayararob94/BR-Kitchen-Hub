import { getDb } from "./index";
import { createCategory, listCategories } from "./categories-db";
import { createMeal, listMeals } from "./meals-db";
import { createCustomer, listCustomers } from "./customers-db";
import { createWeek, setWeekMeals, getWeek } from "./weeks-db";
import { todayISO } from "@/lib/format";

const DEMO_NOTE = "[DEMO]";

/**
 * Seed optional demo data so the operator can test the full workflow.
 * Demo rows are tagged with "[DEMO]" in their notes so they can be removed later.
 */
export function seedDemo(): { customers: number; meals: number; weekId: number } {
  const db = getDb();

  const tx = db.transaction(() => {
    // Categories
    let daily = listCategories().find((c) => c.name === "Daily Meals");
    if (!daily) {
      const id = createCategory({ name: "Daily Meals", sortOrder: 1 });
      daily = { id } as never;
    }
    const categoryId = (daily as { id: number }).id;

    // Meals
    const demoMeals = [
      "Chicken Stroganoff",
      "Beef Ragu",
      "Chicken Schnitzel",
      "Feijoada",
      "Thai Green Curry",
    ];
    const existingMeals = new Set(listMeals().map((m) => m.name));
    const mealIds: number[] = [];
    demoMeals.forEach((name, i) => {
      const found = listMeals().find((m) => m.name === name);
      if (found) {
        mealIds.push(found.id);
        return;
      }
      if (!existingMeals.has(name)) {
        mealIds.push(
          createMeal({
            name,
            categoryId,
            priceCents: 1595,
            sortOrder: i + 1,
            notes: DEMO_NOTE,
          })
        );
      }
    });

    // Customers
    const demoCustomers = [
      {
        firstName: "Lucas",
        lastName: "Test",
        phone: "+61400000001",
        email: "lucas@example.com",
        addressLine1: "12 Ocean Street",
        suburb: "Surfers Paradise",
        state: "QLD",
        postcode: "4217",
        deliveryInstructions: "Leave at front door",
        deliveryWindow: "morning",
        deliveryPreference: "safe_place",
        notes: `${DEMO_NOTE} Gate code 1234`,
      },
      {
        firstName: "Ana",
        lastName: "Test",
        phone: "+61400000002",
        email: "ana@example.com",
        addressLine1: "5 Palm Avenue",
        suburb: "Broadbeach",
        state: "QLD",
        postcode: "4218",
        deliveryWindow: "anytime",
        deliveryPreference: "home",
        notes: `${DEMO_NOTE} Call before delivery`,
      },
      {
        firstName: "John",
        lastName: "Test",
        phone: "+61400000003",
        email: "john@example.com",
        addressLine1: "88 Hedges Avenue",
        suburb: "Mermaid Beach",
        state: "QLD",
        postcode: "4218",
        deliveryWindow: "afternoon",
        deliveryPreference: "safe_place",
        notes: `${DEMO_NOTE} Leave behind side gate`,
      },
    ];
    const existingCustomers = new Set(
      listCustomers().map((c) => c.fullName.toLowerCase())
    );
    let customerCount = 0;
    for (const c of demoCustomers) {
      if (!existingCustomers.has(`${c.firstName} ${c.lastName}`.toLowerCase())) {
        createCustomer(c);
        customerCount++;
      }
    }

    // Active week with the demo meals
    const weekId = createWeek(todayISO(), "active");
    const week = getWeek(weekId);
    if (week) {
      setWeekMeals(
        weekId,
        mealIds.map((mealId) => ({ mealId, priceCents: 1595 }))
      );
    }

    return { customers: customerCount, meals: mealIds.length, weekId };
  });

  return tx();
}

/** Remove demo-tagged rows. Orders referencing them are left intact. */
export function clearDemo(): void {
  const db = getDb();
  const tx = db.transaction(() => {
    // Only remove demo customers/meals that are not referenced by orders.
    const demoCustomers = db
      .prepare("SELECT id FROM customers WHERE notes LIKE ?")
      .all(`%${DEMO_NOTE}%`) as { id: number }[];
    for (const c of demoCustomers) {
      const used = db
        .prepare("SELECT COUNT(*) AS n FROM orders WHERE customer_id = ?")
        .get(c.id) as { n: number };
      if (used.n === 0) db.prepare("DELETE FROM customers WHERE id = ?").run(c.id);
    }
    const demoMeals = db
      .prepare("SELECT id FROM meals WHERE notes LIKE ?")
      .all(`%${DEMO_NOTE}%`) as { id: number }[];
    for (const m of demoMeals) {
      const used = db
        .prepare("SELECT COUNT(*) AS n FROM order_items WHERE meal_id = ?")
        .get(m.id) as { n: number };
      if (used.n === 0) {
        db.prepare("DELETE FROM weekly_menu_items WHERE meal_id = ?").run(m.id);
        db.prepare("DELETE FROM meals WHERE id = ?").run(m.id);
      }
    }
  });
  tx();
}
