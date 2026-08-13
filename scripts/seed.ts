import { seedDemo } from "../src/lib/db/seed";

const result = seedDemo();
console.log(
  `Seeded demo data: ${result.customers} customers, ${result.meals} meals, ` +
    `${result.ingredients} ingredients, ${result.recipes} recipes, active week id ${result.weekId}.`
);
