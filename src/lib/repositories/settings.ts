import type { D1Like } from "@/lib/db/types";
import { newId, nowIso } from "@/lib/db/client";

export type SettingScope = "global" | "operator" | "kitchen";

/**
 * Read a JSON-encoded setting. Falls back from a scoped value to the global
 * default when a scoped override is absent.
 */
export async function getSetting<T = unknown>(
  db: D1Like,
  key: string,
  opts: { scopeType?: SettingScope; scopeId?: string | null } = {},
): Promise<T | null> {
  const scopeType = opts.scopeType ?? "global";
  const scopeId = opts.scopeId ?? null;

  const row = await db
    .prepare(
      "SELECT value FROM system_settings WHERE scope_type = ? AND IFNULL(scope_id,'') = IFNULL(?, '') AND key = ?",
    )
    .bind(scopeType, scopeId, key)
    .first<{ value: string | null }>();

  if (row?.value == null) {
    if (scopeType !== "global") return getSetting<T>(db, key);
    return null;
  }
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

/** Upsert a JSON-encoded setting for a scope. */
export async function setSetting(
  db: D1Like,
  key: string,
  value: unknown,
  opts: { scopeType?: SettingScope; scopeId?: string | null; updatedBy?: string } = {},
): Promise<void> {
  const scopeType = opts.scopeType ?? "global";
  const scopeId = opts.scopeId ?? null;
  const encoded = JSON.stringify(value);
  const now = nowIso();

  const existing = await db
    .prepare(
      "SELECT id FROM system_settings WHERE scope_type = ? AND IFNULL(scope_id,'') = IFNULL(?, '') AND key = ?",
    )
    .bind(scopeType, scopeId, key)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare(
        "UPDATE system_settings SET value = ?, updated_at = ?, updated_by = ? WHERE id = ?",
      )
      .bind(encoded, now, opts.updatedBy ?? null, existing.id)
      .run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO system_settings (id, scope_type, scope_id, key, value, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(newId(), scopeType, scopeId, key, encoded, now, opts.updatedBy ?? null)
    .run();
}
