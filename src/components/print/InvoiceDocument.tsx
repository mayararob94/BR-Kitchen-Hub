import type { InvoiceData } from "@/types";
import { formatMoney } from "@/lib/money";
import { formatDate, formatPhone } from "@/lib/format";

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "UNPAID",
  paid: "PAID",
  partial: "PARTIALLY PAID",
};

/**
 * A4 invoice. Rendered inside a .print-page so bulk printing puts each invoice
 * on its own page. No external assets beyond the logo.
 */
export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const b = data.business;
  return (
    <div className="print-page mx-auto my-4 w-[210mm] max-w-full bg-white p-[16mm] text-gray-900 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-brand-600 pb-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={56} height={56} className="rounded" />
          <div>
            <div className="font-display text-2xl font-semibold text-brand-700">
              {b.businessName || "MEALzinha"}
            </div>
            {b.tradingName && b.tradingName !== b.businessName && (
              <div className="text-sm text-gray-500">{b.tradingName}</div>
            )}
            {b.abn && <div className="text-xs text-gray-500">ABN {b.abn}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-semibold text-gray-800">INVOICE</div>
          <div className="mt-1 text-sm">
            <div>
              <span className="text-gray-500">Invoice #</span>{" "}
              <span className="font-medium">{data.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-gray-500">Order #</span> {data.orderNumber}
            </div>
            <div>
              <span className="text-gray-500">Date</span> {formatDate(data.invoiceDate)}
            </div>
            {data.deliveryDate && (
              <div>
                <span className="text-gray-500">Delivery</span>{" "}
                {formatDate(data.deliveryDate)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="mt-5 grid grid-cols-2 gap-6 text-sm">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Bill To
          </div>
          <div className="font-medium">{data.customer.name}</div>
          {data.customer.addressLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {data.customer.phone && <div>{formatPhone(data.customer.phone)}</div>}
          {data.customer.email && <div>{data.customer.email}</div>}
        </div>
        <div className="text-right">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            From
          </div>
          {b.address && <div>{b.address}</div>}
          {b.phone && <div>{formatPhone(b.phone)}</div>}
          {b.email && <div>{b.email}</div>}
          {b.website && <div>{b.website}</div>}
        </div>
      </div>

      {/* Items */}
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2">Qty</th>
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Unit Price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((it, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2">{it.quantity}</td>
              <td className="py-2">{it.mealName}</td>
              <td className="py-2 text-right">{formatMoney(it.unitPriceCents)}</td>
              <td className="py-2 text-right">{formatMoney(it.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatMoney(data.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Delivery</span>
            <span>{formatMoney(data.deliveryFeeCents)}</span>
          </div>
          {data.discountCents > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Discount</span>
              <span>−{formatMoney(data.discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-300 pt-1 text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(data.totalCents)}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-gray-500">Payment Status</span>
            <span className="font-semibold">
              {PAYMENT_LABEL[data.paymentStatus] ?? data.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Payment details */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
        <div className="mb-1 font-semibold text-gray-700">
          Payment Method — BANK TRANSFER
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          {data.bank.accountName && (
            <div>
              <span className="text-gray-500">Account Name:</span>{" "}
              {data.bank.accountName}
            </div>
          )}
          {data.bank.bsb && (
            <div>
              <span className="text-gray-500">BSB:</span> {data.bank.bsb}
            </div>
          )}
          {data.bank.accountNumber && (
            <div>
              <span className="text-gray-500">Account Number:</span>{" "}
              {data.bank.accountNumber}
            </div>
          )}
        </div>
        {data.bank.paymentInstructions && (
          <div className="mt-2 text-gray-600">{data.bank.paymentInstructions}</div>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-gray-400">
        Thank you for your order · {b.businessName || "MEALzinha"}
      </div>
    </div>
  );
}
