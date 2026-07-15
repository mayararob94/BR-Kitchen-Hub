import { requireAdmin } from "@/lib/auth/current-user";
import { AppShell } from "@/components/app-shell";
import { ADMIN_NAV } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const principal = await requireAdmin();
  return (
    <AppShell navItems={ADMIN_NAV} areaLabel="Admin panel" userEmail={principal.email}>
      {children}
    </AppShell>
  );
}
