import { NextRequest, NextResponse } from "next/server";
import { buildExportCsv } from "@/lib/db/ingredient-import";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  requirePermission("ingredients.export");
  const sp = req.nextUrl.searchParams;
  const csv = buildExportCsv({
    category: sp.get("category") ?? undefined,
    supplier: sp.get("supplier") ?? undefined,
    activeOnly: sp.get("activeOnly") === "1",
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mealzinha-ingredients-${stamp}.csv"`,
    },
  });
}
