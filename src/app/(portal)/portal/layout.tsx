import { requireCustomer } from "@/lib/auth/current-user";
import { AppShell } from "@/components/app-shell";
import { PORTAL_NAV } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const principal = await requireCustomer();
  return (
    <AppShell navItems={PORTAL_NAV} areaLabel="Customer portal" userEmail={principal.email}>
      {children}
    </AppShell>
  );
}
