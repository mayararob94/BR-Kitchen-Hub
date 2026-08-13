import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db/orders-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatMoney } from "@/lib/money";
import { formatDate, formatPhone } from "@/lib/format";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/Badges";
import { OrderQuickControls } from "./OrderQuickControls";

export const dynamic = "force-dynamic";

export default async function OrderViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getOrder(Number(id));
  if (!order) notFound();

  const addressLines = [
    order.addressLine1,
    order.addressLine2,
    [order.suburb, order.state, order.postcode].filter(Boolean).join(" "),
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        subtitle={
          order.invoiceNumber ? `Invoice ${order.invoiceNumber}` : "No invoice yet"
        }
        actions={
          <>
            <Link href={`/orders/${order.id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <a href={`/print/invoice/${order.id}`} target="_blank" className="btn-secondary">
              Print Invoice
            </a>
            <a href={`/print/label/${order.id}`} target="_blank" className="btn-primary">
              Print Label
            </a>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 p-3">
              <h3 className="text-sm font-semibold text-gray-700">Items</h3>
              <span className="text-sm text-gray-500">{order.totalMeals} meals</span>
            </div>
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="th text-center">Qty</th>
                  <th className="th">Item</th>
                  <th className="th text-right">Unit</th>
                  <th className="th text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td className="td text-center">{it.quantity}</td>
                    <td className="td">{it.mealNameSnapshot}</td>
                    <td className="td text-right">{formatMoney(it.unitPriceCents)}</td>
                    <td className="td text-right">{formatMoney(it.lineTotalCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-100">
                <tr>
                  <td colSpan={3} className="td text-right text-gray-500">
                    Subtotal
                  </td>
                  <td className="td text-right">{formatMoney(order.subtotalCents)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="td text-right text-gray-500">
                    Delivery
                  </td>
                  <td className="td text-right">{formatMoney(order.deliveryFeeCents)}</td>
                </tr>
                {order.discountCents > 0 && (
                  <tr>
                    <td colSpan={3} className="td text-right text-gray-500">
                      Discount
                    </td>
                    <td className="td text-right">−{formatMoney(order.discountCents)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="td text-right font-semibold text-gray-900">
                    Total
                  </td>
                  <td className="td text-right font-semibold text-gray-900">
                    {formatMoney(order.totalCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {order.notes && (
            <div className="card p-4">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Order Notes
              </h3>
              <p className="whitespace-pre-wrap text-sm text-gray-800">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Delivery
            </h3>
            <div className="space-y-0.5 text-sm text-gray-800">
              <div className="font-medium">{order.customerName}</div>
              {addressLines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
              <div>{formatPhone(order.customerPhone)}</div>
              <div className="pt-1 text-gray-500">
                Delivery date:{" "}
                <span className="text-gray-900">{formatDate(order.deliveryDate)}</span>
              </div>
              {order.deliveryInstructions && (
                <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-amber-800">
                  {order.deliveryInstructions}
                </div>
              )}
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </span>
              <OrderStatusBadge status={order.orderStatus} />
            </div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payment
              </span>
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
            <OrderQuickControls
              orderId={order.id}
              orderStatus={order.orderStatus}
              paymentStatus={order.paymentStatus}
              totalCents={order.totalCents}
              paymentReference={order.paymentReference}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
