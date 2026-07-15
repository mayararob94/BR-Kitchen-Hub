"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserSearch,
  CalendarClock,
  FileText,
  FileSignature,
  CalendarDays,
  CalendarCheck,
  Boxes,
  LogIn,
  LogOut,
  Camera,
  Wrench,
  Refrigerator,
  ReceiptText,
  CreditCard,
  BarChart3,
  Bell,
  Settings,
  ScrollText,
  Store,
  UsersRound,
  LifeBuoy,
  ChefHat,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { IconName, NavItem } from "@/lib/navigation";
import { logoutAction } from "@/lib/auth/actions";

const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  building: Building2,
  users: Users,
  leads: UserSearch,
  tours: CalendarClock,
  proposals: FileText,
  calendar: CalendarDays,
  bookings: CalendarCheck,
  storage: Boxes,
  documents: FileText,
  contracts: FileSignature,
  checkin: LogIn,
  checkout: LogOut,
  photos: Camera,
  maintenance: Wrench,
  equipment: Refrigerator,
  invoices: ReceiptText,
  payments: CreditCard,
  reports: BarChart3,
  notifications: Bell,
  settings: Settings,
  audit: ScrollText,
  business: Store,
  team: UsersRound,
  support: LifeBuoy,
};

interface AppShellProps {
  navItems: NavItem[];
  areaLabel: string;
  userEmail: string;
  children: React.ReactNode;
}

export function AppShell({ navItems, areaLabel, userEmail, children }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const Icon = ICONS[item.icon];
        const active =
          pathname === item.href ||
          (item.href !== "/admin" &&
            item.href !== "/portal" &&
            pathname.startsWith(`${item.href}/`));

        if (!item.enabled) {
          return (
            <div
              key={item.href}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/70"
              title={`Available in Phase ${item.phase}`}
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4" aria-hidden />
                {item.label}
              </span>
              <Badge variant="outline" className="text-[10px]">
                P{item.phase}
              </Badge>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-secondary",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="hidden border-r bg-card md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ChefHat className="size-4" aria-hidden />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">BR Kitchen Hub</div>
            <div className="text-xs text-muted-foreground">{areaLabel}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{nav}</div>
        <SidebarFooter userEmail={userEmail} />
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ChefHat className="size-4" aria-hidden />
            </div>
            <span className="text-sm font-semibold">BR Kitchen Hub</span>
          </div>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 hover:bg-secondary"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </header>

        {open ? (
          <div className="border-b bg-card p-3 md:hidden">
            {nav}
            <SidebarFooter userEmail={userEmail} />
          </div>
        ) : null}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarFooter({ userEmail }: { userEmail: string }) {
  return (
    <div className="border-t p-3">
      <div className="truncate px-3 py-1 text-xs text-muted-foreground" title={userEmail}>
        {userEmail}
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );
}
