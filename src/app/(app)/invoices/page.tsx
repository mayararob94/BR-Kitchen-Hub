import { listOrders } from "@/lib/db/orders-db";
import { listWeeks, getActiveWeek } from "@/lib/db/weeks-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { BulkPrintPanel } from "@/components/print/BulkPrintPanel";
import { formatWeekRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; date?: string }>;
}) {
  const { week, date } = await searchParams;
  const weeks = listWeeks();

  const activeWeekId = getActiveWeek()?.id;
  const effectiveWeek = week ?? (date ? undefined : activeWeekId?.toString());

  const orders = date
    ? listOrders({ deliveryDate: date })
    : effectiveWeek
      ? listOrders({ weekId: Number(effectiveWeek) })
      : [];

  const rows = orders
    .filter((o) => o.orderStatus !== "cancelled")
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      invoiceNumber: o.invoiceNumber,
      customerName: o.customerName,
      suburb: o.suburb,
      deliveryDate: o.deliveryDate,
      totalMeals: o.totalMeals,
      totalCents: o.totalCents,
      paymentStatus: o.paymentStatus,
    }));

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Print a single invoice or all invoices for a week/delivery date (A4, one per page)."
      />
      <BulkPrintPanel
        rows={rows}
        weeks={weeks.map((w) => ({
          id: w.id,
          label: formatWeekRange(w.weekStart, w.weekEnd),
        }))}
        kind="invoice"
        currentWeek={effectiveWeek}
        currentDate={date}
      />
    </div>
  );
}
