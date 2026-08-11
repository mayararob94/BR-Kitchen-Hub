"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Meal, Category } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { formatMoney, centsToDollars, dollarsToCents } from "@/lib/money";
import {
  createMealAction,
  updateMealAction,
  deleteMealAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/app/actions/meals";

interface MealDraft {
  name: string;
  shortDescription: string;
  categoryId: number | null;
  price: string;
  sortOrder: number;
  notes: string;
  isActive: boolean;
}

function toDraft(m?: Meal): MealDraft {
  return {
    name: m?.name ?? "",
    shortDescription: m?.shortDescription ?? "",
    categoryId: m?.categoryId ?? null,
    price: m ? centsToDollars(m.priceCents) : "",
    sortOrder: m?.sortOrder ?? 0,
    notes: m?.notes ?? "",
    isActive: m?.isActive ?? true,
  };
}

export function MealsManager({
  meals,
  categories,
}: {
  meals: Meal[];
  categories: Category[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Meal | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<MealDraft>(toDraft());
  const [showCats, setShowCats] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showInactive, setShowInactive] = useState(true);

  function openCreate() {
    setDraft(toDraft());
    setCreating(true);
  }
  function openEdit(m: Meal) {
    setDraft(toDraft(m));
    setEditing(m);
  }

  function save() {
    const payload = {
      name: draft.name.trim(),
      shortDescription: draft.shortDescription,
      categoryId: draft.categoryId,
      priceCents: dollarsToCents(draft.price),
      sortOrder: Number(draft.sortOrder) || 0,
      notes: draft.notes,
      isActive: draft.isActive,
    };
    if (!payload.name) return;
    startTransition(async () => {
      if (editing) await updateMealAction(editing.id, payload);
      else await createMealAction(payload);
      setEditing(null);
      setCreating(false);
      router.refresh();
    });
  }

  function remove(m: Meal) {
    if (
      !window.confirm(
        `Delete "${m.name}"? If it appears in past orders it will be archived (kept for invoice history) instead of deleted.`
      )
    )
      return;
    startTransition(async () => {
      await deleteMealAction(m.id);
      router.refresh();
    });
  }

  const visible = meals.filter((m) => showInactive || m.isActive);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowCats(true)}>
            Manage Categories
          </button>
          <button className="btn-primary" onClick={openCreate}>
            New Meal
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">Meal</th>
                <th className="th">Category</th>
                <th className="th">Price</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="td">
                    <div className="font-medium text-gray-900">{m.name}</div>
                    {m.shortDescription && (
                      <div className="text-xs text-gray-400">{m.shortDescription}</div>
                    )}
                  </td>
                  <td className="td">{m.categoryName ?? "—"}</td>
                  <td className="td">{formatMoney(m.priceCents)}</td>
                  <td className="td">
                    {m.isActive ? (
                      <span className="badge bg-tropical-100 text-tropical-800">
                        Active
                      </span>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-500">Inactive</span>
                    )}
                  </td>
                  <td className="td text-right">
                    <button className="btn-ghost text-xs" onClick={() => openEdit(m)}>
                      Edit
                    </button>
                    <button
                      className="btn-ghost text-xs text-red-600"
                      onClick={() => remove(m)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td className="td py-8 text-center text-gray-400" colSpan={5}>
                    No meals yet. Click “New Meal”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meal editor */}
      <Modal
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit Meal" : "New Meal"}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Meal Name *</label>
              <input
                autoFocus
                className="input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Selling Price ($)</label>
              <input
                className="input"
                inputMode="decimal"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="15.95"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={draft.categoryId ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    categoryId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Short Description</label>
              <input
                className="input"
                value={draft.shortDescription}
                onChange={(e) =>
                  setDraft({ ...draft, shortDescription: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input
                className="input"
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDraft({ ...draft, sortOrder: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save Meal"}
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

      <CategoriesModal
        open={showCats}
        onClose={() => setShowCats(false)}
        categories={categories}
      />
    </div>
  );
}

function CategoriesModal({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createCategoryAction({ name: name.trim(), sortOrder: categories.length + 1 });
      setName("");
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Categories">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="New category name (e.g. Fit Meals)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="btn-primary" onClick={add} disabled={pending}>
            Add
          </button>
        </div>
        <ul className="divide-y divide-gray-100">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <input
                defaultValue={c.name}
                className="input mr-2 max-w-xs"
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== c.name) {
                    startTransition(async () => {
                      await updateCategoryAction(c.id, { name: e.target.value.trim() });
                      router.refresh();
                    });
                  }
                }}
              />
              <button
                className="btn-ghost text-xs text-red-600"
                onClick={() => {
                  if (!window.confirm(`Delete category "${c.name}"?`)) return;
                  startTransition(async () => {
                    await deleteCategoryAction(c.id);
                    router.refresh();
                  });
                }}
              >
                Delete
              </button>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="py-4 text-center text-sm text-gray-400">No categories yet.</li>
          )}
        </ul>
      </div>
    </Modal>
  );
}
