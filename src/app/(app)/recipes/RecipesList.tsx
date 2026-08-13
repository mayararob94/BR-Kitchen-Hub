"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RecipeType } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";
import type { BaseUnit } from "@/types";
import { bigToBase } from "@/lib/units";
import { createRecipeAction } from "@/app/actions/recipes";

export interface RecipeRow {
  id: number;
  name: string;
  type: RecipeType;
  isActive: boolean;
  componentCount: number;
  sellingPriceCents: number | null;
  foodCostCents: number | null;
  costUnavailable: boolean;
  costPerKgCents: number | null;
  foodCostPct: number | null;
  marginPct: number | null;
  usedInCount: number;
}

type Filter = "all" | "final" | "batch" | "inactive";

export function RecipesList({ rows }: { rows: RecipeRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);

  const filtered = rows.filter((r) => {
    if (filter === "final") return r.type === "final" && r.isActive;
    if (filter === "batch") return r.type === "batch" && r.isActive;
    if (filter === "inactive") return !r.isActive;
    return r.isActive;
  });

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All Active" },
    { key: "final", label: "Final Dishes" },
    { key: "batch", label: "Batch Recipes" },
    { key: "inactive", label: "Inactive" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                filter === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          New Batch Recipe
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">Recipe</th>
                <th className="th">Type</th>
                <th className="th text-right">Food Cost</th>
                <th className="th text-right">Cost/kg</th>
                <th className="th text-right">Food Cost %</th>
                <th className="th text-right">Margin %</th>
                <th className="th text-right">Used In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => (
                <tr key={r.id} className={`hover:bg-gray-50 ${r.isActive ? "" : "opacity-50"}`}>
                  <td className="td">
                    <Link href={`/recipes/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.name}
                    </Link>
                    {r.componentCount === 0 && (
                      <span className="ml-2 rounded bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700">
                        EMPTY
                      </span>
                    )}
                  </td>
                  <td className="td">
                    {r.type === "batch" ? (
                      <span className="badge bg-tropical-100 text-tropical-800">Batch Recipe</span>
                    ) : (
                      <span className="badge bg-blue-50 text-blue-700">Catalog Dish</span>
                    )}
                  </td>
                  <td className="td text-right">
                    {r.foodCostCents != null ? formatMoney(r.foodCostCents) : "—"}
                    {r.costUnavailable && <span className="ml-1 text-xs text-amber-600">*</span>}
                  </td>
                  <td className="td text-right">
                    {r.costPerKgCents != null ? `${formatMoney(r.costPerKgCents)}/kg` : "—"}
                  </td>
                  <td className="td text-right">
                    {r.foodCostPct != null ? `${r.foodCostPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="td text-right">
                    {r.marginPct != null ? `${r.marginPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="td text-right">{r.usedInCount || "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="td py-8 text-center text-gray-400">
                    No recipes in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewBatchModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function NewBatchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [yieldVal, setYieldVal] = useState("");
  const [unit, setUnit] = useState<BaseUnit>("g");

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      const { id } = await createRecipeAction({
        name: name.trim(),
        recipeType: "batch",
        batchYieldBase: yieldVal ? bigToBase(yieldVal, unit) : null,
        batchYieldUnit: unit,
      });
      onClose();
      router.push(`/recipes/${id}`);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="New Batch Recipe">
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          A batch recipe (sauce, stock, braised meat…) is produced internally and used
          inside other recipes — it isn’t sold directly.
        </p>
        <div>
          <label className="label">Recipe Name</label>
          <input
            autoFocus
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Béchamel Sauce"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Finished Batch Yield</label>
            <input
              className="input"
              inputMode="decimal"
              value={yieldVal}
              onChange={(e) => setYieldVal(e.target.value)}
              placeholder="8.5"
            />
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as BaseUnit)}>
              <option value="g">kg</option>
              <option value="ml">L</option>
              <option value="each">each</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={create} disabled={pending}>
            {pending ? "Creating…" : "Create & Edit"}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
