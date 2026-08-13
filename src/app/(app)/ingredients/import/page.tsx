"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  previewIngredientImportAction,
  commitIngredientImportAction,
} from "@/app/actions/ingredients";
import type { PreviewResult, PreviewRow } from "@/lib/db/ingredient-import";
import type { CommitResult } from "@/lib/db/ingredient-import";

function pricePctLabel(current: string, csv: string): string | null {
  const cur = parseFloat(current.replace(/[$,]/g, ""));
  const nw = parseFloat(csv.replace(/[$,]/g, ""));
  if (Number.isNaN(cur) || Number.isNaN(nw) || cur === 0) return null;
  const pct = ((nw - cur) / cur) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export default function IngredientImportPage() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("import.csv");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createNew, setCreateNew] = useState(true);
  const [updateCodes, setUpdateCodes] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<CommitResult | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setCsv(await file.text());
  }

  async function runPreview() {
    setError(null);
    setBusy(true);
    const res = await previewIngredientImportAction(csv);
    setBusy(false);
    if (res.headerError) {
      setError(res.headerError);
      setPreview(null);
      return;
    }
    setPreview(res);
    setUpdateCodes(new Set()); // default: keep existing
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    const res = await commitIngredientImportAction({
      csvText: csv,
      filename,
      applyUpdateCodes: [...updateCodes],
      importNew: createNew,
    });
    setBusy(false);
    setResult(res);
    router.refresh();
  }

  function toggleUpdate(code: string) {
    setUpdateCodes((s) => {
      const n = new Set(s);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });
  }

  // ── Result step ──
  if (result) {
    return (
      <div>
        <PageHeader title="Import Complete" />
        <div className="card max-w-lg p-6">
          <div className="mb-3 flex items-center gap-2 text-tropical-700">
            <CheckCircle2 size={22} />
            <span className="text-lg font-semibold">
              {result.processed} rows processed
            </span>
          </div>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>✓ {result.created} created</li>
            <li>✓ {result.updated} updated</li>
            <li>• {result.skipped} skipped (kept existing / no change)</li>
            <li className={result.failed ? "text-red-600" : ""}>
              • {result.failed} failed (rows with errors)
            </li>
          </ul>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={() => router.push("/ingredients")}>
              View Ingredients
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setResult(null);
                setPreview(null);
                setCsv("");
              }}
            >
              Import Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const errorRows = preview?.rows.filter((r) => r.status === "error") ?? [];
  const newRows = preview?.rows.filter((r) => r.status === "new") ?? [];
  const changeRows = preview?.rows.filter((r) => r.status === "changes") ?? [];

  return (
    <div>
      <PageHeader
        title="Import Ingredients"
        subtitle="Merge a CSV into your ingredient database — add new items and optionally update existing ones. Nothing is ever deleted or overwritten without your approval."
      />

      {/* Upload step */}
      {!preview && (
        <div className="grid gap-4 md:grid-cols-[1fr_320px]">
          <div className="card space-y-3 p-5">
            <a href="/api/ingredients/template" className="btn-secondary inline-flex">
              <FileText size={15} /> Download CSV Template
            </a>
            <p className="text-xs text-gray-500">
              Download the template, complete your ingredient information, then upload the
              completed CSV. Example rows (codes starting with <code>EXAMPLE-</code>) are
              ignored on import — delete or replace them.
            </p>

            <div className="pt-2">
              <label className="label">CSV file</label>
              <input type="file" accept=".csv,text/csv" onChange={onFile} />
            </div>
            <div className="text-center text-xs text-gray-400">or paste CSV below</div>
            <textarea
              className="input font-mono text-xs"
              rows={8}
              placeholder="ingredient_code,ingredient_name,category,base_unit,yield_percent,price_per_unit,…"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <button className="btn-primary" onClick={runPreview} disabled={busy || !csv.trim()}>
              {busy ? "Reading…" : "Preview Import"}
            </button>
          </div>

          <div className="card p-5 text-sm">
            <h3 className="mb-2 font-semibold text-gray-800">How to import</h3>
            <ol className="list-decimal space-y-1 pl-4 text-gray-600">
              <li>Download the CSV template.</li>
              <li>Open it in Excel or Google Sheets.</li>
              <li>Complete your ingredient information.</li>
              <li>Keep the column headers unchanged.</li>
              <li>Save/export as CSV.</li>
              <li>Upload the file and review.</li>
              <li>Confirm the import.</li>
            </ol>
            <h3 className="mb-1 mt-3 font-semibold text-gray-800">Yield examples</h3>
            <ul className="space-y-0.5 text-gray-600">
              <li>Beef Flank: <code>75</code> = 75% yield</li>
              <li>Jasmine Rice: <code>250</code> = 250% (gains weight)</li>
              <li>Broccoli: <code>90</code> = 90%</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              A missing price is allowed — the ingredient imports and shows “cost
              unavailable” until you add one.
            </p>
          </div>
        </div>
      )}

      {/* Preview step */}
      {preview && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="card p-4">
            <h3 className="mb-3 font-display text-lg font-semibold text-gray-900">
              Ready to Import — {preview.counts.total} rows
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
              <Stat label="New" value={preview.counts.new} tone="green" />
              <Stat label="No Changes" value={preview.counts.nochange} />
              <Stat label="Changes Detected" value={preview.counts.changes} tone="amber" />
              <Stat label="Errors" value={preview.counts.errors} tone="red" />
              <Stat label="Examples Ignored" value={preview.counts.example} />
            </div>
          </div>

          {/* Errors */}
          {errorRows.length > 0 && (
            <div className="card overflow-hidden">
              <h3 className="border-b border-gray-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {errorRows.length} row(s) cannot be imported — fix and re-upload
              </h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {errorRows.map((r) => (
                    <tr key={r.rowNumber}>
                      <td className="td font-mono text-xs">{r.code || `row ${r.rowNumber}`}</td>
                      <td className="td">{r.name || "—"}</td>
                      <td className="td text-red-600">{r.errors.join("; ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Changes — require explicit approval */}
          {changeRows.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle size={15} />
                {changeRows.length} existing ingredient(s) differ from the CSV. They stay
                unchanged unless you tick “Apply update”.
              </div>
              <ul className="divide-y divide-gray-100">
                {changeRows.map((r) => (
                  <ChangeCard
                    key={r.rowNumber}
                    row={r}
                    checked={updateCodes.has(r.code)}
                    onToggle={() => toggleUpdate(r.code)}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* New */}
          {newRows.length > 0 && (
            <div className="card overflow-hidden">
              <label className="flex items-center gap-2 border-b border-gray-100 bg-tropical-50 p-3 text-sm font-medium text-tropical-800">
                <input
                  type="checkbox"
                  checked={createNew}
                  onChange={(e) => setCreateNew(e.target.checked)}
                />
                Create {newRows.length} new ingredient(s)
              </label>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="th">Code</th>
                      <th className="th">Ingredient</th>
                      <th className="th text-right">Yield</th>
                      <th className="th text-right">Price</th>
                      <th className="th">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {newRows.map((r) => (
                      <tr key={r.rowNumber}>
                        <td className="td font-mono text-xs">{r.code}</td>
                        <td className="td">
                          {r.name}
                          {r.nameDuplicateCode && (
                            <span className="ml-2 rounded bg-amber-50 px-1.5 text-[10px] text-amber-700">
                              name matches {r.nameDuplicateCode}
                            </span>
                          )}
                        </td>
                        <td className="td text-right">{r.yieldPct}%</td>
                        <td className="td text-right">{r.priceDisplay}</td>
                        <td className="td text-xs text-gray-400">
                          {r.warnings.filter((w) => !w.startsWith("An ingredient named")).join("; ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => setPreview(null)} disabled={busy}>
              Back
            </button>
            <button
              className="btn-primary"
              onClick={commit}
              disabled={busy || (!createNew && updateCodes.size === 0)}
            >
              {busy
                ? "Importing…"
                : `Import (${(createNew ? preview.counts.new : 0) + updateCodes.size} change${
                    (createNew ? preview.counts.new : 0) + updateCodes.size === 1 ? "" : "s"
                  })`}
            </button>
            <span className="text-xs text-gray-400">
              Existing ingredients not in this file are never touched.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "green" | "amber" | "red";
}) {
  const color =
    tone === "green"
      ? "text-tropical-700"
      : tone === "amber"
        ? "text-amber-700"
        : tone === "red"
          ? "text-red-600"
          : "text-gray-900";
  return (
    <div className="rounded-lg border border-gray-100 p-2 text-center">
      <div className={`font-display text-xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function ChangeCard({
  row,
  checked,
  onToggle,
}: {
  row: PreviewRow;
  checked: boolean;
  onToggle: () => void;
}) {
  const priceChange = row.changes.find((c) => c.field.startsWith("Price/"));
  const pct = priceChange ? pricePctLabel(priceChange.current, priceChange.csv) : null;
  return (
    <li className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-xs text-gray-500">{row.code}</span>{" "}
          <span className="font-medium text-gray-900">{row.name}</span>
          {pct && (
            <span
              className={`ml-2 rounded px-1.5 text-xs font-medium ${
                pct.startsWith("+") ? "bg-red-50 text-red-600" : "bg-tropical-100 text-tropical-800"
              }`}
            >
              Price {pct}
            </span>
          )}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={onToggle} />
          Apply update
        </label>
      </div>
      <table className="mt-2 w-full max-w-xl text-xs">
        <thead className="text-left text-gray-400">
          <tr>
            <th className="py-0.5">Field</th>
            <th className="py-0.5">Current (database)</th>
            <th className="py-0.5">Uploaded CSV</th>
          </tr>
        </thead>
        <tbody>
          {row.changes.map((c, i) => (
            <tr key={i}>
              <td className="py-0.5 text-gray-500">{c.field}</td>
              <td className="py-0.5">{c.current}</td>
              <td className="py-0.5 font-medium text-gray-900">{c.csv}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </li>
  );
}
