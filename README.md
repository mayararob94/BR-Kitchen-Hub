# MEALzinha Hub

A **local-first, offline** order-management tool for MEALzinha's weekly meal-prep
operation. It replaces the manual Excel workflow: enter customers and their weekly
orders, then print invoices, 4×6 delivery labels, production summaries and delivery
manifests — in about 30–60 seconds per order.

This is an **internal operations tool**. There is no customer login, no online
ordering, and no payment gateway. Customers pay by bank transfer; you record
payment status manually.

It is a **separate application** from the MEALzinha website. It deliberately reuses
the online project's data-model concepts, naming, TypeScript shapes, folder layout
and branding so a future migration/sync is straightforward — see
[Future migration](#future-migration).

---

## Quick start

Requirements: **Node.js 18+**.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The SQLite database initialises automatically on
first run (`data/mealzinha.db`) — no migration step.

For day-to-day use, run the production build:

```bash
npm run build
npm run start          # http://localhost:3000
```

### Optional demo data

To try the full workflow with sample customers, meals and an active week:

- **In the app:** Settings → *Seed Demo Data* (and *Remove Demo Data* before real use), or
- **CLI:** `npm run seed` / `npm run reset-demo`

Demo rows are tagged `[DEMO]`; removing them never deletes anything referenced by
a real order.

---

## The weekly workflow

1. **Weekly Menu** → create the week and pick which meals are available (or
   *Duplicate Previous Week Menu* and tweak). Activate it.
2. **New Order** → search a customer, set quantities with `− 0 +`, save.
   - **Save & New Order** clears the form, keeps the week, and refocuses the
     customer search for the next order.
   - **Save & Invoice** / **Save & Label** jump straight to the printable document.
3. **Dashboard** → live weekly stats and **Meals Required** for production planning;
   *Print Production Summary*.
4. **Delivery / Labels** → pick a week or delivery date, select orders, **Print All
   Labels** (4×6) and **Print Manifest**.
5. **Invoices** → **Print All Invoices** for the week (A4, one per page).

Everything is keyboard-friendly: type to search the customer, `↑/↓/Enter` to pick,
tab through the meal quantities.

---

## Recipes, costing & production ordering

A full production module connects every dish to its recipe so the system can
plan production and purchasing from real orders.

- **Ingredients** — a central database of purchased items with **Yield %**
  (supports values above 100% for rice/beans/pasta), price per kg/L/each (or
  pack size + pack price), supplier, purchase increment and an optional buffer
  override. Yield turns cooked/finished weight into the **raw** weight you must
  buy: `raw = cooked ÷ (yield ÷ 100)`.
- **Recipes** — two kinds, sharing one engine:
  - **Final Dish** — linked to a meal; you enter each component's finished
    weight and the system derives raw quantity, cost/meal, food-cost % and
    margin (using the meal's selling price).
  - **Batch Recipe / Sub-Recipe** — sauces, stocks, braised meats etc. that are
    produced internally and used **inside other recipes** (e.g. Béchamel in
    Lasagna). A batch has a finished yield; its cost/kg flows automatically into
    any recipe that uses it. Recipes can nest (a sub-recipe can contain another),
    with circular-dependency protection.
- **Production** (`/production`) — pick a week and the system aggregates all
  confirmed orders into:
  - a summary (orders, meals, dishes, estimated food cost, raw weight);
  - **Dish Production** — finished + raw quantities per dish;
  - **Batch/Sub-Recipe Production** — required finished quantity, theoretical vs
    recommended batches, scaled ingredients;
  - **Ingredient Requirements** — every raw ingredient consolidated across all
    dishes (sub-recipes are recursively expanded into raw ingredients — you buy
    *milk*, not *Béchamel*), with production buffer and purchase-increment
    rounding.
  - **Draft → Finalised**: finalising freezes a snapshot so historical plans stay
    accurate even if recipes or prices change later; the page warns if orders
    change after finalisation.
- **PDFs** (A4, via print / Save-as-PDF): **Ordering PDF** (purchasing list
  grouped by category with checkboxes and estimated cost), **Production PDF**
  (by dish + sub-recipe production for the kitchen), and **Recipe Cards**
  (master, or scaled to a week's production).

All weights are stored as integer grams/millilitres and prices as integer cents
to avoid rounding drift. The default production buffer is set in **Settings**.

## Printing

Dedicated print CSS means only the document prints — no sidebar or buttons.

- **Invoices** — A4, one invoice per page. Use the browser's *Save as PDF* to keep a copy.
- **Delivery labels** — exactly **4 × 6 inch** (101.6 mm × 152.4 mm) portrait, one
  label per page, large high-contrast text for thermal printers. The print dialog's
  page size is set automatically.
- **Production summary / Delivery manifest** — A4 (manifest prints landscape).

Set your thermal printer's paper to 4×6" and disable any "fit to page" scaling for
crisp labels.

---

## Data model

SQLite (via `better-sqlite3`). Schema in [`src/lib/db/schema.sql`](src/lib/db/schema.sql).

```
customers ─┐
           ├─< orders ─< order_items >─ meals
weekly_menus ─< weekly_menu_items >─ meals
categories ─< meals
settings (key/value)
```

Key integrity rules:

- **Money is stored as integer cents** (no floating-point drift).
- **Order items store a price snapshot** (`meal_name_snapshot`, `unit_price_cents`,
  `quantity`, `line_total_cents`). Historical invoices never change if a meal price
  is later edited.
- **Orders snapshot the customer's delivery details** at save time, so past labels
  and invoices stay correct even if the customer record changes.
- **Sequential numbering** — `ORD-0001`, `INV-0001`. Invoice numbers are assigned
  once (on first print) and never reused. Prefixes and next-numbers are editable in
  Settings.
- **No hard deletes of referenced history** — meals/categories used by orders are
  archived (Active/Inactive) instead of deleted; orders can be Cancelled.

---

## Backups (important)

Because your data lives on this machine, back up regularly.

**Settings → Backup Data → Create Backup** writes a timestamped copy to `backups/`,
e.g. `mealzinha-backup-2026-08-10-2200.db`. Existing backups are **never
overwritten**, and each backup can be **downloaded**.

**Restore** replaces the current database with a chosen backup — but first it takes
an automatic safety copy of your current data, so a restore is reversible.

Keep periodic off-machine copies of the `backups/` folder (or `data/mealzinha.db`).

---

## Import / Export

- **Import customers** (Customers → Import CSV): preview + duplicate detection
  (by phone, email, or name+suburb) before anything is created.
- **CSV export** (Settings → Export Data): Customers, Orders, Order Items,
  Production Summary, Delivery Manifest.

---

## Configuration

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `MEALZINHA_DB_PATH` | `./data/mealzinha.db` | SQLite database file location |
| `MEALZINHA_BACKUP_DIR` | `./backups` | Backup output folder |

Business details, ABN, bank details, delivery fee, number prefixes and printing
options are all edited in **Settings** (stored in the `settings` table).

---

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · `better-sqlite3`.
No cloud services, no payment SDKs, no authentication required to run locally.

---

## Future migration

The app is intentionally structured to make a later connection to the MEALzinha
website easy, **without** building any of it now:

- The data layer is isolated in `src/lib/db/*-db.ts` behind typed functions — swap
  `better-sqlite3` for a hosted DB (Cloudflare D1 uses the same SQLite dialect)
  without touching the UI.
- Types in `src/types` and the cents/snapshot conventions mirror the online project.
- Mutations go through server actions / API routes, so exposing an API or adding
  authentication later is additive, not a rewrite.
