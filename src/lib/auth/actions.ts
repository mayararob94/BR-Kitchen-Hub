"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "./session";

/** Clear the session and return to the login screen. */
export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
