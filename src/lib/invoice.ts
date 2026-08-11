import type { Order, AppSettings, InvoiceData } from "@/types";

/** Assemble a print-ready InvoiceData view model from an order + settings. */
export function buildInvoiceData(
  order: Order,
  settings: AppSettings,
  invoiceNumber: string
): InvoiceData {
  const addressLines = [
    order.addressLine1,
    order.addressLine2,
    [order.suburb, order.state, order.postcode].filter(Boolean).join(" "),
  ].filter((l) => l && l.trim());

  return {
    invoiceNumber,
    orderNumber: order.orderNumber,
    invoiceDate: new Date().toISOString().slice(0, 10),
    deliveryDate: order.deliveryDate,
    business: {
      businessName: settings.businessName,
      tradingName: settings.tradingName,
      abn: settings.abn,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
    },
    bank: {
      accountName: settings.accountName,
      bsb: settings.bsb,
      accountNumber: settings.accountNumber,
      paymentInstructions: settings.paymentInstructions,
    },
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail,
      addressLines,
    },
    lineItems: order.items.map((it) => ({
      mealName: it.mealNameSnapshot,
      quantity: it.quantity,
      unitPriceCents: it.unitPriceCents,
      lineTotalCents: it.lineTotalCents,
    })),
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    discountCents: order.discountCents,
    totalCents: order.totalCents,
    amountPaidCents: order.amountPaidCents,
    paymentStatus: order.paymentStatus,
    totalMeals: order.totalMeals,
  };
}
