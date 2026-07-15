import { describe, it, expect } from "vitest";
import {
  can,
  assertCan,
  AuthorizationError,
  isAdminPrincipal,
  isCustomerPrincipal,
  organisationIdsFor,
} from "@/lib/rbac/authorize";
import type { Principal } from "@/lib/rbac/types";

function principal(assignments: Principal["assignments"]): Principal {
  return { userId: "u1", email: "u@x.com", assignments };
}

describe("RBAC — capabilities and scope", () => {
  it("super_admin (global) can do anything, anywhere", () => {
    const p = principal([{ role: "super_admin", scopeType: "global", scopeId: null }]);
    expect(can(p, "settings.manage")).toBe(true);
    expect(can(p, "booking.manage", { kitchenId: "kX" })).toBe(true);
    expect(can(p, "org.manage", { organisationId: "oX" })).toBe(true);
  });

  it("kitchen_admin only manages the kitchen it is scoped to", () => {
    const p = principal([
      { role: "kitchen_admin", scopeType: "kitchen", scopeId: "kitchenA" },
    ]);
    expect(can(p, "booking.manage", { kitchenId: "kitchenA" })).toBe(true);
    expect(can(p, "booking.manage", { kitchenId: "kitchenB" })).toBe(false);
    // Missing target dimension must NOT pass for a scoped role.
    expect(can(p, "booking.manage")).toBe(false);
  });

  it("kitchen_admin lacks capabilities outside its role set", () => {
    const p = principal([
      { role: "kitchen_admin", scopeType: "kitchen", scopeId: "kitchenA" },
    ]);
    expect(can(p, "payment.perform", { kitchenId: "kitchenA" })).toBe(false);
  });

  it("customer_owner is confined to its own organisation", () => {
    const p = principal([
      { role: "customer_owner", scopeType: "organisation", scopeId: "orgA" },
    ]);
    expect(can(p, "booking.create", { organisationId: "orgA" })).toBe(true);
    expect(can(p, "org.member.invite", { organisationId: "orgA" })).toBe(true);
    // Cross-tenant attempt is denied.
    expect(can(p, "booking.create", { organisationId: "orgB" })).toBe(false);
    expect(can(p, "org.manage", { organisationId: "orgB" })).toBe(false);
  });

  it("customer_member cannot manage billing or invite members", () => {
    const p = principal([
      { role: "customer_member", scopeType: "organisation", scopeId: "orgA" },
    ]);
    expect(can(p, "booking.create", { organisationId: "orgA" })).toBe(true);
    expect(can(p, "org.member.invite", { organisationId: "orgA" })).toBe(false);
    expect(can(p, "payment.perform", { organisationId: "orgA" })).toBe(false);
  });

  it("assertCan throws AuthorizationError on denial", () => {
    const p = principal([
      { role: "customer_member", scopeType: "organisation", scopeId: "orgA" },
    ]);
    expect(() => assertCan(p, "payment.perform", { organisationId: "orgA" })).toThrow(
      AuthorizationError,
    );
    expect(() =>
      assertCan(p, "booking.create", { organisationId: "orgA" }),
    ).not.toThrow();
  });

  it("classifies principals and extracts organisation scopes", () => {
    const admin = principal([
      { role: "kitchen_admin", scopeType: "kitchen", scopeId: "kA" },
    ]);
    const customer = principal([
      { role: "customer_owner", scopeType: "organisation", scopeId: "orgA" },
      { role: "customer_member", scopeType: "organisation", scopeId: "orgB" },
    ]);
    expect(isAdminPrincipal(admin)).toBe(true);
    expect(isCustomerPrincipal(admin)).toBe(false);
    expect(isCustomerPrincipal(customer)).toBe(true);
    expect(organisationIdsFor(customer).sort()).toEqual(["orgA", "orgB"]);
  });
});
