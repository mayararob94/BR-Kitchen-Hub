"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveSettingsAction,
  type SettingsFormValues,
} from "@/app/actions/settings";

function Field({
  label,
  value,
  onChange,
  placeholder,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="label">{label}</label>
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const router = useRouter();
  const [v, setV] = useState<SettingsFormValues>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const set = (k: keyof SettingsFormValues) => (val: string) =>
    setV((prev) => ({ ...prev, [k]: val }));

  function save() {
    setSaved(false);
    startTransition(async () => {
      await saveSettingsAction(v);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-gray-900">
          Business
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Business Name" value={v.businessName} onChange={set("businessName")} />
          <Field label="Trading Name" value={v.tradingName} onChange={set("tradingName")} />
          <Field label="ABN" value={v.abn} onChange={set("abn")} />
          <Field label="Phone" value={v.phone} onChange={set("phone")} />
          <Field label="Email" value={v.email} onChange={set("email")} />
          <Field label="Website" value={v.website} onChange={set("website")} />
          <Field label="Address" value={v.address} onChange={set("address")} wide />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-gray-900">
          Bank Details
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account Name" value={v.bankAccountName} onChange={set("bankAccountName")} />
          <Field label="BSB" value={v.bankBsb} onChange={set("bankBsb")} />
          <Field
            label="Account Number"
            value={v.bankAccountNumber}
            onChange={set("bankAccountNumber")}
          />
          <div className="col-span-2">
            <label className="label">Payment Instructions</label>
            <textarea
              className="input"
              rows={2}
              value={v.bankPaymentInstructions}
              onChange={(e) => set("bankPaymentInstructions")(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-gray-900">
          Orders & Numbering
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Order Prefix" value={v.orderPrefix} onChange={set("orderPrefix")} />
          <Field label="Next Order Number" value={v.orderNext} onChange={set("orderNext")} />
          <div />
          <Field label="Invoice Prefix" value={v.invoicePrefix} onChange={set("invoicePrefix")} />
          <Field label="Next Invoice Number" value={v.invoiceNext} onChange={set("invoiceNext")} />
          <Field
            label="Default Delivery Fee ($)"
            value={v.defaultDeliveryFeeDollars}
            onChange={set("defaultDeliveryFeeDollars")}
          />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Numbers are used and incremented automatically. Editing “next number” here
          resets the sequence — existing numbers are never reused.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-gray-900">
          Printing
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div>
            <label className="label">Invoice Paper Size</label>
            <input className="input bg-gray-50" value="A4" readOnly />
          </div>
          <div>
            <label className="label">Delivery Label Size</label>
            <input className="input bg-gray-50" value="4 × 6 inch" readOnly />
          </div>
          <div>
            <label className="label">Label Orientation</label>
            <input className="input bg-gray-50" value="Portrait" readOnly />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save Settings"}
        </button>
        {saved && <span className="text-sm text-tropical-700">Saved ✓</span>}
      </div>
    </div>
  );
}
