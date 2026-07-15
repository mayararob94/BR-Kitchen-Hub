import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const METRICS = [
  { label: "Open leads", phase: 3 },
  { label: "Upcoming tours", phase: 3 },
  { label: "Active customers", phase: 4 },
  { label: "Upcoming bookings", phase: 5 },
  { label: "Outstanding invoices", phase: 10 },
  { label: "Open maintenance", phase: 9 },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operations overview. Live metrics switch on as each module ships.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map((m) => (
          <Card key={m.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.label}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                Phase {m.phase}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-muted-foreground/60">
                —
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                No data yet — arrives with the module.
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-lg border border-dashed bg-card/50 p-6">
        <h2 className="text-sm font-semibold">Foundation is live</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Authentication, roles &amp; permissions, tenant-scoped data access,
          settings and the audit log are in place. The left navigation lists the
          modules planned for later phases; each is marked with the phase it
          becomes available.
        </p>
      </section>
    </div>
  );
}
