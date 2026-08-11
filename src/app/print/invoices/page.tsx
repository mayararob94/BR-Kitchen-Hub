import { ensureInvoiceNumber, getOrder } from "@/lib/db/orders-db";
import { getSettings } from "@/lib/db/settings-db";
import { buildInvoiceData } from "@/lib/invoice";
import { InvoiceDocument } from "@/components/print/InvoiceDocument";
import { PrintControls } from "@/components/PrintControls";
import { resolveOrders, type PrintSelectParams } from "@/lib/print-select";

export const dynamic = "force-dynamic";

export default async function BulkInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<PrintSelectParams>;
}) {
  const params = await searchParams;
  const settings = getSettings();
  const orders = resolveOrders(params);

  const docs = orders.map((o) => {
    const invoiceNumber = ensureInvoiceNumber(o.id) ?? "";
    const fresh = getOrder(o.id)!;
    return buildInvoiceData(fresh, settings, invoiceNumber);
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintControls mode="a4" backHref="/invoices" title={`${docs.length} invoices`} />
      {docs.length === 0 ? (
        <div className="p-10 text-center text-gray-400">No orders selected.</div>
      ) : (
        docs.map((d) => <InvoiceDocument key={d.invoiceNumber} data={d} />)
      )}
    </div>
  );
}
