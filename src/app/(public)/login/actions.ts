"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { createOtp, verifyOtp } from "@/lib/auth/otp";
import { signSession, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/secret";
import { findUserByEmail, getRoleAssignments, markEmailVerified } from "@/lib/repositories/users";
import { isAdminPrincipal } from "@/lib/rbac/authorize";
import { sendEmail } from "@/lib/email/send";
import { constantTimeEqual } from "@/lib/auth/hash";

/**
 * Finalise a sign-in: mark the email verified, mint a session JWT and set the
 * httpOnly cookie. Shared by the OTP and staging-password flows.
 */
async function finalizeSignIn(userId: string, email: string): Promise<void> {
  const db = getDb();
  await markEmailVerified(db, userId);
  const token = await signSession({ sub: userId, email });
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

const verifySchema = emailSchema.extend({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export interface RequestOtpState {
  ok: boolean;
  email?: string;
  error?: string;
}

export async function requestOtpAction(
  _prev: RequestOtpState,
  formData: FormData,
): Promise<RequestOtpState> {
  if (!isAuthConfigured()) {
    return { ok: false, error: "Sign-in is temporarily unavailable." };
  }

  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const { email } = parsed.data;
  const db = getDb();
  const result = await createOtp(db, email, "login");

  // Do not reveal whether the email has an account, and always show the same
  // outcome even when rate-limited, to avoid enumeration.
  if (result.ok && result.code) {
    await sendEmail({
      to: email,
      subject: "Your BR Kitchen Hub sign-in code",
      text: `Your sign-in code is ${result.code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    });
  }

  return { ok: true, email };
}

export interface VerifyOtpState {
  ok: boolean;
  error?: string;
}

export async function verifyOtpAction(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const parsed = verifySchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, code } = parsed.data;
  const db = getDb();

  const verification = await verifyOtp(db, email, code);
  if (!verification.ok) {
    const message =
      verification.error === "expired"
        ? "That code has expired. Request a new one."
        : verification.error === "too_many_attempts"
          ? "Too many attempts. Request a new code."
          : "That code is not correct.";
    return { ok: false, error: message };
  }

  // The code was valid. Sign in only existing, non-suspended accounts.
  const user = await findUserByEmail(db, email);
  if (!user || user.status === "suspended") {
    return {
      ok: false,
      error: "No active account is linked to this email. Please contact the kitchen.",
    };
  }

  await finalizeSignIn(user.id, user.email);
  return { ok: true };
}

// ─── Staging password sign-in (temporary) ────────────────────────────────
// Enabled only when STAGING_LOGIN_PASSWORD is set (a Cloudflare secret in the
// staging environment). It lets a known account sign in with a shared password
// so the draft is easy to browse before email delivery (Resend) is wired up in
// Phase 3. The password value never lives in the repo. Remove the secret to
// disable this path entirely (production leaves it unset).

/** True when the staging password login is configured for this environment. */
export async function isStagingPasswordLoginEnabled(): Promise<boolean> {
  const pw = process.env.STAGING_LOGIN_PASSWORD;
  return typeof pw === "string" && pw.length >= 8;
}

const passwordSchema = emailSchema.extend({
  password: z.string().min(1, "Enter the staging password."),
});

export async function passwordLoginAction(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const expected = process.env.STAGING_LOGIN_PASSWORD;
  if (!expected || expected.length < 8) {
    return { ok: false, error: "Password sign-in is not available." };
  }

  const parsed = passwordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, password } = parsed.data;

  // Constant-time compare padded to a fixed length to avoid leaking the
  // password length via timing.
  const ok = constantTimeEqual(
    password.padEnd(64, "\0").slice(0, 64),
    expected.padEnd(64, "\0").slice(0, 64),
  );
  if (!ok) {
    return { ok: false, error: "That password is not correct." };
  }

  const db = getDb();
  const user = await findUserByEmail(db, email);
  if (!user || user.status === "suspended") {
    return {
      ok: false,
      error: "No active account is linked to this email. Please contact the kitchen.",
    };
  }

  await finalizeSignIn(user.id, user.email);
  return { ok: true };
}

/** Where to send the user after a successful sign-in (admin vs portal). */
export async function postLoginDestination(): Promise<string> {
  const db = getDb();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return "/portal";
  // Cheap role check to pick a landing area.
  const { verifySession } = await import("@/lib/auth/session");
  const session = await verifySession(token);
  if (!session) return "/portal";
  const assignments = await getRoleAssignments(db, session.sub);
  return isAdminPrincipal({ userId: session.sub, email: session.email, assignments })
    ? "/admin"
    : "/portal";
}
