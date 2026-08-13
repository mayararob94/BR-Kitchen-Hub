import type { InvoiceData } from "@/types";
import { formatMoney } from "@/lib/money";
import { formatDate, formatPhone } from "@/lib/format";

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "UNPAID",
  paid: "PAID",
  partial: "PARTIALLY PAID",
};
const PAYMENT_COLOR: Record<string, string> = {
  unpaid: "#c55a1e",
  paid: "#16a34a",
  partial: "#c55a1e",
};

/**
 * A4 invoice matching the MEALzinha brand template: charcoal header band with
 * the logo + business details, BUSINESS / BILL TO / DELIVERY columns, an item
 * table, totals, bank-transfer details and a configurable GST footer note.
 */
export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const b = data.business;
  const hasDelivery = data.customer.addressLines.length > 0;

  return (
    <div className="print-page mx-auto my-4 w-[210mm] max-w-full bg-white text-[#2d2a26] shadow-sm">
      {/* Header band */}
      <div className="flex items-start justify-between bg-[#2d2a26] px-[16mm] py-6 text-white">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={52} height={52} className="rounded bg-white/10 p-1" />
          <div>
            <div className="font-display text-2xl font-semibold leading-none">
              {b.businessName || "MEALzinha"}
            </div>
            {b.tagline && <div className="mt-1 text-sm text-[#ed7531]">{b.tagline}</div>}
            <div className="mt-1 text-[11px] leading-tight text-white/70">
              {[b.address, b.phone && `Ph: ${formatPhone(b.phone)}`, b.email]
                .filter(Boolean)
                .join("  ·  ")}
              {b.abn && <div>ABN: {b.abn}</div>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-bold tracking-wide">INVOICE</div>
          <div className="mt-1 text-lg font-semibold text-[#ed7531]">{data.invoiceNumber}</div>
          <div className="mt-1 text-[11px] text-white/70">
            <div>Date: {formatDate(data.invoiceDate)}</div>
            {data.deliveryDate && <div>Delivery: {formatDate(data.deliveryDate)}</div>}
            <div>Order: {data.orderNumber}</div>
          </div>
        </div>
      </div>

      <div className="px-[16mm] py-6">
        {/* Parties */}
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#ed7531]">
              Business
            </div>
            <div className="font-semibold">{b.businessName}</div>
            {b.abn && <div className="text-[#6b6560]">ABN: {b.abn}</div>}
            {b.email && <div className="text-[#6b6560]">{b.email}</div>}
            {b.phone && <div className="text-[#6b6560]">{formatPhone(b.phone)}</div>}
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#ed7531]">
              Bill To
            </div>
            <div className="font-semibold">{data.customer.name}</div>
            {data.customer.email && <div className="text-[#6b6560]">{data.customer.email}</div>}
            {data.customer.phone && (
              <div className="text-[#6b6560]">{formatPhone(data.customer.phone)}</div>
            )}
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#ed7531]">
              {hasDelivery ? "Delivery" : "Fulfilment"}
            </div>
            {hasDelivery ? (
              data.customer.addressLines.map((l, i) => <div key={i}>{l}</div>)
            ) : (
              <div className="text-[#6b6560]">—</div>
            )}
            {data.deliveryDate && (
              <div className="mt-0.5 text-[#6b6560]">{formatDate(data.deliveryDate)}</div>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="bg-[#2d2a26] text-left text-[11px] uppercase tracking-wide text-white">
              <th className="rounded-l px-3 py-2">Description</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2 text-right">Unit Price</th>
              <th className="rounded-r px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((it, i) => (
              <tr key={i} className={i % 2 ? "bg-[#faf7f5]" : ""}>
                <td className="px-3 py-2 font-medium">{it.mealName}</td>
                <td className="px-3 py-2 text-center">{it.quantity}</td>
                <td className="px-3 py-2 text-right">{formatMoney(it.unitPriceCents)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(it.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-72 text-sm">
            <div className="flex justify-between py-0.5">
              <span className="text-[#6b6560]">Subtotal</span>
              <span>{formatMoney(data.subtotalCents)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-[#6b6560]">Delivery</span>
              <span>{formatMoney(data.deliveryFeeCents)}</span>
            </div>
            {data.discountCents > 0 && (
              <div className="flex justify-between py-0.5">
                <span className="text-[#6b6560]">Discount</span>
                <span>−{formatMoney(data.discountCents)}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between border-t-2 border-[#2d2a26] pt-1.5">
              <span className="font-display text-lg font-bold">TOTAL</span>
              <span className="font-display text-lg font-bold">{formatMoney(data.totalCents)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-[#6b6560]">Payment Status</span>
              <span className="font-bold" style={{ color: PAYMENT_COLOR[data.paymentStatus] }}>
                {PAYMENT_LABEL[data.paymentStatus] ?? data.paymentStatus}
              </span>
            </div>
            <div className="mt-0.5 text-right text-[11px] text-[#6b6560]">
              Total units: {data.totalMeals}
            </div>
          </div>
        </div>

        {/* Payment details */}
        <div className="mt-6 rounded-lg border border-[#e0dbd6] bg-[#fff7f0] p-4 text-sm">
          <div className="mb-1 font-semibold">Payment Method — Bank Transfer</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            {data.bank.accountName && (
              <div>
                <span className="text-[#6b6560]">Account Name:</span> {data.bank.accountName}
              </div>
            )}
            {data.bank.bsb && (
              <div>
                <span className="text-[#6b6560]">BSB:</span> {data.bank.bsb}
              </div>
            )}
            {data.bank.accountNumber && (
              <div>
                <span className="text-[#6b6560]">Account Number:</span> {data.bank.accountNumber}
              </div>
            )}
          </div>
          {data.bank.paymentInstructions && (
            <div className="mt-2 text-[#6b6560]">{data.bank.paymentInstructions}</div>
          )}
        </div>

        <div className="mt-6 text-center text-sm font-medium">Thank you for your order!</div>
        {b.invoiceFooterNote && (
          <div className="mt-1 text-center text-[11px] text-[#6b6560]">{b.invoiceFooterNote}</div>
        )}
      </div>
    </div>
  );
}
