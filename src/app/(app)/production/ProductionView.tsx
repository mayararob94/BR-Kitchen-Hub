"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, AlertTriangle } from "lucide-react";
import type { ProductionComputation, ProductionPlan, IngredientRequirement } from "@/types";
import { formatMoney } from "@/lib/money";
import { formatQty } from "@/lib/units";
import {
  setBufferAction,
  finalisePlanAction,
  reopenPlanAction,
} from "@/app/actions/production";

type SortKey = "category" | "name" | "required" | "supplier";

export function ProductionView({
  weekId,
  plan,
  computation,
  ordersChanged,
}: {
  weekId: number;
  plan: ProductionPlan;
  computation: ProductionComputation;
  ordersChanged: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [buffer, setBuffer] = useState(String(plan.bufferPct));
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const finalised = plan.status === "finalised";

  function applyBuffer() {
    startTransition(async () => {
      await setBufferAction(weekId, parseFloat(buffer) || 0);
      router.refresh();
    });
  }
  function finalise() {
    startTransition(async () => {
      await finalisePlanAction(weekId);
      router.refresh();
    });
  }
  function reopen() {
    startTransition(async () => {
      await reopenPlanAction(weekId);
      router.refresh();
    });
  }

  const sortedIngredients = [...computation.ingredients].sort((a, b) => {
    if (sortKey === "required") return b.requiredBase - a.requiredBase;
    if (sortKey === "supplier") return (a.supplier || "~").localeCompare(b.supplier || "~");
    if (sortKey === "name") return a.name.localeCompare(b.name);
    return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
  });

  const pdfQuery = `?week=${weekId}`;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
          <span
            className={`badge ${finalised ? "bg-tropical-100 text-tropical-800" : "bg-gray-100 text-gray-600"}`}
          >
            {finalised ? "Finalised" : "Draft"}
          </span>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-gray-500">Buffer</span>
            <input
              className="input w-16 py-1 text-right"
              inputMode="decimal"
              value={buffer}
              disabled={finalised}
              onChange={(e) => setBuffer(e.target.value)}
            />
            <span className="text-gray-500">%</span>
            {!finalised && (
              <button className="btn-ghost text-xs" onClick={applyBuffer} disabled={pending}>
                Apply
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/print/ordering${pdfQuery}`} target="_blank" className="btn-secondary">
            Generate Ordering PDF
          </a>
          <a href={`/print/production-plan${pdfQuery}`} target="_blank" className="btn-secondary">
            Generate Production PDF
          </a>
          {finalised ? (
            <button className="btn-secondary" onClick={reopen} disabled={pending}>
              Reopen (Draft)
            </button>
          ) : (
            <button className="btn-primary" onClick={finalise} disabled={pending}>
              Finalise Plan
            </button>
          )}
        </div>
      </div>

      {finalised && ordersChanged && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} />
          Orders have changed since this production plan was finalised. Reopen and
          re-finalise to update the snapshot.
        </div>
      )}

      {computation.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="mb-1 font-medium">Warnings</div>
          <ul className="list-disc space-y-0.5 pl-5">
            {computation.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Total Orders", value: computation.totalOrders },
          { label: "Total Meals", value: computation.totalMeals },
          { label: "Different Dishes", value: computation.distinctDishes },
          {
            label: "Est. Food Cost",
            value:
              computation.estimatedFoodCostCents != null
                ? formatMoney(computation.estimatedFoodCostCents)
                : "—",
          },
          { label: "Est. Raw Weight", value: formatQty(computation.estimatedRawWeightBase, "g") },
        ].map((c) => (
          <div key={c.label} className="card p-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">{c.label}</div>
            <div className="mt-1 font-display text-xl font-semibold text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Ingredient requirements */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-3">
          <h3 className="text-sm font-semibold text-gray-700">Ingredient Requirements (Purchasing)</h3>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            Sort:
            <select
              className="input py-1 text-xs"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="category">Category</option>
              <option value="name">Ingredient</option>
              <option value="required">Required Qty</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">Ingredient</th>
                <th className="th">Category</th>
                <th className="th">Supplier</th>
                <th className="th text-right">Required</th>
                <th className="th text-right">Buffer</th>
                <th className="th text-right">Final Req.</th>
                <th className="th text-right">Purchase Qty</th>
                <th className="th text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedIngredients.map((r) => (
                <IngredientRow key={r.ingredientId} r={r} />
              ))}
              {sortedIngredients.length === 0 && (
                <tr>
                  <td colSpan={8} className="td py-8 text-center text-gray-400">
                    No ingredient requirements — add recipes to the ordered dishes.
                  </td>
                </tr>
              )}
            </tbody>
            {computation.estimatedPurchasingCostCents != null && (
              <tfoot className="border-t border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={7} className="td text-right font-semibold text-gray-700">
                    Estimated Purchasing Cost
                  </td>
                  <td className="td text-right font-bold text-gray-900">
                    {formatMoney(computation.estimatedPurchasingCostCents)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Dish production (collapsible tree) */}
      <div className="card overflow-hidden">
        <h3 className="border-b border-gray-100 p-3 text-sm font-semibold text-gray-700">
          Dish Production
        </h3>
        <ul className="divide-y divide-gray-50">
          {computation.dishes.map((d) => (
            <DishNode key={d.mealId} dish={d} />
          ))}
          {computation.dishes.length === 0 && (
            <li className="p-6 text-center text-sm text-gray-400">No dishes ordered this week.</li>
          )}
        </ul>
      </div>

      {/* Sub-recipe production */}
      {computation.subRecipes.length > 0 && (
        <div className="card overflow-hidden">
          <h3 className="border-b border-gray-100 p-3 text-sm font-semibold text-gray-700">
            Batch / Sub-Recipe Production
          </h3>
          <ul className="divide-y divide-gray-50">
            {computation.subRecipes.map((s) => (
              <li key={s.recipeId} className="p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className="text-sm text-gray-600">
                    Required {formatQty(s.requiredFinishedBase, s.baseUnit)}
                    {s.batchYieldBase != null && (
                      <>
                        {" · "}
                        {s.theoreticalBatches?.toFixed(2)} batches theoretical →{" "}
                        <span className="font-medium">
                          make {s.recommendedBatches?.toFixed(2)} batch
                          {(s.recommendedBatches ?? 0) === 1 ? "" : "es"}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                  {s.components.map((c, i) => (
                    <span key={i}>
                      {c.name}: {formatQty(Math.round(c.quantityBase), c.baseUnit)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IngredientRow({ r }: { r: IngredientRequirement }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="td font-medium text-gray-900">{r.name}</td>
      <td className="td">{r.category}</td>
      <td className="td">{r.supplier || "—"}</td>
      <td className="td text-right">{formatQty(r.requiredBase, r.baseUnit)}</td>
      <td className="td text-right text-gray-500">{r.bufferPct}%</td>
      <td className="td text-right">{formatQty(r.finalRequiredBase, r.baseUnit)}</td>
      <td className="td text-right font-medium">{formatQty(r.purchaseBase, r.baseUnit)}</td>
      <td className="td text-right">
        {r.estimatedCostCents != null ? (
          formatMoney(r.estimatedCostCents)
        ) : (
          <span className="text-amber-600">Cost unavailable</span>
        )}
      </td>
    </tr>
  );
}

function DishNode({
  dish,
}: {
  dish: ProductionComputation["dishes"][number];
}) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span className="font-medium text-gray-900">{dish.dishName}</span>
          {!dish.hasRecipe && (
            <span className="badge bg-amber-50 text-amber-700">no recipe</span>
          )}
        </span>
        <span className="text-sm text-gray-500">{dish.portions} portions</span>
      </button>
      {open && dish.components.length > 0 && (
        <div className="border-t border-gray-50 bg-gray-50/50 px-9 py-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-1">Component</th>
                <th className="py-1 text-right">Finished</th>
                <th className="py-1 text-right">Raw</th>
              </tr>
            </thead>
            <tbody>
              {dish.components.map((c, i) => (
                <tr key={i}>
                  <td className="py-1">
                    {c.name}
                    {c.type === "recipe" && (
                      <span className="ml-1 rounded bg-tropical-100 px-1 text-[10px] text-tropical-800">
                        BATCH
                      </span>
                    )}
                  </td>
                  <td className="py-1 text-right">{formatQty(c.finishedBase, c.baseUnit)}</td>
                  <td className="py-1 text-right text-gray-500">
                    {c.type === "recipe" ? "—" : formatQty(c.rawBase, c.baseUnit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  );
}
