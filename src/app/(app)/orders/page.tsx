import { listOrders } from "@/lib/db/orders-db";
import { listWeeks } from "@/lib/db/weeks-db";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { OrdersTable } from "./OrdersTable";
import { formatWeekRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function OrdersPage() {
  const orders = listOrders();
  const weeks = listWeeks();

  const suburbs = [...new Set(orders.map((o) => o.suburb).filter(Boolean))].sort();

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
        actions={
          <Link href="/orders/new" className="btn-primary">
            New Order
          </Link>
        }
      />
      <OrdersTable
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          invoiceNumber: o.invoiceNumber,
          customerName: o.customerName,
          suburb: o.suburb,
          deliveryDate: o.deliveryDate,
          weekId: o.weeklyMenuId,
          totalMeals: o.totalMeals,
          subtotalCents: o.subtotalCents,
          deliveryFeeCents: o.deliveryFeeCents,
          discountCents: o.discountCents,
          totalCents: o.totalCents,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
        }))}
        weeks={weeks.map((w) => ({
          id: w.id,
          label: formatWeekRange(w.weekStart, w.weekEnd),
          weekStart: w.weekStart,
        }))}
        suburbs={suburbs}
      />
    </div>
  );
}
