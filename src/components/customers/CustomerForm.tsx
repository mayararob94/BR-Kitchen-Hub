"use client";

import { useState } from "react";
import type { Customer } from "@/types";
import {
  createCustomerAction,
  updateCustomerAction,
  checkDuplicatesAction,
} from "@/app/actions/customers";
import type { CustomerInput } from "@/lib/db/customers-db";

const WINDOWS = [
  { value: "", label: "—" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "anytime", label: "Anytime" },
];
const PREFERENCES = [
  { value: "", label: "—" },
  { value: "home", label: "I will be home" },
  { value: "safe_place", label: "Leave in a safe place" },
];

const empty: CustomerInput = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  suburb: "",
  state: "QLD",
  postcode: "",
  deliveryInstructions: "",
  deliveryWindow: "",
  deliveryPreference: "",
  notes: "",
};

export function CustomerForm({
  customer,
  onSaved,
  onCancel,
  compact,
}: {
  customer?: Customer;
  onSaved?: (id: number) => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [form, setForm] = useState<CustomerInput>(
    customer
      ? {
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          email: customer.email,
          addressLine1: customer.addressLine1,
          addressLine2: customer.addressLine2,
          suburb: customer.suburb,
          state: customer.state,
          postcode: customer.postcode,
          deliveryInstructions: customer.deliveryInstructions,
          deliveryWindow: customer.deliveryWindow,
          deliveryPreference: customer.deliveryPreference,
          notes: customer.notes,
          isActive: customer.isActive,
        }
      : empty
  );
  const [dupes, setDupes] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceSave, setForceSave] = useState(false);

  const set = (k: keyof CustomerInput, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.firstName?.trim()) {
      setError("First name is required.");
      return;
    }
    setSaving(true);
    try {
      // Duplicate detection on create.
      if (!customer && !forceSave) {
        const found = await checkDuplicatesAction({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          suburb: form.suburb,
        });
        if (found.length > 0) {
          setDupes(found);
          setForceSave(true);
          setSaving(false);
          return;
        }
      }
      if (customer) {
        await updateCustomerAction(customer.id, form);
        onSaved?.(customer.id);
      } else {
        const { id } = await createCustomerAction(form);
        onSaved?.(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  const grid = compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {dupes.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Possible duplicate customer found:</p>
          <ul className="mt-1 list-disc pl-5">
            {dupes.map((d) => (
              <li key={d.id}>
                {d.fullName} · {d.phone} · {d.suburb}
              </li>
            ))}
          </ul>
          <p className="mt-2">Click Save again to create anyway.</p>
        </div>
      )}

      <div className={`grid ${grid} gap-3`}>
        <div>
          <label className="label">First Name *</label>
          <input
            autoFocus
            className="input"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input
            className="input"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="label">Email</label>
          <input
            className="input"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>

      <div className={`grid ${grid} gap-3`}>
        <div className="col-span-2 md:col-span-3">
          <label className="label">Address Line 1</label>
          <input
            className="input"
            value={form.addressLine1}
            onChange={(e) => set("addressLine1", e.target.value)}
          />
        </div>
        <div className="col-span-2 md:col-span-3">
          <label className="label">Address Line 2</label>
          <input
            className="input"
            value={form.addressLine2}
            onChange={(e) => set("addressLine2", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Suburb</label>
          <input
            className="input"
            value={form.suburb}
            onChange={(e) => set("suburb", e.target.value)}
          />
        </div>
        <div>
          <label className="label">State</label>
          <input
            className="input"
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Postcode</label>
          <input
            className="input"
            value={form.postcode}
            onChange={(e) => set("postcode", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Preferred Delivery Window</label>
          <select
            className="input"
            value={form.deliveryWindow}
            onChange={(e) => set("deliveryWindow", e.target.value)}
          >
            {WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Delivery Preference</label>
          <select
            className="input"
            value={form.deliveryPreference}
            onChange={(e) => set("deliveryPreference", e.target.value)}
          >
            {PREFERENCES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Delivery Instructions</label>
        <textarea
          className="input"
          rows={2}
          value={form.deliveryInstructions}
          onChange={(e) => set("deliveryInstructions", e.target.value)}
          placeholder="e.g. Leave behind side gate, gate code 1234"
        />
      </div>

      <div>
        <label className="label">Internal Notes</label>
        <textarea
          className="input"
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="e.g. Always pays Friday, call before delivery"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : customer ? "Save Changes" : "Create Customer"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
