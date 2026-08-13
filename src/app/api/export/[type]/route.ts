import { NextRequest, NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { listCustomers } from "@/lib/db/customers-db";
import { listOrders } from "@/lib/db/orders-db";
import { mealsRequiredForWeek } from "@/lib/db/reports-db";
import { centsToDollars } from "@/lib/money";

export const dynamic = "force-dynamic";

function csvResponse(filename: string, csv: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const sp = req.nextUrl.searchParams;
  const weekId = sp.get("week") ? Number(sp.get("week")) : undefined;
  const deliveryDate = sp.get("date") ?? undefined;

  const stamp = new Date().toISOString().slice(0, 10);

  if (type === "customers") {
    const rows = listCustomers().map((c) => [
      c.id,
      c.firstName,
      c.lastName,
      c.phone,
      c.email,
      c.addressLine1,
      c.addressLine2,
      c.suburb,
      c.state,
      c.postcode,
      c.deliveryInstructions,
      c.deliveryWindow,
      c.deliveryPreference,
      c.notes,
      c.isActive ? "active" : "inactive",
      c.createdAt,
    ]);
    return csvResponse(
      `customers-${stamp}.csv`,
      toCsv(
        [
          "id",
          "first_name",
          "last_name",
          "phone",
          "email",
          "address_line1",
          "address_line2",
          "suburb",
          "state",
          "postcode",
          "delivery_instructions",
          "delivery_window",
          "delivery_preference",
          "notes",
          "status",
          "created_at",
        ],
        rows
      )
    );
  }

  if (type === "orders") {
    const orders = listOrders({ weekId, deliveryDate });
    const rows = orders.map((o) => [
      o.orderNumber,
      o.invoiceNumber ?? "",
      o.customerName,
      o.customerPhone,
      o.suburb,
      o.deliveryDate ?? "",
      o.totalMeals,
      centsToDollars(o.subtotalCents),
      centsToDollars(o.deliveryFeeCents),
      centsToDollars(o.discountCents),
      centsToDollars(o.totalCents),
      o.paymentStatus,
      o.orderStatus,
      o.createdAt,
    ]);
    return csvResponse(
      `orders-${stamp}.csv`,
      toCsv(
        [
          "order_number",
          "invoice_number",
          "customer_name",
          "customer_phone",
          "suburb",
          "delivery_date",
          "total_meals",
          "subtotal",
          "delivery_fee",
          "discount",
          "total",
          "payment_status",
          "order_status",
          "created_at",
        ],
        rows
      )
    );
  }

  if (type === "order-items") {
    const orders = listOrders({ weekId, deliveryDate });
    const rows: unknown[][] = [];
    for (const o of orders) {
      for (const it of o.items) {
        rows.push([
          o.orderNumber,
          o.customerName,
          o.deliveryDate ?? "",
          it.mealNameSnapshot,
          it.quantity,
          centsToDollars(it.unitPriceCents),
          centsToDollars(it.lineTotalCents),
        ]);
      }
    }
    return csvResponse(
      `order-items-${stamp}.csv`,
      toCsv(
        [
          "order_number",
          "customer_name",
          "delivery_date",
          "meal_name",
          "quantity",
          "unit_price",
          "line_total",
        ],
        rows
      )
    );
  }

  if (type === "production") {
    const rows = mealsRequiredForWeek(weekId ?? null).map((m) => [
      m.mealName,
      m.quantity,
    ]);
    return csvResponse(
      `production-${stamp}.csv`,
      toCsv(["meal_name", "quantity"], rows)
    );
  }

  if (type === "manifest") {
    const orders = listOrders({ weekId, deliveryDate }).filter(
      (o) => o.orderStatus !== "cancelled"
    );
    const rows = orders.map((o) => [
      o.customerName,
      [o.addressLine1, o.addressLine2].filter(Boolean).join(", "),
      o.suburb,
      o.state,
      o.postcode,
      o.customerPhone,
      o.totalMeals,
      o.deliveryWindow,
      o.deliveryPreference,
      o.deliveryInstructions,
      o.paymentStatus,
    ]);
    return csvResponse(
      `manifest-${stamp}.csv`,
      toCsv(
        [
          "customer",
          "address",
          "suburb",
          "state",
          "postcode",
          "phone",
          "meals",
          "delivery_window",
          "delivery_preference",
          "delivery_instructions",
          "payment_status",
        ],
        rows
      )
    );
  }

  return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
}
