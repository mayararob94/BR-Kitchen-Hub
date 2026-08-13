"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Ingredient, BaseUnit } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { formatMoney, dollarsToCents, centsToDollars } from "@/lib/money";
import {
  unitBigLabel,
  bigToBase,
  baseToBig,
  smallToBase,
} from "@/lib/units";
import {
  createIngredientAction,
  updateIngredientAction,
  deleteIngredientAction,
} from "@/app/actions/ingredients";
import type { IngredientInput } from "@/lib/db/ingredients-db";

const CATEGORIES = ["Meat/Protein", "Produce", "Dry Goods", "Dairy", "Other"];

interface Draft {
  name: string;
  category: string;
  baseUnit: BaseUnit;
  yield: string;
  price: string; // $ per kg/L/each
  supplier: string;
  supplierSku: string;
  packSize: string; // in base small unit
  packPrice: string; // $
  purchaseIncrement: string; // big unit (kg/L/each)
  buffer: string; // %
  notes: string;
  isActive: boolean;
}

function toDraft(i?: Ingredient): Draft {
  return {
    name: i?.name ?? "",
    category: i?.category ?? "Other",
    baseUnit: i?.baseUnit ?? "g",
    yield: i ? String(i.defaultYieldPct) : "100",
    price: i?.priceCents != null ? centsToDollars(i.priceCents) : "",
    supplier: i?.supplier ?? "",
    supplierSku: i?.supplierSku ?? "",
    packSize: i?.packSizeBase != null ? String(i.packSizeBase) : "",
    packPrice: i?.packPriceCents != null ? centsToDollars(i.packPriceCents) : "",
    purchaseIncrement:
      i?.purchaseIncrementBase != null
        ? String(baseToBig(i.purchaseIncrementBase, i.baseUnit))
        : "",
    buffer: i?.bufferPctOverride != null ? String(i.bufferPctOverride) : "",
    notes: i?.notes ?? "",
    isActive: i?.isActive ?? true,
  };
}

