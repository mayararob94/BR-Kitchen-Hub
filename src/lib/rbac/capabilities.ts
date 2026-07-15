import type { Role } from "./types";

/**
 * Capabilities are the atomic permissions checked in services before any
 * data access. Grouped by domain. This list grows as later phases add
 * modules; the RBAC engine ({@link ../rbac/authorize}) does not need to
 * change when it does.
 */
export const CAPABILITIES = [
  // Platform / operator administration
  "operator.manage",
  "kitchen.manage",
  "settings.manage",
  "user.manage",
  "role.assign",
  "audit.read",

  // CRM / operations (added surfaces land in later phases)
  "lead.read",
  "lead.manage",
  "tour.read",
  "tour.manage",
  "booking.read",
  "booking.manage",
  "storage.manage",
  "maintenance.read",
  "maintenance.manage",

  // Customer-facing
  "org.read",
  "org.manage",
  "org.member.invite",
  "booking.create",
  "checkin.perform",
  "checkout.perform",
  "document.read",
  "document.upload",
  "invoice.read",
  "payment.perform",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * Role → capability grants. Scope (which kitchen / organisation) is enforced
 * separately by {@link ../rbac/authorize#can}; this map only says *what* a
 * role may do, not *where*.
 *
 * `super_admin` is intentionally omitted here — it is granted every
 * capability unconditionally in the engine.
 */
export const ROLE_CAPABILITIES: Record<Exclude<Role, "super_admin">, Capability[]> = {
  kitchen_admin: [
    "kitchen.manage",
    "settings.manage",
    "user.manage",
    "role.assign",
    "audit.read",
    "lead.read",
    "lead.manage",
    "tour.read",
    "tour.manage",
    "booking.read",
    "booking.manage",
    "storage.manage",
    "maintenance.read",
    "maintenance.manage",
    "org.read",
    "document.read",
    "invoice.read",
  ],
  staff: [
    "lead.read",
    "tour.read",
    "booking.read",
    "maintenance.read",
    "maintenance.manage",
    "checkin.perform",
    "checkout.perform",
    "document.read",
  ],
  customer_owner: [
    "org.read",
    "org.manage",
    "org.member.invite",
    "booking.read",
    "booking.create",
    "checkin.perform",
    "checkout.perform",
    "document.read",
    "document.upload",
    "invoice.read",
    "payment.perform",
    "maintenance.read",
    "maintenance.manage",
  ],
  customer_member: [
    "org.read",
    "booking.read",
    "booking.create",
    "checkin.perform",
    "checkout.perform",
    "document.read",
    "maintenance.read",
  ],
};
