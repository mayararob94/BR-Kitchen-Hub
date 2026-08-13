import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db/orders-db";
import { listWeeks, getWeek, getWeekItems } from "@/lib/db/weeks-db";
import { getSettings } from "@/lib/db/settings-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { OrderForm } from "@/components/orders/OrderForm";

export const dynamic = "force-dynamic";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getOrder(Number(id));
  if (!order) notFound();

  const weeks = listWeeks();
  const week = order.weeklyMenuId ? getWeek(order.weeklyMenuId) : null;
  const weekItems = order.weeklyMenuId ? getWeekItems(order.weeklyMenuId) : [];
  const settings = getSettings();

  return (
    <div>
      <PageHeader title={`Edit ${order.orderNumber}`} />
      <OrderForm
        mode="edit"
        order={order}
        weeks={weeks}
        initialWeek={week}
        initialWeekItems={weekItems}
        defaultDeliveryFeeCents={settings.defaultDeliveryFeeCents}
        orderPrefixPreview={settings.orderPrefix}
      />
    </div>
  );
}