export function IngredientsManager({ ingredients }: { ingredients: Ingredient[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(toDraft());
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  const filtered = useMemo(
    () =>
      ingredients.filter(
        (i) =>
          (showInactive || i.isActive) &&
          (!query ||
            i.name.toLowerCase().includes(query.toLowerCase()) ||
            i.category.toLowerCase().includes(query.toLowerCase()) ||
            i.supplier.toLowerCase().includes(query.toLowerCase()))
      ),
    [ingredients, query, showInactive]
  );

  function open(i?: Ingredient) {
    setError(null);
    setDraft(toDraft(i));
    if (i) setEditing(i);
    else setCreating(true);
  }

  function save() {
    setError(null);
    const yieldPct = parseFloat(draft.yield);
    if (!draft.name.trim()) return setError("Name is required.");
    if (Number.isNaN(yieldPct) || yieldPct <= 0)
      return setError("Yield must be greater than 0%.");
    const priceVal = draft.price.trim() === "" ? null : dollarsToCents(draft.price);
    if (priceVal != null && priceVal < 0) return setError("Price cannot be negative.");

    const payload: IngredientInput = {
      name: draft.name.trim(),
      category: draft.category,
      baseUnit: draft.baseUnit,
      defaultYieldPct: yieldPct,
      priceCents: priceVal,
      supplier: draft.supplier,
      supplierSku: draft.supplierSku,
      packSizeBase: draft.packSize.trim() === "" ? null : smallToBase(draft.packSize),
      packPriceCents: draft.packPrice.trim() === "" ? null : dollarsToCents(draft.packPrice),
      purchaseIncrementBase:
        draft.purchaseIncrement.trim() === ""
          ? null
          : bigToBase(draft.purchaseIncrement, draft.baseUnit),
      bufferPctOverride: draft.buffer.trim() === "" ? null : parseFloat(draft.buffer),
      notes: draft.notes,
      isActive: draft.isActive,
    };
    startTransition(async () => {
      if (editing) await updateIngredientAction(editing.id, payload);
      else await createIngredientAction(payload);
      setEditing(null);
      setCreating(false);
      router.refresh();
    });
  }

  function remove(i: Ingredient) {
    if (
      !window.confirm(
        `Delete "${i.name}"? If it's used in any recipe it will be archived (kept for costing history) instead.`
      )
    )
      return;
    startTransition(async () => {
      await deleteIngredientAction(i.id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <input
            className="input max-w-xs"
            placeholder="Search ingredients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>
        <button className="btn-primary" onClick={() => open()}>
          New Ingredient
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">Ingredient</th>
                <th className="th">Category</th>
                <th className="th text-center">Unit</th>
                <th className="th text-right">Yield</th>
                <th className="th text-right">Price</th>
                <th className="th">Supplier</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((i) => (
                <tr key={i.id} className={`hover:bg-gray-50 ${i.isActive ? "" : "opacity-50"}`}>
                  <td className="td font-medium text-gray-900">{i.name}</td>
                  <td className="td">{i.category}</td>
                  <td className="td text-center">{i.baseUnit}</td>
                  <td className="td text-right">{i.defaultYieldPct}%</td>
                  <td className="td text-right">
                    {i.effectivePriceCents != null ? (
                      <>
                        {formatMoney(i.effectivePriceCents)}
                        <span className="text-gray-400">/{unitBigLabel(i.baseUnit)}</span>
                      </>
                    ) : (
                      <span className="text-amber-600">no price</span>
                    )}
                  </td>
                  <td className="td">{i.supplier || "—"}</td>
                  <td className="td text-right">
                    <button className="btn-ghost text-xs" onClick={() => open(i)}>
                      Edit
                    </button>
                    <button
                      className="btn-ghost text-xs text-red-600"
                      onClick={() => remove(i)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="td py-8 text-center text-gray-400">
                    No ingredients yet. Click “New Ingredient”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit Ingredient" : "New Ingredient"}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input
                autoFocus
                className="input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                list="ing-categories"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
              <datalist id="ing-categories">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Base Unit</label>
              <select
                className="input"
                value={draft.baseUnit}
                onChange={(e) => setDraft({ ...draft, baseUnit: e.target.value as BaseUnit })}
              >
                <option value="g">grams (kg)</option>
                <option value="ml">millilitres (L)</option>
                <option value="each">each</option>
              </select>
            </div>
            <div>
              <label className="label">Default Yield %</label>
              <input
                className="input"
                inputMode="decimal"
                value={draft.yield}
                onChange={(e) => setDraft({ ...draft, yield: e.target.value })}
                placeholder="75, 100, 250…"
              />
            </div>
            <div>
              <label className="label">Price ($ / {unitBigLabel(draft.baseUnit)})</label>
              <input
                className="input"
                inputMode="decimal"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="25.00"
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Optional pack pricing (overrides price above)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Pack Size (in {draft.baseUnit})</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={draft.packSize}
                  onChange={(e) => setDraft({ ...draft, packSize: e.target.value })}
                  placeholder="400"
                />
              </div>
              <div>
                <label className="label">Pack Price ($)</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={draft.packPrice}
                  onChange={(e) => setDraft({ ...draft, packPrice: e.target.value })}
                  placeholder="2.50"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div>
              <label className="label">Supplier</label>
              <input
                className="input"
                value={draft.supplier}
                onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Supplier SKU</label>
              <input
                className="input"
                value={draft.supplierSku}
                onChange={(e) => setDraft({ ...draft, supplierSku: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Purchase Increment ({unitBigLabel(draft.baseUnit)})</label>
              <input
                className="input"
                inputMode="decimal"
                value={draft.purchaseIncrement}
                onChange={(e) => setDraft({ ...draft, purchaseIncrement: e.target.value })}
                placeholder="e.g. 5 (bag)"
              />
            </div>
            <div>
              <label className="label">Buffer Override %</label>
              <input
                className="input"
                inputMode="decimal"
                value={draft.buffer}
                onChange={(e) => setDraft({ ...draft, buffer: e.target.value })}
                placeholder="uses global default"
              />
            </div>
            <div className="col-span-2 flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="label">Notes</label>
              <input
                className="input"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button className="btn-primary" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save Ingredient"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
