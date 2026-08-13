"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import type { Recipe, BaseUnit } from "@/types";
import type { IngredientOption, BatchRecipeOption } from "@/lib/db/recipe-view";
import { formatMoney, dollarsToCents, centsToDollars } from "@/lib/money";
import { unitBigLabel, bigToBase, baseToBig } from "@/lib/units";
import {
  saveRecipeComponentsAction,
  updateRecipeMetaAction,
} from "@/app/actions/recipes";

interface Row {
  key: string;
  type: "ingredient" | "recipe";
  refId: number;
  name: string;
  baseUnit: BaseUnit;
  qty: string; // base small units (g/ml/each)
  yieldOverride: string;
  priceOverride: string; // $ per kg/L/each
  defaultYieldPct: number;
  defaultPriceCents: number | null; // effective price or sub-recipe cost/kg
}

function costOf(rawBase: number, unit: BaseUnit, priceCents: number | null): number | null {
  if (priceCents == null) return null;
  return unit === "each" ? rawBase * priceCents : (rawBase / 1000) * priceCents;
}

export function RecipeEditor({
  recipe,
  sellingPriceCents,
  ingredientOptions,
  batchOptions,
}: {
  recipe: Recipe;
  sellingPriceCents: number | null;
  ingredientOptions: IngredientOption[];
  batchOptions: BatchRecipeOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isBatch = recipe.recipeType === "batch";

  const ingById = useMemo(
    () => new Map(ingredientOptions.map((i) => [i.id, i])),
    [ingredientOptions]
  );
  const batchById = useMemo(
    () => new Map(batchOptions.map((b) => [b.id, b])),
    [batchOptions]
  );

  const [rows, setRows] = useState<Row[]>(() =>
    recipe.components.map((c, idx) => {
      if (c.componentType === "ingredient") {
        const opt = ingById.get(c.ingredientId ?? -1);
        return {
          key: `c${idx}`,
          type: "ingredient" as const,
          refId: c.ingredientId!,
          name: c.name ?? opt?.name ?? "?",
          baseUnit: (c.baseUnit ?? opt?.baseUnit ?? "g") as BaseUnit,
          qty: String(c.quantityBase),
          yieldOverride: c.yieldOverride != null ? String(c.yieldOverride) : "",
          priceOverride: c.priceOverrideCents != null ? centsToDollars(c.priceOverrideCents) : "",
          defaultYieldPct: opt?.defaultYieldPct ?? 100,
          defaultPriceCents: opt?.effectivePriceCents ?? null,
        };
      }
      const opt = batchById.get(c.childRecipeId ?? -1);
      return {
        key: `c${idx}`,
        type: "recipe" as const,
        refId: c.childRecipeId!,
        name: c.name ?? opt?.name ?? "?",
        baseUnit: (c.baseUnit ?? opt?.baseUnit ?? "g") as BaseUnit,
        qty: String(c.quantityBase),
        yieldOverride: "",
        priceOverride: "",
        defaultYieldPct: 100,
        defaultPriceCents: opt?.costPerBaseFinishedCents != null ? opt.costPerBaseFinishedCents * 1000 : null,
      };
    })
  );

  // Meta (name + batch fields)
  const [name, setName] = useState(recipe.name);
  const [batchYield, setBatchYield] = useState(
    recipe.batchYieldBase != null ? String(baseToBig(recipe.batchYieldBase, recipe.batchYieldUnit)) : ""
  );
  const [batchUnit, setBatchUnit] = useState<BaseUnit>(recipe.batchYieldUnit);
  const [batchIncrement, setBatchIncrement] = useState(
    recipe.batchIncrement != null ? String(recipe.batchIncrement) : ""
  );
  const [instructions, setInstructions] = useState(recipe.instructions);
  const [notes, setNotes] = useState(recipe.notes);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [picker, setPicker] = useState<"ingredient" | "recipe" | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  function computeRow(r: Row) {
    const qty = parseFloat(r.qty) || 0;
    const yieldPct = r.yieldOverride ? parseFloat(r.yieldOverride) : r.defaultYieldPct;
    const priceCents = r.priceOverride ? dollarsToCents(r.priceOverride) : r.defaultPriceCents;
    let raw: number;
    if (r.type === "recipe") {
      raw = qty; // finished used; true raw expansion is server-side
    } else if (isBatch) {
      raw = qty; // batch ingredient input is already raw
    } else {
      raw = yieldPct > 0 ? Math.round(qty / (yieldPct / 100)) : 0;
    }
    const cost =
      r.type === "recipe"
        ? priceCents != null
          ? (qty / 1000) * priceCents // cost/kg finished × kg used
          : null
        : costOf(raw, r.baseUnit, priceCents);
    return { qty, yieldPct, raw, cost };
  }

  const totals = useMemo(() => {
    let finished = 0;
    let cost = 0;
    let unavailable = false;
    for (const r of rows) {
      const { qty, cost: c } = computeRow(r);
      finished += qty;
      if (c == null) unavailable = true;
      else cost += c;
    }
    return { finished, cost, unavailable };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, isBatch]);

  const batchYieldBase = batchYield ? bigToBase(batchYield, batchUnit) : null;
  const costPerKg =
    isBatch && batchYieldBase && batchYieldBase > 0 ? (totals.cost / batchYieldBase) * 1000 : null;

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  function addComponent(type: "ingredient" | "recipe", id: number) {
    if (rows.some((r) => r.type === type && r.refId === id)) {
      setError("That component is already in the recipe.");
      return;
    }
    setError(null);
    if (type === "ingredient") {
      const opt = ingById.get(id)!;
      setRows((rs) => [
        ...rs,
        {
          key: `n${Date.now()}`,
          type: "ingredient",
          refId: id,
          name: opt.name,
          baseUnit: opt.baseUnit,
          qty: "0",
          yieldOverride: "",
          priceOverride: "",
          defaultYieldPct: opt.defaultYieldPct,
          defaultPriceCents: opt.effectivePriceCents,
        },
      ]);
    } else {
      const opt = batchById.get(id)!;
      setRows((rs) => [
        ...rs,
        {
          key: `n${Date.now()}`,
          type: "recipe",
          refId: id,
          name: opt.name,
          baseUnit: opt.baseUnit,
          qty: "0",
          yieldOverride: "",
          priceOverride: "",
          defaultYieldPct: 100,
          defaultPriceCents: opt.costPerBaseFinishedCents != null ? opt.costPerBaseFinishedCents * 1000 : null,
        },
      ]);
    }
    setPicker(null);
    setPickerQuery("");
  }

  function save() {
    setError(null);
    setSaved(false);
    for (const r of rows) {
      const qty = parseFloat(r.qty);
      if (Number.isNaN(qty) || qty < 0) return setError(`Quantity for ${r.name} is invalid.`);
      if (r.yieldOverride && parseFloat(r.yieldOverride) <= 0)
        return setError(`Yield for ${r.name} must be greater than 0.`);
    }
    const comps = rows.map((r) => ({
      componentType: r.type,
      ingredientId: r.type === "ingredient" ? r.refId : null,
      childRecipeId: r.type === "recipe" ? r.refId : null,
      quantityBase: Math.round(parseFloat(r.qty) || 0),
      yieldOverride: r.yieldOverride ? parseFloat(r.yieldOverride) : null,
      priceOverrideCents: r.priceOverride ? dollarsToCents(r.priceOverride) : null,
      prepNotes: "",
    }));
    startTransition(async () => {
      await updateRecipeMetaAction(recipe.id, {
        name,
        batchYieldBase: isBatch ? batchYieldBase : null,
        batchYieldUnit: batchUnit,
        batchIncrement: batchIncrement ? parseFloat(batchIncrement) : null,
        instructions,
        notes,
      });
      const res = await saveRecipeComponentsAction(recipe.id, comps);
      if (!res.ok) {
        setError(res.error ?? "Save failed");
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });
  }

  const pickerList =
    picker === "ingredient"
      ? ingredientOptions.filter((o) =>
          o.name.toLowerCase().includes(pickerQuery.toLowerCase())
        )
      : picker === "recipe"
        ? batchOptions.filter((o) => o.name.toLowerCase().includes(pickerQuery.toLowerCase()))
        : [];

  return (
    <div className="space-y-4">
      {/* Name + batch meta */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="label">Recipe Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {isBatch && (
            <>
              <div>
                <label className="label">Finished Batch Yield</label>
                <div className="flex gap-1">
                  <input
                    className="input"
                    inputMode="decimal"
                    value={batchYield}
                    onChange={(e) => setBatchYield(e.target.value)}
                    placeholder="8.5"
                  />
                  <select
                    className="input w-24"
                    value={batchUnit}
                    onChange={(e) => setBatchUnit(e.target.value as BaseUnit)}
                  >
                    <option value="g">kg</option>
                    <option value="ml">L</option>
                    <option value="each">each</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Batch Rounding</label>
                <select
                  className="input"
                  value={batchIncrement}
                  onChange={(e) => setBatchIncrement(e.target.value)}
                >
                  <option value="">Exact quantity</option>
                  <option value="0.25">0.25 batch</option>
                  <option value="0.5">0.5 batch</option>
                  <option value="1">Full batch only</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-3">
          <h3 className="text-sm font-semibold text-gray-700">
            {isBatch ? "Batch Ingredients (raw inputs for one standard batch)" : "Recipe Components"}
          </h3>
          <div className="relative flex gap-2">
            <button
              className="btn-secondary text-xs"
              onClick={() => {
                setPicker("ingredient");
                setPickerQuery("");
              }}
            >
              <Plus size={13} /> Add Ingredient
            </button>
            {batchOptions.length > 0 && (
              <button
                className="btn-secondary text-xs"
                onClick={() => {
                  setPicker("recipe");
                  setPickerQuery("");
                }}
              >
                <Plus size={13} /> Add Batch Recipe
              </button>
            )}
            {picker && (
              <div className="absolute right-0 top-9 z-20 w-72 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                <input
                  autoFocus
                  className="input mb-1"
                  placeholder={`Search ${picker === "ingredient" ? "ingredients" : "batch recipes"}…`}
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                />
                <div className="max-h-56 overflow-y-auto">
                  {pickerList.map((o) => (
                    <button
                      key={o.id}
                      className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                      onClick={() => addComponent(picker, o.id)}
                    >
                      <span>{o.name}</span>
                      <span className="text-xs text-gray-400">{o.baseUnit}</span>
                    </button>
                  ))}
                  {pickerList.length === 0 && (
                    <div className="px-2 py-2 text-sm text-gray-400">No matches</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">Component</th>
                <th className="th text-right">{isBatch ? "Input" : "Finished"} ({rows[0]?.baseUnit ?? "g"})</th>
                <th className="th text-right">Yield %</th>
                <th className="th text-right">Raw</th>
                <th className="th text-right">Price</th>
                <th className="th text-right">Cost</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => {
                const { yieldPct, raw, cost } = computeRow(r);
                return (
                  <tr key={r.key}>
                    <td className="td">
                      <span className="font-medium text-gray-900">{r.name}</span>
                      {r.type === "recipe" && (
                        <span className="ml-1 rounded bg-tropical-100 px-1 text-[10px] font-medium text-tropical-800">
                          BATCH
                        </span>
                      )}
                    </td>
                    <td className="td text-right">
                      <input
                        className="input w-20 py-1 text-right"
                        inputMode="decimal"
                        value={r.qty}
                        onChange={(e) => updateRow(r.key, { qty: e.target.value })}
                      />
                    </td>
                    <td className="td text-right">
                      {r.type === "recipe" || isBatch ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <input
                          className="input w-16 py-1 text-right"
                          inputMode="decimal"
                          value={r.yieldOverride}
                          placeholder={String(r.defaultYieldPct)}
                          onChange={(e) => updateRow(r.key, { yieldOverride: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="td text-right text-gray-500">
                      {r.type === "recipe" ? "—" : `${raw}${r.baseUnit}`}
                    </td>
                    <td className="td text-right">
                      {r.type === "recipe" ? (
                        <span className="text-gray-400">
                          {r.defaultPriceCents != null ? `${formatMoney(r.defaultPriceCents)}/${unitBigLabel(r.baseUnit)}` : "n/a"}
                        </span>
                      ) : (
                        <input
                          className="input w-20 py-1 text-right"
                          inputMode="decimal"
                          value={r.priceOverride}
                          placeholder={r.defaultPriceCents != null ? centsToDollars(r.defaultPriceCents) : "—"}
                          onChange={(e) => updateRow(r.key, { priceOverride: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="td text-right font-medium">
                      {cost != null ? formatMoney(cost) : <span className="text-amber-600">n/a</span>}
                    </td>
                    <td className="td text-right">
                      <button className="btn-ghost p-1 text-red-500" onClick={() => removeRow(r.key)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="td py-6 text-center text-gray-400">
                    No components yet. Use “Add Ingredient” or “Add Batch Recipe”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Totals</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">{isBatch ? "Total input weight" : "Finished meal weight"}</dt>
              <dd>{totals.finished}g</dd>
            </div>
            {isBatch && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Finished batch yield</dt>
                <dd>{batchYieldBase ?? "—"}{batchYieldBase ? "g" : ""}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">{isBatch ? "Batch food cost" : "Food cost"}</dt>
              <dd className="font-medium">
                {formatMoney(totals.cost)}
                {totals.unavailable && <span className="ml-1 text-xs text-amber-600">*incomplete</span>}
              </dd>
            </div>
            {isBatch && (
              <div className="flex justify-between border-t border-gray-100 pt-1.5">
                <dt className="text-gray-500">Cost per {unitBigLabel(batchUnit)}</dt>
                <dd className="font-semibold">{costPerKg != null ? formatMoney(costPerKg) : "—"}</dd>
              </div>
            )}
          </dl>
        </div>

        {!isBatch && (
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Margin</h3>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Selling price</dt>
                <dd>{sellingPriceCents != null ? formatMoney(sellingPriceCents) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Food cost %</dt>
                <dd>
                  {sellingPriceCents && sellingPriceCents > 0
                    ? `${((totals.cost / sellingPriceCents) * 100).toFixed(2)}%`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Gross margin $</dt>
                <dd>{sellingPriceCents != null ? formatMoney(sellingPriceCents - totals.cost) : "—"}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1.5">
                <dt className="text-gray-500">Gross margin %</dt>
                <dd className="font-semibold">
                  {sellingPriceCents && sellingPriceCents > 0
                    ? `${(((sellingPriceCents - totals.cost) / sellingPriceCents) * 100).toFixed(2)}%`
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Method / notes */}
      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Production Method / Instructions</label>
            <textarea
              className="input"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save Recipe"}
        </button>
        {saved && <span className="text-sm text-tropical-700">Saved ✓</span>}
        <a href={`/print/recipe-card/${recipe.id}`} target="_blank" className="btn-secondary">
          Recipe Card
        </a>
      </div>
    </div>
  );
}
