import { getDb } from "./index";
import {
  listIngredients,
  getIngredientByCode,
  createIngredient,
  updateIngredient,
  type IngredientInput,
} from "./ingredients-db";
import { parseCsv, toCsv } from "@/lib/csv";
import { formatMoney } from "@/lib/money";
import type { BaseUnit, Ingredient } from "@/types";

// ─── Template ───

export const TEMPLATE_HEADERS = [
  "ingredient_code",
  "ingredient_name",
  "category",
  "base_unit",
  "yield_percent",
  "price_per_unit",
  "supplier",
  "supplier_sku",
  "pack_size",
  "pack_unit",
  "pack_price",
  "purchase_increment",
  "purchase_increment_unit",
  "notes",
] as const;

const REQUIRED_HEADERS = [
  "ingredient_code",
  "ingredient_name",
  "category",
  "base_unit",
  "yield_percent",
];

// Example rows are ignored on import. Any code starting with EXAMPLE- is a sample.
const EXAMPLE_PREFIX = "EXAMPLE-";

export function buildTemplateCsv(): string {
  const rows: string[][] = [
    // Example rows — IGNORED on import (codes start with EXAMPLE-). Replace them.
    ["EXAMPLE-MEAT-001", "Beef Flank (loses weight)", "Meat/Protein", "kg", "75", "25.00", "Supplier A", "", "1", "kg", "25.00", "1", "kg", "example row — delete me"],
    ["EXAMPLE-DRY-001", "Jasmine Rice (gains weight)", "Dry Goods", "kg", "250", "3.20", "Supplier B", "", "5", "kg", "16.00", "5", "kg", "example row — delete me"],
    ["EXAMPLE-PROD-001", "Broccoli (normal produce)", "Produce", "kg", "90", "6.50", "Supplier C", "", "", "", "", "1", "kg", "example row — delete me"],
  ];
  return toCsv([...TEMPLATE_HEADERS], rows);
}

// ─── Unit handling ───

interface ParsedUnit {
  baseUnit: BaseUnit;
  isBig: boolean; // kg/L/each = big; g/ml = small
  dimension: "weight" | "volume" | "count";
}

function parseUnit(raw: string): ParsedUnit | null {
  const u = raw.trim().toLowerCase();
  switch (u) {
    case "kg":
      return { baseUnit: "g", isBig: true, dimension: "weight" };
    case "g":
    case "gram":
    case "grams":
      return { baseUnit: "g", isBig: false, dimension: "weight" };
    case "l":
    case "litre":
    case "liter":
      return { baseUnit: "ml", isBig: true, dimension: "volume" };
    case "ml":
      return { baseUnit: "ml", isBig: false, dimension: "volume" };
    case "each":
    case "ea":
    case "unit":
    case "pcs":
      return { baseUnit: "each", isBig: true, dimension: "count" };
    default:
      return null;
  }
}

/** dollars per <unit> → internal cents per big unit (kg/L/each). */
function priceToCents(price: number, u: ParsedUnit): number {
  return u.isBig ? Math.round(price * 100) : Math.round(price * 1000 * 100);
}

/** a quantity in <unit> → internal base units (g/ml/each). */
function qtyToBase(qty: number, u: ParsedUnit): number {
  if (u.dimension === "count") return Math.round(qty);
  return Math.round(qty * (u.isBig ? 1000 : 1));
}

function dimensionOf(baseUnit: BaseUnit): "weight" | "volume" | "count" {
  return baseUnit === "g" ? "weight" : baseUnit === "ml" ? "volume" : "count";
}

// ─── Analysis ───

export type RowStatus = "new" | "nochange" | "changes" | "error" | "example";

export interface PreviewChange {
  field: string;
  current: string;
  csv: string;
}

export interface PreviewRow {
  rowNumber: number;
  code: string;
  name: string;
  category: string;
  baseUnitDisplay: string;
  yieldPct: number | null;
  priceDisplay: string;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  changes: PreviewChange[];
  nameDuplicateCode?: string;
}

