import { seedDemo } from "../src/lib/db/seed";

const result = seedDemo();
console.log(
  `Seeded demo data: ${result.customers} customers, ${result.meals} meals, active week id ${result.weekId}.`
);
