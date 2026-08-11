"use server";

import { revalidatePath } from "next/cache";
import {
  createOrder,
  updateOrder,
  setOrderStatus,
  setPayment,
  deleteOrder,
  ensureInvoiceNumber,
  buildDuplicateInput,
  type OrderInput,
} from "@/lib/db/orders-db";
import { getWeekItems } from "@/lib/db/weeks-db";
import type { OrderStatus, PaymentStatus, WeeklyMenuItem } from "@/types";

export async function createOrderAction(
  input: OrderInput
): Promise<{ id: number }> {
  const id = createOrder(input);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { id };
}

export async function updateOrderAction(
  id: number,
  input: OrderInput
): Promise<void> {
  updateOrder(id, input);
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/dashboard");
}

export async function setOrderStatusAction(
  id: number,
  status: OrderStatus
): Promise<void> {
  setOrderStatus(id, status);
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/dashboard");
}

export async function setPaymentAction(
  id: number,
  data: {
    paymentStatus: PaymentStatus;
    amountPaidCents?: number;
    paymentDate?: string | null;
    paymentReference?: string;
  }
): Promise<void> {
  setPayment(id, data);
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteOrderAction(id: number): Promise<void> {
  deleteOrder(id);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
}

export async function ensureInvoiceNumberAction(
  id: number
): Promise<{ invoiceNumber: string | null }> {
  const invoiceNumber = ensureInvoiceNumber(id);
  revalidatePath(`/orders/${id}`);
  return { invoiceNumber };
}

/** Load a week's available meals (used when the week changes on New Order). */
export async function getWeekItemsAction(
  weekId: number
): Promise<WeeklyMenuItem[]> {
  return getWeekItems(weekId);
}

/**
 * Duplicate an order into a target week. Returns the new order id plus any
 * meals that are unavailable that week (flagged for the operator).
 */
export async function duplicateOrderAction(
  sourceOrderId: number,
  targetWeekId: number,
  deliveryDate: string | null
): Promise<{ id: number | null; unavailable: string[] }> {
  const plan = buildDuplicateInput(sourceOrderId, targetWeekId, deliveryDate);
  if (!plan) return { id: null, unavailable: [] };
  const id = createOrder(plan.input);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { id, unavailable: plan.unavailable };
}
