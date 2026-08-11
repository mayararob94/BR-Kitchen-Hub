"use server";

import { revalidatePath } from "next/cache";
import { parseCsv } from "@/lib/csv";
import {
  createCustomer,
  findDuplicates,
  type CustomerInput,
} from "@/lib/db/customers-db";
import { createBackup, restoreBackup } from "@/lib/db/backup";
import { seedDemo, clearDemo } from "@/lib/db/seed";
import type { Customer } from "@/types";

export interface ImportPreviewRow {
  data: CustomerInput;
  duplicates: Customer[];
  rowNumber: number;
}

const HEADER_ALIASES: Record<string, keyof CustomerInput> = {
  "first name": "firstName",
  firstname: "firstName",
  "last name": "lastName",
  lastname: "lastName",
  email: "email",
  phone: "phone",
  mobile: "phone",
  address: "addressLine1",
  "address line 1": "addressLine1",
  "address 1": "addressLine1",
  "address line 2": "addressLine2",
  "address 2": "addressLine2",
  suburb: "suburb",
  city: "suburb",
  state: "state",
  postcode: "postcode",
  zip: "postcode",
  "delivery instructions": "deliveryInstructions",
  instructions: "deliveryInstructions",
  notes: "notes",
};

export async function previewCustomerImportAction(
  csvText: string
): Promise<{ rows: ImportPreviewRow[]; error?: string }> {
  const parsed = parseCsv(csvText);
  if (parsed.length < 2) {
    return { rows: [], error: "CSV must have a header row and at least one data row." };
  }
  const headers = parsed[0].map((h) => h.trim().toLowerCase());
  const rows: ImportPreviewRow[] = [];

  for (let i = 1; i < parsed.length; i++) {
    const cells = parsed[i];
    const data: CustomerInput = { firstName: "" };
    headers.forEach((h, idx) => {
      const key = HEADER_ALIASES[h];
      if (key) (data as unknown as Record<string, string>)[key] = (cells[idx] ?? "").trim();
    });
    if (!data.firstName && !data.lastName && !data.phone && !data.email) continue;
    const duplicates = findDuplicates({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      suburb: data.suburb,
    });
    rows.push({ data, duplicates, rowNumber: i });
  }
  return { rows };
}

export async function importCustomersAction(
  rows: CustomerInput[]
): Promise<{ created: number }> {
  let created = 0;
  for (const r of rows) {
    if (!r.firstName?.trim() && !r.lastName?.trim()) continue;
    createCustomer(r);
    created++;
  }
  revalidatePath("/customers");
  return { created };
}

// ─── Backup / restore / demo ───

export async function createBackupAction(): Promise<{ name: string }> {
  const b = await createBackup();
  revalidatePath("/settings");
  return { name: b.name };
}

export async function restoreBackupAction(
  name: string
): Promise<{ safetyCopy: string }> {
  const r = await restoreBackup(name);
  revalidatePath("/");
  return r;
}

export async function seedDemoAction(): Promise<void> {
  seedDemo();
  revalidatePath("/");
}

export async function clearDemoAction(): Promise<void> {
  clearDemo();
  revalidatePath("/");
}