interface AnalyzedRow {
  preview: PreviewRow;
  input?: IngredientInput; // mapped values (only for importable rows)
  existingId?: number;
}

export interface PreviewResult {
  headerError?: string;
  rows: PreviewRow[];
  counts: {
    total: number;
    new: number;
    nochange: number;
    changes: number;
    errors: number;
    example: number;
  };
}

function num(raw: string | undefined): { ok: boolean; value: number } {
  const s = (raw ?? "").trim();
  if (s === "") return { ok: false, value: NaN };
  const n = Number(s.replace(/[$,]/g, ""));
  return { ok: !Number.isNaN(n), value: n };
}

function analyze(csvText: string): { headerError?: string; rows: AnalyzedRow[] } {
  const parsed = parseCsv(csvText);
  if (parsed.length < 1)
    return { headerError: "The file appears to be empty.", rows: [] };

  const headers = parsed[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      headerError: `Missing required column(s): ${missing.join(", ")}. Download the template for the correct headers.`,
      rows: [],
    };
  }
  const idx = (name: string) => headers.indexOf(name);
  const col = (cells: string[], name: string) => (cells[idx(name)] ?? "").trim();

  // Existing data for matching + duplicate detection + category canonicalisation.
  const existing = listIngredients();
  const byName = new Map<string, Ingredient>();
  const categoryCanon = new Map<string, string>();
  for (const ing of existing) {
    byName.set(ing.name.trim().toLowerCase(), ing);
    if (ing.category) categoryCanon.set(ing.category.trim().toLowerCase(), ing.category);
  }

  const seenCodes = new Set<string>();
  const rows: AnalyzedRow[] = [];

  for (let i = 1; i < parsed.length; i++) {
    const cells = parsed[i];
    const code = col(cells, "ingredient_code");
    const name = col(cells, "ingredient_name");

    // Skip completely empty lines.
    if (!code && !name && cells.every((c) => c.trim() === "")) continue;

    // Example rows are ignored.
    if (code.toUpperCase().startsWith(EXAMPLE_PREFIX)) {
      rows.push({
        preview: {
          rowNumber: i + 1,
          code,
          name,
          category: col(cells, "category"),
          baseUnitDisplay: col(cells, "base_unit"),
          yieldPct: null,
          priceDisplay: "—",
          status: "example",
          errors: [],
          warnings: ["Example row — ignored on import"],
          changes: [],
        },
      });
      continue;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // ── required fields ──
    if (!code) errors.push("Missing ingredient_code");
    else if (seenCodes.has(code.toLowerCase()))
      errors.push("Duplicate ingredient_code within the file");
    seenCodes.add(code.toLowerCase());

    if (!name) errors.push("Missing ingredient_name");

    const categoryRaw = col(cells, "category");
    if (!categoryRaw) errors.push("Missing category");
    const category = categoryCanon.get(categoryRaw.trim().toLowerCase()) ?? categoryRaw;

    const baseUnitRaw = col(cells, "base_unit");
    if (!baseUnitRaw) errors.push("Missing base_unit");
    const unit = baseUnitRaw ? parseUnit(baseUnitRaw) : null;
    if (baseUnitRaw && !unit) errors.push(`Unknown base_unit "${baseUnitRaw}"`);

    const yieldRaw = col(cells, "yield_percent");
    const yieldNum = num(yieldRaw);
    if (yieldRaw.trim() === "") errors.push("Missing yield_percent");
    else if (!yieldNum.ok) errors.push(`Invalid yield "${yieldRaw}"`);
    else if (yieldNum.value <= 0) errors.push("Yield must be greater than 0");
    else if (yieldNum.value > 1000) warnings.push("Unusually high yield (>1000%)");

    // ── optional: price ──
    let priceCents: number | null = null;
    const priceRaw = col(cells, "price_per_unit");
    if (priceRaw.trim() === "") {
      warnings.push("No price — cost will show as unavailable");
    } else {
      const p = num(priceRaw);
      if (!p.ok) errors.push(`Invalid price "${priceRaw}"`);
      else if (p.value < 0) errors.push("Price cannot be negative");
      else if (unit) priceCents = priceToCents(p.value, unit);
    }

    // ── optional: pack ──
    let packSizeBase: number | null = null;
    let packPriceCents: number | null = null;
    const packSizeRaw = col(cells, "pack_size");
    const packUnitRaw = col(cells, "pack_unit");
    const packPriceRaw = col(cells, "pack_price");
    if (packSizeRaw.trim() !== "") {
      const ps = num(packSizeRaw);
      if (!ps.ok || ps.value <= 0) errors.push(`Invalid pack_size "${packSizeRaw}"`);
      const pu = packUnitRaw ? parseUnit(packUnitRaw) : unit;
      if (packUnitRaw && !pu) errors.push(`Unknown pack_unit "${packUnitRaw}"`);
      else if (pu && unit && pu.dimension !== unit.dimension)
        errors.push("pack_unit is a different measurement type than base_unit");
      else if (pu && ps.ok) packSizeBase = qtyToBase(ps.value, pu);
    }
    if (packPriceRaw.trim() !== "") {
      const pp = num(packPriceRaw);
      if (!pp.ok || pp.value < 0) errors.push(`Invalid pack_price "${packPriceRaw}"`);
      else packPriceCents = Math.round(pp.value * 100);
      if (packSizeRaw.trim() === "") errors.push("pack_price provided without pack_size");
    }

    // ── optional: purchase increment ──
    let purchaseIncrementBase: number | null = null;
    const incRaw = col(cells, "purchase_increment");
    const incUnitRaw = col(cells, "purchase_increment_unit");
    if (incRaw.trim() !== "") {
      const inc = num(incRaw);
      if (!inc.ok || inc.value <= 0) errors.push(`Invalid purchase_increment "${incRaw}"`);
      const iu = incUnitRaw ? parseUnit(incUnitRaw) : unit;
      if (!incUnitRaw && !unit) errors.push("purchase_increment provided without a unit");
      else if (incUnitRaw && !iu) errors.push(`Unknown purchase_increment_unit "${incUnitRaw}"`);
      else if (iu && unit && iu.dimension !== unit.dimension)
        errors.push("purchase_increment_unit is a different measurement type than base_unit");
      else if (iu && inc.ok) purchaseIncrementBase = qtyToBase(inc.value, iu);
    }

    const supplier = col(cells, "supplier");
    const supplierSku = col(cells, "supplier_sku");
    const notes = col(cells, "notes");
    if (!supplier) warnings.push("No supplier");

    const baseUnitDisplay = unit
      ? unit.baseUnit === "g"
        ? "kg"
        : unit.baseUnit === "ml"
          ? "L"
          : "each"
      : baseUnitRaw;
    const priceDisplay = priceCents != null ? `${formatMoney(priceCents)}/${baseUnitDisplay}` : "—";

    // Determine status by matching on code.
    const existingRec = code ? getIngredientByCode(code) : null;
    let status: RowStatus = "new";
    const changes: PreviewChange[] = [];
    let nameDuplicateCode: string | undefined;

    const mappedInput: IngredientInput | undefined =
      !unit || yieldRaw.trim() === "" || !yieldNum.ok
        ? undefined
        : {
            code,
            name,
            category,
            baseUnit: unit.baseUnit,
            defaultYieldPct: yieldNum.value,
            priceCents,
            supplier,
            supplierSku,
            packSizeBase,
            packPriceCents,
            purchaseIncrementBase,
            notes,
          };

    if (errors.length > 0) {
      status = "error";
    } else if (existingRec && mappedInput) {
      diffFields(existingRec, mappedInput, baseUnitDisplay, changes);
      status = changes.length > 0 ? "changes" : "nochange";
    } else {
      status = "new";
      const sameName = byName.get(name.trim().toLowerCase());
      if (sameName) {
        nameDuplicateCode = sameName.code ?? `#${sameName.id}`;
        warnings.push(`An ingredient named "${name}" already exists as ${nameDuplicateCode}`);
      }
    }

    const preview: PreviewRow = {
      rowNumber: i + 1,
      code,
      name,
      category,
      baseUnitDisplay,
      yieldPct: yieldNum.ok ? yieldNum.value : null,
      priceDisplay,
      status,
      errors,
      warnings,
      changes,
      nameDuplicateCode,
    };

    rows.push({
      preview,
      input: status === "error" ? undefined : mappedInput,
      existingId: existingRec?.id,
    });
  }

  return { rows };
}

