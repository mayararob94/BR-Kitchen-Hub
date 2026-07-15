/** The five foundational roles from the brief. */
export type Role =
  | "super_admin"
  | "kitchen_admin"
  | "staff"
  | "customer_owner"
  | "customer_member";

/** The tenant slice a role assignment is bound to. */
export type ScopeType = "global" | "operator" | "kitchen" | "organisation";

/** A single role granted to a user within a scope. */
export interface RoleAssignment {
  role: Role;
  scopeType: ScopeType;
  /** Null only for `global` scope. */
  scopeId: string | null;
}

/**
 * The tenant target of an authorization check. A capability is granted only
 * when a matching role's scope covers the relevant dimension(s) here.
 */
export interface AuthTarget {
  operatorId?: string;
  kitchenId?: string;
  organisationId?: string;
}

/** The authenticated principal resolved on the server for every request. */
export interface Principal {
  userId: string;
  email: string;
  assignments: RoleAssignment[];
}
