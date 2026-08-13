import { getWeek } from "@/lib/db/weeks-db";
import { PrintControls } from "@/components/PrintControls";
import { formatDate, formatWeekRange, formatPhone } from "@/lib/format";
import { resolveOrders, type PrintSelectParams } from "@/lib/print-select";

export const dynamic = "force-dynamic";

const WINDOW_LABEL: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  anytime: "Anytime",
};
const PREF_LABEL: Record<string, string> = {
  home: "Home",
  safe_place: "Safe place",
};

export default async function ManifestPrintPage({
  searchParams,
}: {
  searchParams: Promise<PrintSelectParams>;
}) {
  const params = await searchParams;
  const orders = resolveOrders(params);
  const week = params.week ? getWeek(Number(params.week)) : null;

  const scope = params.date
    ? formatDate(params.date)
    : week
      ? `Week of ${formatWeekRange(week.weekStart, week.weekEnd)}`
      : "Selected orders";

  const totalMeals = orders.reduce((s, o) => s + o.totalMeals, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintControls mode="a4l" backHref="/labels" title="Delivery Manifest" />
      <div className="print-page mx-auto my-4 w-[297mm] max-w-full bg-white p-[12mm] text-gray-900 shadow-sm">
        <div className="flex items-end justify-between border-b-2 border-brand-600 pb-2">
          <div>
            <h1 className="font-display text-2xl font-semibold text-brand-700">
              Delivery Manifest
            </h1>
            <p className="text-sm text-gray-500">{scope}</p>
          </div>
          <div className="text-right text-sm">
            <div>{orders.length} deliveries</div>
            <div>{totalMeals} meals</div>
          </div>
        </div>

        <table className="mt-4 w-full text-xs">
          <thead>
            <tr className="border-b border-gray-300 text-left uppercase tracking-wide text-gray-500">
              <th className="py-1.5 pr-2">✓</th>
              <th className="py-1.5 pr-2">Customer</th>
              <th className="py-1.5 pr-2">Address</th>
              <th className="py-1.5 pr-2">Suburb</th>
              <th className="py-1.5 pr-2">Phone</th>
              <th className="py-1.5 pr-2 text-center">Meals</th>
              <th className="py-1.5 pr-2">Window</th>
              <th className="py-1.5 pr-2">Pref.</th>
              <th className="py-1.5 pr-2">Instructions</th>
              <th className="py-1.5">Paid</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-100 align-top">
                <td className="py-2 pr-2">
                  <span className="inline-block h-4 w-4 border border-gray-400" />
                </td>
                <td className="py-2 pr-2 font-medium">{o.customerName}</td>
                <td className="py-2 pr-2">
                  {[o.addressLine1, o.addressLine2].filter(Boolean).join(", ")}
                </td>
                <td className="py-2 pr-2">
                  {o.suburb} {o.postcode}
                </td>
                <td className="py-2 pr-2">{formatPhone(o.customerPhone)}</td>
                <td className="py-2 pr-2 text-center font-semibold">{o.totalMeals}</td>
                <td className="py-2 pr-2">{WINDOW_LABEL[o.deliveryWindow] ?? "—"}</td>
                <td className="py-2 pr-2">{PREF_LABEL[o.deliveryPreference] ?? "—"}</td>
                <td className="py-2 pr-2">{o.deliveryInstructions || "—"}</td>
                <td className="py-2">
                  {o.paymentStatus === "paid"
                    ? "Yes"
                    : o.paymentStatus === "partial"
                      ? "Part"
                      : "No"}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-gray-400">
                  No deliveries for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
