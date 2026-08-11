import Link from "next/link";
import { listWeeks, getActiveWeek, getWeekItems } from "@/lib/db/weeks-db";
import { getCustomer } from "@/lib/db/customers-db";
import { getSettings } from "@/lib/db/settings-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { OrderForm } from "@/components/orders/OrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const weeks = listWeeks();
  const activeWeek = getActiveWeek();
  const weekItems = activeWeek ? getWeekItems(activeWeek.id) : [];
  const settings = getSettings();
  const preselectedCustomer = customerId ? getCustomer(Number(customerId)) : null;

  if (weeks.length === 0) {
    return (
      <div>
        <PageHeader title="New Order" />
        <div className="card p-6 text-center text-gray-500">
          <p>You need an operating week before you can take orders.</p>
          <Link href="/weekly-menu" className="btn-primary mt-3 inline-flex">
            Create a Weekly Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New Order"
        subtitle="Select a customer, set quantities, and save. Use Save & New Order to keep entering orders quickly."
      />
      <OrderForm
        mode="create"
        weeks={weeks}
        initialWeek={activeWeek}
        initialWeekItems={weekItems}
        defaultDeliveryFeeCents={settings.defaultDeliveryFeeCents}
        orderPrefixPreview={settings.orderPrefix}
        preselectedCustomer={preselectedCustomer}
      />
    </div>
  );
}
