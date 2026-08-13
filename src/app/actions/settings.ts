"use server";

import { revalidatePath } from "next/cache";
import { setSettings } from "@/lib/db/settings-db";
import { dollarsToCents } from "@/lib/money";

export interface SettingsFormValues {
  businessName: string;
  tradingName: string;
  abn: string;
  address: string;
  phone: string;
  email: string;
  website: string;

  bankAccountName: string;
  bankBsb: string;
  bankAccountNumber: string;
  bankPaymentInstructions: string;

  orderPrefix: string;
  orderNext: string;
  invoicePrefix: string;
  invoiceNext: string;
  defaultDeliveryFeeDollars: string;

  invoicePaperSize: string;
  labelSize: string;
  labelOrientation: string;

  defaultBufferPct: string;
}

export async function saveSettingsAction(v: SettingsFormValues): Promise<void> {
  setSettings({
    businessName: v.businessName,
    tradingName: v.tradingName,
    abn: v.abn,
    address: v.address,
    phone: v.phone,
    email: v.email,
    website: v.website,

    bankAccountName: v.bankAccountName,
    bankBsb: v.bankBsb,
    bankAccountNumber: v.bankAccountNumber,
    bankPaymentInstructions: v.bankPaymentInstructions,

    orderPrefix: v.orderPrefix,
    orderNext: String(Math.max(1, parseInt(v.orderNext, 10) || 1)),
    invoicePrefix: v.invoicePrefix,
    invoiceNext: String(Math.max(1, parseInt(v.invoiceNext, 10) || 1)),
    defaultDeliveryFeeCents: String(dollarsToCents(v.defaultDeliveryFeeDollars)),

    invoicePaperSize: v.invoicePaperSize,
    labelSize: v.labelSize,
    labelOrientation: v.labelOrientation,

    defaultBufferPct: String(Math.max(0, parseFloat(v.defaultBufferPct) || 0)),
  });
  revalidatePath("/production");
  revalidatePath("/settings");
  revalidatePath("/orders/new");
}
