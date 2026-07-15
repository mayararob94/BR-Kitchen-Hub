import type { D1Like } from "@/lib/db/types";
import { newId, nowIso } from "@/lib/db/client";

export interface AuditEntry {
  actorUserId?: string | null;
  actorLabel?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Append an entry to the audit log. Every privileged mutation (role changes,
 * approvals, price edits, invoice voids, manual check-out closes, …) should
 * call this. The table is append-only; entries are never updated.
 */
export async function writeAudit(db: D1Like, entry: AuditEntry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO audit_logs
         (id, actor_user_id, actor_label, action, entity_type, entity_id, before_json, after_json, ip, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId(),
      entry.actorUserId ?? null,
      entry.actorLabel ?? null,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.before == null ? null : JSON.stringify(entry.before),
      entry.after == null ? null : JSON.stringify(entry.after),
      entry.ip ?? null,
      entry.metadata == null ? null : JSON.stringify(entry.metadata),
      nowIso(),
    )
    .run();
}