function displayPrice(cents: number | null): string {
  return cents != null ? formatMoney(cents) : "—";
}

function diffFields(
  existing: Ingredient,
  input: IngredientInput,
  bigUnit: string,
  out: PreviewChange[]
) {
  const push = (field: string, cur: string, csv: string) => {
    if (cur !== csv) out.push({ field, current: cur, csv });
  };
  push("Name", existing.name, input.name);
  push("Category", existing.category, input.category ?? "");
  push(
    "Yield",
    `${existing.defaultYieldPct}%`,
    `${input.defaultYieldPct}%`
  );
  push(
    `Price/${bigUnit}`,
    displayPrice(existing.priceCents),
    displayPrice(input.priceCents ?? null)
  );
  push("Supplier", existing.supplier, input.supplier ?? "");
  push("Supplier SKU", existing.supplierSku, input.supplierSku ?? "");
  push(
    "Pack size",
    existing.packSizeBase != null ? String(existing.packSizeBase) : "—",
    input.packSizeBase != null ? String(input.packSizeBase) : "—"
  );
  push(
    "Pack price",
    displayPrice(existing.packPriceCents),
    displayPrice(input.packPriceCents ?? null)
  );
  push(
    "Purchase increment",
    existing.purchaseIncrementBase != null ? String(existing.purchaseIncrementBase) : "—",
    input.purchaseIncrementBase != null ? String(input.purchaseIncrementBase) : "—"
  );
  push("Notes", existing.notes, input.notes ?? "");
}

