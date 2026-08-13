import { NextResponse } from "next/server";
import { buildTemplateCsv } from "@/lib/db/ingredient-import";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  requirePermission("ingredients.export");
  return new NextResponse(buildTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mealzinha-ingredients-template.csv"`,
    },
  });
}
