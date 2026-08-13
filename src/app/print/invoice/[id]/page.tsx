import { notFound } from "next/navigation";
import { getOrder, ensureInvoiceNumber } from "@/lib/db/orders-db";
import { getSettings } from "@/lib/db/settings-db";
import { buildInvoiceData } from "@/lib/invoice";
import { InvoiceDocument } from "@/components/print/InvoiceDocument";
import { PrintControls } from "@/components/PrintControls";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  // Assign a permanent invoice number on first print (idempotent).
  const invoiceNumber = ensureInvoiceNumber(orderId);
  const order = getOrder(orderId);
  if (!order || !invoiceNumber) notFound();

  const settings = getSettings();
  const data = buildInvoiceData(order, settings, invoiceNumber);

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintControls mode="a4" backHref={`/orders/${orderId}`} title={`Invoice ${invoiceNumber}`} />
      <InvoiceDocument data={data} />
    </div>
  );
}
