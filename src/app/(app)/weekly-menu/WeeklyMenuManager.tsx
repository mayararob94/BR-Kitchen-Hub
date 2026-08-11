"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WeeklyMenu, WeeklyMenuItem, Meal } from "@/types";
import { formatWeekRange, todayISO } from "@/lib/format";
import { centsToDollars, dollarsToCents } from "@/lib/money";
import {
  createWeekAction,
  setWeekStatusAction,
  setWeekMealsAction,
  duplicateWeekMenuAction,
  deleteWeekAction,
} from "@/app/actions/weeks";

interface Selection {
  mealId: number;
  price: string; // dollars
  on: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-tropical-100 text-tropical-800",
  draft: "bg-gray-100 text-gray-600",
  closed: "bg-red-50 text-red-600",
};

export function WeeklyMenuManager({
  weeks,
  selectedWeek,
  selectedItems,
  meals,
}: {
  weeks: WeeklyMenu[];
  selectedWeek: WeeklyMenu | null;
  selectedItems: WeeklyMenuItem[];
  meals: Meal[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newWeekDate, setNewWeekDate] = useState(todayISO());
  const [dupDate, setDupDate] = useState("");

  // Build selection state from current week items + all meals.
  const priceByMeal = new Map(selectedItems.map((i) => [i.mealId, i.priceCents]));
  const onSet = new Set(selectedItems.map((i) => i.mealId));
  const [selection, setSelection] = useState<Record<number, Selection>>(() => {
    const init: Record<number, Selection> = {};
    for (const m of meals) {
      init[m.id] = {
        mealId: m.id,
        on: onSet.has(m.id),
        price: centsToDollars(priceByMeal.get(m.id) ?? m.priceCents),
      };
    }
    // Include meals that are in the week but no longer in the active meal list.
    for (const it of selectedItems) {
      if (!init[it.mealId]) {
        init[it.mealId] = {
          mealId: it.mealId,
          on: true,
          price: centsToDollars(it.priceCents),
        };
      }
    }
    return init;
  });

  function toggle(id: number) {
    setSelection((s) => ({ ...s, [id]: { ...s[id], on: !s[id].on } }));
  }
  function setPrice(id: number, price: string) {
    setSelection((s) => ({ ...s, [id]: { ...s[id], price } }));
  }

  function goToWeek(id: number) {
    router.push(`/weekly-menu?week=${id}`);
  }

  function createWeek(status: "draft" | "active") {
    startTransition(async () => {
      const { id } = await createWeekAction(newWeekDate, status);
      goToWeek(id);
    });
  }

  function saveMeals() {
    if (!selectedWeek) return;
    const items = Object.values(selection)
      .filter((s) => s.on)
      .map((s) => ({ mealId: s.mealId, priceCents: dollarsToCents(s.price) }));
    startTransition(async () => {
      await setWeekMealsAction(selectedWeek.id, items);
      router.refresh();
    });
  }

  function setStatus(status: "active" | "closed" | "draft") {
    if (!selectedWeek) return;
    startTransition(async () => {
      await setWeekStatusAction(selectedWeek.id, status);
      router.refresh();
    });
  }

  function duplicateInto() {
    if (!selectedWeek || !dupDate) return;
    startTransition(async () => {
      const { id } = await duplicateWeekMenuAction(selectedWeek.id, dupDate);
      goToWeek(id);
    });
  }

  function removeWeek() {
    if (!selectedWeek) return;
    if (!window.confirm("Delete this week? Only allowed if it has no orders.")) return;
    startTransition(async () => {
      const res = await deleteWeekAction(selectedWeek.id);
      if (!res.ok) {
        window.alert("Cannot delete: this week has orders. Close it instead.");
        return;
      }
      router.push("/weekly-menu");
    });
  }

  const selectedCount = Object.values(selection).filter((s) => s.on).length;
  const mealName = (id: number) =>
    meals.find((m) => m.id === id)?.name ??
    selectedItems.find((i) => i.mealId === id)?.mealName ??
    `Meal #${id}`;

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      {/* Week list */}
      <div className="space-y-3">
        <div className="card p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Create Week
          </h3>
          <input
            type="date"
            className="input mb-2"
            value={newWeekDate}
            onChange={(e) => setNewWeekDate(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1 text-xs"
              onClick={() => createWeek("draft")}
              disabled={pending}
            >
              Create Draft
            </button>
            <button
              className="btn-primary flex-1 text-xs"
              onClick={() => createWeek("active")}
              disabled={pending}
            >
              Create + Activate
            </button>
          </div>
        </div>

        <div className="card overflow-hidden">
          <h3 className="border-b border-gray-100 p-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Weeks
          </h3>
          <ul className="max-h-[420px] overflow-y-auto">
            {weeks.map((w) => (
              <li key={w.id}>
                <button
                  onClick={() => goToWeek(w.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    selectedWeek?.id === w.id ? "bg-brand-50" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="text-gray-800">
                    {formatWeekRange(w.weekStart, w.weekEnd)}
                  </span>
                  <span className={`badge ${STATUS_BADGE[w.status]}`}>{w.status}</span>
                </button>
              </li>
            ))}
            {weeks.length === 0 && (
              <li className="p-4 text-center text-sm text-gray-400">No weeks yet.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Meal editor */}
      {selectedWeek ? (
        <div className="space-y-3">
          <div className="card flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <div className="font-medium text-gray-900">
                {formatWeekRange(selectedWeek.weekStart, selectedWeek.weekEnd)}
              </div>
              <div className="text-xs text-gray-500">
                {selectedCount} meals selected ·{" "}
                <span className={`badge ${STATUS_BADGE[selectedWeek.status]}`}>
                  {selectedWeek.status}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedWeek.status !== "active" && (
                <button
                  className="btn-secondary text-xs"
                  onClick={() => setStatus("active")}
                  disabled={pending}
                >
                  Activate
                </button>
              )}
              {selectedWeek.status !== "closed" && (
                <button
                  className="btn-secondary text-xs"
                  onClick={() => setStatus("closed")}
                  disabled={pending}
                >
                  Close
                </button>
              )}
              <button
                className="btn-ghost text-xs text-red-600"
                onClick={removeWeek}
                disabled={pending}
              >
                Delete
              </button>
            </div>
          </div>

          <div className="card p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-600">Duplicate this menu into week of</span>
              <input
                type="date"
                className="input max-w-[160px]"
                value={dupDate}
                onChange={(e) => setDupDate(e.target.value)}
              />
              <button
                className="btn-secondary text-xs"
                onClick={duplicateInto}
                disabled={pending || !dupDate}
              >
                Duplicate Previous Week Menu →
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 p-3">
              <h3 className="text-sm font-semibold text-gray-700">Available Meals</h3>
              <button className="btn-primary" onClick={saveMeals} disabled={pending}>
                {pending ? "Saving…" : "Save Weekly Menu"}
              </button>
            </div>
            <ul className="divide-y divide-gray-50">
              {Object.values(selection).map((s) => (
                <li
                  key={s.mealId}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={s.on}
                    onChange={() => toggle(s.mealId)}
                  />
                  <span className="flex-1 text-sm text-gray-800">
                    {mealName(s.mealId)}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      className="input w-24 py-1 text-sm"
                      inputMode="decimal"
                      value={s.price}
                      disabled={!s.on}
                      onChange={(e) => setPrice(s.mealId, e.target.value)}
                    />
                  </div>
                </li>
              ))}
              {Object.keys(selection).length === 0 && (
                <li className="p-4 text-center text-sm text-gray-400">
                  No active meals. Add meals in the Meals page first.
                </li>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="card flex items-center justify-center p-10 text-gray-400">
          Create or select a week to build its menu.
        </div>
      )}
    </div>
  );
}
