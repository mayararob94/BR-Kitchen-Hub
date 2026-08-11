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
 * 4×6 inch (101.6 × 152.4 mm) thermal delivery label. Large, high-contrast text,
 * minimal graphics (thermal printers don't render fine detail well). Each label
 * is one print page.
 */
export function LabelDocument({ order }: { order: Order }) {
  const windowLabel = WINDOW_LABEL[order.deliveryWindow];
  const prefLabel = PREF_LABEL[order.deliveryPreference];

  return (
    <div className="label-4x6 mx-auto my-4 flex flex-col bg-white p-[6mm] text-black shadow-sm print:my-0 print:shadow-none">
      {/* Brand + order number */}
      <div className="flex items-baseline justify-between border-b-4 border-black pb-1">
        <div className="text-[22px] font-extrabold leading-none tracking-tight">
          MEALzinha
        </div>
        <div className="text-[20px] font-bold leading-none">
          #{order.orderNumber.replace(/^\D+/, "")}
        </div>
      </div>

      {/* Customer + address */}
      <div className="mt-2">
        <div className="text-[26px] font-bold leading-tight">{order.customerName}</div>
        <div className="mt-1 text-[18px] font-medium leading-snug">
          {[order.addressLine1, order.addressLine2].filter(Boolean).join(", ")}
        </div>
        <div className="text-[18px] font-medium leading-snug">
          {[order.suburb, order.state, order.postcode].filter(Boolean).join(" ")}
        </div>
        <div className="mt-1 text-[18px] font-semibold">
          {formatPhone(order.customerPhone)}
        </div>
      </div>

      {/* Meals + delivery */}
      <div className="mt-2 flex items-center justify-between border-y-2 border-black py-1">
        <div className="text-[20px] font-bold">
          MEALS: {order.totalMeals}
        </div>
        <div className="text-right text-[16px] font-semibold">
          {formatDate(order.deliveryDate)}
          {windowLabel ? ` · ${windowLabel}` : ""}
        </div>
      </div>

      {/* Delivery preference — prominent */}
      {prefLabel && (
        <div className="mt-2 rounded border-2 border-black px-2 py-1 text-center text-[20px] font-extrabold">
          {prefLabel}
        </div>
      )}

      {/* Instructions — most prominent */}
      {order.deliveryInstructions && (
        <div className="mt-2 flex-1">
          <div className="text-[12px] font-bold uppercase tracking-wide">
            Delivery Instructions
          </div>
          <div className="text-[20px] font-bold leading-tight">
            {order.deliveryInstructions}
          </div>
        </div>
      )}

      <div className="mt-auto pt-2 text-center text-[11px] text-black">
        {order.customerEmail}
      </div>
    </div>
  );
}
