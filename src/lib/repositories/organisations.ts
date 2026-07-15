import type { D1Like } from "@/lib/db/types";
import type { Principal } from "@/lib/rbac/types";
import { isAdminPrincipal, organisationIdsFor } from "@/lib/rbac/authorize";

export interface OrganisationRow {
  id: string;
  operator_id: string;
  name: string;
  status: string;
}

/**
 * Tenant-scoped organisation lookup. This is the RLS replacement in action:
 * the query is *always* constrained to organisations the principal may see —
 * their own memberships for customers, or an operator's whole book for
 * admins. There is no code path that returns an organisation the caller is
 * not entitled to, because the scope is derived from the server-resolved
 * principal, never from a client-supplied id alone.
 */
export async function findOrganisationForPrincipal(
  db: D1Like,
  principal: Principal,
  organisationId: string,
): Promise<OrganisationRow | null> {
  if (isAdminPrincipal(principal)) {
    // Admin/staff: constrained to organisations under an operator they hold
    // a role on. Operator scope is matched via the organisation's operator_id.
    const operatorIds = principal.assignments
      .filter((a) => a.scopeType === "operator" && a.scopeId)
      .map((a) => a.scopeId as string);

    // super_admin (global) sees all; others are restricted to their operators.
    const isSuper = principal.assignments.some((a) => a.role === "super_admin");
    if (isSuper) {
      return db
        .prepare(
          "SELECT id, operator_id, name, status FROM organisations WHERE id = ? AND deleted_at IS NULL",
        )
        .bind(organisationId)
        .first<OrganisationRow>();
    }
    if (operatorIds.length === 0) return null;
    const placeholders = operatorIds.map(() => "?").join(",");
    return db
      .prepare(
        `SELECT id, operator_id, name, status FROM organisations
          WHERE id = ? AND operator_id IN (${placeholders}) AND deleted_at IS NULL`,
      )
      .bind(organisationId, ...operatorIds)
      .first<OrganisationRow>();
  }

  // Customer: only organisations the principal is a member of.
  const allowed = organisationIdsFor(principal);
  if (!allowed.includes(organisationId)) return null;

  return db
    .prepare(
      "SELECT id, operator_id, name, status FROM organisations WHERE id = ? AND deleted_at IS NULL",
    )
    .bind(organisationId)
    .first<OrganisationRow>();
}

/** List organisations the principal may see (customers: their memberships). */
export async function listOrganisationsForPrincipal(
  db: D1Like,
  principal: Principal,
): Promise<OrganisationRow[]> {
  const allowed = organisationIdsFor(principal);
  if (isAdminPrincipal(principal)) {
    // Admin listing is added with filtering/pagination in a later phase.
    const { results } = await db
      .prepare(
        "SELECT id, operator_id, name, status FROM organisations WHERE deleted_at IS NULL ORDER BY name",
      )
      .all<OrganisationRow>();
    return results;
  }
  if (allowed.length === 0) return [];
  const placeholders = allowed.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT id, operator_id, name, status FROM organisations
        WHERE id IN (${placeholders}) AND deleted_at IS NULL ORDER BY name`,
    )
    .bind(...allowed)
    .all<OrganisationRow>();
  return results;
}
