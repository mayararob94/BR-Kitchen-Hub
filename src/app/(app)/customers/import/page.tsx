"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  previewCustomerImportAction,
  importCustomersAction,
  type ImportPreviewRow,
} from "@/app/actions/data";
import type { CustomerInput } from "@/lib/db/customers-db";

export default function ImportCustomersPage() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<ImportPreviewRow[] | null>(null);
  const [skip, setSkip] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
  }

  async function preview() {
    setError(null);
    setBusy(true);
    const res = await previewCustomerImportAction(csv);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    // Default: skip rows flagged as duplicates.
    const initialSkip: Record<number, boolean> = {};
    res.rows.forEach((r) => {
      if (r.duplicates.length > 0) initialSkip[r.rowNumber] = true;
    });
    setSkip(initialSkip);
    setRows(res.rows);
  }

  async function doImport() {
    if (!rows) return;
    setBusy(true);
    const toImport: CustomerInput[] = rows
      .filter((r) => !skip[r.rowNumber])
      .map((r) => r.data);
    const res = await importCustomersAction(toImport);
    setBusy(false);
    setDone(res.created);
  }

  if (done !== null) {
    return (
      <div>
        <PageHeader title="Import Customers" />
        <div className="card max-w-lg p-6 text-center">
          <p className="text-lg font-medium text-gray-900">
            Imported {done} customer{done === 1 ? "" : "s"}.
          </p>
          <button
            className="btn-primary mt-4"
            onClick={() => router.push("/customers")}
          >
            View Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Import Customers"
        subtitle="Upload a CSV. Duplicates are detected by phone, email or name+suburb and skipped by default."
      />

      {!rows && (
        <div className="card max-w-2xl space-y-3 p-5">
          <div>
            <label className="label">CSV file</label>
            <input type="file" accept=".csv,text/csv" onChange={onFile} />
          </div>
          <div className="text-center text-xs text-gray-400">or paste CSV below</div>
          <textarea
            className="input font-mono text-xs"
            rows={8}
            placeholder="First Name,Last Name,Email,Phone,Address,Suburb,State,Postcode,Delivery Instructions"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            className="btn-primary"
            onClick={preview}
            disabled={busy || !csv.trim()}
          >
            {busy ? "Reading…" : "Preview Import"}
          </button>
        </div>
      )}

      {rows && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 p-3">
            <p className="text-sm text-gray-600">
              {rows.length} rows · {rows.filter((r) => !skip[r.rowNumber]).length} to
              import
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setRows(null)}>
                Back
              </button>
              <button className="btn-primary" onClick={doImport} disabled={busy}>
                {busy ? "Importing…" : "Import Selected"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="th">Import?</th>
                  <th className="th">Name</th>
                  <th className="th">Phone</th>
                  <th className="th">Email</th>
                  <th className="th">Suburb</th>
                  <th className="th">Duplicate?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r) => (
                  <tr key={r.rowNumber} className={skip[r.rowNumber] ? "opacity-50" : ""}>
                    <td className="td">
                      <input
                        type="checkbox"
                        checked={!skip[r.rowNumber]}
                        onChange={(e) =>
                          setSkip((s) => ({ ...s, [r.rowNumber]: !e.target.checked }))
                        }
                      />
                    </td>
                    <td className="td">
                      {[r.data.firstName, r.data.lastName].filter(Boolean).join(" ")}
                    </td>
                    <td className="td">{r.data.phone || "—"}</td>
                    <td className="td">{r.data.email || "—"}</td>
                    <td className="td">{r.data.suburb || "—"}</td>
                    <td className="td">
                      {r.duplicates.length > 0 ? (
                        <span className="badge bg-amber-50 text-amber-700">
                          Matches {r.duplicates[0].fullName}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