export function previewImport(csvText: string): PreviewResult {
  const { headerError, rows } = analyze(csvText);
  if (headerError) {
    return {
      headerError,
      rows: [],
      counts: { total: 0, new: 0, nochange: 0, changes: 0, errors: 0, example: 0 },
    };
  }
  const counts = {
    total: rows.length,
    new: rows.filter((r) => r.preview.status === "new").length,
    nochange: rows.filter((r) => r.preview.status === "nochange").length,
    changes: rows.filter((r) => r.preview.status === "changes").length,
    errors: rows.filter((r) => r.preview.status === "error").length,
    example: rows.filter((r) => r.preview.status === "example").length,
  };
  return { rows: rows.map((r) => r.preview), counts };
}

// ─── Commit (merge-only, transactional) ───

export interface CommitResult {
  importId: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

/**
 * Apply an import as a MERGE: create NEW rows (when importNew), update only the
 * existing rows whose code is in `applyUpdateCodes`, skip everything else.
 * Never deletes, never touches ingredients absent from the CSV.
 */
export function commitImport(
  csvText: string,
  filename: string,
  applyUpdateCodes: string[],
  importNew: boolean,
  actor: string
): CommitResult {
  const db = getDb();
  const { rows } = analyze(csvText);
  const updateSet = new Set(applyUpdateCodes.map((c) => c.toLowerCase()));

  const tx = db.transaction((): CommitResult => {
    const audit = db
      .prepare("INSERT INTO ingredient_imports (filename, imported_by) VALUES (?, ?)")
      .run(filename, actor);
    const importId = Number(audit.lastInsertRowid);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    const changeStmt = db.prepare(
      `INSERT INTO ingredient_import_changes (import_id, ingredient_id, ingredient_code, change_type, changes_json)
       VALUES (?, ?, ?, ?, ?)`
    );

    for (const r of rows) {
      const st = r.preview.status;
      if (st === "example") continue;
      if (st === "error") {
        failed++;
        continue;
      }
      if (st === "new") {
        if (!importNew || !r.input) {
          skipped++;
          continue;
        }
        const id = createIngredient(r.input, "CSV_IMPORT", actor);
        changeStmt.run(
          importId,
          id,
          r.preview.code,
          "create",
          JSON.stringify([{ field: "created", current: "—", csv: r.preview.name }])
        );
        created++;
      } else if (st === "nochange") {
        skipped++;
      } else if (st === "changes") {
        if (!r.input || !r.existingId || !updateSet.has(r.preview.code.toLowerCase())) {
          skipped++;
          continue;
        }
        updateIngredient(r.existingId, r.input, "CSV_IMPORT", actor);
        changeStmt.run(
          importId,
          r.existingId,
          r.preview.code,
          "update",
          JSON.stringify(r.preview.changes)
        );
        updated++;
      }
    }

    const processed = created + updated + skipped + failed;
    db.prepare(
      `UPDATE ingredient_imports
       SET rows_processed=?, created_count=?, updated_count=?, skipped_count=?, failed_count=?
       WHERE id=?`
    ).run(processed, created, updated, skipped, failed, importId);

    return { importId, processed, created, updated, skipped, failed };
  });

  return tx();
}

// ─── Export ───

export interface ExportFilters {
  category?: string;
  supplier?: string;
  activeOnly?: boolean;
}

function baseToBigNumber(base: number | null, baseUnit: BaseUnit): string {
  if (base == null) return "";
  if (baseUnit === "each") return String(base);
  return String(base / 1000);
}

export function buildExportCsv(filters: ExportFilters = {}): string {
  let items = listIngredients();
  if (filters.activeOnly) items = items.filter((i) => i.isActive);
  if (filters.category)
    items = items.filter((i) => i.category.toLowerCase() === filters.category!.toLowerCase());
  if (filters.supplier)
    items = items.filter((i) => i.supplier.toLowerCase() === filters.supplier!.toLowerCase());

  const bigUnit = (u: BaseUnit) => (u === "g" ? "kg" : u === "ml" ? "L" : "each");
  const rows = items.map((i) => [
    i.code ?? "",
    i.name,
    i.category,
    bigUnit(i.baseUnit),
    String(i.defaultYieldPct),
    i.priceCents != null ? (i.priceCents / 100).toFixed(2) : "",
    i.supplier,
    i.supplierSku,
    baseToBigNumber(i.packSizeBase, i.baseUnit),
    i.packSizeBase != null ? bigUnit(i.baseUnit) : "",
    i.packPriceCents != null ? (i.packPriceCents / 100).toFixed(2) : "",
    baseToBigNumber(i.purchaseIncrementBase, i.baseUnit),
    i.purchaseIncrementBase != null ? bigUnit(i.baseUnit) : "",
    i.notes,
  ]);
  return toCsv([...TEMPLATE_HEADERS], rows);
}

// ─── Import audit history ───

export interface ImportAudit {
  id: number;
  filename: string;
  importedBy: string;
  rowsProcessed: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  createdAt: string;
}

export function listImports(limit = 20): ImportAudit[] {
  const rows = getDb()
    .prepare("SELECT * FROM ingredient_imports ORDER BY id DESC LIMIT ?")
    .all(limit) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    filename: r.filename as string,
    importedBy: r.imported_by as string,
    rowsProcessed: r.rows_processed as number,
    createdCount: r.created_count as number,
    updatedCount: r.updated_count as number,
    skippedCount: r.skipped_count as number,
    failedCount: r.failed_count as number,
    createdAt: r.created_at as string,
  }));
}
