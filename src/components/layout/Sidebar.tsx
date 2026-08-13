"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Users,
  UtensilsCrossed,
  CalendarRange,
  FileText,
  Truck,
  Settings,
  Carrot,
  ChefHat,
  Factory,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders/new", label: "New Order", icon: PlusCircle, accent: true },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/ingredients", label: "Ingredients", icon: Carrot },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/weekly-menu", label: "Weekly Menu", icon: CalendarRange },
  { href: "/production", label: "Production", icon: Factory },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/labels", label: "Delivery / Labels", icon: Truck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-chrome flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center border-b border-gray-100 px-4 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="MEALzinha" className="h-12 w-auto" />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV.map(({ href, label, icon: Icon, accent }) => {
          const active =
            href === "/orders"
              ? pathname === "/orders" || /^\/orders\/(?!new)/.test(pathname)
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : accent
                    ? "text-brand-600 hover:bg-brand-50"
                    : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-100 px-4 py-3 text-[10px] text-gray-400">
        Local · Offline · v1.0
      </div>
    </aside>
  );
}
