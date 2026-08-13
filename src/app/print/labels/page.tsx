import { LabelDocument } from "@/components/print/LabelDocument";
import { PrintControls } from "@/components/PrintControls";
import { getSettings } from "@/lib/db/settings-db";
import { resolveOrders, type PrintSelectParams } from "@/lib/print-select";

export const dynamic = "force-dynamic";

export default async function BulkLabelsPage({
  searchParams,
}: {
  searchParams: Promise<PrintSelectParams>;
}) {
  const params = await searchParams;
  const orders = resolveOrders(params);
  const s = getSettings();
  const business = { name: s.businessName, website: s.website };

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintControls mode="label" backHref="/labels" title={`${orders.length} labels`} />
      {orders.length === 0 ? (
        <div className="p-10 text-center text-gray-400">No orders selected.</div>
      ) : (
        orders.map((o) => <LabelDocument key={o.id} order={o} business={business} />)
      )}
    </div>
  );
}
