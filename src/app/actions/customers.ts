"use server";

import { revalidatePath } from "next/cache";
import {
  createCustomer,
  updateCustomer,
  setCustomerActive,
  findDuplicates,
  searchCustomers,
  getCustomer,
  type CustomerInput,
} from "@/lib/db/customers-db";
import type { Customer } from "@/types";

export async function searchCustomersAction(query: string): Promise<Customer[]> {
  return searchCustomers(query);
}

export async function getCustomerByIdAction(id: number): Promise<Customer | null> {
  return getCustomer(id);
}

export async function checkDuplicatesAction(data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  suburb?: string;
}): Promise<Customer[]> {
  return findDuplicates(data);
}

export async function createCustomerAction(
  data: CustomerInput
): Promise<{ id: number }> {
  const id = createCustomer(data);
  revalidatePath("/customers");
  revalidatePath("/orders/new");
  return { id };
}

export async function updateCustomerAction(
  id: number,
  data: CustomerInput
): Promise<void> {
  updateCustomer(id, data);
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
}

export async function setCustomerActiveAction(
  id: number,
  active: boolean
): Promise<void> {
  setCustomerActive(id, active);
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
}
