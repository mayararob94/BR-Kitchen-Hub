"use client";

import { useEffect, useRef, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import type { Customer } from "@/types";
import { searchCustomersAction, getCustomerByIdAction } from "@/app/actions/customers";
import { Modal } from "@/components/ui/Modal";
import { CustomerForm } from "./CustomerForm";

/**
 * Searchable customer autocomplete. Search matches name / phone / suburb / email.
 * Keyboard: type to search, ↑/↓ to move, Enter to select, and a "Create new
 * customer" affordance that opens a modal without losing context.
 */
export function CustomerComboboxController({
  selected,
  onSelect,
  autoFocusInput,
}: {
  selected: Customer | null;
  onSelect: (c: Customer | null) => void;
  autoFocusInput?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocusInput) inputRef.current?.focus();
  }, [autoFocusInput]);

  // Debounced search
  useEffect(() => {
    if (selected) return;
    const t = setTimeout(async () => {
      const r = await searchCustomersAction(query);
      setResults(r);
      setActive(0);
    }, 120);
    return () => clearTimeout(t);
  }, [query, selected]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(c: Customer) {
    onSelect(c);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    const max = results.length; // last index = create option
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, max));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < results.length) choose(results[active]);
      else setShowCreate(true);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
        <div>
          <div className="font-medium text-gray-900">{selected.fullName}</div>
          <div className="text-xs text-gray-500">
            {[selected.phone, selected.suburb].filter(Boolean).join(" · ")}
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => {
            onSelect(null);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          className="input pl-9"
          placeholder="Search customer by name, phone, suburb, email…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(c)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                active === i ? "bg-brand-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="font-medium text-gray-900">{c.fullName}</span>
              <span className="text-xs text-gray-500">
                {[c.phone, c.suburb].filter(Boolean).join(" · ")}
              </span>
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
          )}
          <button
            type="button"
            onMouseEnter={() => setActive(results.length)}
            onClick={() => setShowCreate(true)}
            className={`flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-brand-700 ${
              active === results.length ? "bg-brand-50" : "hover:bg-gray-50"
            }`}
          >
            <UserPlus size={15} /> Create new customer
            {query && <span className="text-gray-400">“{query}”</span>}
          </button>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Customer"
        wide
      >
        <CustomerForm
          onSaved={async (id) => {
            setShowCreate(false);
            const c = await getCustomerByIdAction(id);
            if (c) choose(c);
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}
