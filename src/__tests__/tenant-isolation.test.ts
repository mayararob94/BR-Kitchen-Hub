// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, type TestDb } from "./helpers/test-db";
import {
  findOrganisationForPrincipal,
  listOrganisationsForPrincipal,
} from "@/lib/repositories/organisations";
import type { Principal } from "@/lib/rbac/types";

let db: TestDb;

beforeEach(() => {
  db = createTestDb();
  db.exec(`
    INSERT INTO operators (id, name) VALUES ('op1', 'Op One'), ('op2', 'Op Two');
    INSERT INTO organisations (id, operator_id, name, status) VALUES
      ('orgA', 'op1', 'Alpha Catering', 'active'),
      ('orgB', 'op1', 'Bravo Bakery', 'active'),
      ('orgC', 'op2', 'Charlie Foods', 'active');
  `);
});

function customerOf(orgId: string): Principal {
  return {
    userId: "u_cust",
    email: "cust@x.com",
    assignments: [
      { role: "customer_owner", scopeType: "organisation", scopeId: orgId },
    ],
  };
}

describe("Tenant isolation — organisations repository", () => {
  it("a customer can read their own organisation", async () => {
    const org = await findOrganisationForPrincipal(db, customerOf("orgA"), "orgA");
    expect(org?.id).toBe("orgA");
  });

  it("a customer CANNOT read another organisation", async () => {
    const org = await findOrganisationForPrincipal(db, customerOf("orgA"), "orgB");
    expect(org).toBeNull();
  });

  it("a customer listing returns only their organisations", async () => {
    const list = await listOrganisationsForPrincipal(db, customerOf("orgA"));
    expect(list.map((o) => o.id)).toEqual(["orgA"]);
  });

  it("super_admin can read any organisation", async () => {
    const superAdmin: Principal = {
      userId: "u_super",
      email: "super@x.com",
      assignments: [{ role: "super_admin", scopeType: "global", scopeId: null }],
    };
    expect((await findOrganisationForPrincipal(db, superAdmin, "orgC"))?.id).toBe("orgC");
    const all = await listOrganisationsForPrincipal(db, superAdmin);
    expect(all.map((o) => o.id).sort()).toEqual(["orgA", "orgB", "orgC"]);
  });

  it("an operator-scoped admin only sees organisations under that operator", async () => {
    const op1Admin: Principal = {
      userId: "u_admin",
      email: "admin@x.com",
      assignments: [{ role: "kitchen_admin", scopeType: "operator", scopeId: "op1" }],
    };
    expect((await findOrganisationForPrincipal(db, op1Admin, "orgA"))?.id).toBe("orgA");
    expect((await findOrganisationForPrincipal(db, op1Admin, "orgB"))?.id).toBe("orgB");
    // orgC belongs to op2 — must be invisible.
    expect(await findOrganisationForPrincipal(db, op1Admin, "orgC")).toBeNull();
  });
});
