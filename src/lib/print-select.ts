import { listOrders } from "@/lib/db/orders-db";
import type { Order } from "@/types";

export interface PrintSelectParams {
  week?: string;
  date?: string;
  ids?: string;
}

/** Resolve the set of orders to print from bulk print query params. */
export function resolveOrders(params: PrintSelectParams): Order[] {
  if (params.ids) {
    const ids = params.ids
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    const all = listOrders();
    const byId = new Map(all.map((o) => [o.id, o]));
    return ids.map((id) => byId.get(id)).filter((o): o is Order => !!o);
  }
  if (params.date) {
    return listOrders({ deliveryDate: params.date }).filter(
      (o) => o.orderStatus !== "cancelled"
    );
  }
  if (params.week) {
    return listOrders({ weekId: Number(params.week) }).filter(
      (o) => o.orderStatus !== "cancelled"
    );
  }
  return [];
}
