import { getWeek, getActiveWeek } from "@/lib/db/weeks-db";
import { mealsRequiredForWeek, productionByCustomer } from "@/lib/db/reports-db";
import { PrintControls } from "@/components/PrintControls";
import { formatWeekRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductionPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; breakdown?: string }>;
}) {
  const { week, breakdown } = await searchParams;
  const selected = week ? getWeek(Number(week)) : getActiveWeek();
  const weekId = selected?.id ?? null;
  const tally = mealsRequiredForWeek(weekId);
  const byCustomer = breakdown === "1" ? productionByCustomer(weekId) : [];
  const total = tally.reduce((s, t) => s + t.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintControls mode="a4" backHref="/dashboard" title="Production Summary" />
      <div className="print-page mx-auto my-4 w-[210mm] max-w-full bg-white p-[16mm] text-gray-900 shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-brand-700">
          Production Summary
        </h1>
        <p className="text-sm text-gray-500">
          {selected
            ? `Week of ${formatWeekRange(selected.weekStart, selected.weekEnd)}`
            : "All orders"}
        </p>

        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2">Meal</th>
              <th className="py-2 text-right">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {tally.map((t) => (
              <tr key={t.mealName} className="border-b border-gray-100">
                <td className="py-2 font-medium">{t.mealName}</td>
                <td className="py-2 text-right text-lg font-semibold">{t.quantity}</td>
              </tr>
            ))}
            {tally.length === 0 && (
              <tr>
                <td colSpan={2} className="py-6 text-center text-gray-400">
                  No meals ordered for this week.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-400">
              <td className="py-2 font-semibold">TOTAL MEALS</td>
              <td className="py-2 text-right text-xl font-bold">{total}</td>
            </tr>
          </tfoot>
        </table>

        {byCustomer.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-gray-800">
              Breakdown by Customer
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {byCustomer.map((m) => (
                <div key={m.mealName} className="break-inside-avoid">
                  <div className="border-b border-gray-200 pb-1 font-semibold">
                    {m.mealName}
                  </div>
                  <ul className="mt-1 text-sm">
                    {m.breakdown.map((b, i) => (
                      <li key={i} className="flex justify-between">
                        <span className="text-gray-600">{b.customerName}</span>
                        <span>{b.quantity}</span>
                      </li>
                    ))}
                    <li className="flex justify-between border-t border-gray-100 pt-0.5 font-semibold">
                      <span>TOTAL</span>
                      <span>{m.total}</span>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
