import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer, getCustomerStats } from "@/lib/db/customers-db";
import { listOrders } from "@/lib/db/orders-db";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatMoney } from "@/lib/money";
import { formatDate, formatPhone } from "@/lib/format";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/Badges";
import { CustomerProfileActions } from "./CustomerProfileActions";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = getCustomer(Number(id));
  if (!customer) notFound();

  const stats = getCustomerStats(customer.id);
  const orders = listOrders({ customerId: customer.id });

  const addressLines = [
    customer.addressLine1,
    customer.addressLine2,
    [customer.suburb, customer.state, customer.postcode].filter(Boolean).join(" "),
  ].filter(Boolean);

  const windowLabel =
    { morning: "Morning", afternoon: "Afternoon", anytime: "Anytime", "": "—" }[
      customer.deliveryWindow
    ] ?? "—";
  const prefLabel =
    {
      home: "I will be home",
      safe_place: "Leave in a safe place",
      "": "—",
    }[customer.deliveryPreference] ?? "—";

  return (
    <div>
      <PageHeader
        title={customer.fullName}
        subtitle={customer.isActive ? "Active customer" : "Inactive customer"}
        actions={
          <CustomerProfileActions customer={customer} />
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Contact
          </h3>
          <dl className="space-y-1 text-sm">
            <div>
              <dt className="inline text-gray-500">Phone: </dt>
              <dd className="inline text-gray-900">{formatPhone(customer.phone) || "—"}</dd>
            </div>
            <div>
              <dt className="inline text-gray-500">Email: </dt>
              <dd className="inline text-gray-900">{customer.email || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Delivery
          </h3>
          <div className="space-y-1 text-sm text-gray-900">
            {addressLines.length ? (
              addressLines.map((l, i) => <div key={i}>{l}</div>)
            ) : (
              <div className="text-gray-400">No address</div>
            )}
            <div className="pt-1 text-gray-500">
              Window: <span className="text-gray-900">{windowLabel}</span>
            </div>
            <div className="text-gray-500">
              Preference: <span className="text-gray-900">{prefLabel}</span>
            </div>
            {customer.deliveryInstructions && (
              <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-amber-800">
                {customer.deliveryInstructions}
              </div>
            )}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Lifetime
          </h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Total orders</dt>
              <dd className="font-medium text-gray-900">{stats.totalOrders}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Total meals</dt>
              <dd className="font-medium text-gray-900">{stats.totalMeals}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Total spent</dt>
              <dd className="font-medium text-gray-900">
                {formatMoney(stats.totalSpentCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last order</dt>
              <dd className="font-medium text-gray-900">
                {formatDate(stats.lastOrderDate)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {customer.notes && (
        <div className="card mt-4 p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Notes
          </h3>
          <p className="whitespace-pre-wrap text-sm text-gray-800">{customer.notes}</p>
        </div>
      )}

      <div className="card mt-4 overflow-hidden">
        <h3 className="border-b border-gray-100 p-3 text-sm font-semibold text-gray-700">
          Order History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">Order #</th>
                <th className="th">Delivery</th>
                <th className="th">Meals</th>
                <th className="th">Total</th>
                <th className="th">Payment</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="td">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="td">{formatDate(o.deliveryDate)}</td>
                  <td className="td">{o.totalMeals}</td>
                  <td className="td">{formatMoney(o.totalCents)}</td>
                  <td className="td">
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="td">
                    <OrderStatusBadge status={o.orderStatus} />
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td className="td py-6 text-center text-gray-400" colSpan={6}>
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
