import { LabelDocument } from "@/components/print/LabelDocument";
import { PrintControls } from "@/components/PrintControls";
import { resolveOrders, type PrintSelectParams } from "@/lib/print-select";

export const dynamic = "force-dynamic";

export default async function BulkLabelsPage({
  searchParams,
}: {
  searchParams: Promise<PrintSelectParams>;
}) {
  const params = await searchParams;
  const orders = resolveOrders(params);

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintControls mode="label" backHref="/labels" title={`${orders.length} labels`} />
      {orders.length === 0 ? (
        <div className="p-10 text-center text-gray-400">No orders selected.</div>
      ) : (
        orders.map((o) => <LabelDocument key={o.id} order={o} />)
      )}
    </div>
  );
}
