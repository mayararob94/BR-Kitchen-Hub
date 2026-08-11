import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db/orders-db";
import { LabelDocument } from "@/components/print/LabelDocument";
import { PrintControls } from "@/components/PrintControls";

export const dynamic = "force-dynamic";

export default async function PrintLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getOrder(Number(id));
  if (!order) notFound();

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintControls mode="label" backHref={`/orders/${order.id}`} title={`Label ${order.orderNumber}`} />
      <LabelDocument order={order} />
    </div>
  );
}
