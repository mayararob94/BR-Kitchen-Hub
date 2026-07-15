/**
 * Navigation configuration for the admin panel and customer portal.
 *
 * Each item declares the phase it becomes functional in. In Phase 1 only the
 * dashboards are live; every other destination renders an honest "coming in
 * Phase N" placeholder rather than a dead link or a fake screen. `enabled`
 * gates whether the item is a real link yet.
 */
export type IconName =
  | "dashboard"
  | "building"
  | "users"
  | "leads"
  | "tours"
  | "proposals"
  | "calendar"
  | "bookings"
  | "storage"
  | "documents"
  | "contracts"
  | "checkin"
  | "checkout"
  | "photos"
  | "maintenance"
  | "equipment"
  | "invoices"
  | "payments"
  | "reports"
  | "notifications"
  | "settings"
  | "audit"
  | "business"
  | "team"
  | "support";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  phase: number;
  enabled: boolean;
}

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "dashboard", phase: 1, enabled: true },
  { label: "Kitchens", href: "/admin/kitchens", icon: "building", phase: 1, enabled: false },
  { label: "Leads", href: "/admin/leads", icon: "leads", phase: 3, enabled: false },
  { label: "Tours", href: "/admin/tours", icon: "tours", phase: 3, enabled: false },
  { label: "Proposals", href: "/admin/proposals", icon: "proposals", phase: 4, enabled: false },
  { label: "Customers", href: "/admin/customers", icon: "users", phase: 4, enabled: false },
  { label: "Bookings", href: "/admin/bookings", icon: "bookings", phase: 5, enabled: false },
  { label: "Calendar", href: "/admin/calendar", icon: "calendar", phase: 5, enabled: false },
  { label: "Storage", href: "/admin/storage", icon: "storage", phase: 6, enabled: false },
  { label: "Documents", href: "/admin/documents", icon: "documents", phase: 7, enabled: false },
  { label: "Contracts", href: "/admin/contracts", icon: "contracts", phase: 7, enabled: false },
  { label: "Check-ins", href: "/admin/check-ins", icon: "checkin", phase: 8, enabled: false },
  { label: "Check-outs", href: "/admin/check-outs", icon: "checkout", phase: 8, enabled: false },
  { label: "Maintenance", href: "/admin/maintenance", icon: "maintenance", phase: 9, enabled: false },
  { label: "Equipment", href: "/admin/equipment", icon: "equipment", phase: 9, enabled: false },
  { label: "Invoices", href: "/admin/invoices", icon: "invoices", phase: 10, enabled: false },
  { label: "Payments", href: "/admin/payments", icon: "payments", phase: 10, enabled: false },
  { label: "Reports", href: "/admin/reports", icon: "reports", phase: 11, enabled: false },
  { label: "Settings", href: "/admin/settings", icon: "settings", phase: 1, enabled: false },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: "audit", phase: 1, enabled: false },
];

export const PORTAL_NAV: NavItem[] = [
  { label: "Dashboard", href: "/portal", icon: "dashboard", phase: 1, enabled: true },
  { label: "My Business", href: "/portal/my-business", icon: "business", phase: 4, enabled: false },
  { label: "Team", href: "/portal/team", icon: "team", phase: 4, enabled: false },
  { label: "Bookings", href: "/portal/bookings", icon: "bookings", phase: 5, enabled: false },
  { label: "Storage", href: "/portal/storage", icon: "storage", phase: 6, enabled: false },
  { label: "Documents", href: "/portal/documents", icon: "documents", phase: 7, enabled: false },
  { label: "Contracts", href: "/portal/contracts", icon: "contracts", phase: 7, enabled: false },
  { label: "Invoices", href: "/portal/invoices", icon: "invoices", phase: 10, enabled: false },
  { label: "Maintenance", href: "/portal/maintenance", icon: "maintenance", phase: 9, enabled: false },
  { label: "Support", href: "/portal/support", icon: "support", phase: 11, enabled: false },
  { label: "Settings", href: "/portal/settings", icon: "settings", phase: 1, enabled: false },
];
