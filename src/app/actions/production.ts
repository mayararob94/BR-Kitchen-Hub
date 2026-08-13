"use server";

import { revalidatePath } from "next/cache";
import {
  setPlanBuffer,
  finalisePlan,
  reopenPlan,
} from "@/lib/db/production-db";

export async function setBufferAction(weekId: number, bufferPct: number): Promise<void> {
  setPlanBuffer(weekId, Math.max(0, bufferPct));
  revalidatePath("/production");
}

export async function finalisePlanAction(weekId: number): Promise<void> {
  finalisePlan(weekId);
  revalidatePath("/production");
}

export async function reopenPlanAction(weekId: number): Promise<void> {
  reopenPlan(weekId);
  revalidatePath("/production");
}
