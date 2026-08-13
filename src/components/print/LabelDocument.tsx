import type { Order } from "@/types";
import { formatDate, formatPhone } from "@/lib/format";

const WINDOW_LABEL: Record<string, string> = {
  morning: "MORNING",
  afternoon: "AFTERNOON",
  anytime: "ANYTIME",
};
const PREF_LABEL: Record<string, string> = {
  home: "WILL BE HOME",
  safe_place: "LEAVE IN SAFE PLACE",
};

/**
 * 6×4 inch (152.4 × 101.6 mm) LANDSCAPE thermal delivery label, matching the
 * MEALzinha shipping-label template: recipient + address on the left, an
 * itemised meal list on the right, and a perishable-food footer band. Large,
 * high-contrast type; minimal graphics for thermal printers.
 */
export function LabelDocument({
  order,
  business,
}: {
  order: Order;
  business: { name: string; website: string };
}) {
  const windowLabel = WINDOW_LABEL[order.deliveryWindow];
  const prefLabel = PREF_LABEL[order.deliveryPreference];
  const orderNo = order.orderNumber.replace(/^\D+/, "");

  return (
    <div className="label-4x6 mx-auto my-4 flex flex-col bg-white p-[5mm] text-[#2d2a26] shadow-sm print:my-0 print:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#2d2a26] pb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt={business.name} className="h-12 w-auto" />
        <div className="text-[13px] font-bold">
          #{orderNo} · {formatDate(order.deliveryDate)}
        </div>
      </div>

      {/* Body: recipient (left) + items (right) */}
      <div className="flex min-h-0 flex-1 gap-3 pt-2">
        {/* Left */}
        <div className="flex w-[57%] flex-col">
          <div className="text-[21px] font-extrabold leading-[1.05]">
            {order.customerName}
          </div>
          <div className="mt-0.5 text-[15px] font-semibold">
            {formatPhone(order.customerPhone)}
          </div>

          <div className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-[#ed7531]">
            Deliver To
          </div>
          <div className="text-[14px] font-medium leading-[1.2]">
            {[order.addressLine1, order.addressLine2].filter(Boolean).join(", ")}
          </div>
          <div className="text-[14px] font-medium leading-[1.2]">
            {[order.suburb, order.state, order.postcode].filter(Boolean).join(" ")}
          </div>

          {prefLabel && (
            <div className="mt-1.5 inline-block self-start border-2 border-[#2d2a26] px-1.5 py-0.5 text-[13px] font-extrabold">
              {prefLabel}
            </div>
          )}
          {order.deliveryInstructions && (
            <div className="mt-1 text-[12px] font-bold leading-tight">
              ⚑ {order.deliveryInstructions}
            </div>
          )}
        </div>

        {/* Right: items */}
        <div className="flex w-[43%] flex-col border-l border-[#e0dbd6] pl-3">
          <div className="flex justify-between border-b border-[#2d2a26] pb-0.5 text-[9px] font-bold uppercase tracking-wider text-[#6b6560]">
            <span>Qty</span>
            <span className="flex-1 pl-2">Item</span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {order.items.map((it) => (
              <div key={it.id} className="flex gap-2 border-b border-[#f0ece8] py-[1px] text-[11px] leading-tight">
                <span className="w-4 shrink-0 text-right font-bold">{it.quantity}</span>
                <span className="flex-1">{it.mealNameSnapshot}</span>
              </div>
            ))}
          </div>
          <div className="mt-0.5 border-t-2 border-[#2d2a26] pt-0.5 text-[13px] font-extrabold">
            TOTAL MEALS: {order.totalMeals}
          </div>
        </div>
      </div>

      {/* Footer band */}
      <div className="mt-1 flex items-center justify-between border-t-2 border-[#2d2a26] pt-1 text-[9px]">
        <div className="font-bold uppercase tracking-wide">
          Perishable · Keep refrigerated, store below 5°C
        </div>
        <div className="text-[#6b6560]">
          {windowLabel ? `${windowLabel} · ` : ""}
          {business.website || "mealzinha.com.au"}
        </div>
      </div>
    </div>
  );
}
