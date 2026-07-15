import { requireCustomer } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db/client";
import { listOrganisationsForPrincipal } from "@/lib/repositories/organisations";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PortalDashboardPage() {
  const principal = await requireCustomer();
  const db = getDb();
  const orgs = await listOrganisationsForPrincipal(db, principal);
  const businessName = orgs[0]?.name;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {businessName ? `Welcome, ${businessName}` : "Welcome"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your kitchen bookings, storage, documents and invoices will live here.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Booking opens in Phase 5.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The onboarding checklist arrives in Phase 4.
            </p>
          </CardContent>
        </Card>
      </div>

      <EmptyState
        icon={CalendarCheck}
        title="Nothing scheduled yet"
        description="Once bookings are enabled you'll see your upcoming kitchen sessions, check-in shortcuts and reminders here."
      />
    </div>
  );
}
