import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getRoleAssignments, findUserById } from "@/lib/repositories/users";
import type { Principal } from "@/lib/rbac/types";
import { isAdminPrincipal, isCustomerPrincipal } from "@/lib/rbac/authorize";
import { SESSION_COOKIE_NAME, verifySession } from "./session";

/**
 * Resolve the authenticated principal from the session cookie. Identity is
 * derived entirely from the signed cookie + database — never from any
 * client-supplied user id. Returns null when unauthenticated.
 */
export async function getPrincipal(): Promise<Principal | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const db = getDb();
  const user = await findUserById(db, session.sub);
  if (!user || user.status === "suspended") return null;

  const assignments = await getRoleAssignments(db, user.id);
  return { userId: user.id, email: user.email, assignments };
}

/** Require any authenticated user, else redirect to login. */
export async function requirePrincipal(returnTo?: string): Promise<Principal> {
  const principal = await getPrincipal();
  if (!principal) {
    redirect(`/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`);
  }
  return principal;
}

/** Require an operator-side (admin/staff) principal, else redirect. */
export async function requireAdmin(): Promise<Principal> {
  const principal = await requirePrincipal("/admin");
  if (!isAdminPrincipal(principal)) redirect("/portal");
  return principal;
}

/** Require a customer-side principal, else redirect. */
export async function requireCustomer(): Promise<Principal> {
  const principal = await requirePrincipal("/portal");
  if (!isCustomerPrincipal(principal)) redirect("/admin");
  return principal;
}
