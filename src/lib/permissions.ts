/**
 * Permission seam.
 *
 * The Hub currently runs as a single local operator (implicitly the "Owner"),
 * so there is no authentication system to hook into — and we deliberately do
 * NOT build a second one here. Instead, every sensitive server action calls
 * `requirePermission(...)`, giving a single, centralized enforcement point.
 *
 * When real role-based access control is added later, only `hasPermission`
 * needs to consult the authenticated user's roles — the call sites stay put.
 */

export type Permission =
  | "ingredients.view"
  | "ingredients.create"
  | "ingredients.edit"
  | "ingredients.import"
  | "ingredients.export"
  | "ingredients.view_cost"
  | "ingredients.edit_cost";

/** All permissions granted to the local operator (Owner) today. */
export function hasPermission(_permission: Permission): boolean {
  return true;
}

export function requirePermission(permission: Permission): void {
  if (!hasPermission(permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/** Who is performing the action (for audit rows). RBAC will supply the real user. */
export function currentActor(): string {
  return "Owner";
}
