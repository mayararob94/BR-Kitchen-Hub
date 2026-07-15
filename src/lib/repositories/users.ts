import type { D1Like } from "@/lib/db/types";
import { newId, nowIso } from "@/lib/db/client";
import type { RoleAssignment, Role, ScopeType } from "@/lib/rbac/types";

export interface UserRow {
  id: string;
  email: string;
  email_verified_at: string | null;
  status: string;
}

export async function findUserByEmail(
  db: D1Like,
  email: string,
): Promise<UserRow | null> {
  return db
    .prepare(
      "SELECT id, email, email_verified_at, status FROM users WHERE lower(email) = ? AND deleted_at IS NULL",
    )
    .bind(email.trim().toLowerCase())
    .first<UserRow>();
}

export async function findUserById(
  db: D1Like,
  id: string,
): Promise<UserRow | null> {
  return db
    .prepare(
      "SELECT id, email, email_verified_at, status FROM users WHERE id = ? AND deleted_at IS NULL",
    )
    .bind(id)
    .first<UserRow>();
}

/** Create a user (and empty profile) if one does not already exist for the email. */
export async function upsertUserByEmail(
  db: D1Like,
  email: string,
): Promise<UserRow> {
  const existing = await findUserByEmail(db, email);
  if (existing) return existing;

  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      "INSERT INTO users (id, email, status, created_at, updated_at) VALUES (?, ?, 'active', ?, ?)",
    )
    .bind(id, email.trim().toLowerCase(), now, now)
    .run();
  await db
    .prepare("INSERT INTO profiles (user_id, created_at, updated_at) VALUES (?, ?, ?)")
    .bind(id, now, now)
    .run();

  return { id, email: email.trim().toLowerCase(), email_verified_at: null, status: "active" };
}

export async function markEmailVerified(db: D1Like, userId: string): Promise<void> {
  const now = nowIso();
  await db
    .prepare(
      "UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?), last_login_at = ?, updated_at = ? WHERE id = ?",
    )
    .bind(now, now, now, userId)
    .run();
}

export async function getRoleAssignments(
  db: D1Like,
  userId: string,
): Promise<RoleAssignment[]> {
  const { results } = await db
    .prepare(
      "SELECT role, scope_type, scope_id FROM role_assignments WHERE user_id = ?",
    )
    .bind(userId)
    .all<{ role: Role; scope_type: ScopeType; scope_id: string | null }>();

  return results.map((r) => ({
    role: r.role,
    scopeType: r.scope_type,
    scopeId: r.scope_id,
  }));
}
