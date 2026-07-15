import { ROLE_CAPABILITIES, type Capability } from "./capabilities";
import type { AuthTarget, Principal, RoleAssignment } from "./types";

/** Thrown when an authorization check fails. Callers map this to HTTP 403. */
export class AuthorizationError extends Error {
  readonly capability: Capability;
  constructor(capability: Capability) {
    super(`Not authorized: missing capability '${capability}'`);
    this.name = "AuthorizationError";
    this.capability = capability;
  }
}

/**
 * Does a single assignment's scope cover the requested target?
 *
 *   global       → covers everything
 *   operator:X   → covers targets in operator X
 *   kitchen:K    → covers targets for kitchen K
 *   organisation:O → covers targets for organisation O
 *
 * A scoped assignment covers a target only when the target actually names the
 * matching dimension. This is deliberately strict: a check with no target
 * dimensions is satisfied only by a `global` assignment, so scoped roles can
 * never leak across tenants by omission.
 */
function scopeCovers(assignment: RoleAssignment, target: AuthTarget): boolean {
  switch (assignment.scopeType) {
    case "global":
      return true;
    case "operator":
      return !!target.operatorId && target.operatorId === assignment.scopeId;
    case "kitchen":
      return !!target.kitchenId && target.kitchenId === assignment.scopeId;
    case "organisation":
      return (
        !!target.organisationId &&
        target.organisationId === assignment.scopeId
      );
    default:
      return false;
  }
}

function assignmentGrants(
  assignment: RoleAssignment,
  capability: Capability,
): boolean {
  if (assignment.role === "super_admin") return true;
  return ROLE_CAPABILITIES[assignment.role]?.includes(capability) ?? false;
}

/**
 * Core authorization predicate. Returns true iff the principal holds a role
 * that grants `capability` AND whose scope covers `target`.
 *
 * Authorization is always evaluated here on the server; the UI may hide
 * actions but never decides access.
 */
export function can(
  principal: Principal,
  capability: Capability,
  target: AuthTarget = {},
): boolean {
  return principal.assignments.some(
    (a) => assignmentGrants(a, capability) && scopeCovers(a, target),
  );
}

/** Throwing variant of {@link can}. Use at the top of every mutating action. */
export function assertCan(
  principal: Principal,
  capability: Capability,
  target: AuthTarget = {},
): void {
  if (!can(principal, capability, target)) {
    throw new AuthorizationError(capability);
  }
}

/** True if the principal is an operator-side actor (admin or staff) anywhere. */
export function isAdminPrincipal(principal: Principal): boolean {
  return principal.assignments.some(
    (a) =>
      a.role === "super_admin" ||
      a.role === "kitchen_admin" ||
      a.role === "staff",
  );
}

/** True if the principal is a customer-side actor anywhere. */
export function isCustomerPrincipal(principal: Principal): boolean {
  return principal.assignments.some(
    (a) => a.role === "customer_owner" || a.role === "customer_member",
  );
}

/** Organisation ids this principal belongs to (for tenant-scoped queries). */
export function organisationIdsFor(principal: Principal): string[] {
  return principal.assignments
    .filter((a) => a.scopeType === "organisation" && a.scopeId)
    .map((a) => a.scopeId as string);
}
